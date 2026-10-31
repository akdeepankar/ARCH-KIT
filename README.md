# ArchKit — Residential Studio

A residential design studio with a shared 2D/3D project model and Muse Spark room planning.

## Local development

Use Node.js 24 or newer, then run:

```sh
npm ci
npm run dev
```

The development server prints its local URL. The editor's projects autosave in browser storage.

## Build and tests

```sh
npm run build
node tests/model.test.mjs
node tests/spark.test.mjs
```

The app uses the Sites Vinext/Cloudflare Worker integration. Production output is in `dist/server` and `dist/client`.

## Muse Spark

Configure `MODEL_API_KEY` as a **server secret** in Sites, then deploy the saved version. The key is read only by the Worker and is never embedded in browser code. The assistant uses the official `https://api.meta.ai/v1/responses` endpoint with `muse-spark-1.3`.

The assistant can inspect layouts, plan or edit rooms, calculate areas, and switch views. Valid room edits are applied as one undoable change. All geometry remains in feet internally; metric user requests are converted before edits. Overlaps, setback violations, unknown IDs, and invalid dimensions are rejected. Changes made manually while a request is running prevent that response from overwriting the newer project.

This is an early residential design tool; the assistant does not verify building codes or structural safety.

## Creative architecture workspace

The assistant's Visualize tab uses `muse-spark-1.3` to interpret canonical project geometry and a clean all-floor PNG, then `muse-image-1.0` through Meta's documented `/v1/images/edits` endpoint to render three independent concepts. A two-worker client queue limits concurrent image requests. `Generate 3 More` retains the original batch's project snapshot and requirements and appends a new batch. Refinements and alternate views attach the saved parent image alongside the plan. Interiors attach the selected room's dimensions and openings.

Images, references, batch settings, parent relationships, and selected concepts are stored in the Sites `BUCKET` R2 binding, scoped by authenticated user and project ID. Images are served through authenticated same-origin endpoints; temporary provider URLs are not retained. The original layout remains the geometric source of truth. Concept previews are not measured drawings or validated structures.

All requests requiring `MODEL_API_KEY` run server-side. Routes validate identity, origin, request size, file format, references, project schema, and structured model output. Successful render slots are reused on retry. Partial failures retain successful images. Refreshing the gallery restores saved results; interrupted unfinished slots can be retried.

Service validation: `node tests/creative.test.mjs` covers batch construction, actual Meta request shapes with a deterministic test transport, partial failures, retry/idempotency, authenticated gallery isolation, and queue concurrency. No fake images are used in the application.

Official references:
- https://dev.meta.ai/docs/image-generation
- https://dev.meta.ai/docs/api-reference/images/edit-image
- https://dev.meta.ai/docs/image-understanding

### Image-to-plan and 3D proposals

The From image tab accepts PNG/JPEG/WebP via picker, drag/drop, or pasted image files, up to four references per request. Images are normalized to at most 1600px before upload (input limit 12MB; server asset limit 4MB). An optional two-point known-distance calibration is supplied to Spark.

`server/ai/interpret.ts` validates structured vision output and constructs native rooms, automatic room-boundary walls, independent partitions, hosted openings, and next-floor stairs. The review shows original and editable preview, extracted vs estimated measurements, unknown information, and live layout checks. Room dimensions/names/positions, independent walls, opening positions/dimensions, floors, plot size and setbacks can be corrected. Import requires explicit review and passes through the existing atomic project commit and undo history. Exterior/interior-photo interpretations are labeled conceptual. Only rectangular room footprints are supported; irregular geometry remains an approximation.

Apply to 3D Model uses Spark vision to propose only the renderer's supported roof type, coarse façade palette and parapet height. It lists unsupported visual features, requires confirmation, and leaves room geometry unchanged. Proposals persist in the project gallery; applying a stale proposal is blocked if the current project differs from its source snapshot.

Voice transcription, segmentation masks, and region-selective editing are not enabled. The app uses the verified image-reference editing workflow and never promises that pixels outside a requested edit remain unchanged. Multi-view generations may be visually inconsistent; use the actual 3D Orbit view for geometric accuracy.

Run `node tests/interpret.test.mjs` to check structured extraction, native hosted geometry, estimated dimensions, overlap rejection and supported appearance mapping.

### Floor plans, wall paint, and browser tools

Project Properties includes interior/exterior wall color defaults. Select a room and open **Wall & Exterior Colors** to paint all walls or individual named sides. Interior paint is independent for each face of a shared wall; exterior paint is used only on exposed faces. Room floor/plan fill remains a separate color. Independent walls and exterior features have their own color settings. Hex fields and swatches support exact `#RRGGBB` colors; Reset restores inheritance. Changing a footprint clears its side-specific paints because wall indices change. Colors persist in local saves, JSON imports/exports, snapshots, and GLB materials.

