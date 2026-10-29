# EarthSimulator

Earth-focused fork of [Orbit Foundry](https://github.com/drugsuser/orbit-foundry).
All nine original bodies, N-body gravity, collision physics, solid deformation,
workers, tools, textures and import/export remain. The physics modules are unchanged.

## Camera

- The look-at target follows Earth, independently of the selected inspector body.
- Right drag rotates around Earth; the View tab retains the 20–300% sensitivity control.
- W/S zoom; A/D orbit horizontally; Q/E orbit vertically. Shift accelerates keyboard input.
- Mouse and keys work simultaneously. Left/middle drag also orbit instead of panning away.
- R / C / “К Земле” return to the Earth close-up. F shows the whole system centered on Earth.
- Earth crater inspection is an Earth-relative surface view. Other bodies still have impact reports.
- If Earth is destroyed, deleted or absent from an import, the camera holds its last target;
  it does not attach to another planet. Restoring a world with Earth restores the anchor.
- Earth is identified by its `planet: "earth"` marker, not its editable name or hard-coded ID.
- Saves and sensitivity use separate `earth-simulator-*` localStorage keys, so this fork
  does not overwrite Orbit Foundry data on the same GitHub Pages origin.
- JSON world format remains `orbit-foundry`, version 1, for compatibility. Imported camera
  follow targets cannot override the Earth anchor.

## Object creation and planet list

- Only Earth appears in planet-selection lists; all nine original bodies remain simulated.
- New objects are placed on a camera-facing plane through Earth, avoiding the old world-XY ray intersection singularity at side views. The `spawnZ` control offsets this plane from Earth along world Z (AU).
- Launch drags and trajectory previews share the same frozen 3D creation plane. Spawned objects retain its actual Z coordinate.
- The default is a small asteroid with Earth-relative launch velocity. Circular-orbit creation uses Earth, not the last spawned object, as its reference.
- The hover outline shows the new object size and turns red for physical overlap. Overlapping bodies are rejected instead of silently relocated.

## Earth appearance

- Larger default framing (zoom only; Earth mass, radius, gravity and collision geometry are unchanged).
- 4K day map and 2K cloud alpha map, locally bundled and derived from credited Solar System Scope sources.
- Dielectric PBR surface: ocean mask controls water/land roughness, water-like IOR 1.333, reduced normal-map strength, subtle cloud coverage shading, and night-only city lights.
- Separate thin cloud layer (~11 km for the physical Earth radius) and a lightweight view/Sun-angle atmosphere approximation, not a full scattering solver or weather model.
- Near-black background `#04060b` and a small star-visibility lift. No bloom, ray marching, new shadow maps or increased star count.

## Run locally

```sh
python3 -m http.server 8038
# Open http://localhost:8038
```

No build step. Serve over HTTP so ES modules and the mesh worker can load.

## Tests

```sh
node tests/physics-budget.cjs
BASE_URL=http://127.0.0.1:8038/ node tests/browser-smoke.cjs
BASE_URL=http://127.0.0.1:8038/ node tests/navigation-smoke.cjs
BASE_URL=http://127.0.0.1:8038/ node tests/spawn-smoke.cjs
BASE_URL=http://127.0.0.1:8038/ node tests/visual-smoke.cjs
```

Browser tests require Playwright and Chromium (`CHROMIUM_PATH` may override its location).
The upstream full mechanics guide is preserved in [ORBIT_FOUNDRY_README.md](ORBIT_FOUNDRY_README.md);
its free-flight camera descriptions are superseded by the Earth camera rules above.
See [ASSET_CREDITS.md](ASSET_CREDITS.md) and the retained Three.js license for asset credits.
