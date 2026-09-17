import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const files = {
  sourceScript: readFileSync(join(root, "script.js"), "utf8"),
  distScript: readFileSync(join(root, "dist", "script.js"), "utf8"),
  entryWorker: readFileSync(join(root, "index.js"), "utf8"),
  worker: readFileSync(join(root, "_worker.js"), "utf8"),
  distWorker: readFileSync(join(root, "dist", "_worker.js"), "utf8"),
  index: readFileSync(join(root, "index.html"), "utf8"),
  distIndex: readFileSync(join(root, "dist", "index.html"), "utf8")
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function expect(name, condition, message) {
  if (!condition) fail(`${name}: ${message}`);
}

for (const [name, content] of Object.entries(files)) {
  expect(name, !content.includes("111825271"), "old Metrika counter found");
}

for (const [name, content] of Object.entries({
  sourceScript: files.sourceScript,
  distScript: files.distScript
})) {
  expect(name, content.includes("var leadEndpoint = \"/send-lead.php\";"), "browser form endpoint must be same-origin");
  expect(name, !content.includes("https://dynastia-residence.ru/send-lead.php"), "old lead handler leaked into browser JS");
  expect(name, content.includes("METRIKA_COUNTER_ID = 112655218"), "current Metrika counter constant missing");
  expect(name, content.includes("TOUR_FORM_GOAL = \"tour_form_submit\""), "tour form goal missing");
  expect(name, content.includes("PHONE_CLICK_GOAL = \"phone_click\""), "phone click goal missing");
  expect(name, content.includes("window.ym(METRIKA_COUNTER_ID, \"reachGoal\", goalName)"), "reachGoal call missing");
}

for (const [name, content] of Object.entries({
  entryWorker: files.entryWorker,
  worker: files.worker,
  distWorker: files.distWorker
})) {
  expect(name, content.includes("LEAD_HANDLER_URL"), "server-side lead bridge missing");
  expect(name, content.includes("https://dynastia-residence.ru/send-lead.php"), "working handler bridge missing");
  expect(name, content.includes("env.ASSETS.fetch(request)"), "static asset fallback missing");
}

for (const [name, content] of Object.entries({
  index: files.index,
  distIndex: files.distIndex
})) {
  expect(name, content.includes("112655218"), "current Metrika counter missing from HTML");
  expect(name, content.includes("script.js?v=1789635600"), "cache-busting script version not bumped");
}

if (!process.exitCode) {
  console.log("production safety checks passed");
}
