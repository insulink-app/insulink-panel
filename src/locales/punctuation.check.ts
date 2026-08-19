// Self-check for the locale wording rules — run with
// `npx tsx src/locales/punctuation.check.ts`.
//
// No dash as punctuation: a dash reads as an afterthought bolted onto a
// sentence, and the em dash in particular reads as machine-written. Every one of
// them can be a comma, a colon or a full stop. A hyphen INSIDE a word is fine and
// often required, because German compounds carry one (CGM-Daten, KH-Eingabe), so
// only a dash standing on its own between words is caught.
import assert from "node:assert/strict";
import de from "./lang/de_DE/de_DE.json";
import en from "./lang/en_US/en_US.json";

const LOOSE_DASH = /(^|\s)[—–-](\s|$)/;

type Tree = { [key: string]: string | Tree };

/** Every leaf string in a locale tree, keyed by its dotted path. */
function strings(tree: Tree, prefix = ""): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string"
      ? [[path, value] as [string, string]]
      : strings(value, path);
  });
}

function offenders(tree: Tree): string[] {
  return strings(tree)
    .filter(([, text]) => LOOSE_DASH.test(text))
    .map(([path, text]) => `${path}: ${text}`);
}

for (const [language, tree] of [
  ["de_DE", de as Tree],
  ["en_US", en as Tree],
] as const) {
  const found = offenders(tree);
  assert.deepEqual(
    found,
    [],
    `${language}: rewrite with a comma, a colon or a full stop instead:\n${found.join("\n")}`,
  );
}

// The check itself has to catch one, or it is only decoration.
assert.deepEqual(offenders({ a: { b: "Pump — test" } }), ["a.b: Pump — test"]);
assert.deepEqual(offenders({ a: "CGM-Daten sind fein" }), []);

console.log("locale punctuation ok");
