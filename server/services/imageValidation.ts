export interface ValidatedImageInfo {
  mimeType: 'image/png' | 'image/jpeg';
  byteLength: number;
  width: number;
  height: number;
}

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const MIN_DIMENSION = 128;
const MAX_DIMENSION = 8192;

function parsePngDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 24) return null;
  // IHDR chunk starts at byte 12 ('IHDR')
  const ihdr = buf.toString('ascii', 12, 16);
  if (ihdr !== 'IHDR') return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

function parseJpegDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 4 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buf[offset + 1];
    // Skip padding FF bytes
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSof) {
      if (offset + 9 > buf.length) return null;
      const height = buf.readUInt16BE(offset + 5);
      const width = buf.readUInt16BE(offset + 7);
      return { width, height };
    }
    if (marker === 0xd9 || marker === 0xda) {
      break;
    }
    if (offset + 3 >= buf.length) break;
    const segmentLength = buf.readUInt16BE(offset + 2);
    if (segmentLength < 2) break;
    offset += 2 + segmentLength;
  }
  return null;
}

export function validateFundusImageDataUrl(dataUrl: string): {
  ok: true;
  info: ValidatedImageInfo;
  buffer: Buffer;
} | {
  ok: false;
  error: string;
} {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return {
      ok: false,
      error: 'Invalid image payload. Please upload a valid JPG, JPEG, or PNG fundus image.',
    };
  }

  const match = /^data:(image\/(?:png|jpeg|jpg));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) {
    return {
      ok: false,
      error: 'Unsupported file format. Only standard JPG, JPEG, and PNG images are permitted.',
    };
  }

  const declaredMime = match[1] === 'image/jpg' ? 'image/jpeg' : match[1];
  const buffer = Buffer.from(match[2], 'base64');

  if (buffer.length === 0) {
    return { ok: false, error: 'The uploaded image file appears to be empty.' };
  }
  if (buffer.length > MAX_BYTES) {
    return {
      ok: false,
      error: 'Image file exceeds the 10 MB size limit. Please upload a compressed retinal photograph.',
    };
  }

  // Magic-byte verification
  const isPng =
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  const isJpeg =
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;

  if (!isPng && !isJpeg) {
    return {
      ok: false,
      error: 'File signature mismatch. The uploaded bytes do not correspond to a valid PNG or JPEG image.',
    };
  }

  const actualMime: 'image/png' | 'image/jpeg' = isPng ? 'image/png' : 'image/jpeg';
  if (declaredMime !== actualMime) {
    return {
      ok: false,
      error: 'Image MIME type does not match its binary signature.',
    };
  }

  const dims = isPng ? parsePngDimensions(buffer) : parseJpegDimensions(buffer);
  if (!dims || dims.width <= 0 || dims.height <= 0) {
    return {
      ok: false,
      error: 'Could not read image dimensions. The file may be corrupted.',
    };
  }

  if (dims.width < MIN_DIMENSION || dims.height < MIN_DIMENSION) {
    return {
      ok: false,
      error: `Image resolution (${dims.width}×${dims.height}) is too low. Minimum supported size is ${MIN_DIMENSION}×${MIN_DIMENSION} pixels.`,
    };
  }

  if (dims.width > MAX_DIMENSION || dims.height > MAX_DIMENSION) {
    return {
      ok: false,
      error: `Image resolution (${dims.width}×${dims.height}) exceeds the ${MAX_DIMENSION}×${MAX_DIMENSION} maximum.`,
    };
  }

  return {
    ok: true,
    info: {
      mimeType: actualMime,
      byteLength: buffer.length,
      width: dims.width,
      height: dims.height,
    },
    buffer,
  };
}
