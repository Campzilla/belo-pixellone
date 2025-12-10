import { RGB } from '../types';

// CRC32 Table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function updateCrc(crc: number, buf: Uint8Array): number {
  let c = crc;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c;
}

function crc(buf: Uint8Array): number {
  return updateCrc(0xffffffff, buf) ^ 0xffffffff;
}

// Adler-32 for zlib
function adler32(buf: Uint8Array): number {
  let a = 1, b = 0, L = buf.length, i = 0;
  while (L > 0) {
    let n = Math.min(L, 3800);
    L -= n;
    while (n-- > 0) {
      a = (a + buf[i++]) % 65521;
      b = (b + a) % 65521;
    }
  }
  return (b << 16) | a;
}

// Write a 32-bit integer (Big Endian)
function writeUint32(buf: Uint8Array, pos: number, val: number) {
  buf[pos] = (val >>> 24) & 0xff;
  buf[pos + 1] = (val >>> 16) & 0xff;
  buf[pos + 2] = (val >>> 8) & 0xff;
  buf[pos + 3] = val & 0xff;
}

// Create a valid chunk
function createChunk(type: string, data: Uint8Array): Uint8Array {
  const len = data.length;
  const chunk = new Uint8Array(len + 12);
  writeUint32(chunk, 0, len);
  for (let i = 0; i < 4; i++) chunk[4 + i] = type.charCodeAt(i);
  chunk.set(data, 8);
  const crcVal = crc(chunk.subarray(4, 8 + len));
  writeUint32(chunk, 8 + len, crcVal);
  return chunk;
}

/**
 * Generates an 8-bit Indexed PNG blob.
 * Uses uncompressed Deflate blocks (Stored) to avoid complex compression logic in pure JS,
 * ensuring 100% compatibility with retro tools without heavy libraries.
 */
export const createIndexedPNG = (
  width: number,
  height: number,
  indices: Uint8Array,
  palette: RGB[],
  transparentIndex: number
): Blob => {
  // 1. Signature
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  // 2. IHDR
  const ihdrData = new Uint8Array(13);
  writeUint32(ihdrData, 0, width);
  writeUint32(ihdrData, 4, height);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 3; // Color type: 3 (Indexed)
  ihdrData[10] = 0; // Compression: 0
  ihdrData[11] = 0; // Filter: 0
  ihdrData[12] = 0; // Interlace: 0
  const ihdr = createChunk('IHDR', ihdrData);

  // 3. PLTE
  // Ensure palette is fully populated (up to 256 for safety, though mapped by index)
  // We only need as many entries as the max index, but PNG standard suggests keeping it tight or full.
  const plteData = new Uint8Array(palette.length * 3);
  for (let i = 0; i < palette.length; i++) {
    plteData[i * 3] = palette[i].r;
    plteData[i * 3 + 1] = palette[i].g;
    plteData[i * 3 + 2] = palette[i].b;
  }
  const plte = createChunk('PLTE', plteData);

  // 4. tRNS (Transparency)
  let trns: Uint8Array = new Uint8Array(0);
  if (transparentIndex !== -1 && transparentIndex < palette.length) {
    // PNG transparency for indexed images matches the palette indices.
    // If index 0 is transparent, we need 1 byte: [0].
    // If index 5 is transparent, we need 6 bytes: [255, 255, 255, 255, 255, 0].
    const trnsData = new Uint8Array(transparentIndex + 1);
    trnsData.fill(255); // Opaque by default
    trnsData[transparentIndex] = 0; // Fully transparent
    trns = createChunk('tRNS', trnsData);
  }

  // 5. IDAT (Image Data)
  // Rows are prepended with filter byte (0).
  const rowSize = width + 1; // 1 byte filter + width pixels
  const rawData = new Uint8Array(height * rowSize);
  for (let y = 0; y < height; y++) {
    rawData[y * rowSize] = 0; // No filter
    // Copy row indices
    for (let x = 0; x < width; x++) {
      rawData[y * rowSize + 1 + x] = indices[y * width + x];
    }
  }

  // Zlib wrapper around raw data (No compression - "Stored" blocks)
  // Header: 78 01 (Deflate, no preset dictionary)
  // Block: 00 (No compression), Len, NLen, Data
  // Max block size is 65535
  const blocks: Uint8Array[] = [];
  const zlibHeader = new Uint8Array([0x78, 0x01]);
  blocks.push(zlibHeader);

  let offset = 0;
  while (offset < rawData.length) {
    const isLast = (offset + 65535) >= rawData.length;
    const blockSize = Math.min(65535, rawData.length - offset);
    
    // Block header: 1 byte type, 2 bytes len, 2 bytes nlen
    const header = new Uint8Array(5);
    header[0] = isLast ? 0x01 : 0x00; // BFINAL + BTYPE(00)
    header[1] = blockSize & 0xff;
    header[2] = (blockSize >>> 8) & 0xff;
    header[3] = (~blockSize) & 0xff;
    header[4] = ((~blockSize) >>> 8) & 0xff;
    
    blocks.push(header);
    blocks.push(rawData.subarray(offset, offset + blockSize));
    offset += blockSize;
  }

  // Adler32 footer (Big Endian)
  const adler = adler32(rawData);
  const footer = new Uint8Array(4);
  writeUint32(footer, 0, adler);
  blocks.push(footer);

  // Combine IDAT payload
  const totalSize = blocks.reduce((sum, b) => sum + b.length, 0);
  const idatPayload = new Uint8Array(totalSize);
  let p = 0;
  for (const b of blocks) {
    idatPayload.set(b, p);
    p += b.length;
  }
  const idat = createChunk('IDAT', idatPayload);

  // 6. IEND
  const iend = createChunk('IEND', new Uint8Array(0));

  // Combine all chunks
  return new Blob([signature, ihdr, plte, trns, idat, iend], { type: 'image/png' });
};

/**
 * Fast client-side re-renderer. 
 * Takes indices and a MODIFIED palette, returns a new visual DataURL.
 * This skips the heavy image processing steps.
 */
export const renderFromIndices = (
  width: number,
  height: number,
  indices: Uint8Array,
  palette: RGB[],
  transparentIndex: number
): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  for (let i = 0; i < indices.length; i++) {
    const idx = indices[i];
    const outIdx = i * 4;
    
    if (idx === transparentIndex) {
      data[outIdx + 3] = 0;
    } else {
      const color = palette[idx];
      // Safety check if palette shrank (shouldn't happen in valid flow)
      if (color) {
        data[outIdx] = color.r;
        data[outIdx + 1] = color.g;
        data[outIdx + 2] = color.b;
        data[outIdx + 3] = 255;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
};