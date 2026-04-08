/**
 * Seasonal particle ring for the Fey Step teleport range indicator.
 * Draws season-themed particles orbiting the 30ft range boundary with some drifting inside.
 */

const TICK_RATE = 30;
const ORBIT_SPEED = 0.0003; // radians per ms (slower orbit)
const PARTICLE_LIFETIME = 4000; // longer life so ring stays dense
const MAX_RING_PARTICLES = 80; // dense ring of particles
const MAX_INNER_PARTICLES = 6;
const SPAWN_INTERVAL = 60; // faster spawning to fill ring quickly
const INNER_SPAWN_INTERVAL = 800; // slower inner spawns
const PARTICLE_SCALE = 1.4; // larger particles
const INNER_PARTICLE_SCALE = 0.9; // inner particles visible but smaller

/**
 * Season visual config: colors, particle draw function, ring tint
 */
const SEASON_CONFIG = {
  spring: {
    ringColor: 0x5a9e4b,
    ringAlpha: 0.12,
    lineColor: 0x5a9e4b,
    colors: [0x228b22, 0x32cd32, 0x4a9e4b, 0xcc3333, 0xb22222, 0xff69b4],
    drawParticle: drawFlower,
  },
  summer: {
    ringColor: 0x2d8f2d,
    ringAlpha: 0.1,
    lineColor: 0x3a7a3a,
    colors: [0x228b22, 0x32cd32, 0x3cb371, 0x4a7a3a, 0x6b8e23, 0x556b2f],
    drawParticle: drawLeaf,
  },
  autumn: {
    ringColor: 0xb8510d,
    ringAlpha: 0.1,
    lineColor: 0x8b4513,
    colors: [0xcc5500, 0xb8510d, 0x8b4513, 0xd2691e, 0xa0522d, 0xcd853f],
    drawParticle: drawLeaf,
  },
  winter: {
    ringColor: 0x5b8fbd,
    ringAlpha: 0.12,
    lineColor: 0x7ab0d4,
    colors: [0xffffff, 0xe8f4fd, 0xc5dff5, 0xb0d4f1, 0xd6eaf8, 0xaed6f1],
    drawParticle: drawSnowflake,
  },
};

// -- Particle Drawing Functions ------------------------------------------------

function drawFlower(gfx, color) {
  const petalCount = 5;
  const petalR = 3.5;
  // Petals
  gfx.beginFill(color, 0.85);
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2;
    const px = Math.cos(angle) * petalR;
    const py = Math.sin(angle) * petalR;
    gfx.drawEllipse(px, py, 2.5, 1.5);
  }
  gfx.endFill();
  // Center
  gfx.beginFill(0xffdd44, 0.9);
  gfx.drawCircle(0, 0, 1.5);
  gfx.endFill();
}

function drawLeaf(gfx, color) {
  // Simple leaf shape using two curves
  gfx.beginFill(color, 0.8);
  gfx.moveTo(0, -5);
  gfx.quadraticCurveTo(5, -2, 0, 5);
  gfx.quadraticCurveTo(-5, -2, 0, -5);
  gfx.endFill();
  // Vein
  gfx.lineStyle(0.5, 0x000000, 0.15);
  gfx.moveTo(0, -4);
  gfx.lineTo(0, 4);
}

function drawSnowflake(gfx, color) {
  gfx.lineStyle(1.2, color, 0.9);
  // 6 arms
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const len = 4;
    gfx.moveTo(0, 0);
    gfx.lineTo(cos * len, sin * len);
    // Small branches
    const bx = cos * len * 0.6;
    const by = sin * len * 0.6;
    const branchAngle1 = angle + 0.5;
    const branchAngle2 = angle - 0.5;
    gfx.moveTo(bx, by);
    gfx.lineTo(bx + Math.cos(branchAngle1) * 1.5, by + Math.sin(branchAngle1) * 1.5);
    gfx.moveTo(bx, by);
    gfx.lineTo(bx + Math.cos(branchAngle2) * 1.5, by + Math.sin(branchAngle2) * 1.5);
  }
}

// -- Season Burst Class -------------------------------------------------------

const BURST_PARTICLE_COUNT = 40;
const BURST_LIFETIME = 1200; // ms — total burst duration
const BURST_TICK = 30;
const BURST_SCALE = 1.6;

/**
 * Outward explosion of seasonal particles from a token center.
 * Used when an Eladrin changes season — particles radiate ~10ft outward.
 */
