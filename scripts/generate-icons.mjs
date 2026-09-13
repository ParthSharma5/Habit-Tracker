/**
 * Generates the raster icons in public/ from the same flame geometry as
 * public/favicon.svg, so the SVG and the PNGs can never drift apart.
 *
 *   node scripts/generate-icons.mjs
 *
 * Written against Node's own zlib so the project needs no image dependency.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

// Brand palette — keep in sync with favicon.svg and the app's violet/amber accents.
const BG_TOP = [109, 40, 217]; // violet-700
const BG_BOTTOM = [168, 85, 247]; // purple-500
const FLAME_OUTER = [251, 191, 36]; // amber-400
const FLAME_INNER = [255, 247, 214]; // warm white

/**
 * Flame outline in a 0..1 box, as cubic beziers: [startX, startY, ...curves].
 *
 * Deliberately asymmetric: the tip leans right and the left shoulder carries a
 * notch. A symmetric teardrop reads as a water droplet, not fire.
 */
const FLAME_OUTER_PATH = [
  [0.56, 0.05],
  [[0.56, 0.18], [0.70, 0.26], [0.74, 0.38]], // right of the tip, sweeping down
  [[0.80, 0.50], [0.84, 0.58], [0.84, 0.67]], // right belly
  [[0.84, 0.82], [0.69, 0.94], [0.50, 0.94]], // round bottom
  [[0.31, 0.94], [0.16, 0.82], [0.16, 0.67]],
  [[0.16, 0.56], [0.22, 0.50], [0.28, 0.42]], // left side rising
  [[0.36, 0.32], [0.34, 0.22], [0.30, 0.15]], // the lick that makes it fire
  [[0.42, 0.22], [0.50, 0.14], [0.56, 0.05]],
];

/** Inner flame — smaller, sitting lower, leaning the same way, for depth. */
const FLAME_INNER_PATH = [
  [0.53, 0.44],
  [[0.59, 0.55], [0.67, 0.62], [0.67, 0.71]],
  [[0.67, 0.80], [0.595, 0.87], [0.50, 0.87]],
  [[0.405, 0.87], [0.33, 0.80], [0.33, 0.71]],
  [[0.33, 0.63], [0.44, 0.56], [0.53, 0.44]],
];

function flattenPath(path, segmentsPerCurve = 48) {
  const points = [path[0]];
  let current = path[0];

  for (let i = 1; i < path.length; i++) {
    const [c1, c2, end] = path[i];

    for (let s = 1; s <= segmentsPerCurve; s++) {
      const t = s / segmentsPerCurve;
      const u = 1 - t;

      points.push([
        u * u * u * current[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * end[0],
        u * u * u * current[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * end[1],
      ]);
    }
    current = end;
  }

  return points;
}

function isInsidePolygon(points, x, y) {
  let inside = false;

  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}

/** Signed-distance style test for a rounded square covering the whole canvas. */
function isInsideRoundedSquare(x, y, radius) {
  const dx = Math.max(radius - x, 0, x - (1 - radius));
  const dy = Math.max(radius - y, 0, y - (1 - radius));

  return dx * dx + dy * dy <= radius * radius;
}

function blend(base, layer, alpha) {
  return [
    Math.round(base[0] + (layer[0] - base[0]) * alpha),
    Math.round(base[1] + (layer[1] - base[1]) * alpha),
    Math.round(base[2] + (layer[2] - base[2]) * alpha),
  ];
}

/**
 * @param size pixel dimensions
 * @param scale how much of the canvas the flame occupies (smaller for maskable
 *   icons, whose outer ~10% can be cropped to any shape by the platform)
 * @param cornerRadius 0.5 renders a circle, 0 a hard square
 */
function renderIcon(size, { scale = 0.56, cornerRadius = 0.22 } = {}) {
  const outer = flattenPath(FLAME_OUTER_PATH);
  const inner = flattenPath(FLAME_INNER_PATH);

  const samples = 4; // 4x4 supersampling for smooth edges
  const pixels = Buffer.alloc(size * size * 4);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let bgHits = 0;
      let outerHits = 0;
      let innerHits = 0;

      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = (px + (sx + 0.5) / samples) / size;
          const y = (py + (sy + 0.5) / samples) / size;

          if (!isInsideRoundedSquare(x, y, cornerRadius)) continue;
          bgHits++;

          // Map the canvas point into the flame's own 0..1 space.
          const fx = (x - 0.5) / scale + 0.5;
          const fy = (y - 0.5) / scale + 0.5;
          if (fx < 0 || fx > 1 || fy < 0 || fy > 1) continue;

          if (isInsidePolygon(outer, fx, fy)) outerHits++;
          if (isInsidePolygon(inner, fx, fy)) innerHits++;
        }
      }

      const total = samples * samples;
      const offset = (py * size + px) * 4;
      const alpha = Math.round((bgHits / total) * 255);

      if (alpha === 0) continue;

      // Vertical gradient for the background plate.
      const t = py / (size - 1);
      let color = blend(BG_TOP, BG_BOTTOM, t);
      color = blend(color, FLAME_OUTER, outerHits / total);
      color = blend(color, FLAME_INNER, innerHits / total);

      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = alpha;
    }
  }

  return pixels;
}

// ---- minimal PNG writer -----------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);

  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }

  return table;
})();

function crc32(buf) {
  let c = -1;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);

  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));

  return Buffer.concat([length, body, crc]);
}

function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // 10-12 stay zero: deflate, adaptive filtering, no interlace.

  // Each scanline is prefixed with its filter byte (0 = none).
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const from = y * size * 4;
    pixels.copy(raw, y * (size * 4 + 1) + 1, from, from + size * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** ICO wrapping a PNG payload — supported everywhere that still asks for .ico. */
function encodeIco(size, png) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image

  const entry = Buffer.alloc(16);
  entry[0] = size < 256 ? size : 0;
  entry[1] = size < 256 ? size : 0;
  entry[4] = 1; // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);

  return Buffer.concat([header, entry, png]);
}

// ---- output -----------------------------------------------------------------

mkdirSync(PUBLIC_DIR, { recursive: true });

const targets = [
  { file: "favicon-32.png", size: 32, opts: { scale: 0.62, cornerRadius: 0.22 } },
  { file: "apple-touch-icon.png", size: 180, opts: { scale: 0.58, cornerRadius: 0.0 } },
  { file: "icon-192.png", size: 192, opts: { scale: 0.5, cornerRadius: 0.22 } },
  { file: "icon-512.png", size: 512, opts: { scale: 0.5, cornerRadius: 0.22 } },
];

for (const { file, size, opts } of targets) {
  const png = encodePng(size, renderIcon(size, opts));
  writeFileSync(join(PUBLIC_DIR, file), png);
  console.log(`${file.padEnd(22)} ${size}x${size}  ${png.length} bytes`);
}

const icoPng = encodePng(32, renderIcon(32, { scale: 0.62, cornerRadius: 0.22 }));
const ico = encodeIco(32, icoPng);
writeFileSync(join(PUBLIC_DIR, "favicon.ico"), ico);
console.log(`${"favicon.ico".padEnd(22)} 32x32  ${ico.length} bytes`);
