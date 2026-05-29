"use strict";

/* ============================================================================
   COALESCING MONOGRAM — a faint drifting cloud of points gathers into an "SN"
   monogram and HOLDS. As the cursor sweeps through the letters they warp and
   spring back, while charging "energy": the monogram scales up and the points
   vibrate as tension builds. At max charge it bursts apart, then reforms.
   Sits behind all content as a living watermark.
   ============================================================================ */

(function () {
  const canvas = document.getElementById("fx-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // --- Tuning ---
  const GRID_ROWS     = 24;    // monogram height in character rows
  const CELL_ASPECT   = 0.58;  // cell width / height (monospace proportion)
  const COVER_ALPHA   = 128;   // alpha threshold for a filled cell
  const SPRING        = 0.085; // pull toward target while assembling/holding
  const FRICTION      = 0.80;  // damping during assemble/hold
  const DRIFT_FRICTION = 0.985;// damping while scattered
  const FORMED_ALPHA  = 0.3;
  const SCATTER_ALPHA = 0.08;
  const GLYPH_FORM_BASE = 0.7;  // glyph size (× cellH) when scattered
  const GLYPH_FORM_GROW = 0.25; // extra (× cellH) when fully formed
  const GLYPH_ENERGY_F  = 0.3;  // extra (× cellH) at full charge
  const DISTURB_R     = 88;
  const DISTURB_PUSH  = 1.6;
  const SHOCK_R       = 190;
  const SHOCK_IMPULSE = 14;
  const BURST_SPEED   = 6;     // outward kick when the charge releases
  const IDLE_MS       = 2200;

  // --- Charge / energy ---
  const MAX_ENERGY    = 1;
  const ENERGY_GAIN   = 0.0007; // per px of cursor travel inside the letters
  const SPEED_CAP     = 40;     // clamp per-frame cursor travel feeding the charge
  const ENERGY_DECAY  = 0.0035; // drained per 60fps frame when not charging
  const SCALE_MAX     = 0.45;   // monogram grows up to 1 + this at full charge
  const ENERGY_SHAKE  = 0.9;    // point vibration amplitude at full charge
  const ENERGY_GLOW   = 0.12;   // extra alpha at full charge
  const CLICK_ENERGY  = 0.2;    // charge added by a click/tap

  const ASSEMBLE_MS = 2200;
  const SCATTER_MS  = 2200;

  const DISTURB_R_SQ = DISTURB_R * DISTURB_R;
  const SHOCK_R_SQ   = SHOCK_R * SHOCK_R;

  let dpr, W, H, cx, cy;
  let cellH = 12;                  // character row height (set in buildTargets)
  let points = [];                 // { x, y, vx, vy, tx, ty, bit }
  let bbox = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let cursor = { x: -9999, y: -9999, active: false };
  let lastMoveTime = 0;
  let rafId = null;
  let lastTs = 0;
  let phase = "assemble";
  let phaseT = 0;
  let energy = 0;
  let prevCX = -9999, prevCY = -9999;

  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  // --- KEEP: canvas sizing with dpr cap ---
  function setupCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    cx = W / 2;
    cy = H / 2;
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Render "SN" to an offscreen canvas, then sample it on a regular monospace
  // grid (ASCII-art style): one target per grid cell the letters cover.
  function buildTargets() {
    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    const octx = off.getContext("2d");
    const fontSize = Math.min(W * 0.4, H * 0.55);
    octx.fillStyle = "#000";
    octx.font = `700 ${fontSize}px sans-serif`;
    octx.textAlign = "center";
    octx.textBaseline = "middle";
    octx.fillText("SN", cx, cy);

    const data = octx.getImageData(0, 0, W, H).data;
    cellH = fontSize / GRID_ROWS;
    const cellW = cellH * CELL_ASPECT;

    const targets = [];
    for (let y = cellH / 2; y < H; y += cellH) {
      const yi = y | 0;
      for (let x = cellW / 2; x < W; x += cellW) {
        const xi = x | 0;
        if (data[(yi * W + xi) * 4 + 3] > COVER_ALPHA) {
          targets.push({ x, y }); // exact grid coords keep columns/rows aligned
        }
      }
    }
    return targets;
  }

  // Build (or rebuild) the point set, seeding particles at random scattered spots.
  function initPoints() {
    const targets = buildTargets();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points = targets.map((t) => {
      if (t.x < minX) minX = t.x; if (t.x > maxX) maxX = t.x;
      if (t.y < minY) minY = t.y; if (t.y > maxY) maxY = t.y;
      return {
        x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0,
        tx: t.x, ty: t.y, bit: Math.random() < 0.5 ? "0" : "1",
      };
    });
    bbox = { minX, minY, maxX, maxY };
  }

  // One-shot radial impulse — a local strike.
  function applyShock(sx, sy) {
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const dx = p.x - sx;
      const dy = p.y - sy;
      const d2 = dx * dx + dy * dy;
      if (d2 < SHOCK_R_SQ) {
        const d = Math.sqrt(d2) || 0.0001;
        const falloff = 1 - d / SHOCK_R;
        const kick = SHOCK_IMPULSE * falloff * falloff;
        p.vx += (dx / d) * kick;
        p.vy += (dy / d) * kick;
      }
    }
  }

  // Kick every point outward from the monogram centre when the charge releases.
  function burstApart() {
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const dx = p.x - cx;
      const dy = p.y - cy;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
      const jitter = 0.6 + Math.random() * 0.8;
      p.vx += (dx / d) * BURST_SPEED * jitter;
      p.vy += (dy / d) * BURST_SPEED * jitter;
    }
  }

  function formationFactor() {
    if (phase === "assemble") return easeInOut(Math.min(phaseT / ASSEMBLE_MS, 1));
    if (phase === "hold") return 1;
    return 1 - easeInOut(Math.min(phaseT / SCATTER_MS, 1)); // scatter
  }

  // Is the cursor sweeping inside the (scaled) monogram bounds?
  function cursorInLetters(scale) {
    return (
      cursor.x > cx + (bbox.minX - cx) * scale &&
      cursor.x < cx + (bbox.maxX - cx) * scale &&
      cursor.y > cy + (bbox.minY - cy) * scale &&
      cursor.y < cy + (bbox.maxY - cy) * scale
    );
  }

  function stepPoint(p, dtScale, springFr, driftFr, scale) {
    if (phase === "scatter") {
      p.vx *= driftFr;
      p.vy *= driftFr;
      p.vx += (Math.random() - 0.5) * 0.05 * dtScale;
      p.vy += (Math.random() - 0.5) * 0.05 * dtScale;
    } else {
      // Spring toward the scaled target (monogram grows as it charges).
      const tx = cx + (p.tx - cx) * scale;
      const ty = cy + (p.ty - cy) * scale;
      p.vx = (p.vx + (tx - p.x) * SPRING * dtScale) * springFr;
      p.vy = (p.vy + (ty - p.y) * SPRING * dtScale) * springFr;

      // Tension vibration that grows with charge.
      if (energy > 0) {
        p.vx += (Math.random() - 0.5) * energy * ENERGY_SHAKE * dtScale;
        p.vy += (Math.random() - 0.5) * energy * ENERGY_SHAKE * dtScale;
      }
    }

    // Cursor disturbance — push points away (they spring back).
    if (cursor.active) {
      const dx = p.x - cursor.x;
      const dy = p.y - cursor.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < DISTURB_R_SQ && d2 > 0) {
        const d = Math.sqrt(d2);
        const f = (1 - d / DISTURB_R) * DISTURB_PUSH * dtScale;
        p.vx += (dx / d) * f;
        p.vy += (dy / d) * f;
      }
    }

    p.x += p.vx * dtScale;
    p.y += p.vy * dtScale;

    // Flicker the bit — a faint ambient shimmer that intensifies with charge.
    if (Math.random() < (0.004 + energy * 0.06) * dtScale) {
      p.bit = p.bit === "0" ? "1" : "0";
    }

    // Soft wrap while scattered so the cloud keeps wandering on screen.
    if (phase === "scatter") {
      if (p.x < 0) p.x += W; else if (p.x > W) p.x -= W;
      if (p.y < 0) p.y += H; else if (p.y > H) p.y -= H;
    }
  }

  function draw(formation) {
    ctx.clearRect(0, 0, W, H);
    const alpha = SCATTER_ALPHA + (FORMED_ALPHA - SCATTER_ALPHA) * formation + energy * ENERGY_GLOW;
    const fontPx = cellH * (GLYPH_FORM_BASE + GLYPH_FORM_GROW * formation + energy * GLYPH_ENERGY_F);
    ctx.fillStyle = `hsla(220, 13%, 52%, ${Math.min(alpha, 0.85).toFixed(3)})`;
    ctx.font = `600 ${fontPx.toFixed(1)}px "Courier New", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < points.length; i++) {
      ctx.fillText(points[i].bit, points[i].x, points[i].y);
    }
  }

  function loop(ts) {
    const dtMs = lastTs ? Math.min(ts - lastTs, 50) : 16.667;
    const dtScale = Math.min(Math.max(dtMs / 16.667, 0), 3);
    lastTs = ts;

    cursor.active = Date.now() - lastMoveTime < IDLE_MS;

    // Phase timing (assemble -> hold is timed; hold -> burst is charge-driven).
    phaseT += dtMs;
    if (phase === "assemble" && phaseT >= ASSEMBLE_MS) { phase = "hold"; phaseT = 0; }
    else if (phase === "scatter" && phaseT >= SCATTER_MS) { phase = "assemble"; phaseT = 0; }

    const scale = 1 + energy * SCALE_MAX;

    // Charge from cursor travel inside the letters; decay otherwise.
    if (phase === "hold") {
      if (cursor.active && prevCX > -9000 && cursorInLetters(scale)) {
        const travel = Math.min(Math.hypot(cursor.x - prevCX, cursor.y - prevCY), SPEED_CAP);
        energy += travel * ENERGY_GAIN;
      }
      energy -= ENERGY_DECAY * dtScale;
      if (energy < 0) energy = 0;

      if (energy >= MAX_ENERGY) {
        phase = "scatter";
        phaseT = 0;
        energy = 0;
        burstApart();
      }
    } else {
      energy = 0; // only the held monogram can charge
    }

    const springFr = Math.pow(FRICTION, dtScale);
    const driftFr = Math.pow(DRIFT_FRICTION, dtScale);
    for (let i = 0; i < points.length; i++) stepPoint(points[i], dtScale, springFr, driftFr, scale);

    draw(formationFactor());

    prevCX = cursor.x;
    prevCY = cursor.y;
    rafId = requestAnimationFrame(loop);
  }

  function renderStaticFrame() {
    // Reduced motion: snap points onto the monogram and draw once.
    for (let i = 0; i < points.length; i++) {
      points[i].x = points[i].tx;
      points[i].y = points[i].ty;
    }
    draw(1);
  }

  // --- Bootstrap ---
  setupCanvas();
  initPoints();

  if (reducedMotion) {
    renderStaticFrame();
    return; // strict no-motion: no listeners, no RAF
  }

  rafId = requestAnimationFrame(loop);

  document.addEventListener("mousemove", (e) => {
    cursor.x = e.clientX;
    cursor.y = e.clientY;
    lastMoveTime = Date.now();
  });

  document.addEventListener("click", (e) => {
    applyShock(e.clientX, e.clientY);
    if (phase === "hold") energy = Math.min(energy + CLICK_ENERGY, MAX_ENERGY);
  });

  document.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    if (!t) return;
    cursor.x = t.clientX;
    cursor.y = t.clientY;
    lastMoveTime = Date.now();
    applyShock(t.clientX, t.clientY);
    if (phase === "hold") energy = Math.min(energy + CLICK_ENERGY, MAX_ENERGY);
  }, { passive: true });

  document.addEventListener("touchmove", (e) => {
    const t = e.touches[0];
    if (!t) return;
    cursor.x = t.clientX;
    cursor.y = t.clientY;
    lastMoveTime = Date.now();
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!rafId) {
      lastTs = 0; // avoid a catch-up burst on resume
      rafId = requestAnimationFrame(loop);
    }
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      setupCanvas();
      initPoints();
      phase = "assemble";
      phaseT = 0;
      energy = 0;
    }, 150);
  }, { passive: true });
})();
