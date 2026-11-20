# Disney Cruise Fare History
Live tracker: [Disney Cruise Prices 2026-2027 on DCL Guide](https://dclguide.com/disney-cruise-prices)

Unofficial snapshot of upcoming Disney Cruise Line fares, published as CSV and JSON so anyone can download, chart, or cite them. The files match the fare table behind the DCL Guide price tracker. A browsable copy of this repository is at [https://lakerw8.github.io/dcl-fare-history/](https://lakerw8.github.io/dcl-fare-history/).

This is a current snapshot, not a time series. Each refresh replaces `data/sailings.csv` and `data/sailings.json`. Older snapshots stay in this repository's git history. DCL Guide's own price-history archive is not included.

The first published copy is dated **2026-11-19** and contains **902** future sailings, with departures from 2026-11-20 through 2028-05-13. After the next refresh, read `updated` and `sailings.length` in the JSON for the current date and row count.

## What is in the files

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

## Column dictionary

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

## Update cadence

DCL Guide refreshes its tracker on Mondays. This repository pulls the public export the next day.

[`.github/workflows/refresh.yml`](.github/workflows/refresh.yml) runs every **Tuesday at 17:00 UTC**, and whenever it is started by hand (`workflow_dispatch`). It downloads:

- [https://dclguide.com/data/sailings.csv](https://dclguide.com/data/sailings.csv)
- [https://dclguide.com/data/sailings.json](https://dclguide.com/data/sailings.json)

The job checks that both downloads succeed, are non-empty, and parse, and that the CSV row count matches the JSON sailing count. It commits the two files only when their contents changed. A 404, an empty file, or a file that does not parse fails the job and does not create a commit.

## Methodology

The export is built from the same cruise list the DCL Guide tracker publishes.

- Only future sailings are kept. A sailing that has already departed is dropped.
- A sailing with no priced category is dropped.
- Each category price is the tracker's headline fare for two guests, including taxes and fees. It is not a per-person fare and it is not a fare with taxes added afterward.
- A missing category means that category was not offered at a positive price in the source.
- Per night uses the cheapest of the categories that do have a price, divided by the number of nights, then rounded to the nearest dollar (the same rounding the tracker uses).
- The home port is the embarkation side of the tracker's port string.
- The snapshot date is the date the source cruise list was last written, not the clock time of this repository's download.

## Disclaimer

This is an unofficial fan project. It is not affiliated with or endorsed by Disney, Disney Cruise Line, or The Walt Disney Company. DCL Guide does not sell cruises. Prices are snapshots and can change or sell out without notice. Always verify the fare, and book, on [disneycruise.disney.go.com](https://disneycruise.disney.go.com).
