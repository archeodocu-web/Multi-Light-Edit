const MODULE_ID = "multi-light-edit";
const TOOL_ID = "multi-light-edit";

function localize(key, data = {}) {
  const fullKey = `MLE.${key}`;
  const localized = game.i18n.localize(fullKey);
  const value = localized === fullKey ? key : localized;
  return Object.entries(data).reduce((result, [name, replacement]) => result.replaceAll(`{${name}}`, String(replacement)), value);
}

Hooks.once("init", () => {
  console.info(`${MODULE_ID} | Initializing ${game.modules.get(MODULE_ID)?.title ?? MODULE_ID}`);
});

Hooks.on("getSceneControlButtons", (controls) => {
  const lightingControls = controls.lighting;
  if (!lightingControls?.tools) {
    console.warn(`${MODULE_ID} | Could not find the Lighting scene controls; tool was not added.`);
    return;
  }

  lightingControls.tools[TOOL_ID] = {
    name: TOOL_ID,
    title: localize("ToolTitle"),
    icon: "fa-solid fa-lightbulb mle-three-bulbs",
    order: Object.keys(lightingControls.tools).length,
    button: true,
    visible: game.user.isGM,
    onChange: () => openMultiLightEditor()
  };
});

async function openMultiLightEditor() {
  if (!canvas?.ready || !canvas.lighting || !canvas.scene) {
    ui.notifications.warn(localize("Notifications.SceneNotReady"));
    return;
  }

  const documents = canvas.lighting.placeables
    .filter((placeable) => placeable.controlled)
    .map((placeable) => placeable.document)
    .filter((document) => document?.canUserModify(game.user, "update"));

  if (documents.length === 0) {
    ui.notifications.warn(localize("Notifications.SelectLights"));
    return;
  }

  await MultiLightEditDialog.open(documents);
}

class MultiLightEditDialog {
  static async open(documents) {
    const scene = canvas.scene;
    const first = documents[0].toObject();
    const config = first.config ?? {};
    const darkness = config.darkness ?? { min: 0, max: 1 };
    const normalizedDarkness = normalizeDarknessRange(darkness.min, darkness.max);
    const animation = config.animation ?? {};

    const initial = {
      bright: asNumber(config.bright, 0),
      dim: asNumber(config.dim, 0),
      alpha: asNumber(config.alpha, 1),
      darknessMin: normalizedDarkness.min,
      darknessMax: normalizedDarkness.max,
      animationType: animation.type ?? "",
      animationSpeed: asNumber(animation.speed, 5),
      animationIntensity: asNumber(animation.intensity, 5),
      animationReverse: Boolean(animation.reverse),
      walls: first.walls !== false,
      vision: Boolean(first.vision),
      negative: Boolean(config.negative),
      color: normalizeColor(config.color),
      coloration: asNumber(config.coloration, 0.5),
      luminosity: asNumber(config.luminosity, 0),
      contrast: asNumber(config.contrast, 0),
      saturation: asNumber(config.saturation, 0),
      attenuation: asNumber(config.attenuation, 0.5),
      shadows: asNumber(config.shadows, 0.5),
      priority: asNumber(config.priority, 0),
      angle: asNumber(config.angle, 360),
      rotation: asNumber(first.rotation, 0),
      elevation: asNumber(first.elevation, 0)
    };

    const animationOptions = getAnimationOptions(initial.animationType);
    const session = new MultiLightEditSession(scene, documents);
    const dialog = new foundry.applications.api.DialogV2({
      window: {
        title: localize("ToolTitle"),
        icon: "fa-solid fa-lightbulb",
        classes: ["multi-light-edit-dialog"],
        resizable: true
      },
      position: { width: 980, height: Math.max(520, Math.min(900, Math.floor(window.innerHeight * 0.88))) },
      content: buildDialogContent(documents.length, initial, animationOptions),
      buttons: [
        {
          action: "save",
          label: localize("Buttons.Save"),
          icon: "fa-solid fa-floppy-disk",
          default: true,
          callback: async () => {
            const success = await session.flush({ drain: true });
            if (!success) return false;
            const verified = session.verifySaved();
            if (!verified) return false;

            session.finished = true;
            ui.notifications.info(session.savedCount > 0
              ? localize("Notifications.Saved", { count: session.savedCount })
              : localize("Notifications.NoChanges"));
            return true;
          }
        }
      ],
      close: async () => {
        // Slider and control changes are already live-saved. Flush any final queued value on close.
        if (!session.finished) await session.flush();
      }
    });

    await dialog.render({ force: true });
    configureDialogScrolling(dialog);
    attachControls(dialog.element, session);
  }
}


