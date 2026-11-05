import type { Register } from 'claude-code'

type Block = { lang: string; code: string }

const RUBY = '#E0115F'
const HOVER = 'white'

// Extrait les blocs ``` / ~~~ fermés du markdown source (un bloc non fermé,
// pendant le streaming, est ignoré jusqu'à sa fermeture).
function codeBlocks(markdown: string): Block[] {
  const blocks: Block[] = []
  let open: { fence: string; lang: string; lines: string[] } | null = null

  for (const line of markdown.split('\n')) {
    if (open === null) {
      const start = /^\s{0,3}(`{3,}|~{3,})\s*([\w+#.-]*)/.exec(line)
      if (start) open = { fence: start[1] ?? '```', lang: start[2] ?? '', lines: [] }
      continue
    }
    const close = new RegExp(`^\\s{0,3}${open.fence[0]}{${open.fence.length},}\\s*$`)
    if (close.test(line)) {
      blocks.push({ lang: open.lang || 'code', code: open.lines.join('\n') })
      open = null
    } else {
      open.lines.push(line)
    }
  }
  return blocks
}

export const register: Register = on => {
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (e.props.isSummary) return next(e)

    const blocks = codeBlocks(e.props.text)
    if (blocks.length === 0) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const row = await next(e)

    return (
      <Box flexDirection="column">
        {row}
        <Box flexDirection="row" gap={1}>
          {blocks.map((b, i) => {
            const label = blocks.length === 1 ? `⧉ copier ${b.lang}` : `⧉ ${b.lang} #${i + 1}`
            return (
              <Box key={`copy-box-${i}`}>
                <Button
                  key={`copy-${i}`}
                  label={label}
                  onPress={async press => {
                    const r = await $.ui.copy({ text: b.code, surface: press.surface })
                    const lines = b.code.split('\n').length
                    $.ui.toast(
                      r.isCopied
                        ? `Copié : ${b.lang} #${i + 1} (${lines} ligne${lines > 1 ? 's' : ''})`
                        : `Copie impossible : ${r.reason}`,
                    )
                  }}
                >
                  <Text color={RUBY} bold hover={{ color: HOVER }}>
                    {label}
                  </Text>
                </Button>
              </Box>
            )
          })}
        </Box>
      </Box>
    )
  })
}
