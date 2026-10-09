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

The 93-frame P0014_8254f925 example uses existing exported JoHan, HaWoR,
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
python3 scripts/export_world.py /path/to/selected.npz assets/world
```

Serve this directory over HTTP; browser module imports cannot run from file://.

The optional reference environment adds a 10 cm XY grid, lighting, shadows,
and a wrist-to-plane guide. It is a presentation aid, not reconstructed HOT3D
scene geometry or an estimate of the physical ground plane. Its height is set
below the complete trajectories of the selected methods and stays fixed during
playback; changing the comparison selection can reposition this reference.
The saved hand vertex coordinates are unchanged.

## Real scene context and example selection

The current example spans source frames 1420–1512. It has the smallest mean
first-aligned W-MPJPE (5.2344 mm) among 477 saved, matched JoHan/HaWoR clips in
the existing evaluation export. This explicitly selected low-error example is
not an estimate of average benchmark performance. `scripts/select_world_case.py`
records its selection without changing, re-aligning or smoothing the saved meshes.

The scene is a partial RGB point cloud from existing HaWoR masked DROID-SLAM
inverse depths, using their saved Metric3D metric scale. No new depth or hand
inference is performed. As this static-camera interval contains no saved depth
keyframe, nearby source frames 1364, 1382 and 1588 provide the scene observations.
Dataset camera extrinsics register these observations to the GT world frame;
the scene is **not** an output of JoHan. The recorded-view button uses the dataset
camera at hand-animation frame 46 (source frame 1466).

The exporter reproduces SLAM's resize-and-crop intrinsics, masks moving hands,
rejects depth discontinuities, requires agreement from a second view, and fuses
points into 5 mm voxels. Missing or unreliable surfaces stay absent. Temporal
changes in other scene objects and errors in estimated depth may remain.
Camera registration checked against archived GT meshes has mean/max residual
0.128/0.388 mm; this checks coordinate conversion, not scene reconstruction accuracy.
Only geometry, RGB colours and a source reference image are published. See
`assets/world/scene/scene.json` for exact provenance and `scripts/export_scene.py`
for the conversion. Existing hand vertex arrays are left untouched by scene fusion.
