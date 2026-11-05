# modcopy: click-to-copy buttons for code blocks in Claude Code

A [Claude Code](https://code.claude.com) mod that sets every code block of
Claude's replies on its own padded band, with a clickable copy button right
under it, in the terminal:

```
  ┌ grey band ─────────────────────────┐
  │                                    │
  │   SELECT id, username              │
  │   FROM users;                      │
  │                                    │
  └────────────────────────────────────┘

  ▒▒  ⧉  copier sql  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒   muted ruby bar, ruby button
```

## Why

When you select a long shell command or SQL query with the mouse, the terminal
also copies the line breaks it inserted to wrap the line on screen, which breaks
the command. The button copies the block's source text exactly as Claude wrote
it: no wrap-induced line breaks, `\` continuations intact, and no trailing
newline, so pasting never runs the command by itself.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install copy-code-buttons --marketplace kwop/modcopy
```

Answer `y` to add the marketplace, then pick a scope (the user scope enables it
in all your sessions).

From a shell:

```
claude plugin install copy-code-buttons --marketplace kwop/modcopy
```

In the desktop app, where `/plugin` does not run: click **+** next to the prompt
box, then **Plugins**, **Add marketplace** with `kwop/modcopy`, then
**Add plugin**.

## Requirements

- **Fullscreen rendering** for mouse clicks: run `/tui fullscreen` once
  (`/tui` alone tells you which renderer is active).
- **Mouse reporting** in your terminal. Ghostty, kitty and WezTerm work out of
  the box. In iTerm2, enable *Settings → Profiles → Terminal → Enable mouse
  reporting*, and run `/terminal-setup` so Claude Code may write to the
  clipboard.
- Over SSH, the copy goes through OSC 52, which your local terminal must allow.

## Usage

- Each closed code block is drawn on a padded grey band (your theme's
  `bashMessageBackgroundColor`, the band behind `!` shell commands, so it
  follows light and dark themes), with Claude Code's own syntax highlighting.
- Under each block, after a blank line, a full-width muted ruby bar (`#4A1027`)
  holds the button: `⧉  copier sql`, white on ruby (`#E0115F`). Claude Code
  inverts it under the pointer. The bar has room for more buttons later.
- Click the button: the block lands in your clipboard and a notification
  confirms it (`Copié : sql (2 lignes)`), or tells you why the copy failed.
- The UI labels are in French (`copier`, `Copié`, `Copie impossible`).
- Replies without a code block are left exactly as Claude Code draws them.
- In the desktop app and VS Code the mod does nothing: they already draw code
  blocks with their own copy button.

Without the mod, the built-in `/copy` command opens a picker of the last reply's
code blocks, which also copies the source text.

## How it works

The mod hooks `ui.render` on `AssistantMessage` in the terminal. When a reply
holds closed fenced blocks (```` ``` ```` or `~~~`), it redraws the reply: the
prose as `Markdown` (Claude Code's own renderer), each block as `Code` on its
band, and a `Button` under each one. A press calls `$.ui.copy`, the same path as
`/copy` (`pbcopy`, `wl-copy`/`xclip`/`xsel`, PowerShell `Set-Clipboard`, or
OSC 52 over SSH).

## Limitations

- Replies with code are redrawn by the mod: prose uses Claude Code's markdown
  renderer, but a future Claude Code release that changes how replies look will
  not be mirrored exactly in those replies.
- A block that is still streaming is drawn as plain markdown until its closing
  fence arrives; it then gets its band and button.
- Summarised reply rows are left untouched.
- The mouse pointer does not turn into a hand over the button: the mod API has
  no way to set the terminal's pointer shape.

## Development

```
claude plugin test .
claude plugin validate .
```

`claude --plugin-dir .` starts a session with your local copy loaded.

## License

[MIT](LICENSE)
