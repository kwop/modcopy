# modcopy: click-to-copy buttons for code blocks in Claude Code

A [Claude Code](https://code.claude.com) mod that adds a clickable copy button
under every code block in Claude's replies, right in the terminal:

```
[ ⧉ bash #1 ]  [ ⧉ sql #2 ]
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

- One code block in a reply: `[ ⧉ copier bash ]`. Several: one numbered button
  per block, in order (`⧉ bash #1`, `⧉ sql #2`, ...).
- Click a button: the block lands in your clipboard and a notification confirms
  it (`Copié : bash #1 (3 lignes)`), or tells you why the copy failed.
- Buttons are drawn in ruby (`#E0115F`) and turn white under the pointer.
- The UI labels are in French (`copier`, `Copié`, `Copie impossible`).

Without the mod, the built-in `/copy` command opens a picker of the last reply's
code blocks, which also copies the source text.

## How it works

The mod hooks `ui.render` on `AssistantMessage`: it finds the closed fenced
blocks (```` ``` ```` or `~~~`) in the reply's markdown, keeps Claude Code's own
drawing of the reply, and adds one `Button` per block underneath. A press calls
`$.ui.copy`, the same path as `/copy` (`pbcopy`, `wl-copy`/`xclip`/`xsel`,
PowerShell `Set-Clipboard`, or OSC 52 over SSH).

## Limitations

- Buttons sit at the bottom of the reply, numbered in order, not directly under
  each block.
- A block that is still streaming gets its button once its closing fence
  arrives.
- Summarised reply rows are left untouched.

## Development

```
claude plugin test .
claude plugin validate .
```

`claude --plugin-dir .` starts a session with your local copy loaded.

## License

[MIT](LICENSE)
