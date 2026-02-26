# glsleditor

A browser-based GLSL shader editor with a split-pane layout: write vertex and fragment shaders on the left, see the live WebGL output on the right.

## What it does

- Edit vertex and fragment shaders side by side in a syntax-highlighted code editor
- Shaders auto-compile 500ms after your last keystroke, with immediate error feedback
- The WebGL canvas renders in real time with built-in uniforms for time, resolution, and mouse position
- State (title + shaders) persists automatically via `localStorage`

## Features

- **Dual-pane editor** — resizable split between vertex and fragment shader panels
- **Auto-compile** — shaders recompile automatically as you type
- **Built-in uniforms** — `u_time`, `u_resolution`, `u_mouse` available in every fragment shader
- **Error display** — GLSL compile errors shown inline below the editor
- **LocalStorage persistence** — your work is saved automatically in the browser
- **Reset** button to restore the default animated gradient shader
- Syntax highlighting via CodeMirror 5 (Monokai theme)

## Default shader

The built-in fragment shader renders a smooth animated RGB gradient using `sin(u_time + ...)` across both axes.

## Tech Stack

- **WebGL** (via `canvas.getContext('webgl')`)
- **CodeMirror 5** — editor with C-like syntax highlighting
- **Vanilla JavaScript / HTML / CSS** — no build step required

## How to Run

Open `index.html` directly in any WebGL-capable browser — no server or build step needed.

```bash
open index.html
```

## License

Apache License 2.0 — see [LICENSE](LICENSE) for details.
