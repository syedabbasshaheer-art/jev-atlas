// streak.mjs — card 4.7 / watch item W8: "the cron running but adding
// nothing, for days" must not just look like a quiet week. This keeps the
// counter git-as-database style, same principle as the catalogue itself:
// state lives in a committed repo file, not in a runtime store.
//
// Usage: node .github/scripts/streak.mjs <added_count>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STATE = path.join(HERE, "..", "state", "streak.json");
const ALERT_AT = 3; // three runs (nominally three days, on a daily cron) with zero new rows

function out(name, value) {
  const f = process.env.GITHUB_OUTPUT;
  if (f) fs.appendFileSync(f, `${name}=${value}\n`);
}

const addedCount = Number(process.argv[2] ?? 0) || 0;
const prev = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : { consecutiveZero: 0 };

const state = {
  lastRun: new Date().toISOString(),
  lastAdded: addedCount,
  consecutiveZero: addedCount > 0 ? 0 : (prev.consecutiveZero || 0) + 1,
};

fs.mkdirSync(path.dirname(STATE), { recursive: true });
fs.writeFileSync(STATE, JSON.stringify(state, null, 1));

console.log(`streak: added ${addedCount} this run; consecutive zero-add runs = ${state.consecutiveZero}`);
out("consecutive_zero", String(state.consecutiveZero));
out("should_alert", String(state.consecutiveZero >= ALERT_AT));
