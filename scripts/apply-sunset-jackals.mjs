import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const marker = "const JACKAL_MAX_HEALTH = 70;";
const dest = "app/game.tsx";
const current = readFileSync(dest, "utf8");
if (current.includes(marker)) {
  console.log("Sunset Jackals already present in app/game.tsx");
  process.exit(0);
}

const dir = "scripts/jackal-payload";
const parts = readdirSync(dir)
  .filter((name) => name.startsWith("game.tsx.gz.b64."))
  .sort();
if (!parts.length) {
  throw new Error("Missing jackal payload chunks");
}
const b64 = parts.map((name) => readFileSync(`${dir}/${name}`, "utf8").trim()).join("");
const next = gunzipSync(Buffer.from(b64, "base64")).toString("utf8");
if (!next.includes(marker) || !next.includes("drawPixelJackal")) {
  throw new Error("Decoded payload is not the Sunset Jackal game source");
}
writeFileSync(dest, next);
console.log(`Wrote ${dest} (${next.length} bytes) with Sunset Jackals`);
