// Match pup-clinker's LegacyPuppyTransparency.kt without altering the original artwork.
// Build-time PNG conversion is shared by Vite and Expo/Metro. No runtime native plugin.
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { join, resolve, relative, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inflateSync, deflateSync } from "node:zlib";

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const crcTable = Array.from({ length: 256 }, (_, i) => {
  let value = i;
  for (let j = 0; j < 8; j++)
    value = value & 1 ? (0xedb88320 ^ (value >>> 1)) >>> 0 : value >>> 1;
  return value >>> 0;
});
function crc(buffer) {
  let result = 0xffffffff;
  for (const byte of buffer)
    result = crcTable[(result ^ byte) & 255] ^ (result >>> 8);
  return (result ^ 0xffffffff) >>> 0;
}
function chunk(name, bytes) {
  const kind = Buffer.from(name, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(bytes.length);
  const crcValue = Buffer.alloc(4);
  crcValue.writeUInt32BE(crc(Buffer.concat([kind, bytes])));
  return Buffer.concat([length, kind, bytes, crcValue]);
}

// The Kotlin source assets use ordinary non-interlaced 8-bit PNGs.
// Also handles palette and greyscale images for future original-asset imports.
export function decodePng(bytes) {
  if (!bytes.subarray(0, 8).equals(SIGNATURE)) throw Error("Not a PNG");
  let width = 0, height = 0, depth = 0, type = 0, interlace = 0;
  let palette = null, transparency = null;
  const compressed = [];
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const size = bytes.readUInt32BE(offset);
    const end = offset + size + 12;
    if (end > bytes.length) throw Error("Truncated PNG chunk");
    const name = bytes.toString("ascii", offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + size);
    if (name === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8];
      type = data[9];
      interlace = data[12];
    } else if (name === "PLTE") palette = data;
    else if (name === "tRNS") transparency = data;
    else if (name === "IDAT") compressed.push(data);
    if (name === "IEND") break;
    offset = end;
  }
  const channels = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 })[type];
  if (!channels || depth !== 8 || interlace || !width || !height)
    throw Error("Unsupported PNG format: type=" + type + " depth=" + depth + " interlace=" + interlace);
  if (width * height > 16_000_000) throw Error("PNG dimensions exceed safe limit");
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(compressed));
  if (raw.length !== (stride + 1) * height) throw Error("Invalid PNG scanlines");
  const pixels = Buffer.alloc(width * height * 4);
  let previous = Buffer.alloc(stride);
  let position = 0;
  let hasTransparency = false;
  for (let y = 0; y < height; y++) {
    const filter = raw[position++];
    const row = Buffer.from(raw.subarray(position, position + stride));
    position += stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? row[x - channels] : 0;
      const b = previous[x];
      const c = x >= channels ? previous[x - channels] : 0;
      let predictor = 0;
      if (filter === 1) predictor = a;
      else if (filter === 2) predictor = b;
      else if (filter === 3) predictor = Math.floor((a + b) / 2);
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (filter !== 0) throw Error("Unknown PNG filter " + filter);
      row[x] = (row[x] + predictor) & 255;
    }
    for (let x = 0; x < width; x++) {
      const s = x * channels, d = (y * width + x) * 4;
      if (type === 2 || type === 6) {
        pixels[d] = row[s];
        pixels[d + 1] = row[s + 1];
        pixels[d + 2] = row[s + 2];
        pixels[d + 3] = type === 6 ? row[s + 3] : 255;
      } else if (type === 3) {
        const index = row[s];
        if (!palette || 3 * index + 2 >= palette.length) throw Error("Invalid PNG palette");
        pixels[d] = palette[3 * index];
        pixels[d + 1] = palette[3 * index + 1];
        pixels[d + 2] = palette[3 * index + 2];
        pixels[d + 3] = transparency?.[index] ?? 255;
      } else {
        pixels[d] = pixels[d + 1] = pixels[d + 2] = row[s];
        pixels[d + 3] = type === 4 ? row[s + 1] : 255;
      }
      if (pixels[d + 3] !== 255) hasTransparency = true;
    }
    previous = row;
  }
  return { width, height, pixels, hasTransparency };
}

export function encodePng({ width, height, pixels }) {
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    scanlines[rowStart] = 0; // unfiltered RGBA scanline
    pixels.copy(scanlines, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([SIGNATURE, chunk("IHDR", header),
    chunk("IDAT", deflateSync(scanlines)), chunk("IEND", Buffer.alloc(0))]);
}

export function makeLegacyBackgroundTransparent(bytes) {
  const image = decodePng(bytes);
  // Kotlin skips PNGs with existing alpha so preserve intentional transparent art.
  if (image.hasTransparency) return bytes;
  const { width, height, pixels } = image;
  const queue = new Int32Array(width * height);
  let head = 0, tail = 0;
  const visit = (index) => {
    const p = index * 4;
    if (pixels[p + 3] === 0 || pixels[p] > 20 ||
        pixels[p + 1] > 20 || pixels[p + 2] > 20) return;
    pixels[p + 3] = 0;
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x++) {
    visit(x);
    if (height > 1) visit((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    visit(y * width);
    if (width > 1) visit(y * width + width - 1);
  }
  while (head < tail) {
    const i = queue[head++], x = i % width, y = Math.floor(i / width);
    if (x > 0) visit(i - 1);
    if (x + 1 < width) visit(i + 1);
    if (y > 0) visit(i - width);
    if (y + 1 < height) visit(i + width);
  }
  return tail ? encodePng(image) : bytes;
}

export async function preparePuppyArt(root = ROOT) {
  const entries = [];
  for (const folder of ["v1", "v2"]) {
    const sourceDir = join(root, "public/assets", folder);
    const outputDir = join(root, "public/assets/transparent", folder);
    await mkdir(outputDir, { recursive: true });
    const files = (await readdir(sourceDir)).filter((file) => file.endsWith(".png")).sort();
    for (const file of files) {
      const data = await readFile(join(sourceDir, file));
      const processed = makeLegacyBackgroundTransparent(data);
      await writeFile(join(outputDir, file), processed);
      const key = "/assets/transparent/" + folder + "/" + file;
      entries.push([key, "../public" + key]);
    }
  }
  // Metro requires literal static require() paths. This registry is generated
  // before bundling; keep it out of git alongside generated transparent PNGs.
  const code = "// Generated by scripts/prepare-puppy-art.mjs. Do not edit.\n" +
    "export const transparentAssets = {\n" +
    entries.map(([key, file]) => "  " + JSON.stringify(key) +
      ": require(" + JSON.stringify(file) + "),").join("\n") +
    "\n};\n";
  await writeFile(join(root, "mobile/transparent-assets.js"), code);
  return entries.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const count = await preparePuppyArt();
  console.log("Prepared " + count + " legacy puppy PNGs with Kotlin-equivalent transparency.");
}
