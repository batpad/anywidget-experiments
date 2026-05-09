"""Fetch NYC building footprints from Overture Maps.

Idempotent: if `buildings.parquet` already exists we skip the download.
Uses the official `overturemaps` Python library, which streams
GeoParquet directly from the Overture S3 release.

Bbox covers Manhattan + Long Island City + parts of Brooklyn — tuned
to land around 80–100K buildings while keeping the parquet under
~100 MB.
"""
from __future__ import annotations

import pathlib
import sys

HERE = pathlib.Path(__file__).parent

# (minx, miny, maxx, maxy) — Manhattan + LIC + parts of Brooklyn / Queens
BBOX = (-74.030, 40.680, -73.920, 40.820)


def fetch_buildings() -> pathlib.Path:
    target = HERE / "buildings.parquet"
    if target.exists():
        print(f"  buildings.parquet exists ({target.stat().st_size:,} bytes), skipping")
        return target

    print(f"  fetching Overture buildings for bbox {BBOX} (~30s per Overture docs)")
    from overturemaps import record_batch_reader

    reader = record_batch_reader("building", bbox=BBOX)
    if reader is None:
        raise RuntimeError("Overture record_batch_reader returned None")

    import pyarrow.parquet as pq

    with pq.ParquetWriter(
        target, reader.schema, compression="zstd", compression_level=9
    ) as writer:
        n_rows = 0
        for batch in reader:
            writer.write_batch(batch)
            n_rows += batch.num_rows
            print(f"    wrote {n_rows:,} buildings so far...")

    print(f"  wrote {target} ({target.stat().st_size:,} bytes, {n_rows:,} rows)")
    return target


if __name__ == "__main__":
    try:
        fetch_buildings()
    except Exception as e:
        print(f"FAILED: {e}", file=sys.stderr)
        sys.exit(1)
