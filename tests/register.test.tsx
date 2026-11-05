import { expect, test } from 'claude-code/testing'

type Found = { key: string | undefined; props: Record<string, unknown> }

const SURFACES = ['terminal', 'desktop'] as const

const REPLY = [
  'Voici deux blocs :',
  '',
  '```bash',
  "printf '%s\\n' \\",
  '  "ligne 1" \\',
  "  | sed 's/^/OK -> /'",
  '```',
  '',
  '```sql',
  'SELECT id',
  'FROM users;',
  '```',
].join('\n')

const mountReply = ($: any, surface: (typeof SURFACES)[number], text: string, extra = {}) =>
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

test('a reply with two blocks keeps its row and gets one ruby button per block', async ($, on) => {
  engineRow(on)
  for (const surface of SURFACES) {
    const ui = await mountReply($, surface, REPLY)

    expect((await ui.find({ type: 'Text', text: /engine row/ }))?.text).toBe('engine row')
    const buttons = await ui.findAll({ type: 'Button' })
    expect(buttons.map((b: Found) => b.key)).toEqual(['copy-0', 'copy-1'])
    expect(buttons.map((b: Found) => b.props.label)).toEqual(['⧉ bash #1', '⧉ sql #2'])

    const label = await ui.find({ type: 'Text', text: '⧉ bash #1' })
    expect(label?.props.color).toBe('#E0115F')
    // hover (white) is applied by the surface and never reported to the test kit: checked by eye.
    await ui.unmount()
  }
})

test('a press copies the block verbatim, backslashes kept, no trailing newline', async ($, on) => {
  engineRow(on)
  const copied: { text: string; surface?: string }[] = []
  const toasts: string[] = []
  on('ui.copy', (_: any, e: any) => {
    copied.push({ text: e.text, surface: e.surface })
    return { value: { isCopied: true } }
  })
  on('ui.toast', (_: any, e: any) => {
    toasts.push(e.text)
    return { value: undefined }
  })

  for (const surface of SURFACES) {
    copied.length = 0
    toasts.length = 0
    const ui = await mountReply($, surface, REPLY)
    await ui.press({ key: 'copy-0' })
    await ui.press({ key: 'copy-1' })

    expect(copied).toEqual([
      { text: "printf '%s\\n' \\\n  \"ligne 1\" \\\n  | sed 's/^/OK -> /'", surface },
      { text: 'SELECT id\nFROM users;', surface },
    ])
    expect(toasts).toEqual(['Copié : bash #1 (3 lignes)', 'Copié : sql #2 (2 lignes)'])
    await ui.unmount()
  }
})

test('a refused copy says why', async ($, on) => {
  engineRow(on)
  const toasts: string[] = []
  on('ui.copy', () => ({ value: { isCopied: false, reason: 'no-clipboard' } }))
  on('ui.toast', (_: any, e: any) => {
    toasts.push(e.text)
    return { value: undefined }
  })

  const ui = await mountReply($, 'terminal', '```sh\nls\n```')
  expect((await ui.find({ type: 'Button' }))?.props.label).toBe('⧉ copier sh')
  await ui.press({ key: 'copy-0' })
  expect(toasts).toEqual(['Copie impossible : no-clipboard'])
  await ui.unmount()
})

test('no button without a closed block: plain text, a block still streaming, a summary', async ($, on) => {
  engineRow(on)
  const cases: [string, object][] = [
    ['Juste du texte, `inline` compris.', {}],
    ['Début :\n\n```bash\necho pas encore ferme', {}],
    ['```bash\nls\n```', { isSummary: true }],
  ]
  for (const [text, extra] of cases) {
    const ui = await mountReply($, 'terminal', text, extra)
    expect(await ui.findAll({ type: 'Button' })).toEqual([])
    expect((await ui.find({ type: 'Text', text: /engine row/ }))?.text).toBe('engine row')
    await ui.unmount()
  }
})

test('a block without a language and a ~~~ fence are both found', async ($, on) => {
  engineRow(on)
  const ui = await mountReply($, 'terminal', '```\nuname -a\n```\n\n~~~python\nprint(1)\n~~~')
  const labels = (await ui.findAll({ type: 'Button' })).map((b: Found) => b.props.label)
  expect(labels).toEqual(['⧉ code #1', '⧉ python #2'])
  await ui.unmount()
})
