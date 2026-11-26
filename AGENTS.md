# Codex instructions for Multi Light Edit

## Product goal
Build a Foundry-native mass editor for selected Ambient Lights. Its UI uses a dark charcoal surface, warm gold accents, and three classic incandescent bulbs as the Lighting control icon. It supports German and English through Foundry localization files.

## Compatibility
- Target Foundry VTT v14 first; manifest verified against 14.370.
- Use public Foundry APIs and hooks whenever possible.
- Module ID and folder name are `multi-light-edit`.

## Selection and scope
- Use Foundry's normal selected `canvas.lighting.placeables` and preserve the core Ctrl-click selection behavior.
- Only update selected AmbientLight documents that the current user can modify.
- Never update Token lights, Tiles, Walls, Sounds, or Scene darkness.

## Live edit behavior
- Moving a slider or changing a supported form control queues a throttled live update.
- Release/change flushes the latest value immediately.
- Keep one bottom save button which flushes pending writes and verifies saved values.
- Do not add per-property change checkboxes or an Apply button.
- Only changed paths are sent. Untouched values for each selected light must remain intact, including when selected lights have mixed starting values.
- Batch updates through the active Scene's `updateEmbeddedDocuments("AmbientLight", updates)`.

## Darkness Activation Range — critical
- Foundry v14 stores the interval in `config.darkness.min` and `config.darkness.max`.
- `min` means the scene-darkness value from which the light becomes active.
- `max` means the scene-darkness value until which the light remains active.
- Values are normalized 0–1: 0 = bright/daylight, 1 = fully dark.
- Example: active from 40% through full darkness is `{min: 0.4, max: 1}`.
- Keep `min <= max`; do not invert these fields or label them as brightness thresholds.
- The top slider is min; its max attribute must equal the current max value.
- The bottom slider is max; its min attribute must equal the current min value.
- Never move the companion slider to the active slider's value. Never swap meanings.
- If either endpoint changes, persist the full min/max pair atomically to every selected AmbientLight.
- Validate the range for every selected light and verify it after saving.

## Localization
- Keep all user-facing strings in both `lang/de.json` and `lang/en.json`.
- Register both languages in `module.json` `languages`.
- Do not hard-code German UI text in JavaScript, except technical log tags.

## UI and verified data fields
- Keep Basic Configuration, Light Animation, and Advanced Options easy to reach.
- Current fields use documented AmbientLight v14 data paths. Verify any additional path against the v14 schema before adding it.
- Animation type options should be read from `CONFIG.Canvas.lightAnimations`, not hard-coded.

## Development workflow
1. Check the v14 API/schema before adding data paths.
2. Keep functions small; handle errors with console diagnostics and localized user notifications.
3. Run `node --check scripts/main.js` and JSON validation before packaging.
4. Update README and testing checklist.
5. Never claim a live Foundry test passed unless actually performed in a Foundry v14 world.


## Interface quality
- Do not add top anchor navigation; keep a simple vertical stack of sections.
- Keep the form vertically scrollable inside a viewport-sized DialogV2 window. The footer/save control remains visible.
- All visible interface text and values must use the Foundry UI font, not monospace.
- Format localized decimal values with comma in German and point in English. Display Darkness as 0–100%, not raw normalized decimals.