/**
 * DialogV2 wraps supplied content in its own form. Make every wrapper in that
 * chain a height-constrained flex container so the inner editor can scroll,
 * while the DialogV2 action buttons remain fixed at the bottom.
 */
function configureDialogScrolling(dialog) {
  const root = dialog.element;
  const windowContent = dialog.window?.content ?? root?.querySelector(".window-content");
  const form = dialog.form ?? windowContent?.querySelector("form") ?? root?.querySelector("form");
  const dialogContent = form?.querySelector(".dialog-content")
    ?? windowContent?.querySelector(".dialog-content")
    ?? root?.querySelector(".dialog-content");
  const editor = root?.querySelector(".mle-form");
  const footer = root?.querySelector(".dialog-buttons");

  if (windowContent) {
    Object.assign(windowContent.style, {
      display: "flex",
      flexDirection: "column",
      minHeight: "0",
      height: "100%",
      maxHeight: "100%",
      overflow: "hidden"
    });
  }

  if (form) {
    Object.assign(form.style, {
      display: "flex",
      flex: "1 1 0%",
      flexDirection: "column",
      width: "100%",
      height: "100%",
      minHeight: "0",
      maxHeight: "100%",
      overflow: "hidden"
    });
  }

  if (dialogContent) {
    Object.assign(dialogContent.style, {
      display: "flex",
      flex: "1 1 0%",
      flexDirection: "column",
      height: "0",
      minHeight: "0",
      maxHeight: "100%",
      overflow: "hidden"
    });
  }

  if (editor) {
    Object.assign(editor.style, {
      display: "flex",
      flex: "1 1 auto",
      flexDirection: "column",
      height: "100%",
      minHeight: "0",
      maxHeight: "100%",
      overflowX: "hidden",
      overflowY: "auto",
      overscrollBehaviorY: "contain",
      scrollbarGutter: "stable"
    });
  }

  if (footer) footer.style.flex = "0 0 auto";
}

class MultiLightEditSession {
  constructor(scene, documents) {
    this.sceneId = scene.id;
    this.documentIds = [...new Set(documents.map((document) => document.id))];
    this.pending = new Map();
    this.savedValues = new Map();
    this.timer = null;
    this.flushPromise = null;
    this.finished = false;
    this.savedCount = 0;
    this.statusElement = null;
  }

  bindStatus(root) {
    this.statusElement = root.querySelector("[data-mle-status]");
  }

  setStatus(message, state = "idle") {
    if (!this.statusElement) return;
    this.statusElement.textContent = message;
    this.statusElement.dataset.state = state;
  }

  queue(changes) {
    for (const [path, value] of Object.entries(changes)) this.pending.set(path, value);
    this.setStatus(localize("Status.Pending"), "pending");

    // Throttle live writes while a slider is moving; release handlers flush the last value immediately.
    if (this.timer === null) {
      this.timer = setTimeout(() => {
        this.timer = null;
        this.flush().catch((error) => {
          console.error(`${MODULE_ID} | Live update failed`, error);
          this.setStatus(localize("Status.Error"), "error");
        });
      }, 140);
    }
  }

  async flush({ drain = false } = {}) {
    clearTimeout(this.timer);
    this.timer = null;

    if (this.flushPromise) {
      const inFlightSuccess = await this.flushPromise;
      if (!inFlightSuccess) return false;
      if (drain && this.pending.size > 0) return this.flush({ drain: true });
      return this.pending.size === 0;
    }
    if (this.pending.size === 0) return true;

    const batch = Object.fromEntries(this.pending.entries());
    this.pending.clear();
    this.flushPromise = persistLightChanges(this.sceneId, this.documentIds, batch);

    let success = false;
    try {
      success = await this.flushPromise;
    } finally {
      this.flushPromise = null;
    }

    if (!success) {
      for (const [path, value] of Object.entries(batch)) {
        if (!this.pending.has(path)) this.pending.set(path, value);
      }
      this.setStatus(localize("Status.Error"), "error");
      return false;
    }

    for (const [path, value] of Object.entries(batch)) this.savedValues.set(path, value);
    this.savedCount = this.documentIds.length;
    this.setStatus(localize("Status.Saved"), "saved");

    if (drain && this.pending.size > 0) return this.flush({ drain: true });
    if (this.pending.size > 0 && this.timer === null) {
      this.timer = setTimeout(() => {
        this.timer = null;
        this.flush().catch((error) => {
          console.error(`${MODULE_ID} | Live update failed`, error);
          this.setStatus(localize("Status.Error"), "error");
        });
      }, 140);
    }
    return true;
  }

