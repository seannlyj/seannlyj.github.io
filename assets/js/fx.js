"use strict";

/* ============================================================================
   DODGING SWARM — an autonomous boids flock that banks away from the cursor
   (a "predator") and scatters from a strike shockwave on click. A nod to the
   dodge-timing and spacing of the Pugilist combat work. Sits behind content.
   ============================================================================ */

(function () {
  const canvas = document.getElementById("fx-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // --- Tuning ---
  const COUNT        = 48;
  const MAX_SPEED    = 1.4;
  const MIN_SPEED    = 0.35;
  const MAX_FORCE    = 0.035;
  const PERCEPTION   = 56;
  const SEPARATION_R = 22;
  const W_SEP        = 1.6;
  const W_ALI        = 1.0;
  const W_COH        = 0.9;
  const FLEE_RADIUS  = 150;
  const W_FLEE       = 2.4;
  const FLEE_FORCE   = 0.12;
  const SHOCK_RADIUS = 170;
  const SHOCK_IMPULSE = 9.0;
  const EDGE_MARGIN  = 40;
  const AGENT_LEN    = 6.5;
  const AGENT_HALF   = 3.0;
  const BASE_ALPHA   = 0.34;
  const IDLE_MS      = 2500;

  const PERCEPTION_SQ   = PERCEPTION * PERCEPTION;
  const SEPARATION_R_SQ = SEPARATION_R * SEPARATION_R;
  const FLEE_RADIUS_SQ  = FLEE_RADIUS * FLEE_RADIUS;
  const SHOCK_RADIUS_SQ = SHOCK_RADIUS * SHOCK_RADIUS;

  let dpr, W, H;
  let agents = [];
  let cursor = { x: -9999, y: -9999, active: false };
  let lastMoveTime = 0;
  let rafId = null;
  let lastTs = 0;

  // --- KEEP: canvas sizing with dpr cap ---
  function setupCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function initAgents() {
    agents = [];
    for (let i = 0; i < COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      agents.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: Math.cos(angle) * MAX_SPEED,
        vy: Math.sin(angle) * MAX_SPEED,
      });
    }
  }

  // Clamp a vector to a maximum magnitude, returned via the shared scratch object.
  const scratch = { x: 0, y: 0 };
  function clampVec(x, y, max) {
    const m = Math.sqrt(x * x + y * y);
    if (m > max && m > 0) {
      x = (x / m) * max;
      y = (y / m) * max;
    }
    scratch.x = x;
    scratch.y = y;
    return scratch;
  }

  // Reynolds steering: desired (normalized to MAX_SPEED) minus current velocity,
  // clamped to MAX_FORCE. Writes into scratch.
  function steer(dx, dy, a) {
    const m = Math.sqrt(dx * dx + dy * dy);
    if (m === 0) { scratch.x = 0; scratch.y = 0; return scratch; }
    const desX = (dx / m) * MAX_SPEED;
    const desY = (dy / m) * MAX_SPEED;
    return clampVec(desX - a.vx, desY - a.vy, MAX_FORCE);
  }

  // Combined neighbour pass (separation + alignment + cohesion) plus predator flee.
  function flock(a) {
    let sepX = 0, sepY = 0;
    let aliX = 0, aliY = 0, aliN = 0;
    let cohX = 0, cohY = 0, cohN = 0;

    for (let j = 0; j < agents.length; j++) {
      const o = agents[j];
      if (o === a) continue;
      const dx = a.x - o.x;
      const dy = a.y - o.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > PERCEPTION_SQ || d2 === 0) continue;

      aliX += o.vx; aliY += o.vy; aliN++;
      cohX += o.x;  cohY += o.y;  cohN++;

      if (d2 < SEPARATION_R_SQ) {
        const d = Math.sqrt(d2);
        sepX += (dx / d) / d;
        sepY += (dy / d) / d;
      }
    }

    let ax = 0, ay = 0;

    if (sepX !== 0 || sepY !== 0) {
      const s = steer(sepX, sepY, a);
      ax += s.x * W_SEP; ay += s.y * W_SEP;
    }
    if (aliN > 0) {
      const s = steer(aliX / aliN, aliY / aliN, a);
      ax += s.x * W_ALI; ay += s.y * W_ALI;
    }
    if (cohN > 0) {
      const s = steer(cohX / cohN - a.x, cohY / cohN - a.y, a);
      ax += s.x * W_COH; ay += s.y * W_COH;
    }

    // Predator avoidance — bank away from the cursor.
    if (cursor.active) {
      const dx = a.x - cursor.x;
      const dy = a.y - cursor.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < FLEE_RADIUS_SQ && d2 > 0) {
        const d = Math.sqrt(d2);
        const desX = (dx / d) * MAX_SPEED;
        const desY = (dy / d) * MAX_SPEED;
        const s = clampVec(desX - a.vx, desY - a.vy, FLEE_FORCE);
        const t = 1 - d / FLEE_RADIUS;
        const ease = t * t;
        ax += s.x * W_FLEE * ease;
        ay += s.y * W_FLEE * ease;
      }
    }

    return { ax, ay };
  }

  // One-shot radial impulse — the "strike".
  function applyShock(cx, cy) {
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];
      const dx = a.x - cx;
      const dy = a.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < SHOCK_RADIUS_SQ) {
        const d = Math.sqrt(d2) || 0.0001;
        const falloff = 1 - d / SHOCK_RADIUS;
        const kick = SHOCK_IMPULSE * falloff * falloff;
        a.vx += (dx / d) * kick;
        a.vy += (dy / d) * kick;
      }
    }
  }

  function drawAgent(a) {
    const sp = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
    const ratio = Math.min(sp / MAX_SPEED, 1.6);
    const alpha = Math.min(BASE_ALPHA * (0.7 + 0.3 * ratio), 0.42);
    const ang = Math.atan2(a.vy, a.vx);

    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(AGENT_LEN, 0);
    ctx.lineTo(-AGENT_LEN * 0.6, AGENT_HALF);
    ctx.lineTo(-AGENT_LEN * 0.6, -AGENT_HALF);
    ctx.closePath();
    ctx.fillStyle = `hsla(220, 13%, 52%, ${alpha.toFixed(3)})`;
    ctx.fill();
    ctx.restore();
  }

  function stepAgent(a, dtScale) {
    const { ax, ay } = flock(a);
    a.vx += ax * dtScale;
    a.vy += ay * dtScale;

    // Speed clamp: ease over-speed down (~15%/frame) so a strike settles smoothly,
    // and keep a floor so the flock never freezes.
    let sp = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
    if (sp > MAX_SPEED) {
      const factor = Math.max(MAX_SPEED / sp, 0.85);
      a.vx *= factor; a.vy *= factor;
    } else if (sp > 0 && sp < MIN_SPEED) {
      const factor = MIN_SPEED / sp;
      a.vx *= factor; a.vy *= factor;
    } else if (sp === 0) {
      const angle = Math.random() * Math.PI * 2;
      a.vx = Math.cos(angle) * MIN_SPEED;
      a.vy = Math.sin(angle) * MIN_SPEED;
    }

    a.x += a.vx * dtScale;
    a.y += a.vy * dtScale;

    // Wrap-around with margin for continuous flow.
    if (a.x < -EDGE_MARGIN) a.x = W + EDGE_MARGIN;
    else if (a.x > W + EDGE_MARGIN) a.x = -EDGE_MARGIN;
    if (a.y < -EDGE_MARGIN) a.y = H + EDGE_MARGIN;
    else if (a.y > H + EDGE_MARGIN) a.y = -EDGE_MARGIN;
  }

  function loop(ts) {
    const dtScale = lastTs ? Math.min(Math.max((ts - lastTs) / 16.667, 0), 3) : 1;
    lastTs = ts;

    cursor.active = Date.now() - lastMoveTime < IDLE_MS;

    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < agents.length; i++) {
      stepAgent(agents[i], dtScale);
      drawAgent(agents[i]);
    }

    rafId = requestAnimationFrame(loop);
  }

  function renderStaticFrame() {
    ctx.clearRect(0, 0, W, H);
    agents.forEach(drawAgent);
  }

  // --- Bootstrap ---
  setupCanvas();
  initAgents();

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

  document.addEventListener("click", (e) => applyShock(e.clientX, e.clientY));

  document.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    if (!t) return;
    cursor.x = t.clientX;
    cursor.y = t.clientY;
    lastMoveTime = Date.now();
    applyShock(t.clientX, t.clientY);
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
      // Keep the existing flock; just pull any strays back in-bounds.
      agents.forEach((a) => {
        if (a.x < 0) a.x = 0; else if (a.x > W) a.x = W;
        if (a.y < 0) a.y = 0; else if (a.y > H) a.y = H;
      });
    }, 150);
  }, { passive: true });
})();
