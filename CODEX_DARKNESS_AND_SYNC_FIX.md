> **Historical alpha.2 task:** This document records the first Darkness Activation Range investigation. The current alpha.3 interaction model is defined in `CODEX_LIVE_EDIT_AND_SAVE.md`. Do not restore per-slider `Ändern` checkboxes or the old one-shot-only apply behavior.

# Codex task: verify Darkness Activation Range and core-sheet synchronization

## Context from the live test

The user tested Multi Light Edit in Foundry VTT v14 (14.370) with DSA5 active. The provided screenshot shows:

- The Multi Light Edit dialog reports 73 selected light sources.
- The Darkness sliders show a range of 0% to 30%.
- The normal Ambient Light configuration window is also open and still shows `Between 0 and 1` for Darkness Activation Range.
- The console includes `Es wurde keine Eigenschaft zur Änderung aktiviert.`
- The console also includes notifications saying `82 Lichtquellen aktualisiert.` This does not match the dialog's count of 73 and must be investigated. Never report a count that differs from the document IDs actually sent to the update call.

The first Alpha required a separate `Ändern` checkbox next to each slider. This was confusing. The current alpha.2 branch changes this: moving a slider automatically marks that field as dirty. Review this behavior and keep it.

## Required debugging and fixes

1. Read `AGENTS.md`, `README.md`, and the current `scripts/main.js` before changing anything.
2. Confirm the actual installed module code matches this project. Check for duplicate module folders or stale copies. The runtime's updated count must equal the exact list of selected AmbientLight document IDs captured when the editor opens.
3. Confirm the persisted Foundry v14 data structure. The AmbientLight document has `config: LightData`; `LightData` contains a `darkness` schema. Darkness values are normalized numbers from 0 to 1, stored at:
   - `config.darkness.min`
   - `config.darkness.max`
4. Confirm the update operation really writes those values to the current Scene's AmbientLight documents. After `updateEmbeddedDocuments("AmbientLight", updates)`, re-read each selected document from the Scene collection and compare the persisted values with the values submitted. If any mismatch occurs, log the document id, field path, expected value, and actual value, and do not show a success notification.
5. Verify that slider input is the only trigger required to include a field in the update. Do not reintroduce a separate checkbox. Unmoved fields must remain untouched for every selected light.
6. Reject invalid Darkness ranges (`min < 0`, `max > 1`, or `min > max`) before sending any updates. Do not silently clamp or reverse the user's values.
7. Confirm `config.animation.speed` and `config.animation.intensity` are valid v14 fields and that they persist in the same way.
8. When a successful mass update affects a light whose normal `AmbientLightConfig` window is already open, refresh that sheet so its Basic Configuration, Light Animation, and Advanced Options tabs show the saved values. Do not silently discard unsaved edits in an open sheet; detect them or show a notice telling the user to reopen the sheet.
9. Add diagnostic logging for the exact selected ID count and update payload paths, but do not dump entire scene data.
10. Add a regression test or a clearly documented manual test for the Darkness Activation Range:
    - Set `min = 0.3` and `max = 1.0` on one test light.
    - Confirm the document stores exactly `0.3` and `1.0`.
    - At scene darkness 0.2 the light should be inactive; at 0.5 it should be active; at 1.0 it should still be active.
    - Then set `min = 0` and `max = 0.3`; confirm it is active only within that interval.
11. Do not change scene darkness itself. Only update AmbientLight documents.
12. Run `node --check scripts/main.js` and update README/testing checklist.

## UI follow-up requested by the user

The user wants the mass editor's settings to feel like the normal Foundry Ambient Light configuration, with the three core sections readily available:

- Basic Configuration: Bright, Dim, color/light appearance, and Darkness Activation Range.
- Light Animation: animation type, animation speed, reverse direction (if supported), and animation intensity.
- Advanced Options: the existing relevant advanced light settings, such as wall constraint, vision, emission angle/rotation, darkness-source behavior, luminosity, contrast, saturation, shadows, and other properties that the v14 sheet actually exposes.

Before implementing each control, inspect the live v14 AmbientLightConfig form/template and its schema to establish the exact property path, input type, and valid range. Do not invent fields or assume all options are under `config`; some AmbientLight settings live at the document root. Preserve the "only fields that the user touched get written" rule.

## Required Codex report

At completion, state:

- Which exact files changed.
- Which data paths were verified against Foundry v14.
- Whether the 73-versus-82 count discrepancy was explained and fixed.
- Whether persisted values were read back successfully.
- What still needs a live Foundry test.
