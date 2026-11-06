# DSA Visualizer

Route: `/visualizer/dsa` (sidebar: **DSA Visualizer**, same access rules as the Code Visualizer).
Ported from DevNexus `frontend/src/features/visualizer` with the same layout and behaviour, recoloured for CodeBegun.

## What is live

| Category | Topics | Engine |
| --- | --- | --- |
| Searching | Binary, Linear, Ternary, Jump, Exponential | `UniversalEngine` |
| Sorting | Bubble, Selection, Insertion, Merge, Quick, Heap, Radix, Counting | `UniversalEngine` |
| 24 Core Coding Patterns | 22 pattern workspaces + DFS/BFS | `UniversalEngine`, DFS/BFS use the Web Worker playground (`VisualizerWorkspace`) |

**On hold for redesign:** Data Structures and Bit Manipulation. Their engines are still in `core/` and compile,
but the hub hides them. To bring one back, remove its id from `ON_HOLD_CATEGORIES` in `core/visualizerTopics.ts`.

## Colours

- `core/theme/codebegun-theme.css` holds every colour as a `--viz-*` token (navy `#051D64`, teal `#359AAD`).
- Canvas and SVG drawing read the same tokens through `viz('token')` (`core/theme/vizTheme.ts`). Keep its `FALLBACK` in sync.
- State colours must stay distinct: pointer = teal, evaluate = amber, match = green, discard = red.

## Styling without Tailwind in the LMS

The DevNexus components use Tailwind classes. The LMS has no Tailwind, so
`core/theme/visualizer-scoped.css` is a pre-built, checked-in stylesheet. It is scoped to `.visualizer-theme`
so it cannot affect other LMS pages, and it overrides Bootstrap utilities with the same names, such as `gap-5` and `p-3`.
If you add Tailwind classes or edit `core/theme/base.css`, regenerate it:

```bash
bash client/src/pages/DsaVisualizer/core/theme/tailwind/build.sh
```

## Sound

`core/utils/soundEffects.ts`. Sound is on by default; it used to start muted. The volume is about 3x louder, through a master gain and compressor.
The **Mute / Volume** control is in each workspace header. Preferences are stored per browser
(`codebegun:dsa-visualizer:*` in localStorage).
