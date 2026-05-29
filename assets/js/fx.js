"use strict";

/* ============================================================================
   3D ROTATING MONOGRAM — "SN" rendered as an extruded 3D letter cloud.
   Letter shapes are sampled from an offscreen canvas, then distributed across
   three Z-depth layers and continuously rotated around the Y-axis with a
   gentle X-tilt oscillation. Perspective projection maps everything to 2D.
   Sits behind all content (z-index: -1) as a living watermark.
   ============================================================================ */

(function () {
  const canvas = document.getElementById("fx-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // --- Tuning ---
  const FOCAL        = 900;   // perspective focal length (CSS px)
  const DEPTH        = 65;    // extrusion depth in letter-space units
  const SAMPLE_STEP  = 8;     // pixel stride when sampling the offscreen letter render
  const DOT_R        = 3.8;   // base dot radius at scale=1
  const ROT_SPEED_Y  = 0.006; // Y-rotation radians per 16.667ms frame
  const TILT_X_BASE  = 0.18;  // static camera tilt around X (radians)
  const TILT_X_AMP   = 0.06;  // slow breathing oscillation amplitude
  const TILT_X_FREQ  = 0.00022; // oscillation frequency (rad/ms)

  // Three depth layers: front (index 0), mid (1), back (2)
  const LAYER_Z     = [-DEPTH / 2, 0, DEPTH / 2];
  const LAYER_ALPHA = [0.36, 0.20, 0.10]; // front brightest, back dimmest
  const COLOR       = "hsl(220,13%,52%)"; // --coolgray

  let dpr, W, H;
  let rafId = null, lastTs = 0;
  let rotY = 0;
  // letterPts: 2D positions (centered, letter-space) for all sampled pixels.
  // Each entry generates 3 points (one per layer) during drawFrame.
  let letterPts = []; // [{x, y}]

  // --- KEEP: canvas sizing with dpr cap ---
  function setupCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W   = window.innerWidth;
    H   = window.innerHeight;
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Sample letter pixels from an offscreen canvas render of "SN".
  function buildLetterPts() {
    const fontSize = Math.round(Math.min(W * 0.48, H * 0.36, 290));
    const offW = Math.ceil(fontSize * 2.5);
    const offH = Math.ceil(fontSize * 1.2);
    const off  = document.createElement("canvas");
    off.width  = offW;
    off.height = offH;
    const oc = off.getContext("2d");
    oc.fillStyle    = "#fff";
    oc.font         = `900 ${fontSize}px "Arial Black", Impact, Arial, sans-serif`;
    oc.textAlign    = "center";
    oc.textBaseline = "middle";
    oc.fillText("SN", offW / 2, offH / 2);
    const { data } = oc.getImageData(0, 0, offW, offH);
    letterPts = [];
    const ox = offW / 2;
    const oy = offH / 2;
    for (let y = 0; y < offH; y += SAMPLE_STEP) {
      for (let x = 0; x < offW; x += SAMPLE_STEP) {
        if (data[(y * offW + x) * 4 + 3] < 128) continue;
        letterPts.push({ x: x - ox, y: y - oy });
      }
    }
  }

  function drawFrame(ts) {
    ctx.clearRect(0, 0, W, H);

    const tiltX = TILT_X_BASE + Math.sin(ts * TILT_X_FREQ) * TILT_X_AMP;
    const cosY  = Math.cos(rotY), sinY = Math.sin(rotY);
    const cosX  = Math.cos(tiltX), sinX = Math.sin(tiltX);

    // Draw order: back layer first so the front paints on top.
    // Flip when the letter faces away (cos(rotY) < 0) to avoid X-ray effect.
    const order = cosY >= 0 ? [2, 1, 0] : [0, 1, 2];

    for (const li of order) {
      const z0 = LAYER_Z[li];
      ctx.globalAlpha = LAYER_ALPHA[li];
      ctx.fillStyle   = COLOR;
      ctx.beginPath();

      for (const { x, y } of letterPts) {
        // Y-axis rotation
        const rx   = x * cosY - z0 * sinY;
        const rz_y = x * sinY + z0 * cosY;
        // X-axis rotation (tilt)
        const ry   = y * cosX - rz_y * sinX;
        const rz   = y * sinX + rz_y * cosX;
        // Perspective projection
        const sc   = FOCAL / (FOCAL + rz);
        const sx   = rx * sc + W / 2;
        const sy   = ry * sc + H / 2;
        const r    = DOT_R * Math.max(0.5, sc * 0.95);
        ctx.moveTo(sx + r, sy);
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
      }

      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  function loop(ts) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min((ts - lastTs) / 16.667, 3);
    lastTs = ts;
    rotY += ROT_SPEED_Y * dt;
    drawFrame(ts);
    rafId = requestAnimationFrame(loop);
  }

  function renderStaticFrame() {
    setupCanvas();
    buildLetterPts();
    rotY = -0.55; // pleasant 3/4 view angle for the static snapshot
    drawFrame(1000);
  }

  // --- Bootstrap ---
  setupCanvas();
  buildLetterPts();

  if (reducedMotion) {
    renderStaticFrame();
    return; // strict no-motion: no listeners, no RAF
  }

  function start() {
    if (!rafId) { lastTs = 0; rafId = requestAnimationFrame(loop); }
  }
  function stop() {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  start();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { stop(); } else { start(); }
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      stop();
      setupCanvas();
      buildLetterPts();
      start();
    }, 150);
  }, { passive: true });
})();
