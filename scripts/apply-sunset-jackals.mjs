import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { execSync } from "node:child_process";

const dest = "app/game.tsx";
const current = readFileSync(dest, "utf8");
if (current.includes("const JACKAL_MAX_HEALTH = 70;")) {
  console.log("Sunset Jackals already present in app/game.tsx");
  process.exit(0);
}

const dir = "scripts/jackal-patch";
const parts = readdirSync(dir)
  .filter((name) => name.startsWith("part."))
  .sort();
if (!parts.length) {
  throw new Error("Missing jackal patch parts");
}
const b64 = parts.map((name) => readFileSync(`${dir}/${name}`, "utf8").trim()).join("");
const patch = gunzipSync(Buffer.from(b64, "base64")).toString("utf8");
writeFileSync("jackals.patch", patch);
execSync("patch -p0 < jackals.patch", { stdio: "inherit" });
const next = readFileSync(dest, "utf8");
if (!next.includes("drawPixelJackal")) {
  throw new Error("Patch applied but jackals are still missing");
}
console.log(`Patched ${dest} (${next.length} bytes) with Sunset Jackals`);
