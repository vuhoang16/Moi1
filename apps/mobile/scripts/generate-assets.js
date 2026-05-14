#!/usr/bin/env node
/**
 * Generates placeholder app assets (solid-color PNGs).
 * Replace with real design assets before production release.
 *
 * Run: node apps/mobile/scripts/generate-assets.js
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function solidPNG(width, height, r, g, b) {
  const scanline = width * 3 + 1; // 1 filter byte + RGB per pixel
  const raw = Buffer.alloc(scanline * height);
  for (let y = 0; y < height; y++) {
    raw[y * scanline] = 0; // filter type = None
    for (let x = 0; x < width; x++) {
      const i = y * scanline + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  const deflated = zlib.deflateSync(raw, { level: 9 });

  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) {
      c ^= b;
      for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
    return (c ^ 0xffffffff) >>> 0;
  };

  const chunk = (type, data) => {
    const t = Buffer.from(type);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, crcBuf]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB color type

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', deflated),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const ASSETS = path.join(__dirname, '..', 'assets');
fs.mkdirSync(ASSETS, { recursive: true });

// Primary navy: #1B4F72 = rgb(27, 79, 114)
const [NR, NG, NB] = [27, 79, 114];
// White for splash background
const [WR, WG, WB] = [255, 255, 255];

const files = [
  { name: 'icon.png',          w: 1024, h: 1024,  r: NR, g: NG, b: NB },
  { name: 'adaptive-icon.png', w: 1024, h: 1024,  r: NR, g: NG, b: NB },
  { name: 'splash.png',        w: 2048, h: 2048,  r: WR, g: WG, b: WB },
  { name: 'favicon.png',       w: 196,  h: 196,   r: NR, g: NG, b: NB },
];

for (const { name, w, h, r, g, b } of files) {
  const out = path.join(ASSETS, name);
  process.stdout.write(`Generating ${name} (${w}×${h})... `);
  fs.writeFileSync(out, solidPNG(w, h, r, g, b));
  console.log('done');
}

console.log('\nPlaceholder assets created in apps/mobile/assets/');
console.log('Replace with real design assets before release.');
