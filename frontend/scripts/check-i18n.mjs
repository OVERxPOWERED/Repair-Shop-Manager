// Fails when the three locale files do not have exactly the same keys. Warns on "[TODO hi]" placeholders.
import { readFileSync } from "node:fs";

const dir = new URL("../src/i18n/messages/", import.meta.url);
const files = ["en", "hi", "hi-Latn"];

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key, out);
    else out[key] = String(v);
  }
  return out;
}

const maps = Object.fromEntries(
  files.map((f) => [f, flatten(JSON.parse(readFileSync(new URL(`${f}.json`, dir), "utf8")))]),
);
const base = new Set(Object.keys(maps.en));
let failed = false;
for (const f of files.slice(1)) {
  const keys = new Set(Object.keys(maps[f]));
  const missing = [...base].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !base.has(k));
  if (missing.length || extra.length) {
    failed = true;
    console.error(`${f}.json  missing: ${missing.join(", ") || "-"}  extra: ${extra.join(", ") || "-"}`);
  }
  const todos = Object.entries(maps[f]).filter(([, v]) => v.startsWith("[TODO")).length;
  if (todos) console.warn(`${f}.json: ${todos} untranslated [TODO] strings`);
}
if (failed) process.exit(1);
console.log(`i18n OK: ${base.size} keys in ${files.length} locales`);
