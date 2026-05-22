# Montandon STAC – Overview, Collections, and Analysis Ideas

> Confidence: 93%  
> Audience: beginner–intermediate coders  
> Source: live authenticated Montandon STAC API (https://montandon-eoapi.ifrc.org/stac)

---

## 1. What Is Montandon and Why It Matters

Montandon is a **global crisis data bank** that normalizes disaster data from many sources into one STAC API.

**Why it matters for humanitarians**
- One API instead of many source‑specific formats
- Cross‑source linking via `monty:corr_id`
- Near real‑time event feeds + historical archives
- Covers hazards, events, and impacts in a single structure

**Montandon’s core structure**
- `*-events` – source event records (USGS earthquakes, GDACS alerts, EM‑DAT disasters, etc.)
- `*-hazards` – hazard footprints, severity scores, polygons
- `*-impacts` – affected people, deaths, displaced, damaged buildings

---

## 2. Collections Inventory

### Populated Collections

| Collection ID | Title | Approx. Items | Geometry Types |
|--------------|-------|-----------------|---------------|
| `pdc-events` | PDC Source Events | 34,388 | Point |
| `pdc-hazards` | PDC Source Hazards | 34,388 | Polygon |
| `pdc-impacts` | PDC Impacts | 745,218 | Point / Polygon |
| `idmc-gidd-impacts` | IDMC GIDD Impacts | 32,536 | MultiPoint |
| `idmc-gidd-events` | IDMC GIDD Source Events | 16,224 | MultiPoint |
| `gdacs-impacts` | GDACS Impacts | 135,518 | Point |
| `gdacs-events` | GDACS Source Events | 6,659 | Point |
| `gdacs-hazards` | GDACS Hazards | 6,659 | Polygon |
| `usgs-events` | USGS Events | 6,332 | Point |
| `usgs-hazards` | USGS Hazards | 6,332 | Polygon |
| `usgs-impacts` | USGS Impacts | 81 | Point |
| `idmc-idu-events` | IDMC IDU Events | 2,012 | Point |
| `idmc-idu-impacts` | IDMC IDU Impacts | 3,701 | Point |
| `gfd-events` | GFD Events | 913 | Polygon |
| `gfd-hazards` | GFD Hazards | 913 | Polygon |
| `gfd-impacts` | GFD Impacts | 1,826 | Polygon |
| `emdat-events` | EM‑DAT Events | 123 | MultiPolygon |
| `emdat-hazards` | EM‑DAT Hazards | 123 | MultiPolygon |
| `emdat-impacts` | EM‑DAT Impacts | 340 | MultiPolygon |
| `ibtracs-events` | IBTrACS Events | 1 | LineString |
| `ibtracs-hazards` | IBTrACS Hazards | 47 | — |
| `glide-events` | GLIDE Events | 4 | Point |
| `glide-hazards` | GLIDE Hazards | 4 | — |

### Present but Empty Right Now
- `desinventar-events`, `desinventar-impacts`
- `ifrcevent-events`, `ifrcevent-impacts`

---

## 3. Key Schema Fields

### Common Fields (appear in most collections)
- `datetime`, `start_datetime`, `end_datetime`
- `geometry` – Point, Polygon, MultiPolygon, LineString, MultiPoint
- `title`, `description`, `keywords`
- `monty:corr_id` – **cross‑source correlation ID** (core Montandon utility)
- `monty:src_event_id` – original source ID
- `monty:country_codes` – country linkage
- `monty:hazard_codes` – hazard taxonomy codes
- `monty:episode_number` – event episode tracking
- `roles`

### Hazard Detail (`monty:hazard_detail`)
- `severity_value` – numeric severity
- `severity_unit` – e.g. `ml`, `GDACS Severity Score`, `GFD Flood Severity Score`
- `estimate_type` – `primary`, `modelled`
- `cluster` (some sources)

### Impact Detail (`monty:impact_detail`)
- `category` – e.g. `people`, `buildings`
- `type` – e.g. `death`, `displaced_total`, `affected_total`, `displaced_internal`, `evacuated`, `damaged`
- `value` – numeric figure
- `unit` – e.g. `count`, `USD`, `sendai`
- `estimate_type` – `primary`, `modelled`

### Source‑Specific Extras
- USGS: `eq:magnitude`, `eq:depth`, `eq:magnitude_type`, `eq:tsunami`, `eq:status`, `forecasted` (True/False)
- IBTrACS: cyclone track (LineString)
- PDC/IDU: demographic breakdowns (`adult_*`, `children_*`, `elderly`, `hospitals`, `schools`, `households`)

---

## 4. Example Values

### Hazard Severity Examples
- USGS: `severity_value=1.15`, `severity_unit="ml"`
- GDACS: `severity_value=0.5`, `severity_unit="GDACS Severity Score"`, `severity_label="Green"`
- GFD: `severity_value=1.5`, `severity_unit="GFD Flood Severity Score"`

### Impact Categories & Units
- `people / death / count`
- `people / displaced_total / count`
- `people / displaced_internal / count`
- `people / affected_total / count`
- `people / evacuated / count`
- `people / injured / count`
- `buildings / damaged / sendai`
- `buildings / cost / USD`
- `households / affected_total / (none)`
- `hospitals / affected_total / (none)`
- `schools / affected_total / (none)`

### Forecast Flag
- `forecasted=True` appears on some USGS impact records

---

## 5. Promising Analysis Ideas

### High Demo Value
1. **Cross‑source crisis lens**
   - Pick one active disaster
   - Pull all linked records by `monty:corr_id`
   - Compare event descriptions, hazard footprints, reported vs modelled impacts
   - Why it works: best demo of Montandon’s core value

2. **Historical calibration**
   - Compare early severity signals vs later curated impacts (EM‑DAT, IDMC)
   - Answer: which feed is most reliable for what?
   - Why it works: builds trust with analysts

### High Humanitarian Value
3. **Flood displacement risk explorer**
   - Combine GFD floods, IDMC displacement, population rasters, admin boundaries
   - Map: where do flood footprints overlap dense populations?
   - Why it works: concrete, operationally relevant narrative

4. **Earthquake rapid impact triage**
   - USGS events + ShakeMap hazards + modelled impacts
   - Overlay population grids, OSM hospitals/schools/roads
   - Why it works: fast, high‑signal response workflow

5. **Cyclone track + exposure story**
   - IBTrACS tracks + GDACS/PDC alerts/impacts
   - Overlay coastal population and admin boundaries
   - Why it works: visually strong, good for anticipatory action

6. **Displacement‑centric humanitarian briefing**
   - Focus on IDMC GIDD + IDU displacements
   - Link hazard/event context via Montandon
   - Why it works: very humanitarian‑specific, clean narrative

### Operational / Monitoring
7. **Country watchlist / early‑warning board**
   - Rank countries by recent event count, hazard severity, affected/displaced totals
   - Count corroborating sources per `monty:corr_id`
   - Why it works: simple, practical, shows source corroboration value

8. **Repeated‑shock hotspot analysis**
   - Aggregate events, displaced, deaths by admin unit
   - Add hazard diversity, population, vulnerability layers
   - Why it works: identifies chronic crisis hotspots for preparedness

9. **Data quality / source complementarity**
   - Analyze Montandon itself: polygons vs points, modelled vs reported impacts
   - Coverage by country, hazard type, latency from event to impact
   - Why it works: strong technical demo, useful before building products

---

## 6. Recommended First Notebook

**Title:** “Recent High‑Impact Events with Corroborated Sources”

**Workflow**
1. Query last 30 days, `max_items` large enough for all sources
2. Group by `monty:corr_id`
3. For each linked crisis, show:
   - Event title and time
   - Affected countries
   - Hazard type and max severity
   - Latest affected / displaced / death estimates
   - Number of corroborating sources
4. Map:
   - Hazard footprint (polygon if available)
   - Admin boundaries (GADM or geoBoundaries)
   - Population layer (WorldPop or Meta HRSL)

**Why this first**
- Demos Montandon’s cross‑source linking clearly
- Produces something immediately useful for humanitarians
- Uses events + hazards + impacts together

---

## 7. Recommended Augmentation Datasets

### Population
- WorldPop (https://www.worldpop.org/)
- GPW (Gridded Population of the World)
- Meta High‑Resolution Settlement Layer (HRSL)

### Administrative Boundaries
- geoBoundaries (https://www.geoboundaries.org/)
- GADM (https://gadm.org/)
- HDX COD‑AB (Common Operational Datasets – Administrative Boundaries)

### Weather & Forecasts
- ECMWF forecast API
- NOAA weather services
- Open‑Meteo
- IBTrACS cyclone forecast tracks

### OSM Features
- Hospitals
- Schools
- Roads and major infrastructure
- Airports and logistics hubs

### Vulnerability / Context
- Poverty / multidimensional poverty indices
- Fragility indices
- IPC / food security classifications (where available)

---

## 8. Key Takeaway

Montandon’s biggest utility is **normalizing many disaster sources into one API and linking them with `monty:corr_id`**.

The strongest notebooks will:
- Show one crisis across multiple sources
- Combine hazard footprints with population and impact data
- Demonstrate early‑warning and rapid‑triage workflows

*End of overview – confident about collections, schemas, and analysis suggestions based on live API inspection (93%).*
