# Multi Light Edit

**Multi Light Edit** is a small quality-of-life module for Foundry Virtual Tabletop. It makes it easier to edit multiple Ambient Lights at once instead of opening every light individually.

Select the lights you want to change, open Multi Light Edit from the Lighting controls, and adjust their settings in one place. Changes are applied live, so you can see the results directly on your scene.

The interface is available in **English and German** and follows the language selected in Foundry.

## What can you do with it?

Multi Light Edit brings the most important Ambient Light settings together in one window:

- Adjust bright and dim light radius.
- Change light opacity.
- Set the Darkness Activation Range.
- Change animation type, speed, and intensity.
- Access advanced lighting options without opening each light separately.

The goal is to make working with large numbers of lights faster and less repetitive.

## Editing multiple lights

Multi Light Edit uses Foundry's normal Ambient Light selection.

You can select individual lights or use Foundry's Ctrl-click selection to build a group. Once you open the editor, it shows how many lights are selected.

Move a slider or change a setting, and that value is applied to all selected lights immediately.

You do not need to activate separate checkboxes for individual properties. Only settings you actually change are applied. Everything you leave untouched keeps its original value.

The **Save Changes** button at the bottom provides a final save and verification step. Changes are already saved live, so closing the window does not undo them.

## Available settings

### Basic Configuration

- **Bright Radius:** Controls the range of bright light.
- **Dim Radius:** Controls the range of dim light.
- **Light Opacity:** Adjusts the opacity of the emitted light.
- **Darkness Activation Range:** Determines at which scene darkness levels the light is active.

### Light Animation

- Animation type
- Animation speed
- Animation intensity
- Reverse animation direction

### Advanced Options

For more detailed adjustments, the editor also provides:

- Wall and surface constraints
- Vision
- Darkness source
- Light color
- Coloration
- Luminosity
- Contrast
- Saturation
- Attenuation
- Shadows
- Priority
- Emission angle
- Rotation
- Elevation

## Understanding the Darkness Activation Range

Foundry uses two values to determine when an Ambient Light is active.

Both values range from `0` to `1`:

- `0` represents full daylight.
- `1` represents complete darkness.

The two sliders control the lower and upper boundaries of the activation range.

- **Minimum (`config.darkness.min`):** The darkness level at which the light becomes active.
- **Maximum (`config.darkness.max`):** The darkness level up to which the light remains active.

The minimum must never be higher than the maximum.

For example, a light that should turn on at 10% darkness and remain active until 80% darkness uses:

```js
config.darkness.min = 0.10;
config.darkness.max = 0.80;
```

The two sliders can be adjusted independently, but they always maintain a valid range. Moving one slider beyond the other adjusts the available range without allowing an invalid interval.

## Working with different light settings

When you select several lights with different settings, the editor initially uses the first selected light as its reference.

This does not mean that all other settings are automatically overwritten.

Only properties you actually change are applied to the selected lights. All untouched properties retain their individual values.

This makes it possible to adjust one aspect of a group of lights without accidentally changing everything else.

## Installation

1. Download the latest Multi Light Edit ZIP.
2. Extract the archive.
3. Copy the `multi-light-edit` folder into your Foundry user data directory:

   `Data/modules/`

4. Make sure `module.json` is directly inside the `multi-light-edit` folder.
5. Start Foundry and open **Manage Modules**.
6. Enable **Multi Light Edit**.
7. Open a scene and activate the Lighting controls.
8. Select one or more Ambient Lights and click the Multi Light Edit icon.

## Language Support

Multi Light Edit currently supports:

- English
- German

The module automatically follows the language selected in Foundry. There is no separate language setting to configure.

Translation files are located in:

- `lang/en.json`
- `lang/de.json`

## Current Version

**Version 0.2.0-alpha.3**

This version includes:

- The redesigned dark interface with warm gold accents.
- Multi-light editing through Foundry's Lighting controls.
- Live updates for changed properties.
- A final save and verification button.
- English and German language support.
- Improved Darkness Activation Range controls.
- A vertically scrollable editor window.
- A fixed save button at the bottom of the window.

## Compatibility

- Foundry Virtual Tabletop v14
- Ambient Lights in the currently active scene

The module does not edit Token Lights, Tiles, Walls, Sounds, or the scene's global darkness setting.

Only Ambient Lights that the current user is allowed to update are included.

## Important Notes

Multi Light Edit is still an alpha release.

The module has been checked for basic code and packaging issues, but it has not yet been fully tested in every Foundry setup.

Before using it to change a large number of lights in an existing game, it is recommended to test it in a separate scene first.

Feedback and bug reports are welcome. The goal is to keep the module simple, predictable, and useful for everyday Foundry game preparation.



<img width="3409" height="1403" alt="Capture" src="https://github.com/user-attachments/assets/bf908e99-b468-422f-9188-8e43808baea1" />
