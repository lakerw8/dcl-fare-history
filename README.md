# Disney Cruise Fare History

- Live tracker: [Disney Cruise Prices 2026-2027 on DCL Guide](https://dclguide.com/disney-cruise-prices)
- Cost guide: [Disney Cruise Cost Guide](https://dclguide.com/blog/disney-cruise-cost-guide)
- Staterooms: [Disney Cruise Staterooms Guide](https://dclguide.com/disney-cruise-staterooms)
- Source site: [DCL Guide](https://dclguide.com)

Unofficial snapshot of upcoming Disney Cruise Line fares, monthly regional seasonality, and tracked fare movers, published as CSV and JSON so anyone can download, chart, or cite them. The files match the public exports behind the DCL Guide price tracker. A browsable copy of this repository is at [https://lakerw8.github.io/dcl-fare-history/](https://lakerw8.github.io/dcl-fare-history/).

Each refresh replaces the published snapshot, seasonality, and movers files in `data/`. Earlier weekly copies stay in this repository's git history. DCL Guide's full per-sailing price-history archive is not stored here; see the [live tracker](https://dclguide.com/disney-cruise-prices) for per-sailing sparklines.

## Current highlights

- **Current sailing snapshot (`data/sailings.csv`, `data/sailings.json`)**: dated **2026-11-19**, containing **902** future sailings with departures from 2026-11-20 through 2028-05-13. After the next refresh, read `updated` and `sailings.length` in `data/sailings.json` for the latest date and count.
- **Historical window (`data/seasonality.json`, `data/price-movers.json`)**: **17** tracked snapshots from **2026-01-19** to **2026-11-16**.
- **U.S. homeports**: **1,009** sailings; cheapest month **2027-01** (median lowest fare **$2,068**, median per night **$506**); peak month **2026-06** (median **$4,344**, median per night **$977**).
- **Singapore (Disney Adventure)**: **188** sailings; cheapest month **2027-01** (median **$1,138**); peak month **2026-03** (median **$2,350**). Singapore sailings are kept separate and are never blended into U.S. homeport medians.
- **Other homeports**: **218** sailings; cheapest month **2026-02** (median **$2,116**); peak month **2027-12** (median **$6,444**, small sample).

## Datasets in `data/`

### 1. Current sailings snapshot (`data/sailings.csv`, `data/sailings.json`)

`data/sailings.csv` is one row per ship and sail date. `data/sailings.json` is the same rows plus a short description of how the prices were built.

JSON envelope:

| Field | Meaning |
| --- | --- |
| `updated` | Snapshot date (`YYYY-MM-DD`). |
| `priceBasis` | How a category fare is defined. |
| `perNightBasis` | How `perNight` is defined. |
| `caveat` | Short unofficial-data note from the source export. |
| `tracker` | Link back to the live price tracker. |
| `sailings` | Array of sailing rows. |

Fares are whole US dollars. An empty CSV cell and a JSON `null` mean that category had no positive price in the source (sold out). `per_night` / `perNight` is the lowest priced category still for sale, divided by nights, rounded to the nearest dollar.

| CSV column | JSON field | Meaning |
| --- | --- | --- |
| `sail_date` | `sailDate` | Departure date, `YYYY-MM-DD`. |
| `ship` | `ship` | Ship name. |
| `nights` | `nights` | Length of the sailing in nights. |
| `homeport` | `homeport` | Embarkation port. Taken from the tracker's port text, up to ` to ` or ` with `. A one-way sailing can name the ending port in this text. |
| `destination` | `destination` | Itinerary label from the tracker (for example Bahamian, Western Caribbean, Alaskan). |
| `inside` | `inside` | Inside stateroom headline fare for two guests, taxes and fees included. |
| `oceanview` | `oceanview` | Oceanview stateroom, same fare basis. |
| `verandah` | `verandah` | Verandah stateroom, same fare basis. |
| `concierge` | `concierge` | Concierge stateroom, same fare basis. |
| `per_night` | `perNight` | Lowest available category divided by `nights`, nearest dollar. |
| `last_updated` | `lastUpdated` | Date this snapshot was taken, `YYYY-MM-DD`. |

Rows are sorted by sail date, then ship. There is one row per ship and sail date.

### 2. Monthly fare seasonality (`data/seasonality.csv`, `data/seasonality.json`)

Monthly median lowest fares, median per-night fares, and the cheapest sailing in each month across tracked snapshots, split into three separate region groups:

- `us` — U.S. homeports
- `singapore` — Singapore (Disney Adventure)
- `other` — Other homeports

Singapore (Disney Adventure) is never blended into U.S. homeport medians. `data/seasonality.csv` stores one row per `(region, month)` with `sailing_count`, `median_lowest_fare`, `median_per_night`, and cheapest sailing columns. `data/seasonality.json` carries the same regional monthly summaries plus snapshot metadata (`generatedAt`, `snapshotCount`, `dateRange`, `years`, `priceBasis`, `caveat`, `officialUrl`).

### 3. Tracked fare movers (`data/price-movers.json`)

A compact JSON summary of the top 15 observed price drops and top 15 observed price increases derived from DCL Guide's public `price-history-summary.json` across the tracked snapshot window (currently 17 snapshots, Jan–Nov 2026).

- Generated by [`scripts/build-movers.mjs`](scripts/build-movers.mjs).
- Movement is `changeSinceFirst.dollars` (latest tracked lowest fare minus first tracked lowest fare for two guests, taxes and fees included) among sailings tracked in at least 2 snapshots with a non-zero change.
- Per-sailing time series (`series`) and the full `price-history-summary.json` archive are intentionally omitted from this repository to keep it small. Use the [live price tracker](https://dclguide.com/disney-cruise-prices) for per-sailing sparklines.

## Update cadence

DCL Guide refreshes its tracker on Mondays. This repository pulls the public exports the next day.

[`.github/workflows/refresh.yml`](.github/workflows/refresh.yml) runs every **Tuesday at 17:00 UTC**, and whenever it is started by hand (`workflow_dispatch`). It downloads:

- [https://dclguide.com/data/sailings.csv](https://dclguide.com/data/sailings.csv)
- [https://dclguide.com/data/sailings.json](https://dclguide.com/data/sailings.json)
- [https://dclguide.com/data/seasonality.csv](https://dclguide.com/data/seasonality.csv)
- [https://dclguide.com/data/seasonality.json](https://dclguide.com/data/seasonality.json)
- [https://dclguide.com/data/price-history-summary.json](https://dclguide.com/data/price-history-summary.json) (temporary download only; never committed)

The job validates that every download succeeds, is non-empty, is not HTML, and parses with the expected structure (including matching CSV/JSON sailing counts and separate `us`, `singapore`, and `other` regions in seasonality). It then runs `node scripts/build-movers.mjs` to regenerate `data/price-movers.json` and commits changes to the five published files in `data/` only when their contents changed. A 404, an empty file, or a file that does not parse fails the job and does not create a commit.

## Methodology

The exports are built from the same cruise list and weekly snapshots the DCL Guide tracker publishes.

- Only future sailings are kept in `data/sailings.*`. A sailing that has already departed is dropped.
- A sailing with no priced category is dropped.
- Each category price is the tracker's headline fare for two guests, including taxes and fees. It is not a per-person fare and it is not a fare with taxes added afterward.
- A missing category means that category was not offered at a positive price in the source.
- Per night uses the cheapest of the categories that do have a price, divided by the number of nights, then rounded to the nearest dollar (the same rounding the tracker uses).
- The home port is the embarkation side of the tracker's port string.
- Regional seasonality keeps U.S. homeports, Singapore (Disney Adventure), and other homeports strictly separate.
- Fare movers compare each sailing's first tracked lowest fare against its latest tracked lowest fare (`changeSinceFirst`) across sailings with at least two snapshots.
- The snapshot date is the date the source cruise list was last written, not the clock time of this repository's download.

## Disclaimer

This is an unofficial fan project. It is not affiliated with or endorsed by Disney, Disney Cruise Line, or The Walt Disney Company. DCL Guide does not sell cruises. Prices are snapshots and can change or sell out without notice. Always verify the live fare, and book, on [disneycruise.disney.go.com](https://disneycruise.disney.go.com).