export class SeasonBurst {
  /**
   * @param {number} cx - Center X in canvas coords
   * @param {number} cy - Center Y in canvas coords
   * @param {string} seasonId - spring|summer|autumn|winter
   * @param {number} [radiusFeet=10] - Explosion radius in feet
   */
  constructor(cx, cy, seasonId, radiusFeet = 10) {
    this.cx = cx;
    this.cy = cy;
    this.config = SEASON_CONFIG[seasonId] ?? SEASON_CONFIG.autumn;
    this._destroyed = false;

    const gridSize = canvas.grid.size;
    const gridDistance = canvas.grid.distance;
    this.radiusPixels = (radiusFeet / gridDistance) * gridSize;

    this.container = new PIXI.Container();
    this.particles = [];

    this._init();
  }

  _init() {
    canvas.controls.addChild(this.container);

    // Spawn all particles at once as a burst
    for (let i = 0; i < BURST_PARTICLE_COUNT; i++) {
      this._spawnParticle();
    }

    // Animate
    this._animInterval = setInterval(() => {
      if (this._destroyed) return;
      this._animate();
    }, BURST_TICK);
  }

  _spawnParticle() {
    const angle = Math.random() * Math.PI * 2;
    const gfx = this._createParticle();

    // Start at center with slight random offset for organic feel
    const startOffset = Math.random() * 8;
    gfx.x = this.cx + Math.cos(angle) * startOffset;
    gfx.y = this.cy + Math.sin(angle) * startOffset;
    gfx.alpha = 0;

    this.container.addChild(gfx);

    // Each particle gets a slightly different speed and target radius
    const speed = 0.7 + Math.random() * 0.6; // 0.7–1.3x speed variation
    const targetR = this.radiusPixels * (0.6 + Math.random() * 0.5); // 60–110% of radius

    this.particles.push({
      gfx,
      angle,
      born: Date.now(),
      speed,
      targetR,
      phase: Math.random() * Math.PI * 2,
      startOffset,
    });
  }

  _createParticle() {
    const gfx = new PIXI.Graphics();
    const colors = this.config.colors;
    const color = colors[Math.floor(Math.random() * colors.length)];
    this.config.drawParticle(gfx, color);
    gfx.scale.set(BURST_SCALE, BURST_SCALE);
    return gfx;
  }

  _animate() {
    const now = Date.now();
    let allDead = true;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const age = now - p.born;
      const t = age / BURST_LIFETIME;

      if (t >= 1) {
        p.gfx.destroy(true);
        this.particles.splice(i, 1);
        continue;
      }

      allDead = false;

      // Ease-out radial movement: fast start, slow finish
      const eased = 1 - Math.pow(1 - t * p.speed, 3);
      const dist = p.startOffset + eased * p.targetR;
      p.gfx.x = this.cx + Math.cos(p.angle) * dist;
      p.gfx.y = this.cy + Math.sin(p.angle) * dist;

      // Slight spin
      p.gfx.rotation = age * 0.003 + p.phase;

      // Alpha: quick fade-in, hold, longer fade-out
      if (t < 0.08) p.gfx.alpha = t / 0.08;
      else if (t > 0.5) p.gfx.alpha = Math.max(0, (1 - t) / 0.5);
      else p.gfx.alpha = 0.9;

      // Scale: start slightly small, grow, then shrink
      const scaleCurve = Math.sin(t * Math.PI); // 0 → 1 → 0
      const s = BURST_SCALE * (0.5 + 0.6 * scaleCurve);
      p.gfx.scale.set(s, s);
    }

    if (allDead) this.destroy();
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    if (this._animInterval) clearInterval(this._animInterval);
    for (const p of this.particles) p.gfx.destroy(true);
    this.particles = [];
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true });
  }
}

// -- Season Ring Class ---------------------------------------------------------

export class SeasonRing {
  /**
   * @param {number} cx - Center X in canvas coords
   * @param {number} cy - Center Y in canvas coords
   * @param {number} radiusPixels - Ring radius in pixels
   * @param {string} seasonId - spring|summer|autumn|winter
   */
  constructor(cx, cy, radiusPixels, seasonId) {
    this.cx = cx;
    this.cy = cy;
    this.radius = radiusPixels;
    this.config = SEASON_CONFIG[seasonId] ?? SEASON_CONFIG.autumn;
    this.container = new PIXI.Container();
    this.particles = [];
    this._destroyed = false;
    this._spawnInterval = null;
    this._innerSpawnInterval = null;
    this._animInterval = null;

    this._init();
  }

