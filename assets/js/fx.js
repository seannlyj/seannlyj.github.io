"use strict";

/* ============================================================================
   ROTATING KEYCAP — a 3D keyboard keycap with an "S" legend, spinning behind
   the page as a living watermark. Built on the 2D canvas: a rounded-square
   profile lofted into a tapered mesh, Y-rotation + fixed camera tilt,
   perspective projection, back-face culling, painter's-algorithm sort, and
   Lambert shading. Press and hold anywhere to depress the key; release to
   spring it back. Sits behind all content (z-index: -1).

   Performance: the loop is capped to ~30fps, pauses entirely while the hero is
   scrolled out of view, and blits the "S" legend as a pre-rendered texture with
   a single drawImage per frame instead of sampling it dot-by-dot.
   ============================================================================ */

(function () {
  const canvas = document.getElementById("fx-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  // --- Tuning ---
  const FOCAL = 1100; // perspective focal length (CSS px)
  const ROT_SPEED = 0.0035; // Y-rotation radians per 16.667ms frame
  const TILT_X = 1; // fixed camera tilt so the top + legend stay visible
  const SEG = 44; // points around the profile (higher = smoother)
  const ROUND = 8; // superellipse exponent (2 = circle, ∞ = square)
  const HUE = 220,
    SAT = 15; // cool-gray palette (matches --coolgray)
  const FACE_ALPHA = 0.1; // subtle so body text stays readable
  const LEGEND_ALPHA = 1; // legend opacity when the top fully faces the camera
  const FRAME_MIN_MS = 1000 / 30; // frame-rate cap — the rotation is slow

  // Press animation — a real keycap. The key travels DOWN and HOLDS while the
  // pointer is held, then SPRINGS back up with a little overshoot on release.
  const PRESS_DEPTH = 52; // world-Y travel at full depress (~28 px on screen)
  const DOWN_OMEGA = 42; // natural frequency (rad/s) — firm bottom-out
  const DOWN_ZETA = 0.82;
  const UP_OMEGA = 30; // springier on the way up
  const UP_ZETA = 0.38; // underdamped, small overshoot above rest

  // Light direction (upper-left-front), normalized.
  const LIGHT = (() => {
    const v = [-0.35, -0.72, -0.6];
    const m = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / m, v[1] / m, v[2] / m];
  })();

  let dpr, W, H;
  let rafId = null;
  let rotY = 0;
  let pressTarget = 0; // 0 = released (up), PRESS_DEPTH = held (down)
  let pressPos = 0; // current depth (world-Y), integrated each frame
  let pressVel = 0; // depth velocity (world-Y per second)

  let outline = []; // unit rounded-square profile [[x,z], ...]
  let verts = []; // [[x,y,z], ...]
  let faces = []; // [{ idx:[..], legend? }]
  let legendCanvas = null; // pre-rendered "S" glyph texture
  let legendW = 0,
    legendH = 0; // texture dimensions
  let legendCorners = null; // [P00, P10, P01] local coords of the texture corners

  function buildOutline() {
    outline = [];
    for (let k = 0; k < SEG; k++) {
      const t = (k / SEG) * Math.PI * 2;
      const ct = Math.cos(t),
        st = Math.sin(t);
      const x = Math.sign(ct) * Math.pow(Math.abs(ct), 2 / ROUND);
      const z = Math.sign(st) * Math.pow(Math.abs(st), 2 / ROUND);
      outline.push([x, z]);
    }
  }

  function buildGeometry() {
    const SIZE = Math.min(W, H) * 0.17;
    const HH = SIZE * 0.6;

    const rings = [
      { y: -HH, r: SIZE * 0.72 }, // top flat (legend sits here)
      { y: -HH * 0.45, r: SIZE * 0.8 }, // shoulder — softens the top edge
      { y: HH, r: SIZE * 1.0 }, // base
    ];

    verts = [];
    for (const ring of rings)
      for (const o of outline)
        verts.push([o[0] * ring.r, ring.y, o[1] * ring.r]);

    faces = [];
    const top = [];
    for (let i = 0; i < SEG; i++) top.push(i);
    faces.push({ idx: top, legend: true });

    for (let r = 0; r < rings.length - 1; r++) {
      const a = r * SEG,
        b = (r + 1) * SEG;
      for (let i = 0; i < SEG; i++) {
        const ni = (i + 1) % SEG;
        faces.push({ idx: [a + i, a + ni, b + ni, b + i] });
      }
    }

    const last = (rings.length - 1) * SEG;
    const bottom = [];
    for (let i = SEG - 1; i >= 0; i--) bottom.push(last + i);
    faces.push({ idx: bottom });

    buildLegend(rings[0].y, rings[0].r);
  }

  // Render the "S" once to an offscreen canvas and record the three corners of
  // its plane (in local space). Each frame we project those corners and blit the
  // texture with one affine drawImage — no per-pixel sampling.
  function buildLegend(yTop, topR) {
    const fs = 200;
    const offW = Math.ceil(fs * 1.1);
    const offH = Math.ceil(fs * 1.2);
    const off = document.createElement("canvas");
    off.width = offW;
    off.height = offH;
    const oc = off.getContext("2d");
    oc.fillStyle = "#fff";
    oc.font = `900 ${fs}px "Arial Black", Impact, Arial, sans-serif`;
    oc.textAlign = "center";
    oc.textBaseline = "middle";
    oc.fillText("S", offW / 2, offH / 2);

    const span = topR * 0.78; // legend extent on the top face
    const y = yTop - 0.5; // a hair above the top to avoid z-fighting
    const ax = (offW / offH) * span; // half-width in world X

    legendCanvas = off;
    legendW = offW;
    legendH = offH;
    // Image (0,0) → top-left, (offW,0) → top-right, (0,offH) → bottom-left.
    legendCorners = [
      [-ax, y, span],
      [ax, y, span],
      [-ax, y, -span],
    ];
  }

  // --- KEEP: canvas sizing with dpr cap ---
  function setupCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Rotate a point by rotY (vertical axis) then the fixed X tilt.
  let cosY = 1,
    sinY = 0;
  const cosX = Math.cos(TILT_X),
    sinX = Math.sin(TILT_X);
  function rotate(p) {
    const x = p[0] * cosY + p[2] * sinY;
    const z = -p[0] * sinY + p[2] * cosY;
    const y2 = p[1] * cosX - z * sinX;
    const z2 = p[1] * sinX + z * cosX;
    return [x, y2, z2];
  }
  function project(rp) {
    const sc = FOCAL / (FOCAL + rp[2]);
    return [rp[0] * sc + W / 2, rp[1] * sc + H / 2, sc];
  }

  // Advance the press spring toward its target. Fixed sub-steps keep the stiff
  // spring stable regardless of frame pacing.
  function stepPress(dtSec) {
    const omega = pressTarget > 0 ? DOWN_OMEGA : UP_OMEGA;
    const zeta = pressTarget > 0 ? DOWN_ZETA : UP_ZETA;
    let t = Math.min(dtSec, 0.05);
    const h = 1 / 240;
    while (t > 0) {
      const step = Math.min(h, t);
      const a =
        omega * omega * (pressTarget - pressPos) - 2 * zeta * omega * pressVel;
      pressVel += a * step;
      pressPos += pressVel * step;
      t -= step;
    }
  }

  function drawFrame() {
    ctx.clearRect(0, 0, W, H);
    cosY = Math.cos(rotY);
    sinY = Math.sin(rotY);

    // --- Press: spring-driven depth, held while the pointer is down ---
    // cosX converts world-Y travel to screen-Y (camera is tilted by TILT_X).
    const screenPressY = pressPos * cosX;

    ctx.save();
    ctx.translate(0, screenPressY);

    const RV = verts.map(rotate); // rotated verts
    const PV = RV.map(project); // projected verts

    const draws = [];
    let topVisible = false,
      topFacing = 0;

    for (const f of faces) {
      const [a, b, c] = f.idx;
      const v0 = RV[a],
        v1 = RV[b],
        v2 = RV[c];
      const e1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
      const e2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
      let nx = e1[1] * e2[2] - e1[2] * e2[1];
      let ny = e1[2] * e2[0] - e1[0] * e2[2];
      let nz = e1[0] * e2[1] - e1[1] * e2[0];

      // Orient the normal outward (away from the centre at origin).
      let cxr = 0,
        cyr = 0,
        czr = 0;
      for (const i of f.idx) {
        cxr += RV[i][0];
        cyr += RV[i][1];
        czr += RV[i][2];
      }
      const n = f.idx.length;
      cxr /= n;
      cyr /= n;
      czr /= n;
      if (nx * cxr + ny * cyr + nz * czr < 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }

      // Visible when the normal points back toward the camera (nz < 0).
      if (nz >= 0) continue;

      const nl = Math.hypot(nx, ny, nz) || 1;
      const ndl = (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / nl;
      const bright = 0.32 + 0.68 * Math.max(0, ndl);
      const light = 22 + bright * 46;

      if (f.legend) {
        topVisible = true;
        topFacing = -nz / nl;
      }
      draws.push({ idx: f.idx, z: czr, light });
    }

    draws.sort((p, q) => q.z - p.z); // far first (painter's algorithm)

    for (const d of draws) {
      ctx.beginPath();
      const p0 = PV[d.idx[0]];
      ctx.moveTo(p0[0], p0[1]);
      for (let i = 1; i < d.idx.length; i++) {
        const p = PV[d.idx[i]];
        ctx.lineTo(p[0], p[1]);
      }
      ctx.closePath();
      const fill = `hsla(${HUE},${SAT}%,${d.light.toFixed(0)}%,${FACE_ALPHA})`;
      ctx.fillStyle = fill;
      // Stroke in the same colour to seal antialiased seams between faces.
      ctx.strokeStyle = fill;
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
    }

    // Legend: blit the pre-rendered "S" texture onto the top face with a single
    // affine drawImage (perspective is mild at this scale). Only while the top
    // faces the camera; fade as it turns edge-on.
    if (topVisible && legendCanvas) {
      const a = LEGEND_ALPHA * Math.min(1, topFacing * 1.7);
      if (a > 0.01) {
        const s00 = project(rotate(legendCorners[0]));
        const s10 = project(rotate(legendCorners[1]));
        const s01 = project(rotate(legendCorners[2]));
        ctx.save();
        ctx.globalAlpha = a;
        ctx.transform(
          (s10[0] - s00[0]) / legendW,
          (s10[1] - s00[1]) / legendW,
          (s01[0] - s00[0]) / legendH,
          (s01[1] - s00[1]) / legendH,
          s00[0],
          s00[1],
        );
        ctx.drawImage(legendCanvas, 0, 0);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  let lastFrame = 0;
  function loop(ts) {
    rafId = requestAnimationFrame(loop);
    // Frame-rate cap: skip until at least FRAME_MIN_MS has elapsed.
    if (lastFrame && ts - lastFrame < FRAME_MIN_MS) return;
    const rawMs = lastFrame ? ts - lastFrame : 16.667;
    lastFrame = ts;
    const dt = Math.min(rawMs / 16.667, 3);
    rotY += ROT_SPEED * dt;
    stepPress(rawMs / 1000);
    drawFrame();
  }

  function renderStaticFrame() {
    rotY = -0.6; // pleasant 3/4 view for the static snapshot
    drawFrame(); // pressPos = 0, key sits at rest
  }

  // --- Bootstrap ---
  setupCanvas();
  buildOutline();
  buildGeometry();

  if (reducedMotion) {
    renderStaticFrame();
    return; // strict no-motion: no listeners, no RAF
  }

  function start() {
    if (!rafId) {
      lastFrame = 0;
      rafId = requestAnimationFrame(loop);
    }
  }
  function stop() {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  // Run only while the page is visible AND the hero (top) is on screen.
  let heroVisible = true;
  let docVisible = !document.hidden;
  function updateRunning() {
    if (heroVisible && docVisible) start();
    else stop();
  }

  function pressDown() {
    pressTarget = PRESS_DEPTH;
  }
  function pressUp() {
    pressTarget = 0;
  }

  updateRunning();

  // Press-and-hold: depress on pointer-down, spring back up on release.
  document.addEventListener("pointerdown", pressDown);
  // Release is caught on window so a pointer-up outside the page still counts.
  window.addEventListener("pointerup", pressUp);
  window.addEventListener("pointercancel", pressUp);
  window.addEventListener("blur", pressUp);

  document.addEventListener("visibilitychange", () => {
    docVisible = !document.hidden;
    updateRunning();
  });

  // Pause the render loop while the hero is scrolled out of view — the keycap is
  // barely visible behind lower sections, so this hands those frames back to
  // scrolling the heavier sections below (e.g. Work).
  const heroEl = document.getElementById("home");
  if (heroEl && "IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => {
        heroVisible = entry.isIntersecting;
        updateRunning();
      },
      { threshold: 0 },
    ).observe(heroEl);
  }

  let resizeTimer;
  window.addEventListener(
    "resize",
    () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        stop();
        setupCanvas();
        buildGeometry();
        updateRunning();
      }, 150);
    },
    { passive: true },
  );
})();
