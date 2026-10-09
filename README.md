# JoHan project page

Standalone project website for **Video-Conditioned Generative Joint 2D–3D Hand Motion Recovery**.

The site is plain HTML, CSS and JavaScript. GitHub Pages serves the repository root from `main`; `.nojekyll` disables Jekyll processing.

## Local preview

```sh
python3 -m http.server 8765
```

Open http://localhost:8765/.

## Updating content

- `index.html`: authors, descriptions, metrics and citation.
- `style.css`: responsive layout and visual styling.
- `script.js`: accessible dataset tabs, video playback and citation copying.
- `assets/`: paper, existing research figures and H.264 video demonstrations.

Research figures were exported from the current manuscript. Videos were extracted from the project's existing presentation and transcoded for browser playback; they are not newly generated experimental results. The paper is the supplied preprint PDF. Code and model weights are not part of this website repository.

No analytics or external frontend dependencies are used.
