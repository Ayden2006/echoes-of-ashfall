import { readFileSync, writeFileSync } from "node:fs";

const dest = "app/game.tsx";
let src = readFileSync(dest, "utf8");
if (src.includes("CINDER_FOX_CARD")) {
  console.log("Campaign expansion already present");
  process.exit(0);
}

const patch = (label, needle, repl) => {
  if (!src.includes(needle)) throw new Error("Missing needle: " + label + " :: " + needle.slice(0, 120));
  src = src.replace(needle, repl);
};

patch("MapId", "type MapId = 1|2;", "type MapId = 1|2|3|4|5|6;");

patch(
  "sizes",
  "const MAP1_W = 5200;\nconst MAP2_W = 3600;",
  "const MAP1_W = 5200;\nconst MAP2_W = 3600;\nconst MAP3_W = 4000;\nconst MAP4_W = 4200;"
);

patch(
  "portals",
  "const MAP1_PORTAL_X = 5070;\nconst MAP2_PORTAL_X = 105;",
  "const MAP1_PORTAL_X = 5070;\nconst MAP2_PORTAL_X = 105;\nconst MAP2_EXIT_X = 3470;\nconst MAP3_ENTRY_X = 105;\nconst MAP3_EXIT_X = 3870;\nconst MAP4_ENTRY_X = 105;\nconst MAP4_EXIT_X = 4070;"
);

writeFileSync(dest, src);
console.log("Phase 1 applied", dest, src.length);
