# Profiling worksheet

Keep camera, content, device, backend, viewport, DPR, and interaction constant for before/after measurements. Separate cold startup from warm interaction. Prefer frame time in milliseconds to average FPS alone.

| Question | Experiment | Interpretation limit |
| --- | --- | --- |
| Is pixel work dominant? | Lower drawing-buffer resolution | Suggests fill/shading/bandwidth cost, not a specific shader |
| Are shadows/effects expensive? | Disable one feature and rerun | Features interact; confirm the accepted combination |
| Is CPU animation expensive? | Pause simulation/updates | Different motion can also change GPU work |
| Are draw calls dominant? | Compare representative instanced content | Draw count is not a GPU timing measurement |
| Is startup slow? | Separate transfer, decode, upload, compile, first frame | Network and shader caches affect repeated runs |
| Is memory leaking? | Warm once, repeat mounting/model switches and wait for async completion | Internal caches may plateau above zero; inspect trends |

Record frame-time percentiles when supported, long tasks, calls/triangles, texture dimensions/formats, and memory trends. GPU timers may be unavailable or invalid during disjoint events; report that limitation.

For each resource record its creator, consumers, release event, and whether it is shared/cached. Include loader caches, image bitmaps, object URLs, targets, workers, audio, listeners, and physics worlds when present. Texture disposal does not necessarily close an underlying shared ImageBitmap; close it only after its last consumer releases it.

Accept changes when the metric improves beyond noise and required appearance/interaction still passes. Attach comparable screenshots when changing quality. Give adaptive quality transitions hysteresis to prevent oscillation. Do not impose universal FPS, triangle count, or DPR limits without product/device context.