  _init() {
    // Faint filled area only -- no line border, particles form the edge
    const ring = new PIXI.Graphics();
    ring.beginFill(this.config.ringColor, this.config.ringAlpha);
    ring.drawCircle(this.cx, this.cy, this.radius);
    ring.endFill();
    this.container.addChild(ring);

    canvas.controls.addChild(this.container);

    // Spawn ring particles
    this._spawnRingParticle();
    this._spawnInterval = setInterval(() => {
      if (this._destroyed) return;
      if (this.particles.filter((p) => p.type === "ring").length < MAX_RING_PARTICLES) {
        this._spawnRingParticle();
      }
    }, SPAWN_INTERVAL);

    // Spawn inner particles (fewer, slower)
    this._innerSpawnInterval = setInterval(() => {
      if (this._destroyed) return;
      if (this.particles.filter((p) => p.type === "inner").length < MAX_INNER_PARTICLES) {
        this._spawnInnerParticle();
      }
    }, INNER_SPAWN_INTERVAL);

    // Animate
    this._animInterval = setInterval(() => {
      if (this._destroyed) return;
      this._animate();
    }, TICK_RATE);
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    if (this._spawnInterval) clearInterval(this._spawnInterval);
    if (this._innerSpawnInterval) clearInterval(this._innerSpawnInterval);
    if (this._animInterval) clearInterval(this._animInterval);
    for (const p of this.particles) p.gfx.destroy(true);
    this.particles = [];
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true });
  }

  _spawnRingParticle() {
    const angle = Math.random() * Math.PI * 2;
    const gfx = this._createParticle();
    gfx.x = this.cx + Math.cos(angle) * this.radius;
    gfx.y = this.cy + Math.sin(angle) * this.radius;
    gfx.alpha = 0;
    this.container.addChild(gfx);
    this.particles.push({
      gfx,
      angle,
      born: Date.now(),
      phase: Math.random() * Math.PI * 2,
      type: "ring",
      orbitSpeed: ORBIT_SPEED * (0.7 + Math.random() * 0.6),
      radialOffset: (Math.random() - 0.5) * 20,
    });
  }

  _spawnInnerParticle() {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * this.radius * 0.7 + this.radius * 0.1;
    const startX = this.cx + Math.cos(angle) * dist;
    const startY = this.cy + Math.sin(angle) * dist;
    const gfx = this._createParticle();
    gfx.x = startX;
    gfx.y = startY;
    gfx.alpha = 0;
    gfx.scale.set(INNER_PARTICLE_SCALE, INNER_PARTICLE_SCALE);
    this.container.addChild(gfx);

    const driftDir = Math.random() * Math.PI * 2;
    this.particles.push({
      gfx,
      born: Date.now(),
      phase: Math.random() * Math.PI * 2,
      type: "inner",
      startX,
      startY,
      driftDx: Math.cos(driftDir) * 0.012,
      driftDy: Math.sin(driftDir) * 0.012,
    });
  }

  _createParticle() {
    const gfx = new PIXI.Graphics();
    const colors = this.config.colors;
    const color = colors[Math.floor(Math.random() * colors.length)];
    this.config.drawParticle(gfx, color);
    gfx.scale.set(PARTICLE_SCALE, PARTICLE_SCALE);
    return gfx;
  }

  _animate() {
    const now = Date.now();

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const age = now - p.born;
      const t = age / PARTICLE_LIFETIME;

      if (t >= 1) {
        p.gfx.destroy(true);
        this.particles.splice(i, 1);
        continue;
      }

      if (p.type === "ring") {
        p.angle += p.orbitSpeed * TICK_RATE;
        const wobble = Math.sin(age * 0.0015 + p.phase) * 15 + p.radialOffset;
        p.gfx.x = this.cx + Math.cos(p.angle) * (this.radius + wobble);
        p.gfx.y = this.cy + Math.sin(p.angle) * (this.radius + wobble);
        p.gfx.y -= Math.sin(age * 0.002 + p.phase) * 5;
      } else {
        p.gfx.x = p.startX + p.driftDx * age;
        p.gfx.y = p.startY + p.driftDy * age;
      }

      p.gfx.rotation = Math.sin(age * 0.002 + p.phase) * 0.6;

      if (t < 0.1) p.gfx.alpha = t / 0.1;
      else if (t > 0.7) p.gfx.alpha = (1 - t) / 0.3;
      else p.gfx.alpha = 0.85;

      const baseScale = p.type === "inner" ? INNER_PARTICLE_SCALE : PARTICLE_SCALE;
      const breathe = 0.85 + 0.3 * Math.sin(t * Math.PI);
      p.gfx.scale.set(baseScale * breathe, baseScale * breathe);
    }
  }
}
