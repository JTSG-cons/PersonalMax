// Generates the PWA icon set as real PNGs with zero dependencies
// (raw pixel buffer -> zlib -> hand-built PNG chunks).
// Run: node scripts/generate-icons.mjs

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

// --- minimal PNG encoder ------------------------------------------------------

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
}

function encodePng(size, pixels /* RGBA Uint8Array */) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // raw scanlines, each prefixed with filter byte 0
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    Buffer.from(pixels.buffer, y * size * 4, size * 4).copy(raw, rowStart + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- icon artwork ---------------------------------------------------------------
// Dark arena background with a violet dumbbell; drawn in normalized [0,1] space.

const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

const BG_TOP = hex("#1d1a2e");
const BG_BOTTOM = hex("#0b0a12");
const PLATE = hex("#8b5cf6");
const PLATE_INNER = hex("#a78bfa");
const BAR = hex("#ece9f8");
const GOLD = hex("#fbbf24");

const inRect = (x, y, cx, cy, hw, hh, r) => {
  // rounded rectangle centered at (cx, cy), half-extents hw/hh, corner radius r
  const dx = Math.max(Math.abs(x - cx) - (hw - r), 0);
  const dy = Math.max(Math.abs(y - cy) - (hh - r), 0);
  return dx * dx + dy * dy <= r * r;
};

function pixelColor(x, y, maskable) {
  // In maskable mode the artwork shrinks into the 80% safe zone.
  const s = maskable ? 0.72 : 1;
  const u = (x - 0.5) / s + 0.5;
  const v = (y - 0.5) / s + 0.5;

  // gold "level ring" arc accent near the top
  const ringDist = Math.hypot(x - 0.5, y - 0.5);
  const onRing = !maskable && ringDist > 0.455 && ringDist < 0.48 && y < 0.5;

  // dumbbell: bar + outer/inner plates on each side
  const bar = inRect(u, v, 0.5, 0.5, 0.30, 0.035, 0.03);
  const outerL = inRect(u, v, 0.235, 0.5, 0.045, 0.20, 0.04);
  const outerR = inRect(u, v, 0.765, 0.5, 0.045, 0.20, 0.04);
  const innerL = inRect(u, v, 0.335, 0.5, 0.04, 0.145, 0.035);
  const innerR = inRect(u, v, 0.665, 0.5, 0.04, 0.145, 0.035);

  if (outerL || outerR) return PLATE;
  if (innerL || innerR) return PLATE_INNER;
  if (bar) return BAR;
  if (onRing) return GOLD;

  // vertical gradient background
  const t = y;
  return [
    Math.round(BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * t),
    Math.round(BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * t),
    Math.round(BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * t),
  ];
}

function renderIcon(size, { maskable = false, rounded = false } = {}) {
  const pixels = new Uint8Array(size * size * 4);
  const cornerR = rounded ? size * 0.22 : 0;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const i = (py * size + px) * 4;
      const [r, g, b] = pixelColor((px + 0.5) / size, (py + 0.5) / size, maskable);
      let alpha = 255;
      if (rounded && !inRect((px + 0.5) / size, (py + 0.5) / size, 0.5, 0.5, 0.5, 0.5, cornerR / size)) {
        alpha = 0;
      }
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      pixels[i + 3] = alpha;
    }
  }
  return encodePng(size, pixels);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "icon-192.png"), renderIcon(192, { rounded: true }));
writeFileSync(join(OUT_DIR, "icon-512.png"), renderIcon(512, { rounded: true }));
writeFileSync(join(OUT_DIR, "icon-512-maskable.png"), renderIcon(512, { maskable: true }));
writeFileSync(join(OUT_DIR, "apple-icon-180.png"), renderIcon(180));
console.log(`Icons written to ${OUT_DIR}`);