  verifySaved() {
    const scene = game.scenes.get(this.sceneId);
    if (!scene) {
      ui.notifications.error(localize("Notifications.SceneMissing"));
      return false;
    }

    const mismatches = [];
    for (const id of this.documentIds) {
      const document = scene.lights.get(id);
      if (!document) {
        mismatches.push({ id, reason: "Light source not found" });
        continue;
      }
      const source = document.toObject();
      for (const [path, expected] of this.savedValues.entries()) {
        const actual = foundry.utils.getProperty(source, path);
        if (!valuesMatch(actual, expected)) mismatches.push({ id, path, expected, actual });
      }
    }

    if (mismatches.length) {
      console.error(`${MODULE_ID} | Final save verification failed`, mismatches);
      this.setStatus(localize("Status.VerifyError"), "error");
      ui.notifications.error(localize("Notifications.VerifyError"));
      return false;
    }
    return true;
  }
}

function buildDialogContent(count, values, animationOptions) {
  const countLabel = count === 1 ? localize("Summary.One") : localize("Summary.Many", { count });
  const minPercent = Math.round(values.darknessMin * 100);
  const maxPercent = Math.round(values.darknessMax * 100);

  return `
    <div class="mle-form">
      <div class="mle-summary">
        <span class="mle-summary-icon" aria-hidden="true"><i class="fa-solid fa-lightbulb"></i></span>
        <div class="mle-summary-copy">
          <strong>${escapeHTML(countLabel)}</strong>
          <p>${escapeHTML(localize("Summary.Description"))}</p>
        </div>
        <span class="mle-live-pill"><span></span>${escapeHTML(localize("Summary.Live"))}</span>
      </div>

      <section class="mle-section" id="mle-basic">
        <h3><i class="fa-solid fa-sun"></i>${escapeHTML(localize("Sections.Light"))}</h3>
        <div class="mle-slider-grid">
          ${sliderRow("bright", localize("Fields.Bright"), values.bright, 0, 60, 0.5, localize("Help.Bright"), "m", 1)}
          ${sliderRow("dim", localize("Fields.Dim"), values.dim, 0, 60, 0.5, localize("Help.Dim"), "m", 1)}
          ${sliderRow("alpha", localize("Fields.Alpha"), values.alpha, 0, 1, 0.01, localize("Help.Alpha"), "%", 2)}
        </div>
      </section>

      <section class="mle-section mle-darkness-section" id="mle-darkness">
        <div class="mle-darkness-main">
          <h3><i class="fa-solid fa-moon"></i>${escapeHTML(localize("Sections.Darkness"))}</h3>
          <p class="mle-section-intro">${escapeHTML(localize("Darkness.Intro"))}</p>
          <div class="mle-slider-grid mle-darkness-controls">
            ${sliderRow("darknessMin", localize("Fields.DarknessMin"), values.darknessMin, 0, values.darknessMax, 0.01, localize("Help.DarknessMin"), "%", 0)}
            ${sliderRow("darknessMax", localize("Fields.DarknessMax"), values.darknessMax, values.darknessMin, 1, 0.01, localize("Help.DarknessMax"), "%", 0)}
          </div>
        </div>
        <aside class="mle-darkness-info">
          <h4><i class="fa-solid fa-circle-info"></i>${escapeHTML(localize("Darkness.Between"))}</h4>
          <p>${escapeHTML(localize("Darkness.Explanation"))}</p>
          <div class="mle-range-labels">
            <span>0 %<small>${escapeHTML(localize("Darkness.Bright"))}</small></span>
            <span>100 %<small>${escapeHTML(localize("Darkness.Dark"))}</small></span>
          </div>
          <div class="mle-darkness-track" data-mle-darkness-track style="--mle-from:${minPercent}%;--mle-width:${Math.max(0, maxPercent - minPercent)}%">
            <span class="mle-darkness-active">${escapeHTML(localize("Darkness.ActiveRange"))}</span>
          </div>
          <p class="mle-example" data-mle-darkness-example>${escapeHTML(localize("Darkness.Example", { min: minPercent, max: maxPercent }))}</p>
        </aside>
      </section>

      <section class="mle-section" id="mle-animation">
        <h3><i class="fa-solid fa-wand-magic-sparkles"></i>${escapeHTML(localize("Sections.Animation"))}</h3>
        <div class="mle-field-row mle-select-row">
          <label for="mle-animation-type">${escapeHTML(localize("Fields.AnimationType"))}</label>
          <select id="mle-animation-type" data-mle-path="config.animation.type">
            ${animationOptions}
          </select>
        </div>
        <div class="mle-slider-grid">
          ${sliderRow("animationSpeed", localize("Fields.AnimationSpeed"), values.animationSpeed, 0, 10, 1, localize("Help.AnimationSpeed"), "", 0)}
          ${sliderRow("animationIntensity", localize("Fields.AnimationIntensity"), values.animationIntensity, 1, 10, 1, localize("Help.AnimationIntensity"), "", 0)}
        </div>
        <label class="mle-check-row"><input type="checkbox" data-mle-path="config.animation.reverse" ${values.animationReverse ? "checked" : ""}><span>${escapeHTML(localize("Fields.AnimationReverse"))}</span></label>
      </section>

      <details class="mle-section mle-advanced" id="mle-advanced">
        <summary><span><i class="fa-solid fa-sliders"></i>${escapeHTML(localize("Sections.Advanced"))}</span><i class="fa-solid fa-chevron-down mle-chevron"></i></summary>
        <div class="mle-advanced-content">
          <div class="mle-advanced-grid">
            <label class="mle-check-card"><input type="checkbox" data-mle-path="walls" ${values.walls ? "checked" : ""}><span><strong>${escapeHTML(localize("Fields.Walls"))}</strong><small>${escapeHTML(localize("Help.Walls"))}</small></span></label>
            <label class="mle-check-card"><input type="checkbox" data-mle-path="vision" ${values.vision ? "checked" : ""}><span><strong>${escapeHTML(localize("Fields.Vision"))}</strong><small>${escapeHTML(localize("Help.Vision"))}</small></span></label>
            <label class="mle-check-card"><input type="checkbox" data-mle-path="config.negative" ${values.negative ? "checked" : ""}><span><strong>${escapeHTML(localize("Fields.Negative"))}</strong><small>${escapeHTML(localize("Help.Negative"))}</small></span></label>
            <div class="mle-color-row"><label for="mle-color">${escapeHTML(localize("Fields.Color"))}</label><input type="color" id="mle-color" data-mle-path="config.color" value="${escapeHTML(values.color)}"></div>
            ${sliderRow("coloration", localize("Fields.Coloration"), values.coloration, 0, 1, 0.01, localize("Help.Coloration"), "%", 2, "config.coloration")}
            ${sliderRow("luminosity", localize("Fields.Luminosity"), values.luminosity, -1, 1, 0.01, localize("Help.Luminosity"), "", 2, "config.luminosity")}
            ${sliderRow("contrast", localize("Fields.Contrast"), values.contrast, -1, 1, 0.01, localize("Help.Contrast"), "", 2, "config.contrast")}
            ${sliderRow("saturation", localize("Fields.Saturation"), values.saturation, 0, 1, 0.01, localize("Help.Saturation"), "%", 2, "config.saturation")}
            ${sliderRow("attenuation", localize("Fields.Attenuation"), values.attenuation, 0, 1, 0.01, localize("Help.Attenuation"), "%", 2, "config.attenuation")}
            ${sliderRow("shadows", localize("Fields.Shadows"), values.shadows, 0, 1, 0.01, localize("Help.Shadows"), "%", 2, "config.shadows")}
            ${sliderRow("priority", localize("Fields.Priority"), values.priority, 0, 10, 1, localize("Help.Priority"), "", 0, "config.priority")}
            ${sliderRow("angle", localize("Fields.Angle"), values.angle, 0, 360, 1, localize("Help.Angle"), "°", 0, "config.angle")}
            ${sliderRow("rotation", localize("Fields.Rotation"), values.rotation, 0, 360, 1, localize("Help.Rotation"), "°", 0, "rotation")}
            ${sliderRow("elevation", localize("Fields.Elevation"), values.elevation, -100, 100, 1, localize("Help.Elevation"), "", 0, "elevation")}
          </div>
        </div>
      </details>

      <div class="mle-live-status" data-mle-status data-state="idle" role="status" aria-live="polite">${escapeHTML(localize("Status.Idle"))}</div>
      <footer class="mle-footer">
        <span>${escapeHTML(localize("Footer.Version"))}</span>
        <span>${escapeHTML(localize("Footer.Target"))}</span>
      </footer>
    </div>
  `;
}

