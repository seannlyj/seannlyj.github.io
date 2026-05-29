"use strict";

/* ============================================================================
   ROTATING KEYCAP — a 3D keyboard keycap with an "S" legend, spinning on its
   vertical axis behind the page content. Built from scratch on the 2D canvas:
   a rounded-square (superellipse) profile lofted through three rings into a
   tapered, soft-edged mesh, a Y-rotation matrix + fixed camera tilt,
   perspective projection, back-face culling, painter's-algorithm face sort,
   and Lambert shading from a fixed light. The "S" is sampled from an offscreen
   text render and laid onto the top face's plane.
   Sits behind all content (z-index: -1) as a living watermark.
   ============================================================================ */

(function () {
  const canvas = document.getElementById("fx-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // --- Tuning ---
  const FOCAL        = 1100;  // perspective focal length (CSS px)
  const ROT_SPEED    = 0.0065;// Y-rotation radians per 16.667ms frame
  const TILT_X       = 0.6;   // fixed camera tilt so the top + legend stay visible
  const SEG          = 44;    // points around the profile (higher = smoother)
  const ROUND        = 4;     // superellipse exponent (2 = circle, ∞ = square)
  const SAMPLE_STEP  = 5;     // pixel stride when sampling the offscreen "S"
  const DOT_R        = 3.2;   // legend dot radius at scale=1 (overlap into a solid S)
  const HUE = 220, SAT = 13;  // cool-gray palette (matches --coolgray)
  const FACE_ALPHA   = 0.34;  // subtle so body text stays readable
  const LEGEND_LIGHT = 26;    // dark engraved legend (reads on the light page)
  const LEGEND_ALPHA = 0.55;

  // Light direction (upper-left-front), normalized.
  const LIGHT = (() => {
    const v = [-0.35, -0.72, -0.6];
    const m = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / m, v[1] / m, v[2] / m];
  })();

  let dpr, W, H;
  let rafId = null, lastTs = 0;
  let rotY = 0;

  let outline = [];        // unit rounded-square profile [[x,z], ...]
  let verts = [];          // [[x,y,z], ...]
  let faces = [];          // [{ idx:[..], legend? }]
  let legendPts = [];      // [[x,y,z], ...] points just above the top face

  function buildOutline() {
    outline = [];
    for (let k = 0; k < SEG; k++) {
      const t = (k / SEG) * Math.PI * 2;
      const ct = Math.cos(t), st = Math.sin(t);
      const x = Math.sign(ct) * Math.pow(Math.abs(ct), 2 / ROUND);
      const z = Math.sign(st) * Math.pow(Math.abs(st), 2 / ROUND);
      outline.push([x, z]);
    }
  }

  function buildGeometry() {
    const SIZE = Math.min(W, H) * 0.17;
    const HH   = SIZE * 0.6;

    // Three rings lofted top→bottom: flat top, rounded shoulder, tapered base.
    const rings = [
      { y: -HH,        r: SIZE * 0.72 }, // top flat (legend sits here)
      { y: -HH * 0.45, r: SIZE * 0.8 },  // shoulder — softens the top edge
      { y:  HH,        r: SIZE * 1.0 },  // base
    ];

    verts = [];
    for (const ring of rings)
      for (const o of outline)
        verts.push([o[0] * ring.r, ring.y, o[1] * ring.r]);

    faces = [];
    // Top cap.
    const top = [];
    for (let i = 0; i < SEG; i++) top.push(i);
    faces.push({ idx: top, legend: true });

    // Side bands between consecutive rings.
    for (let r = 0; r < rings.length - 1; r++) {
      const a = r * SEG, b = (r + 1) * SEG;
      for (let i = 0; i < SEG; i++) {
        const ni = (i + 1) % SEG;
        faces.push({ idx: [a + i, a + ni, b + ni, b + i] });
      }
    }

    // Bottom cap (reversed so winding faces down).
    const last = (rings.length - 1) * SEG;
    const bottom = [];
    for (let i = SEG - 1; i >= 0; i--) bottom.push(last + i);
    faces.push({ idx: bottom });

    buildLegend(rings[0].y, rings[0].r);
  }

  // Sample an "S" from an offscreen render and lay the points on the top plane.
  function buildLegend(yTop, topR) {
    const fs   = 200;
    const offW = Math.ceil(fs * 1.1);
    const offH = Math.ceil(fs * 1.2);
    const off  = document.createElement("canvas");
    off.width  = offW;
    off.height = offH;
    const oc = off.getContext("2d");
    oc.fillStyle    = "#fff";
    oc.font         = `900 ${fs}px "Arial Black", Impact, Arial, sans-serif`;
    oc.textAlign    = "center";
    oc.textBaseline = "middle";
    oc.fillText("S", offW / 2, offH / 2);
    const { data } = oc.getImageData(0, 0, offW, offH);

    const norm = offH / 2;        // map glyph height to [-1, 1]
    const span = topR * 0.78;     // legend extent on the top face
    const y    = yTop - 0.5;      // a hair above the top to avoid z-fighting
    legendPts = [];
    for (let py = 0; py < offH; py += SAMPLE_STEP) {
      for (let px = 0; px < offW; px += SAMPLE_STEP) {
        if (data[(py * offW + px) * 4 + 3] < 128) continue;
        const lx = ((px - offW / 2) / norm) * span;
        const lz = ((py - offH / 2) / norm) * span;
        legendPts.push([lx, y, lz]);
      }
    }
  }

  // --- KEEP: canvas sizing with dpr cap ---
  function setupCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W   = window.innerWidth;
    H   = window.innerHeight;
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Rotate a point by rotY (vertical axis) then the fixed X tilt.
  let cosY = 1, sinY = 0;
  const cosX = Math.cos(TILT_X), sinX = Math.sin(TILT_X);
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

  function drawFrame() {
    ctx.clearRect(0, 0, W, H);
    cosY = Math.cos(rotY);
    sinY = Math.sin(rotY);

    const RV = verts.map(rotate);   // rotated verts
    const PV = RV.map(project);     // projected verts

    const draws = [];
    let topVisible = false, topFacing = 0;

    for (const f of faces) {
      const [a, b, c] = f.idx;
      const v0 = RV[a], v1 = RV[b], v2 = RV[c];
      const e1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
      const e2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
      let nx = e1[1] * e2[2] - e1[2] * e2[1];
      let ny = e1[2] * e2[0] - e1[0] * e2[2];
      let nz = e1[0] * e2[1] - e1[1] * e2[0];

      // Orient the normal outward (away from the centre at origin).
      let cxr = 0, cyr = 0, czr = 0;
      for (const i of f.idx) { cxr += RV[i][0]; cyr += RV[i][1]; czr += RV[i][2]; }
      const n = f.idx.length;
      cxr /= n; cyr /= n; czr /= n;
      if (nx * cxr + ny * cyr + nz * czr < 0) { nx = -nx; ny = -ny; nz = -nz; }

      // Visible when the normal points back toward the camera (nz < 0).
      if (nz >= 0) continue;

      const nl  = Math.hypot(nx, ny, nz) || 1;
      const ndl = (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / nl;
      const bright = 0.32 + 0.68 * Math.max(0, ndl);
      const light  = 22 + bright * 46;

      if (f.legend) { topVisible = true; topFacing = -nz / nl; }
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

    // Legend: only when the top faces the camera; fade as it turns edge-on.
    if (topVisible && legendPts.length) {
      const a = LEGEND_ALPHA * Math.min(1, topFacing * 1.7);
      if (a > 0.01) {
        ctx.fillStyle = `hsla(${HUE},${SAT}%,${LEGEND_LIGHT}%,${a.toFixed(3)})`;
        ctx.beginPath();
        for (const lp of legendPts) {
          const [sx, sy, sc] = project(rotate(lp));
          const r = DOT_R * Math.max(0.5, sc);
          ctx.moveTo(sx + r, sy);
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    }
  }

  function loop(ts) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min((ts - lastTs) / 16.667, 3);
    lastTs = ts;
    rotY += ROT_SPEED * dt;
    drawFrame();
    rafId = requestAnimationFrame(loop);
  }

  function renderStaticFrame() {
    rotY = -0.6; // pleasant 3/4 view for the static snapshot
    drawFrame();
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
      buildGeometry();
      start();
    }, 150);
  }, { passive: true });
})();
