import type { Register } from 'claude-code'

type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'code'; lang: string; code: string; index: number }

const RUBY = '#E0115F'
// Muted ruby: the action bar under a block, room for more buttons later.
const RUBY_DIM = '#4A1027'
// Theme key: the grey band behind `!` shell commands; follows light/dark themes.
const CODE_BG = 'bashMessageBackgroundColor'

// Splits a reply's markdown into prose and closed fenced code blocks. A block
// still streaming (no closing fence yet) stays prose, drawn as Claude Code does.
// The button face: one row, padded so the ruby reads as a button.
function face(label: string): string {
  return `  ${label}  `
}

function segments(markdown: string): Segment[] {
  const out: Segment[] = []
  let prose: string[] = []
  let open: { fence: string; lang: string; header: string; lines: string[] } | null = null
  let index = 0

  const flush = () => {
    const text = prose.join('\n').replace(/^\s*\n/, '').trimEnd()
    if (text.trim() !== '') out.push({ kind: 'text', text })
    prose = []
  }

  for (const line of markdown.split('\n')) {
    if (open === null) {
      const start = /^\s{0,3}(`{3,}|~{3,})\s*([\w+#.-]*)/.exec(line)
      if (start) open = { fence: start[1] ?? '```', lang: start[2] ?? '', header: line, lines: [] }
      else prose.push(line)
      continue
    }
    const close = new RegExp(`^\\s{0,3}${open.fence[0]}{${open.fence.length},}\\s*$`)
    if (close.test(line)) {
      flush()
      out.push({ kind: 'code', lang: open.lang || 'code', code: open.lines.join('\n'), index: index++ })
      open = null
    } else {
      open.lines.push(line)
    }
  }
  if (open !== null) prose.push(open.header, ...open.lines)
  flush()
  return out
}

export const register: Register = on => {
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    // Desktop and VS Code already draw code blocks with their own copy button.
    if (e.surface !== 'terminal' || e.props.isSummary) return next(e)

    const segs = segments(e.props.text)
    if (!segs.some(s => s.kind === 'code')) return next(e)

    const { Box, Button, Code, Markdown, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="row">
        <Box width={2} flexShrink={0}>
          <Text>{e.props.isFirstOfReply ? '⏺' : ' '}</Text>
        </Box>
        <Box flexDirection="column" flexGrow={1} flexShrink={1} gap={1}>
          {segs.map((s, i) =>
            s.kind === 'text' ? (
              <Markdown key={`md-${i}`} text={s.text} />
            ) : (
              <Box key={`code-${i}`} flexDirection="column">
                <Box flexDirection="column" backgroundColor={CODE_BG} paddingX={2} paddingY={1}>
                  <Code source={s.code} language={s.lang === 'code' ? undefined : s.lang} />
                </Box>
                <Box
                  key={`bar-${s.index}`}
                  flexDirection="row"
                  marginTop={1}
                  paddingX={1}
                  gap={1}
                  backgroundColor={RUBY_DIM}
                >
                  <Button
                    key={`copy-${s.index}`}
                    label={`⧉  copier ${s.lang}`}
                    plain
                    onPress={async press => {
                      const r = await $.ui.copy({ text: s.code, surface: press.surface })
                      const lines = s.code.split('\n').length
                      $.ui.toast(
                        r.isCopied
                          ? `Copié : ${s.lang} (${lines} ligne${lines > 1 ? 's' : ''})`
                          : `Copie impossible : ${r.reason}`,
                      )
                    }}
                  >
                    <Text backgroundColor={RUBY} color="white" bold>
                      {face(`⧉  copier ${s.lang}`)}
                    </Text>
                  </Button>
                </Box>
              </Box>
            ),
          )}
        </Box>
      </Box>
    )
  })
}