function sliderRow(key, label, value, min, max, step, help, suffix = "", digits = 1, path = null) {
  const formatted = formatValue(value, suffix, digits, key);
  const dataPath = path ?? ({
    bright: "config.bright",
    dim: "config.dim",
    alpha: "config.alpha",
    darknessMin: "config.darkness.min",
    darknessMax: "config.darkness.max",
    animationSpeed: "config.animation.speed",
    animationIntensity: "config.animation.intensity"
  }[key]);

  return `
    <div class="mle-slider-row" data-mle-row="${key}">
      <div class="mle-slider-heading">
        <label for="mle-${key}">${escapeHTML(label)}</label>
        <output class="mle-value" data-output-for="mle-${key}" aria-live="off">${escapeHTML(formatted)}</output>
      </div>
      <input type="range" id="mle-${key}" name="${key}" data-mle-key="${key}" data-mle-path="${dataPath}" min="${min}" max="${max}" step="${step}" value="${value}">
      <p class="mle-help">${escapeHTML(help)}</p>
    </div>
  `;
}

function formatValue(value, suffix, digits, key) {
  const number = Number(value);
  const locale = String(game.i18n.lang ?? "en").toLowerCase().startsWith("de") ? "de-DE" : "en-US";
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
  if (suffix === "%") {
    const percentFormatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    return `${percentFormatter.format(number * 100)} %`;
  }
  if (key === "bright" || key === "dim") return `${formatter.format(number)} m`;
  return `${formatter.format(number)}${suffix ? ` ${suffix}` : ""}`;
}

