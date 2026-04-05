import { MODULE_ID } from "./const.js";
import { getCurrentSeason } from "./season-data.js";
import { SeasonRing } from "./season-particles.js";

/**
 * Register the Fey Step teleport handler.
 * Hooks into dnd5e.postUseActivity to intercept Fey Step usage
 * and provide interactive teleportation with range indicator.
 */
export function registerTeleportHandler() {
  Hooks.on("dnd5e.postUseActivity", async (activity, config, results) => {
    if (!activity?.item?.name?.startsWith("Fey Step")) return;

    const actName = activity.name ?? "";
    const isTeleport = actName.includes("Teleport") || actName.includes("Spring");
    if (!isTeleport) return;

    // Find the token
    const actor = activity.item.actor;
    const token =
      canvas.tokens.controlled[0] ??
      canvas.tokens.placeables.find((t) => t.actor?.id === actor?.id);
    if (!token) return;

    const didTeleport = await teleportToken(token, 30);

    // Auto-trigger the seasonal bonus activity (e.g. Summer fire damage)
    if (didTeleport) {
      await triggerSeasonalBonus(activity.item, token);
    }
  });
}

/**
 * After teleport, auto-trigger the seasonal bonus activity (damage/save)
 * on the same Fey Step item, skipping the MidiQOL multi-activity dialog.
 * Auto-targets all hostile tokens within 5 feet of the caster.
 * @param {Item5e} item - The Fey Step item
 * @param {Token} token - The caster's token (at its new position)
 */
async function triggerSeasonalBonus(item, token) {
  // Find the non-teleport activity (the seasonal bonus)
  const bonusActivity = Array.from(item.system.activities.values()).find(
    (a) => !a.name?.includes("Teleport") && !a.name?.includes("Spring") && a.type !== "utility"
  );
  if (!bonusActivity) {
    console.log(`${MODULE_ID} | No bonus activity found on ${item.name}`);
    return;
  }

  // Wait for token position to update on canvas after the teleport
  await new Promise((r) => setTimeout(r, 500));

  // Auto-target all hostile tokens within 5 feet
  const nearby = findHostilesWithinRange(token, 5);
  console.log(`${MODULE_ID} | Found ${nearby.length} hostile(s) within 5ft:`,
    nearby.map((t) => t.name));

  // Clear existing targets first
  for (const t of game.user.targets) t.setTarget(false, { releaseOthers: false });

  if (nearby.length > 0) {
    for (const t of nearby) t.setTarget(true, { releaseOthers: false, groupSelection: true });
  }

  // Fix stale activity config: ensure unlimited targets and no prompt
  const targetCfg = bonusActivity.target;
  if (targetCfg?.affects?.count === "1" || targetCfg?.prompt) {
    await item.update({
      [`system.activities.${bonusActivity.id}.target.affects.count`]: "",
      [`system.activities.${bonusActivity.id}.target.affects.choice`]: false,
      [`system.activities.${bonusActivity.id}.target.prompt`]: false,
    });
  }

  // Always trigger the bonus activity -- targets are already set
  await bonusActivity.use({}, {}, { createMessage: true });
}

/**
 * Find all hostile tokens within a given range (in feet) of a token.
 * @param {Token} token - The origin token
 * @param {number} rangeFeet - Range in feet
 * @returns {Token[]} Array of hostile tokens in range
 */
function findHostilesWithinRange(token, rangeFeet) {
  console.log(`${MODULE_ID} | Checking hostiles within ${rangeFeet}ft of`, token.name);

  return canvas.tokens.placeables.filter((t) => {
    if (t.id === token.id) return false;
    if (t.document.hidden) return false;

    const disposition = t.document.disposition;
    if (disposition !== CONST.TOKEN_DISPOSITIONS.HOSTILE) return false;

    const distance = canvas.grid.measurePath([token.center, t.center]).distance;
    console.log(`${MODULE_ID} |   ${t.name}: ${distance}ft (disposition ${disposition})`);
    return distance <= rangeFeet;
  });
}

/**
 * Show a range indicator circle and let the player click to teleport.
 * @param {Token} token - The token to teleport
 * @param {number} rangeInFeet - Maximum teleport range in feet
 * @returns {Promise<boolean>} true if teleported, false if cancelled
 */
