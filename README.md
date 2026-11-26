# Multi Light Edit

A bilingual Foundry Virtual Tabletop v14 mass editor for selected Ambient Lights.

## Version 0.2.0-alpha.2

### Interface

- Dark charcoal interface with warm gold accents, based on the supplied new-menu direction.
- Three classic incandescent bulbs in the Lighting scene controls.
- Section navigation for Basic Configuration, Light Animation, and Advanced Options.
- Responsive Darkness Activation Range panel with an explanatory active-range display.
- English and German translations loaded from the Foundry user's active language.

### Editing behavior

- Uses Foundry's normal Ambient Light selection. Ctrl-click multi-selection remains untouched.
- Slider and form changes are applied live to all selected, updateable Ambient Lights.
- Only changed properties are sent; untouched properties are never overwritten.
- The single bottom **Save changes / Änderungen speichern** button flushes pending writes and verifies persisted values before closing.
- Changes are already saved live; closing the window does not roll them back.

### Supported properties

**Basic Configuration**

- Bright radius: `config.bright`
- Dim radius: `config.dim`
- Light opacity: `config.alpha`
- Darkness activation range: `config.darkness.min` and `config.darkness.max`

**Light Animation**

- Animation type: `config.animation.type`
- Animation speed: `config.animation.speed`
- Animation intensity: `config.animation.intensity`
- Reverse direction: `config.animation.reverse`

**Advanced Options**

- Constrained by walls: `walls`
- Provides vision: `vision`
- Darkness source: `config.negative`
- Light color: `config.color`
- Coloration: `config.coloration`
- Luminosity: `config.luminosity`
- Contrast: `config.contrast`
- Saturation: `config.saturation`
- Attenuation: `config.attenuation`
- Shadows: `config.shadows`
- Priority: `config.priority`
- Emission angle: `config.angle`
- Rotation: `rotation`
- Elevation: `elevation`

## Darkness range semantics

Foundry stores the Darkness Activation Range as normalized values between 0 and 1:

- `config.darkness.min` = darkness level at which the light becomes active.
- `config.darkness.max` = darkness level up to which the light remains active.
- `0` means bright/daylight; `1` means fully dark.

Example: a light that should switch on at 40% darkness and remain active until full darkness uses `min = 0.40` and `max = 1.00`.

The editor keeps the valid range `min <= max`. When one handle crosses the other, the companion handle follows to preserve a valid Foundry range. Moving the start threshold down toward daylight is otherwise unrestricted.

## Installation

1. Extract the ZIP.
2. Copy the `multi-light-edit` folder into your Foundry user data `Data/modules/` directory.
3. Confirm `module.json` is directly inside `Data/modules/multi-light-edit/`.
4. Enable **Multi Light Edit** in Manage Modules.
5. Open a scene, activate Lighting controls, select one or more Ambient Lights, and click the three-bulb tool.

## Language support

The module manifest registers `lang/de.json` and `lang/en.json`. Foundry loads the translation matching the user's active application language. No separate module language setting is required.

## Testing checklist

- [ ] Module loads without errors on Foundry v14.
- [ ] Language follows Foundry UI locale in German and English.
- [ ] Three-bulb tool appears in Lighting controls for a GM.
- [ ] Selection count matches the controlled Ambient Light document IDs.
- [ ] Basic sliders update selected lights live.
- [ ] With darkness range set to 0.40–1.00, lights activate from 40% scene darkness through full darkness.
- [ ] Lowering the start threshold toward 0 remains possible while max is 1.00.
- [ ] Increasing the start threshold beyond the current max moves max to keep the interval valid.
- [ ] Animation type, speed, intensity, and reverse direction update live.
- [ ] Advanced options update only the documented Ambient Light fields.
- [ ] Untouched properties remain unchanged.
- [ ] Bottom save button flushes queued writes and verifies persisted document values.
- [ ] A failed update is reported and can be retried without false success.

## Scope and safety

- The editor operates only on selected `AmbientLight` documents in the active scene that the current user can update.
- It does not edit Token lights, Tiles, Walls, Sounds, or Scene darkness.
- Values shown initially come from the first selected Ambient Light. If selected lights have mixed values, changing a control applies that one value to all selected lights; untouched controls preserve each light's own value.
- This alpha has not been run in a live Foundry world by the build environment. Verify it in a test scene before bulk-editing a production scene.


## Darkness Activation Range (alpha.2)

The Darkness controls follow Foundry's native `Between min and max` interval exactly:

- The **upper slider** writes `config.darkness.min` (lower numeric boundary).
- The **lower slider** writes `config.darkness.max` (upper numeric boundary).
- The minimum slider is dynamically capped at the current maximum.
- The maximum slider is dynamically floored at the current minimum.
- Moving either slider sends both interval endpoints together to all selected Ambient Lights.
- Example: `0.10` to `0.80` means active from 10% through 80% scene darkness.

The main editor has no top navigation bar. Its content area scrolls vertically while the bottom save button remains available. Numeric values are formatted using the active Foundry language.
## 0.2.0-alpha.3

- Fix DialogV2 content sizing so the editor body scrolls vertically when it exceeds the window height.
- Keep the Save button fixed at the bottom while the editor body scrolls.
- No lighting controls, labels, translations, or Darkness Activation Range behavior changed in this release.
