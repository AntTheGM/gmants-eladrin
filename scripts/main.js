import { MODULE_ID } from "./const.js";
import { registerSettings, registerEladrinOptIn } from "./settings.js";
import { EladrinSeasonDialog } from "./dialog/EladrinSeasonDialog.js";
import { isEladrin } from "./season-data.js";
import { registerTeleportHandler } from "./teleport.js";

let dialogInstance = null;

// -- Initialization ------------------------------------------------------------

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing`);
  registerSettings();
});

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | Ready`);
  registerEladrinOptIn();
  registerTeleportHandler();
});

// -- Scene Control Button ------------------------------------------------------

Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.settings.get(MODULE_ID, "showEladrinButton")) return;

  const tokenControls = controls.tokens;
  if (!tokenControls) return;

  tokenControls.tools.eladrinSeason = {
    name: "eladrinSeason",
    title: game.i18n.localize("ELADRIN.ControlButton"),
    icon: "fa-solid fa-leaf",
    onClick: () => openEladrinDialog(),
    button: true,
  };
});

// -- Settings Page Promo -------------------------------------------------------

Hooks.on("renderSettingsConfig", (app, html) => {
  const tab =
    html[0]?.querySelector?.(`.tab[data-tab="${MODULE_ID}"]`) ??
    html.querySelector?.(`.tab[data-tab="${MODULE_ID}"]`);
  if (!tab || tab.querySelector(".eladrin-settings-promo")) return;
  const note = document.createElement("p");
  note.className = "eladrin-settings-promo";
  note.style.cssText =
    "text-align:center; font-style:italic; opacity:0.6; font-size:0.8rem; margin-top:0.5rem;";
  note.innerHTML =
    'Visit <a href="https://roleplayr.com/gmant" target="_blank" rel="noopener">roleplayr.com/gmant</a> for updates, more virtual tabletop tools, and online RPG tools.';
  tab.appendChild(note);
});

// -- Eladrin Dialog ------------------------------------------------------------

/**
 * Open the Eladrin Season Dialog for the currently selected/assigned actor.
 */
function openEladrinDialog() {
  const actor = resolveActor();
  if (!actor) {
    ui.notifications.warn(game.i18n.localize("ELADRIN.Error.NoActor"));
    return;
  }

  if (!isEladrin(actor)) {
    ui.notifications.warn(game.i18n.localize("ELADRIN.Error.NotEladrin"));
    return;
  }

  if (dialogInstance) {
    dialogInstance.close();
    dialogInstance = null;
  }

  dialogInstance = new EladrinSeasonDialog(actor);
  dialogInstance.render(true);
}

/**
 * Resolve the actor to use: selected token's actor, or assigned character.
 */
function resolveActor() {
  return canvas.tokens?.controlled?.[0]?.actor ?? game.user?.character ?? null;
}

// -- Public API ----------------------------------------------------------------

Hooks.once("ready", () => {
  game.modules.get(MODULE_ID).api = {
    open: openEladrinDialog,
  };
});
