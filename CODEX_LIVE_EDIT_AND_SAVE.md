# Codex task: live editing with a final save button

## User requirement

The user does not want a separate "Ändern" checkbox or per-property apply control. Moving a slider must immediately change the selected Ambient Lights. Keep exactly one clear bottom action named **"Änderungen speichern"** as a final flush and persisted-value verification step.

## Intended behavior in alpha.3

- Slider movement queues a throttled live write to the selected AmbientLight documents while the drag is in progress.
- The slider's `change` event flushes immediately when the user releases it.
- Only properties whose sliders were touched are included. All untouched properties remain unchanged.
- The bottom button flushes any queued values, reads the selected documents back from the Scene collection, verifies every changed field and closes only when verification succeeds.
- There is no separate per-slider "Ändern" checkbox or button.
- The Darkness Activation Range is kept valid: moving the lower bound above the upper bound moves the upper bound with it, and vice versa.
- Updates are restricted to the AmbientLight document IDs captured when the editor opened, on the same Scene.

## Required verification

1. Confirm the live update flow works in Foundry VTT v14, including when moving the Darkness Activation Range sliders.
2. Confirm `config.darkness.min/max` persist as normalized numbers from 0 to 1 and change the light activation behavior at scene darkness values inside/outside the range.
3. Confirm Bright, Dim, alpha, animation speed and animation intensity update immediately.
4. Confirm a failure leaves the final save button available for retry and does not show a false success message.
5. Confirm the final save action verifies values read back from the Scene collection.
6. Confirm the dialog reports the count and IDs it actually updates; no unexplained selected/updated count discrepancy.
7. Confirm moving one slider does not overwrite other untouched properties.
8. Confirm pressing the final save button with no edits is harmless.
9. Run `node --check scripts/main.js` and update README and test checklist.

Do not implement a separate apply toggle per property. Do not add a second top-level apply button. Do not modify scene darkness itself.
