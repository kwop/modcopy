import { expect, test } from 'claude-code/testing'

type Found = { key: string | undefined; props: Record<string, unknown>; text: string }

const REPLY = [
  'Voici deux blocs :',
  '',
  '```bash',
  "printf '%s\\n' \\",
  '  "ligne 1" \\',
  "  | sed 's/^/OK -> /'",
  '```',
  '',
  'Et la requête :',
  '',
  '```sql',
  'SELECT id',
  'FROM users;',
  '```',
].join('\n')

const mountReply = (
  $: any,
  text: string,
  extra: object = {},
  surface: 'terminal' | 'desktop' = 'terminal',
) =>
  $.ui.mount({
    plugin: 'copy-code-buttons',
    surface,
    component: 'AssistantMessage',
    requestId: 'msg-1',
    props: { text, isFirstOfReply: true, ...extra },
  })

// Stands for the engine's own drawing of the reply, beneath the mod.
const engineRow = (on: any) =>
  on('ui.render', ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine row</Text>
  })

const answerToasts = (on: any, toasts: string[]) =>
  on('ui.toast', (_: any, e: any) => {
    toasts.push(e.text)
    return { value: undefined }
  })

test('prose stays markdown, each block sits on the grey band with its ruby button under it', async ($, on) => {
  engineRow(on)
  const ui = await mountReply($, REPLY)

  expect(await ui.find({ type: 'Text', text: /engine row/ })).toBeUndefined()
  const md = (await ui.findAll({ type: 'Markdown' })).map((m: Found) => m.props.text)
  expect(md).toEqual(['Voici deux blocs :', 'Et la requête :'])

  const code = (await ui.findAll({ type: 'Code' })).map((c: Found) => [c.props.language, c.props.source])
  expect(code).toEqual([
    ['bash', "printf '%s\\n' \\\n  \"ligne 1\" \\\n  | sed 's/^/OK -> /'"],
    ['sql', 'SELECT id\nFROM users;'],
  ])
  const boxes: Found[] = await ui.findAll({ type: 'Box' })
  const bands = boxes.filter(b => b.props.backgroundColor === 'bashMessageBackgroundColor')
  expect(bands.map(b => [b.props.paddingX, b.props.paddingY])).toEqual([[2, 1], [2, 1]])

  const bars = boxes.filter(b => b.props.backgroundColor === '#4A1027')
  expect(bars.map(b => [b.key, b.props.marginTop, b.props.paddingX])).toEqual([
    ['bar-0', 1, 1],
    ['bar-1', 1, 1],
  ])

  const buttons = await ui.findAll({ type: 'Button' })
  expect(buttons.map((b: Found) => [b.key, b.props.label])).toEqual([
    ['copy-0', '⧉  copier bash'],
    ['copy-1', '⧉  copier sql'],
  ])
  const face = await ui.find({ type: 'Text', text: /⧉  copier sql/ })
  expect(face?.props).toMatchObject({ backgroundColor: '#E0115F', color: 'white', bold: true })
  expect(face?.text).toBe('  ⧉  copier sql  ')
  await ui.unmount()
})

test('the reply bullet is drawn on the first block only', async ($, on) => {
  engineRow(on)
  const first = await mountReply($, REPLY)
  expect(await first.find({ type: 'Text', text: '⏺' })).toBeDefined()
  await first.unmount()

  const later = await mountReply($, REPLY, { isFirstOfReply: false })
  expect(await later.find({ type: 'Text', text: '⏺' })).toBeUndefined()
  await later.unmount()
})

test('a press copies the block verbatim, backslashes kept, no trailing newline', async ($, on) => {
  engineRow(on)
  const copied: string[] = []
  const toasts: string[] = []
  on('ui.copy', (_: any, e: any) => {
    copied.push(e.text)
    return { value: { isCopied: true } }
  })
  answerToasts(on, toasts)

  const ui = await mountReply($, REPLY)
  await ui.press({ key: 'copy-0' })
  await ui.press({ key: 'copy-1' })

  expect(copied).toEqual(["printf '%s\\n' \\\n  \"ligne 1\" \\\n  | sed 's/^/OK -> /'", 'SELECT id\nFROM users;'])
  expect(toasts).toEqual(['Copié : bash (3 lignes)', 'Copié : sql (2 lignes)'])
  await ui.unmount()
})

test('a refused copy says why', async ($, on) => {
  engineRow(on)
  const toasts: string[] = []
  on('ui.copy', () => ({ value: { isCopied: false, reason: 'no-clipboard' } }))
  answerToasts(on, toasts)

  const ui = await mountReply($, '```sh\nls\n```')
  await ui.press({ key: 'copy-0' })
  expect(toasts).toEqual(['Copie impossible : no-clipboard'])
  await ui.unmount()
})

test('left to Claude Code: no closed block, a summary, another surface', async ($, on) => {
  engineRow(on)
  const cases: [string, object, 'terminal' | 'desktop'][] = [
    ['Juste du texte, `inline` compris.', {}, 'terminal'],
    ['Début :\n\n```bash\necho pas encore ferme', {}, 'terminal'],
    ['```bash\nls\n```', { isSummary: true }, 'terminal'],
    [REPLY, {}, 'desktop'],
  ]
  for (const [text, extra, surface] of cases) {
    const ui = await mountReply($, text, extra, surface)
    expect(await ui.findAll({ type: 'Button' })).toEqual([])
    expect((await ui.find({ type: 'Text', text: /engine row/ }))?.text).toBe('engine row')
    await ui.unmount()
  }
})

test('a block still streaming after a closed one stays in the prose', async ($, on) => {
  engineRow(on)
  const ui = await mountReply($, '```sh\nls\n```\n\nPuis :\n\n```bash\necho en cours')
  expect((await ui.findAll({ type: 'Button' })).length).toBe(1)
  const md = (await ui.findAll({ type: 'Markdown' })).map((m: Found) => m.props.text)
  expect(md).toEqual(['Puis :\n\n```bash\necho en cours'])
  await ui.unmount()
})

test('a block without a language and a ~~~ fence are both found', async ($, on) => {
  engineRow(on)
  const ui = await mountReply($, '```\nuname -a\n```\n\n~~~python\nprint(1)\n~~~')
  const labels = (await ui.findAll({ type: 'Button' })).map((b: Found) => b.props.label)
  expect(labels).toEqual(['⧉  copier code', '⧉  copier python'])
  const langs = (await ui.findAll({ type: 'Code' })).map((c: Found) => c.props.language)
  expect(langs).toEqual([undefined, 'python'])
  await ui.unmount()
})