async function teleportToken(token, rangeInFeet) {
  const gridSize = canvas.grid.size;
  const gridDistance = canvas.grid.distance;
  const rangePixels = (rangeInFeet / gridDistance) * gridSize;
  const tokenWidthPx = token.document.width * gridSize;
  const tokenHeightPx = token.document.height * gridSize;

  const originX = token.center.x;
  const originY = token.center.y;

  const seasonId = getCurrentSeason(token.actor) ?? "autumn";
  const seasonRing = new SeasonRing(originX, originY, rangePixels, seasonId);

  const ghost = new PIXI.Graphics();
  ghost.visible = false;
  canvas.controls.addChild(ghost);

  function getCanvasPos(event) {
    const transform = canvas.stage.worldTransform;
    return {
      x: (event.global.x - transform.tx) / transform.a,
      y: (event.global.y - transform.ty) / transform.d,
    };
  }

  function snapToGrid(pos) {
    const col = Math.floor(pos.x / gridSize);
    const row = Math.floor(pos.y / gridSize);
    return { x: col * gridSize, y: row * gridSize };
  }

  function drawGhost(gridPos, inRange) {
    ghost.clear();
    const color = inRange ? 0x44aa44 : 0xaa4444;

    ghost.lineStyle(2, color, 0.7);
    ghost.beginFill(color, 0.15);
    ghost.drawRoundedRect(gridPos.x, gridPos.y, tokenWidthPx, tokenHeightPx, 4);
    ghost.endFill();

    ghost.visible = true;
  }

  function isInRange(gridPos) {
    const ghostCenterX = gridPos.x + tokenWidthPx / 2;
    const ghostCenterY = gridPos.y + tokenHeightPx / 2;
    const dx = ghostCenterX - originX;
    const dy = ghostCenterY - originY;
    return Math.sqrt(dx * dx + dy * dy) <= rangePixels;
  }

  // Minimize character sheet if open
  if (token.actor?.sheet?.rendered) token.actor.sheet.minimize();

  return new Promise((resolve) => {
    let lastGridPos = null;

    function onMouseMove(event) {
      const canvasPos = getCanvasPos(event);
      const gridPos = snapToGrid(canvasPos);
      lastGridPos = gridPos;
      drawGhost(gridPos, isInRange(gridPos));
    }

    async function onClick(event) {
      if (!lastGridPos) return;

      if (!isInRange(lastGridPos)) {
        ui.notifications.warn("Target is out of range.");
        return;
      }

      cleanup();

      await performTeleport(token, lastGridPos);

      if (token.actor?.sheet?.rendered) token.actor.sheet.maximize();
      resolve(true);
    }

    function onRightClick(event) {
      event.preventDefault();
      event.stopPropagation();
      cleanup();
      if (token.actor?.sheet?.rendered) token.actor.sheet.maximize();
      resolve(false);
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        cleanup();
        if (token.actor?.sheet?.rendered) token.actor.sheet.maximize();
        resolve(false);
      }
    }

    function cleanup() {
      seasonRing.destroy();
      canvas.controls.removeChild(ghost);
      ghost.destroy();
      canvas.stage.off("pointermove", onMouseMove);
      canvas.stage.off("pointerdown", onClick);
      canvas.stage.off("rightdown", onRightClick);
      document.removeEventListener("keydown", onKeyDown);
    }

    canvas.stage.on("pointermove", onMouseMove);
    canvas.stage.on("pointerdown", onClick);
    canvas.stage.on("rightdown", onRightClick);
    document.addEventListener("keydown", onKeyDown);
  });
}

/**
 * Perform the teleport with visual effects.
 * Uses Sequencer + JB2A if available, falls back to simple fade.
 * @param {Token} token
 * @param {{x: number, y: number}} destPos - Grid-snapped destination (top-left)
 */
async function performTeleport(token, destPos) {
  const gridSize = canvas.grid.size;
  const originCenter = { x: token.center.x, y: token.center.y };
  const destCenter = {
    x: destPos.x + (token.document.width * gridSize) / 2,
    y: destPos.y + (token.document.height * gridSize) / 2,
  };

  const hasSequencer = typeof Sequencer !== "undefined" && typeof Sequence !== "undefined";

  if (hasSequencer) {
    await teleportWithSequencer(token, originCenter, destCenter, destPos);
  } else {
    await teleportSimple(token, destPos);
  }
}

/**
 * Teleport using Sequencer + JB2A animations.
 */
async function teleportWithSequencer(token, originCenter, destCenter, destPos) {
  const mistyStep1 = "jb2a.misty_step.01.blue";
  const mistyStep2 = "jb2a.misty_step.02.blue";

  await new Sequence()
    .effect()
      .file(mistyStep1)
      .atLocation(originCenter)
      .scaleToObject(1.5)
      .waitUntilFinished(-1500)

    .animation()
      .on(token)
      .fadeOut(200)

    .wait(200)

    .thenDo(async () => {
      await token.document.update(
        { x: destPos.x, y: destPos.y },
        { animation: { duration: 0 } }
      );
    })

    .wait(100)

    .effect()
      .file(mistyStep2)
      .atLocation(destCenter)
      .scaleToObject(1.5)

    .animation()
      .on(token)
      .fadeIn(300)

    .play();
}

/**
 * Simple teleport fallback without Sequencer.
 */
async function teleportSimple(token, destPos) {
  await animateAlpha(token.mesh, 0, 150);

  await token.document.update(
    { x: destPos.x, y: destPos.y },
    { animation: { duration: 0 } }
  );

  await animateAlpha(token.mesh, 1, 200);
}

/**
 * Simple alpha animation helper.
 */
function animateAlpha(target, toAlpha, durationMs) {
  if (!target) return Promise.resolve();
  return new Promise((resolve) => {
    const startAlpha = target.alpha;
    const delta = toAlpha - startAlpha;
    const startTime = performance.now();

    function tick() {
      const progress = Math.min((performance.now() - startTime) / durationMs, 1);
      target.alpha = startAlpha + delta * progress;
      if (progress < 1) requestAnimationFrame(tick);
      else resolve();
    }
    requestAnimationFrame(tick);
  });
}
