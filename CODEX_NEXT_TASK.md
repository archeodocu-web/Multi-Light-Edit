# Multi Light Edit — Codex next task (0.2.0-alpha.2)

Read `AGENTS.md` and `README.md` before modifying anything.

## Blocking user-reported defect: Darkness Activation Range

The Darkness UI must behave exactly like Foundry's native `Between min and max` range.

- First/top slider is **Minimum / lower numeric bound** and writes `config.darkness.min`.
- Second/bottom slider is **Maximum / upper numeric bound** and writes `config.darkness.max`.
- Both values are normalized numbers from 0 to 1. 0 = bright/daylight; 1 = fully dark.
- Valid range requires `min <= max`.
- The top slider's HTML max must always equal the bottom slider's current value.
- The bottom slider's HTML min must always equal the top slider's current value.
- Do NOT move the companion slider to the dragged value. Do NOT swap labels or meanings.
- On either endpoint change, persist the complete pair `{min, max}` together to every selected AmbientLight.
- Example: min 0.10 / max 0.80 means light active only between 10% and 80% scene darkness.

## UI fixes in this build

- Removed the broken top navigation bar; keep Basic, Darkness, Animation, and Advanced sections in one vertical scroll flow.
- The DialogV2 window has a defined viewport height. `.window-content`, `.dialog-content`, and `.mle-form` must use flex sizing with `min-height: 0`; only the form body scrolls vertically.
- Bottom save button remains visible.
- Explicitly use Foundry's normal UI font; no monospace/code font for labels or values.
- Format decimal values according to active locale (German comma, English decimal point); Darkness values display as percentages, never raw normalized decimals.

## Test steps

1. Open the editor with exactly one selected light whose Darkness range is 0/1.
2. Set the upper Minimum slider to 0.10. Confirm the lower Maximum slider remains 1.00 and the UI displays 10%.
3. Set the lower Maximum slider to 0.80. Confirm the upper Minimum remains 0.10 and UI reads Between 10% and 80%.
4. Attempt to drag Minimum above 0.80: it must stop at 0.80.
5. Attempt to drag Maximum below 0.10: it must stop at 0.10.
6. Save, inspect `light.toObject().config.darkness`, and confirm `{min:0.1,max:0.8}`.
7. Change scene darkness to 0.05, 0.5, and 0.9. The light should be off, on, off respectively.
8. Repeat with multiple selected lights and verify exact selected document IDs only.
9. Test DE and EN locale formatting.
10. Check vertical scrolling from top to bottom and confirm the save button remains visible.

## Build validation

- Run `node --check scripts/main.js`.
- Validate `module.json`, `package.json`, `lang/de.json`, and `lang/en.json`.
- Check all localization keys exist in both files.
- Do not claim a live Foundry test unless actually performed in the user's world.
