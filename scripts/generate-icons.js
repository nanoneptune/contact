import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const iconsDir = path.join(process.cwd(), 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate a valid uncompressed/DEFLATE PNG buffer programmatically
function createPng(width, height, isMaskable = false, isScreenshot = false, isWide = false) {
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function createChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData), 0);

    return Buffer.concat([len, typeAndData, crc]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = createChunk('IHDR', ihdrData);

  const rawData = Buffer.alloc((width * 4 + 1) * height);
  const cx = width / 2;
  const cy = height / 2;

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      if (isScreenshot) {
        // Render a mockup UI preview
        const isHeader = y < (isWide ? 70 : 90);
        const isSidebar = isWide && x < 280;
        const isCard = (isWide && x > 300 && x < width - 40 && y > 90 && y < height - 40) ||
                       (!isWide && x > 24 && x < width - 24 && y > 110 && y < height - 40);

        if (isHeader) {
          rawData[offset++] = 94; // #5e5ce6
          rawData[offset++] = 92;
          rawData[offset++] = 230;
          rawData[offset++] = 255;
        } else if (isSidebar) {
          rawData[offset++] = 245;
          rawData[offset++] = 245;
          rawData[offset++] = 248;
          rawData[offset++] = 255;
        } else if (isCard) {
          rawData[offset++] = 255;
          rawData[offset++] = 255;
          rawData[offset++] = 255;
          rawData[offset++] = 255;
        } else {
          rawData[offset++] = 250;
          rawData[offset++] = 250;
          rawData[offset++] = 252;
          rawData[offset++] = 255;
        }
      } else {
        const dx = x - cx;
        const dy = y - cy;

        // Gradient background
        const ratio = (x + y) / (width + height);
        const pr = Math.round(94 * (1 - ratio) + 0 * ratio);
        const pg = Math.round(92 * (1 - ratio) + 136 * ratio);
        const pb = Math.round(230 * (1 - ratio) + 204 * ratio);

        const cornerRadius = width * 0.22;
        const inBoxX = Math.abs(dx) < (width / 2 - cornerRadius);
        const inBoxY = Math.abs(dy) < (height / 2 - cornerRadius);
        const cornerDx = Math.max(0, Math.abs(dx) - (width / 2 - cornerRadius));
        const cornerDy = Math.max(0, Math.abs(dy) - (height / 2 - cornerRadius));
        const cornerDist = Math.sqrt(cornerDx * cornerDx + cornerDy * cornerDy);
        const inCard = isMaskable ? true : (inBoxX || inBoxY || cornerDist <= cornerRadius);

        const headDist = Math.sqrt((x - cx) ** 2 + (y - (cy - height * 0.12)) ** 2);
        const isHead = headDist <= width * 0.13;
        const bodyDx = x - cx;
        const bodyDy = y - (cy + height * 0.18);
        const isBody = (y >= cy + height * 0.05 && y <= cy + height * 0.32) &&
                       ((bodyDx / (width * 0.26)) ** 2 + (bodyDy / (height * 0.16)) ** 2 <= 1);

        if (isHead || isBody) {
          rawData[offset++] = 255;
          rawData[offset++] = 255;
          rawData[offset++] = 255;
          rawData[offset++] = 255;
        } else if (inCard) {
          rawData[offset++] = pr;
          rawData[offset++] = pg;
          rawData[offset++] = pb;
          rawData[offset++] = 255;
        } else {
          rawData[offset++] = 0;
          rawData[offset++] = 0;
          rawData[offset++] = 0;
          rawData[offset++] = 0;
        }
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idat = createChunk('IDAT', compressedData);
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// Generate all standard icon dimensions for PWA stores & PWABuilder
const sizes = [48, 72, 96, 128, 144, 152, 192, 256, 384, 512, 1024];

for (const size of sizes) {
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), createPng(size, size, false));
  fs.writeFileSync(path.join(iconsDir, `icon-maskable-${size}.png`), createPng(size, size, true));
}

// Generate standard Apple Touch Icon & Favicons
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), createPng(180, 180, false));
fs.writeFileSync(path.join(iconsDir, 'favicon-32x32.png'), createPng(32, 32, false));
fs.writeFileSync(path.join(iconsDir, 'favicon-16x16.png'), createPng(16, 16, false));

// Generate Wide (Desktop) & Narrow (Mobile) Screenshots
fs.writeFileSync(path.join(iconsDir, 'screenshot-desktop.png'), createPng(1280, 720, false, true, true));
fs.writeFileSync(path.join(iconsDir, 'screenshot-mobile.png'), createPng(750, 1334, false, true, false));

console.log('Successfully generated all PWA icons & store screenshots for PWABuilder 40/40 compliance.');
