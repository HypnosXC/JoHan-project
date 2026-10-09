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
- `script.js`: sequence selection, video playback controls and citation copying.
- `assets/`: paper, existing research figures and H.264 video demonstrations.

Research figures were exported from the current manuscript. Videos were extracted from the project's existing presentation and transcoded for browser playback; they are not newly generated experimental results. Paper links and the citation point to https://arxiv.org/abs/2610.10512. Code and model weights are not part of this website repository.

No analytics or external frontend dependencies are used.

## Interactive HOT3D world-space viewer

The 116-frame P0002_65085bfc example uses existing exported JoHan, HaWoR,
and ground-truth meshes from the first-aligned world-space evaluation.
Vertex coordinates are preserved in metres, without per-frame recentering.
The JoHan export includes the saved world-motion smoothing used by that evaluation.
Frame labels start at zero; original indices are retained in sequence.json.
Playback rates are display settings, not a claim about recording frame rate.

`world-viewer.js` uses locally vendored Three.js 0.180.0 (MIT license in
`vendor/three/LICENSE`). No external CDN or analytics is required. The binary
assets contain only vertices, wrist positions, and triangle indices; no source
filesystem paths are published. To regenerate from the existing archive:

```sh
python3 scripts/export_world.py /path/to/04_P0002_65085bfc_f01258-01373.npz assets/world
```

Serve this directory over HTTP; browser module imports cannot run from file://.

The optional reference environment adds a 10 cm XY grid, lighting, shadows,
and a wrist-to-plane guide. It is a presentation aid, not reconstructed HOT3D
scene geometry or an estimate of the physical ground plane. Its height is set
below the complete trajectories of the selected methods and stays fixed during
playback; changing the comparison selection can reposition this reference.
The saved hand vertex coordinates are unchanged.
