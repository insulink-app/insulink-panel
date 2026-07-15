// Self-check for the ZIP writer — run with `npx tsx src/lib/zip.check.ts`.
// Verified against the system `unzip` rather than against our own reader: a
// container we can round-trip ourselves proves nothing about whether the user's
// unpacker opens it.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { zip } from "./zip";

const workdir = mkdtempSync(join(tmpdir(), "zip-check-"));
const archive = join(workdir, "bundle.zip");

// Names stay ASCII because that is all the exporter can emit (`insulink-<id>-…`,
// and every dataset id is ASCII). Umlauts are exercised in the *body*, where
// they really occur — product names like "Müsli".
// The long repetitive row deflates; the tiny one would grow and must fall back
// to stored — both paths ship in one archive.
const bigCsv = "time,value\n" + "1767330000000,112\n".repeat(500);
const files = [
  { name: "insulink-glucose-2026-07-15.csv", text: bigCsv },
  { name: "insulink-products-2026-07-15.csv", text: "name\nMüsli, Früchte\n" },
  { name: "insulink-tiny-2026-07-15.csv", text: "a\n1" },
];

const blob = await zip(files);
writeFileSync(archive, Buffer.from(await blob.arrayBuffer()));

// `unzip -t` walks the central directory and checks every CRC. A wrong offset,
// size or checksum fails here.
const test = execFileSync("unzip", ["-t", archive], { encoding: "utf8" });
assert.match(test, /No errors detected/);

// Contents must survive byte-for-byte, including the umlauts.
for (const file of files) {
  const extracted = execFileSync("unzip", ["-p", archive, file.name], {
    encoding: "utf8",
  });
  assert.equal(extracted, file.text, `${file.name} did not round-trip`);
}

// Every entry is listed exactly once.
const listing = execFileSync("unzip", ["-l", archive], { encoding: "utf8" });
for (const file of files) {
  assert.equal(listing.split(file.name).length - 1, 1);
}

// The repetitive CSV must actually be smaller than its source, or deflate is
// silently not happening and the bundle is just a slower folder.
assert.ok(
  blob.size < Buffer.byteLength(bigCsv),
  "archive should be smaller than its largest member",
);

// No members means the end-of-central-directory record and nothing else. The
// exporter refuses to hand this to the user (see the export page), but the
// writer must still not emit garbage.
const empty = await zip([]);
assert.equal(empty.size, 22);

console.log("zip.check.ts OK");
