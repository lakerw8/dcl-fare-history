#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const DEFAULT_INPUT_CANDIDATES = [
  "/tmp/fare-export/price-history-summary.json",
  "/workspace/dclguide-live-data/price-history-summary.json",
];
const DEFAULT_OUTPUT = "data/price-movers.json";
const DEFAULT_CAVEAT =
  "Unofficial fan tracker. DCL Guide does not sell cruises. Verify the live fare and book on Disney Cruise Line at https://disneycruise.disney.go.com.";
const DEFAULT_PRICE_BASIS =
  "Lowest priced stateroom for two guests, including taxes and fees, on each snapshot.";
const METHOD_NOTE =
  "Change is latest fare minus first tracked fare (changeSinceFirst) across the snapshot window. Fares are the lowest priced stateroom for two guests, including taxes and fees.";
const TOP_LIMIT = 15;

function fail(message) {
  console.error(`build-movers error: ${message}`);
  process.exit(1);
}

function resolveInputPath() {
  const argPath = process.argv[2]?.trim();
  if (argPath) return argPath;

  const envPath = process.env.PRICE_HISTORY_SUMMARY_PATH?.trim();
  if (envPath) return envPath;

  for (const candidate of DEFAULT_INPUT_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  fail(
    `input summary file not found. Pass an input path or place price-history-summary.json at one of: ${DEFAULT_INPUT_CANDIDATES.join(", ")}`
  );
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readAndValidateSummary(inputPath) {
  if (!fs.existsSync(inputPath)) {
    fail(`input file does not exist: ${inputPath}`);
  }

  let raw;
  try {
    raw = fs.readFileSync(inputPath, "utf8");
  } catch (error) {
    fail(`could not read input file ${inputPath}: ${error.message}`);
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    fail(`input file is empty: ${inputPath}`);
  }
  if (trimmed.startsWith("<")) {
    fail(`input file looks like HTML, not JSON: ${inputPath}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    fail(`input file is not valid JSON: ${error.message}`);
  }

  if (!isPlainObject(parsed)) {
    fail("input JSON root must be an object");
  }
  if (!isPlainObject(parsed.sailings)) {
    fail("input JSON must include a 'sailings' object");
  }

  const entries = Object.entries(parsed.sailings);
  if (entries.length === 0) {
    fail("input JSON 'sailings' object is empty");
  }

  if (
    typeof parsed.snapshotCount !== "number" ||
    !Number.isFinite(parsed.snapshotCount) ||
    parsed.snapshotCount <= 0
  ) {
    fail("input JSON must include a positive numeric 'snapshotCount'");
  }

  return { summary: parsed, entries };
}

function toMoverRow(key, row) {
  if (!isPlainObject(row)) return null;
  if (typeof row.snapshotCount !== "number" || row.snapshotCount < 2) {
    return null;
  }
  if (!isPlainObject(row.changeSinceFirst)) {
    return null;
  }

  const changeDollars = row.changeSinceFirst.dollars;
  if (
    typeof changeDollars !== "number" ||
    !Number.isFinite(changeDollars) ||
    changeDollars === 0
  ) {
    return null;
  }

  let changePercent = row.changeSinceFirst.percent;
  if (typeof changePercent !== "number" || !Number.isFinite(changePercent)) {
    if (typeof row.firstFare === "number" && row.firstFare > 0) {
      changePercent = Math.round((changeDollars / row.firstFare) * 1000) / 10;
    } else {
      changePercent = 0;
    }
  }

  return {
    id: row.id != null ? String(row.id) : String(key),
    ship: typeof row.ship === "string" ? row.ship : "",
    startDate: typeof row.startDate === "string" ? row.startDate : "",
    nights: typeof row.nights === "number" ? row.nights : null,
    firstFare: typeof row.firstFare === "number" ? row.firstFare : null,
    latestFare: typeof row.latestFare === "number" ? row.latestFare : null,
    lowestFare: typeof row.lowestFare === "number" ? row.lowestFare : null,
    highestFare: typeof row.highestFare === "number" ? row.highestFare : null,
    snapshotCount: row.snapshotCount,
    firstSeen: typeof row.firstSeen === "string" ? row.firstSeen : null,
    lastSeen: typeof row.lastSeen === "string" ? row.lastSeen : null,
    changeDollars,
    changePercent,
  };
}

function compareDatesAndShip(a, b) {
  if (a.startDate !== b.startDate) {
    return a.startDate < b.startDate ? -1 : 1;
  }
  if (a.ship !== b.ship) {
    return a.ship.localeCompare(b.ship);
  }
  return a.id.localeCompare(b.id);
}

function main() {
  const inputPath = resolveInputPath();
  const outputPath = process.argv[3]?.trim() || DEFAULT_OUTPUT;

  const { summary, entries } = readAndValidateSummary(inputPath);

  const movers = [];
  for (const [key, row] of entries) {
    const mover = toMoverRow(key, row);
    if (mover) movers.push(mover);
  }

  const drops = movers
    .filter((m) => m.changeDollars < 0)
    .sort(
      (a, b) =>
        a.changeDollars - b.changeDollars ||
        a.changePercent - b.changePercent ||
        compareDatesAndShip(a, b)
    )
    .slice(0, TOP_LIMIT);

  const increases = movers
    .filter((m) => m.changeDollars > 0)
    .sort(
      (a, b) =>
        b.changeDollars - a.changeDollars ||
        b.changePercent - a.changePercent ||
        compareDatesAndShip(a, b)
    )
    .slice(0, TOP_LIMIT);

  const output = {
    generatedAt: summary.generatedAt ?? null,
    ...(summary.asOf ? { asOf: summary.asOf } : {}),
    snapshotCount: summary.snapshotCount,
    dateRange: summary.dateRange ?? null,
    sailingCount:
      typeof summary.sailingCount === "number"
        ? summary.sailingCount
        : entries.length,
    priceBasis:
      typeof summary.priceBasis === "string" && summary.priceBasis.trim()
        ? summary.priceBasis
        : DEFAULT_PRICE_BASIS,
    caveat:
      typeof summary.caveat === "string" && summary.caveat.trim()
        ? summary.caveat
        : DEFAULT_CAVEAT,
    officialUrl:
      typeof summary.officialUrl === "string" && summary.officialUrl.trim()
        ? summary.officialUrl
        : "https://disneycruise.disney.go.com",
    tracker: "https://dclguide.com/disney-cruise-prices",
    method: METHOD_NOTE,
    drops,
    increases,
  };

  const outDir = path.dirname(path.resolve(outputPath));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  const sizeBytes = fs.statSync(outputPath).size;
  console.log(
    `Wrote ${outputPath} (${sizeBytes.toLocaleString("en-US")} bytes): ${drops.length} drops, ${increases.length} increases from ${output.sailingCount} sailings across ${output.snapshotCount} snapshots.`
  );
}

main();
