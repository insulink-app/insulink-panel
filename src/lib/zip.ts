// Minimal ZIP writer for the export bundle. Deflate comes from the browser's
// native CompressionStream, so this file only builds the container around it.
//
// Deliberately narrow: no zip64, no directories, no encryption. That covers a
// handful of CSVs and nothing else — anything past 4 GB or 65535 files needs
// zip64 and a real library. ponytail: a dependency for this would be ~8 kB to
// avoid a fixed 30-year-old header layout.

// IEEE CRC-32, which the ZIP spec mandates per entry.
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index++) {
    let value = index;
    for (let bit = 0; bit < 8; bit++) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  // The spec stores it unsigned; JS bit ops hand back a signed int.
  return (crc ^ 0xffffffff) >>> 0;
}

async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const compressed = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(compressed).arrayBuffer());
}

// ZIP predates epochs: the mtime is a DOS-packed local time, 2-second resolution.
function dosStamp(when: Date) {
  return {
    time:
      (when.getHours() << 11) | (when.getMinutes() << 5) | (when.getSeconds() >> 1),
    date:
      ((when.getFullYear() - 1980) << 9) |
      ((when.getMonth() + 1) << 5) |
      when.getDate(),
  };
}

export interface ZipFile {
  name: string;
  text: string;
}

export async function zip(files: ZipFile[]): Promise<Blob> {
  const encoder = new TextEncoder();
  const stamp = dosStamp(new Date());
  const localRecords: Uint8Array[] = [];
  const centralRecords: Uint8Array[] = [];
  let localBytes = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const source = encoder.encode(file.text);
    const checksum = crc32(source);
    const deflated = await deflateRaw(source);

    // Deflate can outgrow short or already-dense input. Storing those raw keeps
    // the entry smaller and still opens everywhere.
    const compressed = deflated.length < source.length;
    const payload = compressed ? deflated : source;
    const method = compressed ? 8 : 0;

    // Flag 0x0800 marks the filename as UTF-8 — without it "Übungen.csv" is read
    // as the unpacker's codepage.
    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, method, true);
    localView.setUint16(10, stamp.time, true);
    localView.setUint16(12, stamp.date, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, payload.length, true);
    localView.setUint32(22, source.length, true);
    localView.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    localRecords.push(local, payload);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, method, true);
    centralView.setUint16(12, stamp.time, true);
    centralView.setUint16(14, stamp.date, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, payload.length, true);
    centralView.setUint32(24, source.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    // Where this entry's local header starts, which is what unpackers seek to.
    centralView.setUint32(42, localBytes, true);
    central.set(nameBytes, 46);
    centralRecords.push(central);

    localBytes += local.length + payload.length;
  }

  const centralSize = centralRecords.reduce(
    (total, record) => total + record.length,
    0,
  );
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  // The central directory sits directly after the last local record.
  endView.setUint32(16, localBytes, true);

  const parts = [...localRecords, ...centralRecords, end] as BlobPart[];
  return new Blob(parts, { type: "application/zip" });
}
