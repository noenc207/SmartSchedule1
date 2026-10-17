// Pure JavaScript GIF89a Encoder (Zero npm dependencies)
// Supports global/local palette, loop count, frame delay, LZW compression

class GifEncoder {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.frames = [];
    this.delay = 10; // in hundredths of a second (10 = 100ms = 10fps)
    this.repeat = 0; // 0 = infinite loop
  }

  setDelay(ms) {
    this.delay = Math.round(ms / 10);
  }

  setRepeat(repeat) {
    this.repeat = repeat;
  }

  addFrame(rgbaData) {
    // rgbaData is Buffer or Uint8Array of size width * height * 4
    this.frames.push(Buffer.from(rgbaData));
  }

  // Quantize 24/32-bit RGBA to 256-color palette (Simple uniform/popularity quantizer)
  quantize(rgba) {
    const palette = [];
    const colorMap = new Map();
    const indexed = new Uint8Array(this.width * this.height);

    for (let i = 0; i < rgba.length; i += 4) {
      const r = rgba[i] & 0xf8;
      const g = rgba[i + 1] & 0xf8;
      const b = rgba[i + 2] & 0xf8;
      const key = (r << 16) | (g << 8) | b;

      let colorIndex;
      if (colorMap.has(key)) {
        colorIndex = colorMap.get(key);
      } else {
        if (palette.length < 256) {
          colorIndex = palette.length;
          palette.push([rgba[i], rgba[i + 1], rgba[i + 2]]);
          colorMap.set(key, colorIndex);
        } else {
          // Find closest match in palette
          let minDist = Infinity;
          let bestIdx = 0;
          for (let p = 0; p < palette.length; p++) {
            const dr = palette[p][0] - rgba[i];
            const dg = palette[p][1] - rgba[i + 1];
            const db = palette[p][2] - rgba[i + 2];
            const dist = dr * dr + dg * dg + db * db;
            if (dist < minDist) {
              minDist = dist;
              bestIdx = p;
            }
          }
          colorIndex = bestIdx;
        }
      }
      indexed[i / 4] = colorIndex;
    }

    // Pad palette to power of 2 (at least 2, max 256)
    let pSize = 2;
    while (pSize < palette.length && pSize < 256) pSize <<= 1;
    while (palette.length < pSize) palette.push([0, 0, 0]);

    return { palette, indexed };
  }

  // LZW Compressor for GIF
  lzw(minCodeSize, indexedPixels) {
    const clearCode = 1 << minCodeSize;
    const eoiCode = clearCode + 1;
    let codeSize = minCodeSize + 1;
    let nextCode = eoiCode + 1;

    let dict = new Map();
    const resetDict = () => {
      dict.clear();
      for (let i = 0; i < clearCode; i++) dict.set(String.fromCharCode(i), i);
      codeSize = minCodeSize + 1;
      nextCode = eoiCode + 1;
    };
    resetDict();

    const outputBits = [];
    const writeBits = (val, count) => {
      for (let b = 0; b < count; b++) {
        outputBits.push((val >> b) & 1);
      }
    };

    writeBits(clearCode, codeSize);

    let curStr = '';
    for (let i = 0; i < indexedPixels.length; i++) {
      const char = String.fromCharCode(indexedPixels[i]);
      const combined = curStr + char;
      if (dict.has(combined)) {
        curStr = combined;
      } else {
        writeBits(dict.get(curStr), codeSize);
        if (nextCode < 4096) {
          dict.set(combined, nextCode++);
          if (nextCode > (1 << codeSize) && codeSize < 12) {
            codeSize++;
          }
        } else {
          writeBits(clearCode, codeSize);
          resetDict();
        }
        curStr = char;
      }
    }
    if (curStr !== '') {
      writeBits(dict.get(curStr), codeSize);
    }
    writeBits(eoiCode, codeSize);

    // Convert bits to byte blocks
    const bytes = [];
    for (let i = 0; i < outputBits.length; i += 8) {
      let byte = 0;
      for (let b = 0; b < 8 && i + b < outputBits.length; b++) {
        byte |= outputBits[i + b] << b;
      }
      bytes.push(byte);
    }

    const blocks = [];
    for (let i = 0; i < bytes.length; i += 254) {
      const chunk = bytes.slice(i, i + 254);
      blocks.push(chunk.length);
      blocks.push(...chunk);
    }
    blocks.push(0); // block terminator

    return Buffer.from(blocks);
  }

  encode() {
    const out = [];

    // 1. Header & Logical Screen Descriptor
    out.push(Buffer.from('GIF89a'));

    const lsd = Buffer.alloc(7);
    lsd.writeUInt16LE(this.width, 0);
    lsd.writeUInt16LE(this.height, 2);

    // First frame quantize for global palette
    const { palette: gPalette } = this.quantize(this.frames[0]);
    const colorDepth = Math.round(Math.log2(gPalette.length)) - 1;
    lsd[4] = 0x80 | (0x07 << 4) | (colorDepth & 0x07); // GCT Flag = 1
    lsd[5] = 0; // Background color index
    lsd[6] = 0; // Pixel aspect ratio
    out.push(lsd);

    // Global Color Table
    const gct = Buffer.alloc(gPalette.length * 3);
    gPalette.forEach((c, idx) => {
      gct[idx * 3] = c[0];
      gct[idx * 3 + 1] = c[1];
      gct[idx * 3 + 2] = c[2];
    });
    out.push(gct);

    // Netscape Looping Extension
    if (this.repeat >= 0) {
      const loopExt = Buffer.from([
        0x21, 0xff, 0x0b, 0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30,
        0x03, 0x01, this.repeat & 0xff, (this.repeat >> 8) & 0xff, 0x00
      ]);
      out.push(loopExt);
    }

    // Frames
    for (let f = 0; f < this.frames.length; f++) {
      const frameData = this.frames[f];
      const { palette, indexed } = this.quantize(frameData);

      // Graphic Control Extension
      const gce = Buffer.from([
        0x21, 0xf9, 0x04,
        0x04, // Disposal method: restore to background (2 << 2)
        this.delay & 0xff, (this.delay >> 8) & 0xff,
        0x00, // Transparent color index
        0x00
      ]);
      out.push(gce);

      // Image Descriptor (with local color table)
      const id = Buffer.alloc(10);
      id[0] = 0x2c; // comma
      id.writeUInt16LE(0, 1); // left
      id.writeUInt16LE(0, 3); // top
      id.writeUInt16LE(this.width, 5);
      id.writeUInt16LE(this.height, 7);
      const lctDepth = Math.round(Math.log2(palette.length)) - 1;
      id[9] = 0x80 | (lctDepth & 0x07); // Local color table flag = 1
      out.push(id);

      // Local Color Table
      const lct = Buffer.alloc(palette.length * 3);
      palette.forEach((c, idx) => {
        lct[idx * 3] = c[0];
        lct[idx * 3 + 1] = c[1];
        lct[idx * 3 + 2] = c[2];
      });
      out.push(lct);

      // Min code size
      const minCodeSize = Math.max(2, lctDepth + 1);
      out.push(Buffer.from([minCodeSize]));

      // LZW compressed data blocks
      out.push(this.lzw(minCodeSize, indexed));
    }

    // Trailer
    out.push(Buffer.from([0x3b]));

    return Buffer.concat(out);
  }
}

module.exports = GifEncoder;
