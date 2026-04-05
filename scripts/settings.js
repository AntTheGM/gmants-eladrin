import { MODULE_ID } from "./const.js";

export function registerSettings() {
  game.settings.register(MODULE_ID, "useMidiQol", {
    name: "ELADRIN.Settings.UseMidiQol",
    hint: "ELADRIN.Settings.UseMidiQolHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(MODULE_ID, "showEladrinButton", {
    name: "ELADRIN.Settings.ShowEladrinButton",
    hint: "ELADRIN.Settings.ShowEladrinButtonHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true,
  });

  game.settings.register(MODULE_ID, "eladrinDialogPosition", {
    scope: "client",
    config: false,
    default: {},
    type: Object,
  });
}

/**
 * Register a header button on actor sheets to toggle Eladrin opt-in.
 */
export function registerEladrinOptIn() {
  Hooks.on("dnd5e.getActorSheetHeaderButtons", (sheet, buttons) => {
    if (sheet.actor?.type !== "character") return;
    if (!sheet.actor.isOwner) return;

    const actor = sheet.actor;
    const isOptedIn = actor.getFlag(MODULE_ID, "eladrinOptIn");

    buttons.unshift({
      class: "eladrin-opt-in",
      icon: isOptedIn ? "fas fa-cloud-sun" : "far fa-cloud-sun",
      label: isOptedIn ? "Eladrin: On" : "Eladrin: Off",
      onclick: async () => {
        await actor.setFlag(MODULE_ID, "eladrinOptIn", !isOptedIn);
        sheet.render(false);
        ui.notifications.info(
          `Eladrin Season ${!isOptedIn ? "enabled" : "disabled"} for ${actor.name}.`
        );
      },
    });
  });
}