Muse Spark's **Plan & edit** mode uses the same validated actions for all room types and six footprints, floor add/update/select/duplicate/delete, door/window add/update/rehost/duplicate/delete, independent walls, connected stairs, roof/site/boundary settings, exterior features, and wall/exterior colors. It receives the selected room ID and an explicit wall-side table. For example: “Add an office on the first floor,” “Paint the selected room's east wall sage green,” or “Make the exterior #C18F6B.” The existing server-only `MODEL_API_KEY` connection is required. Image generation remains a separate workflow.

When `document.modelContext` is available, the open page registers 27 WebMCP tools:

| Tool | Purpose |
| --- | --- |
| `get_project` | Current floors, rooms, geometry, paint, wall-side indices, selection, areas and checks |
| `get_floor_plan` | Read a floor by ID |
| `get_room` | Read a room and its named wall sides |
| `list_space_types` | All ten room/space presets and six footprints |
| `apply_floor_edits` | Atomic floor create/update/select/duplicate/delete |
| `apply_room_edits` | Atomic room create/update/move/resize/duplicate/delete on any floor |
| `apply_surface_colors` | Defaults, per-room/per-side wall and exterior paint, floor fill, independent walls and exterior features |
| `apply_exterior_edits` | Balcony, terrace, canopy and sunshade create/update/duplicate/delete |
| `select_studio_element` | Select an element and open its properties |
| `set_view_mode` | Floor Plan, 3D Orbit or Walk |
| `apply_opening_edits` | Door/window add/update/move/rehost/resize/swing/duplicate/delete, with automatic free-wall placement or a shared room connection |
| `apply_wall_edits` | Independent wall endpoints, dimensions, paint, duplication and deletion |
| `apply_stair_edits` | Stair placement, size, next-floor connection, duplication and deletion |
| `update_project_settings` | Name, plot, orientation, setbacks, roof, parapet, façade, boundary/gate, units and precision |
| `manage_project` | New, duplicate, example or JSON import, all retained in undo history |
| `get_studio_capabilities` | Complete tool/schema inventory and supported-model limitations |
| `get_element` | Inspect any room, opening, wall, stair or exterior feature |
| `get_editor_state` | View, drawing tool, panels, ruler, camera/zoom, visibility, save/AI state and visualization history |
| `get_history` | Undo/redo entries and current restore index |
| `navigate_history` | Undo, redo or restore a recorded state |
| `set_editor_options` | Drawing tool/preset, pan/zoom/fit, cutaway, walk eye height, grid, snapping, dimensions and panels |
| `measure_distance` | Plan ruler in feet and meters, optionally displayed |
| `save_studio_project` | Immediate browser-local save |
| `export_studio_project` | Structured JSON or JSON/SVG/PNG/GLB file export |
| `capture_studio_view` | PNG capture of the current Floor Plan, 3D Orbit or Walk viewport |
| `ask_muse_spark` | Natural-language validated edits through the existing server-only Muse Spark connection |
| `manage_visualization` | Generate/refine/retry images from the captured viewport, or select/step through saved images |


Inspect current IDs before editing. Geometry is always feet; wall sides use zero-based indices supplied by the read tools. A color of `null` resets inherited paint (room floor fill requires an actual hex value). Mutations use the normal project validation and undo history. Invalid batches return `success:false` without applying partial changes. Registrations use an abort signal for cleanup; browsers without WebMCP retain all ordinary controls.

Run `node --test tests/*.test.mjs` for regression checks, including shared wall faces, paint inheritance, multi-floor edits, WebMCP registration/validation/cleanup, and the Muse Spark function loop.

Door/window inputs use an exact host `roomId` and either `side` or `toRoomId`. Omit `offset` for automatic placement in a free interval. Doors default to 3 × 7 ft at sill 0; windows default to 3 × 4 ft at sill 3. Both faces of a shared physical wall are checked for conflicting openings. Stairs must connect directly to the floor above. Independent drawn walls do not yet support hosted openings; attach doors/windows to room boundary walls. The capability inventory reports this limitation explicitly.

Browser AI requests reject stale responses if the canonical project changes while the provider is working. Full project replacements remove obsolete optional properties instead of inheriting settings from the previous project. Visualization actions reuse the same tray/queue and server endpoints as the visible UI; they do not alter measured floor-plan geometry.

Muse Spark's tool loop sends the complete function-call/result history in each request with `store:false`; it does not depend on provider response IDs being retained.
