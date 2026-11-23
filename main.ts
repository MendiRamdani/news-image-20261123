import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_BYTES = 1048576;
const EXPECTED_WIDTH = 1024;
const EXPECTED_HEIGHT = 1024;

// Read width/height straight out of the PNG IHDR chunk (bytes 16-23),
// so no image library or network is needed.
function pngDimensions(buf: Buffer): { width: number; height: number } {
  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length < 33 || !buf.subarray(0, 8).equals(pngSig)) {
    throw new Error("entry.png is not a PNG file");
  }
  if (buf.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error("entry.png has no IHDR chunk where expected");
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const here = fileURLToPath(new URL(".", import.meta.url));
const src = join(here, "entry.png");
const input = readFileSync(src);
if (input.length > MAX_BYTES) {
  throw new Error(`entry.png too large: ${input.length} bytes (limit ${MAX_BYTES})`);
}
const { width, height } = pngDimensions(input);
if (width !== EXPECTED_WIDTH || height !== EXPECTED_HEIGHT) {
  throw new Error(
    `entry.png is ${width}x${height}, expected ${EXPECTED_WIDTH}x${EXPECTED_HEIGHT}`,
  );
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
const out = join(outDir, "entry.png");
copyFileSync(src, out);
const written = readFileSync(out);
const sha256 = createHash("sha256").update(written).digest("hex");
if (written.length !== input.length || sha256 !== createHash("sha256").update(input).digest("hex")) {
  throw new Error("output differs from source entry.png");
}
console.log(`wrote ${out}`);
console.log(`size: ${written.length} bytes (limit ${MAX_BYTES})`);
console.log(`dimensions: ${width}x${height}`);
console.log(`sha256: ${sha256}`);
