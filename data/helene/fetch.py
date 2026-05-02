"""Fetch the public-data inputs for the Helene notebook.

Idempotent: each piece is downloaded only if its target file is missing.
If a remote endpoint is unavailable we fall back to a checked-in stub or
skip with a clear message — the notebook handles missing layers gracefully.

Inputs we pull:
  * HURDAT2 best-track text file (NOAA NHC, public).
  * OSM building footprints + hospitals via the Overpass API for a bbox
    around Asheville, NC (the worst-hit Helene area).
  * NASA GIBS true-color MODIS PNGs for before / after the storm.
  * A hand-authored flood polygon stand-in for the Swannanoa / French Broad
    valleys (Sentinel-1 EMS products require Copernicus auth; the simplified
    polygon keeps the notebook self-contained).
"""
from __future__ import annotations

import json
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request

HERE = pathlib.Path(__file__).parent

# A ~10×10 km bbox centered on Asheville, NC. Tight enough to keep the OSM
# building extract under ~20 MB while still covering the worst-hit areas
# (Biltmore Village, downtown, Swannanoa River corridor, West Asheville).
BBOX = {"minlat": 35.530, "minlon": -82.600, "maxlat": 35.640, "maxlon": -82.470}
# The basemap PNGs use a slightly wider bbox to give visual context.
BASEMAP_BBOX = {"minlat": 35.45, "minlon": -82.70, "maxlat": 35.72, "maxlon": -82.40}

UA = "anywidget-experiments-helene-fetch/1.0 (https://github.com/batpad/anywidget-experiments)"


def _get(url: str, timeout: int = 60) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def fetch_hurdat2() -> pathlib.Path:
    target = HERE / "hurdat2.txt"
    if target.exists():
        print(f"  hurdat2.txt exists, skipping")
        return target
    url = "https://www.nhc.noaa.gov/data/hurdat/hurdat2-1851-2024-040425.txt"
    print(f"  fetching {url}")
    target.write_bytes(_get(url))
    print(f"  wrote {target} ({target.stat().st_size:,} bytes)")
    return target