function getAnimationOptions(selectedType) {
  const animations = CONFIG.Canvas?.lightAnimations ?? {};
  const options = [`<option value="">${escapeHTML(localize("Animation.None"))}</option>`];
  for (const [type, data] of Object.entries(animations)) {
    const rawLabel = data?.label ?? type;
    const translated = game.i18n.localize(rawLabel);
    const label = translated === rawLabel ? rawLabel : translated;
    options.push(`<option value="${escapeHTML(type)}" ${type === selectedType ? "selected" : ""}>${escapeHTML(label)}</option>`);
  }
  if (selectedType && !Object.hasOwn(animations, selectedType)) {
    options.push(`<option value="${escapeHTML(selectedType)}" selected>${escapeHTML(selectedType)}</option>`);
  }
  return options.join("");
}

function attachControls(root, session) {
  session.bindStatus(root);
  const ranges = [...root.querySelectorAll('input[type="range"][data-mle-path]')];

  const updateRangeDisplay = (range) => {
    const output = root.querySelector(`[data-output-for="${range.id}"]`);
    if (output) {
      output.textContent = formatValue(
        range.value,
        range.dataset.suffix ?? inferSuffix(range),
        Number(range.dataset.digits ?? (range.name.startsWith("darkness") ? 0 : 1)),
        range.name
      );
    }
  };

  const updateAllDarknessUI = () => {
    const minRange = root.querySelector('[name="darknessMin"]');
    const maxRange = root.querySelector('[name="darknessMax"]');
    if (!minRange || !maxRange) return;

    const min = Math.min(1, Math.max(0, Number(minRange.value)));
    const max = Math.min(1, Math.max(min, Number(maxRange.value)));

    // Keep two independent sliders in a valid Between interval:
    // the upper (minimum) slider cannot exceed max; the lower (maximum) slider cannot go below min.
    minRange.min = "0";
    minRange.max = String(max);
    maxRange.min = String(min);
    maxRange.max = "1";
    minRange.value = String(Math.min(min, max));
    maxRange.value = String(Math.max(max, Number(minRange.value)));

    updateRangeDisplay(minRange);
    updateRangeDisplay(maxRange);
    updateDarknessVisualization(root);
  };

  const queueDarknessPair = () => {
    const minRange = root.querySelector('[name="darknessMin"]');
    const maxRange = root.querySelector('[name="darknessMax"]');
    if (!minRange || !maxRange) return;
    const min = Number(minRange.value);
    const max = Number(maxRange.value);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
      session.setStatus(localize("Status.Error"), "error");
      return;
    }

    // Darkness Activation Range is one interval. Send both endpoints together so every
    // selected AmbientLight receives exactly the same valid Between min/max pair.
    session.queue({
      "config.darkness.min": min,
      "config.darkness.max": max
    });
  };

  updateAllDarknessUI();

  for (const range of ranges) {
    range.addEventListener("input", () => {
      if (range.name === "darknessMin" || range.name === "darknessMax") {
        updateAllDarknessUI();
        queueDarknessPair();
        return;
      }
      updateRangeDisplay(range);
      session.queue({ [range.dataset.mlePath]: Number(range.value) });
    });
    range.addEventListener("change", () => session.flush({ drain: true }));
  }

  for (const input of root.querySelectorAll("input[data-mle-path]:not([type='range']), select[data-mle-path]")) {
    const handler = () => {
      const value = input.type === "checkbox" ? input.checked : input.value;
      session.queue({ [input.dataset.mlePath]: value });
      session.flush({ drain: true });
    };
    input.addEventListener("change", handler);
  }

  updateDarknessVisualization(root);
}

