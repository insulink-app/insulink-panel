// npx tsx src/pages/panel/exercise-stats/label-positions.check.ts
import assert from "node:assert/strict";
import { endLabelPositions } from "./label-positions";

const line = (name: string, value: number) => ({ name, color: "", points: [{ time: 0, value }] });
const positions = endLabelPositions([line("a", 21), line("b", 21), line("c", 5)]);
assert.ok(Math.abs(positions.get("a")! - positions.get("b")!) >= 16);
assert.ok(positions.get("c")! > positions.get("b")!);
console.log("label positions: ok");