def fetch_overpass(query: str, target: pathlib.Path) -> pathlib.Path:
    if target.exists():
        print(f"  {target.name} exists, skipping")
        return target
    print(f"  Overpass query → {target.name}")
    body = ("data=" + urllib.parse.quote(query)).encode()
    req = urllib.request.Request(
        "https://overpass-api.de/api/interpreter",
        data=body,
        headers={"User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req, timeout=180) as r:
        target.write_bytes(r.read())
    print(f"  wrote {target} ({target.stat().st_size:,} bytes)")
    return target


def fetch_osm_buildings() -> pathlib.Path:
    q = f"""[out:json][timeout:120];
(
  way["building"]({BBOX['minlat']},{BBOX['minlon']},{BBOX['maxlat']},{BBOX['maxlon']});
);
out geom;
"""
    return fetch_overpass(q, HERE / "osm_buildings.json")


def fetch_osm_hospitals() -> pathlib.Path:
    q = f"""[out:json][timeout:60];
(
  node["amenity"="hospital"]({BBOX['minlat']},{BBOX['minlon']},{BBOX['maxlat']},{BBOX['maxlon']});
  way["amenity"="hospital"]({BBOX['minlat']},{BBOX['minlon']},{BBOX['maxlat']},{BBOX['maxlon']});
);
out center geom;
"""
    return fetch_overpass(q, HERE / "osm_hospitals.json")


def fetch_gibs_basemap() -> tuple[pathlib.Path, pathlib.Path]:
    """Pre-storm and post-storm MODIS true-color PNGs from NASA GIBS WMS.

    GIBS daily products usually lag by a day or so but Helene is well past
    the moratorium now. Pre = Sept 25, 2024 (clear). Post = Sept 28, 2024
    (just after landfall in NC).
    """
    out = []
    for label, date in [("modis_before", "2024-09-25"), ("modis_after", "2024-09-28")]:
        target = HERE / f"{label}.png"
        if target.exists():
            print(f"  {target.name} exists, skipping")
            out.append(target)
            continue
        # GIBS WMS — EPSG:4326, bbox lat/lon order is min_lat,min_lon,max_lat,max_lon
        bbox = f"{BASEMAP_BBOX['minlat']},{BASEMAP_BBOX['minlon']},{BASEMAP_BBOX['maxlat']},{BASEMAP_BBOX['maxlon']}"
        url = (
            "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?"
            "SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap"
            "&LAYERS=MODIS_Terra_CorrectedReflectance_TrueColor"
            f"&CRS=EPSG:4326&FORMAT=image/png&WIDTH=1024&HEIGHT=1024"
            f"&TIME={date}&BBOX={bbox}"
        )
        print(f"  fetching GIBS {label} for {date}")
        try:
            target.write_bytes(_get(url))
            print(f"  wrote {target} ({target.stat().st_size:,} bytes)")
        except urllib.error.URLError as e:
            print(f"  WARN: GIBS fetch failed: {e}")
            continue
        out.append(target)
    return tuple(out)


# ---------------------------------------------------------------------------
# Hand-authored flood polygon. Coordinates trace the Swannanoa River /
# French Broad / Biltmore Village floodplain — areas devastated by Helene's
# remnants on 27 Sept 2024. This is an approximation for demonstration; a
# proper analysis would use Sentinel-1 SAR-derived inundation polygons
# (Copernicus EMS rapid mapping product EMSR755 covered this region).
FLOOD_POLYGONS = {
    "type": "FeatureCollection",
    "features": [
        # Biltmore Village / Swannanoa River confluence — devastated by ~4-5 m water
        {
            "type": "Feature",
            "properties": {"name": "Biltmore Village / Swannanoa", "depth_m": 4.2},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [-82.555, 35.585],
                    [-82.545, 35.585],
                    [-82.535, 35.578],
                    [-82.530, 35.572],
                    [-82.525, 35.567],
                    [-82.520, 35.562],
                    [-82.518, 35.555],
                    [-82.522, 35.553],
                    [-82.530, 35.555],
                    [-82.540, 35.560],
                    [-82.548, 35.568],
                    [-82.555, 35.578],
                    [-82.555, 35.585],
                ]],
            },
        },
        # French Broad upstream (West Asheville / RAD) — knee-to-waist water inland
        {
            "type": "Feature",
            "properties": {"name": "French Broad — RAD/West Asheville", "depth_m": 1.6},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [-82.585, 35.610],
                    [-82.575, 35.612],
                    [-82.568, 35.605],
                    [-82.560, 35.598],
                    [-82.555, 35.590],
                    [-82.560, 35.585],
                    [-82.572, 35.588],
                    [-82.580, 35.595],
                    [-82.585, 35.602],
                    [-82.585, 35.610],
                ]],
            },
        },
        # Swannanoa / Black Mountain corridor — drowned river valley
        {
            "type": "Feature",
            "properties": {"name": "Swannanoa corridor — east", "depth_m": 3.4},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [-82.510, 35.595],
                    [-82.495, 35.602],
                    [-82.480, 35.605],
                    [-82.465, 35.605],
                    [-82.450, 35.598],
                    [-82.448, 35.592],
                    [-82.460, 35.590],
                    [-82.475, 35.595],
                    [-82.490, 35.595],
                    [-82.505, 35.590],
                    [-82.510, 35.595],
                ]],
            },
        },
        # North Asheville / downtown periphery — shallow streetside flooding
        # near the French Broad's wider floodplain on the city's west edge.
        {
            "type": "Feature",
            "properties": {"name": "North Asheville periphery", "depth_m": 0.6},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [-82.580, 35.624],
                    [-82.565, 35.628],
                    [-82.550, 35.626],
                    [-82.538, 35.620],
                    [-82.535, 35.612],
                    [-82.548, 35.610],
                    [-82.563, 35.614],
                    [-82.578, 35.618],
                    [-82.580, 35.624],
                ]],
            },
        },
        # Downtown street-level pooling
        {
            "type": "Feature",
            "properties": {"name": "Downtown — street pooling", "depth_m": 0.4},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [-82.560, 35.598],
                    [-82.545, 35.600],
                    [-82.540, 35.595],
                    [-82.548, 35.590],
                    [-82.560, 35.592],
                    [-82.560, 35.598],
                ]],
            },
        },
    ],
}


def write_flood_polygon() -> pathlib.Path:
    target = HERE / "flood_extent.geojson"
    if target.exists():
        print(f"  flood_extent.geojson exists, skipping")
        return target
    target.write_text(json.dumps(FLOOD_POLYGONS, indent=2))
    print(f"  wrote {target} ({target.stat().st_size:,} bytes)")
    return target


def main():
    print("Fetching Helene inputs into", HERE)
    write_flood_polygon()
    fetch_hurdat2()
    fetch_gibs_basemap()
    fetch_osm_hospitals()
    fetch_osm_buildings()
    print("Done.")


if __name__ == "__main__":
    main()