function inferSuffix(range) {
  return ["darknessMin", "darknessMax", "alpha", "coloration", "saturation", "attenuation", "shadows"].includes(range.name)
    ? "%"
    : ["bright", "dim"].includes(range.name) ? "m" : range.name === "angle" || range.name === "rotation" ? "°" : "";
}

function updateDarknessVisualization(root) {
  const minRange = root.querySelector('[name="darknessMin"]');
  const maxRange = root.querySelector('[name="darknessMax"]');
  const track = root.querySelector("[data-mle-darkness-track]");
  if (!minRange || !maxRange || !track) return;

  const min = Math.round(Number(minRange.value) * 100);
  const max = Math.round(Number(maxRange.value) * 100);
  track.style.setProperty("--mle-from", `${min}%`);
  track.style.setProperty("--mle-width", `${Math.max(0, max - min)}%`);

  const example = root.querySelector("[data-mle-darkness-example]");
  if (example) example.textContent = localize("Darkness.Example", { min, max });
}

function normalizeDarknessRange(rawMin, rawMax) {
  let min = Math.min(1, Math.max(0, asNumber(rawMin, 0)));
  let max = Math.min(1, Math.max(0, asNumber(rawMax, 1)));
  if (min > max) max = min;
  return { min, max };
}

async function persistLightChanges(sceneId, documentIds, changed) {
  const scene = game.scenes.get(sceneId);
  if (!scene || canvas.scene?.id !== sceneId) {
    ui.notifications.error(localize("Notifications.SceneChanged"));
    return false;
  }

  const documents = documentIds.map((id) => scene.lights.get(id));
  if (documents.some((document) => !document)) {
    ui.notifications.error(localize("Notifications.LightMissing"));
    return false;
  }

  const minPath = "config.darkness.min";
  const maxPath = "config.darkness.max";
  const editsMin = Object.hasOwn(changed, minPath);
  const editsMax = Object.hasOwn(changed, maxPath);
  if (editsMin || editsMax) {
    for (const document of documents) {
      const current = document.toObject();
      const min = editsMin ? changed[minPath] : asNumber(current.config?.darkness?.min, 0);
      const max = editsMax ? changed[maxPath] : asNumber(current.config?.darkness?.max, 1);
      if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max > 1 || min > max) {
        ui.notifications.error(localize("Notifications.DarknessInvalid"));
        return false;
      }
    }
  }

  const updates = documents.map((document) => ({ _id: document.id, ...changed }));
  try {
    await scene.updateEmbeddedDocuments("AmbientLight", updates);

    const mismatches = [];
    for (const id of documentIds) {
      const updated = scene.lights.get(id);
      const source = updated?.toObject?.();
      for (const [path, expected] of Object.entries(changed)) {
        const actual = foundry.utils.getProperty(source, path);
        if (!valuesMatch(actual, expected)) mismatches.push({ id, path, expected, actual });
      }
    }

    if (mismatches.length) {
      console.error(`${MODULE_ID} | Live update verification failed`, mismatches);
      ui.notifications.error(localize("Notifications.UpdateMismatch"));
      return false;
    }
    return true;
  } catch (error) {
    console.error(`${MODULE_ID} | Failed to persist live Ambient Light changes`, error);
    ui.notifications.error(localize("Notifications.SaveFailed"));
    return false;
  }
}

function valuesMatch(actual, expected) {
  if (typeof expected === "number") return Number.isFinite(Number(actual)) && Math.abs(Number(actual) - expected) < 0.000001;
  return actual === expected;
}

function normalizeColor(value) {
  if (typeof value !== "string" || !/^#?[0-9a-f]{6}$/i.test(value)) return "#ffffff";
  return value.startsWith("#") ? value : `#${value}`;
}

function asNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}
