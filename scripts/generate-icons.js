import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const iconsDir = path.join(process.cwd(), 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate a valid uncompressed/DEFLATE PNG buffer programmatically
function createPng(width, height, r, g, b, isMaskable = false) {
  // CRC32 table
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

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bit depth
  ihdrData[9] = 6; // RGBA color type
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = createChunk('IHDR', ihdrData);

  // Raw image scanlines (RGBA with filter byte 0 per row)
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  const cx = width / 2;
  const cy = height / 2;
  const outerR = (Math.min(width, height) / 2) * (isMaskable ? 0.98 : 0.85);

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter byte: None
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Gradient background
      const ratio = (x + y) / (width + height);
      const pr = Math.round(94 * (1 - ratio) + 0 * ratio);
      const pg = Math.round(92 * (1 - ratio) + 136 * ratio);
      const pb = Math.round(230 * (1 - ratio) + 204 * ratio);

      // Rounded rect or circle icon background
      const cornerRadius = width * 0.22;
      const inBoxX = Math.abs(dx) < (width / 2 - cornerRadius);
      const inBoxY = Math.abs(dy) < (height / 2 - cornerRadius);
      const cornerDx = Math.max(0, Math.abs(dx) - (width / 2 - cornerRadius));
      const cornerDy = Math.max(0, Math.abs(dy) - (height / 2 - cornerRadius));
      const cornerDist = Math.sqrt(cornerDx * cornerDx + cornerDy * cornerDy);
      const inCard = isMaskable ? true : (inBoxX || inBoxY || cornerDist <= cornerRadius);

      // Contact glyph (circle head + arc body)
      const headDist = Math.sqrt((x - cx) ** 2 + (y - (cy - height * 0.12)) ** 2);
      const isHead = headDist <= width * 0.13;
      const bodyDx = x - cx;
      const bodyDy = y - (cy + height * 0.18);
      const isBody = (y >= cy + height * 0.05 && y <= cy + height * 0.32) &&
                     ((bodyDx / (width * 0.26)) ** 2 + (bodyDy / (height * 0.16)) ** 2 <= 1);

      if (isHead || isBody) {
        // White icon foreground
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
        // Transparent outside card
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        rawData[offset++] = 0;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idat = createChunk('IDAT', compressedData);
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// Write standard icons
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createPng(192, 192, 94, 92, 230, false));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createPng(512, 512, 94, 92, 230, false));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-192.png'), createPng(192, 192, 94, 92, 230, true));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), createPng(512, 512, 94, 92, 230, true));

// Create mock screenshots for PWA store preview validation
fs.writeFileSync(path.join(iconsDir, 'screenshot-desktop.png'), createPng(1280, 720, 245, 245, 250, true));
fs.writeFileSync(path.join(iconsDir, 'screenshot-mobile.png'), createPng(750, 1334, 245, 245, 250, true));

console.log('Successfully generated all PWA icons & screenshots in /public/icons');
