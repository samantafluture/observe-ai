/**
 * Phase 5 — correlation engine.
 *
 * Given a selected feature, walk the loaded data across every layer and
 * return the set of related feature IDs plus a human-readable relation list.
 * The traversal is intentionally narrow: only *first-order* edges. That keeps
 * the resulting highlight legible and the traversal O(N) in the loaded data.
 *
 * Relationship kinds we surface:
 *
 *   - supply-upstream / supply-downstream — supply arcs pointing to or from
 *     the selected facility, and their opposite endpoints.
 *   - co-located                          — facilities (DCs, labs, fabs)
 *     sharing the selected entity's country.
 *   - regulated-by                        — the regulatory zone whose
 *     country_iso matches the selected entity's country.
 *   - investment                          — the money-flow point for that
 *     country in the latest year within the window.
 *   - export-controlled                   — CSL entities in the same country.
 *   - research-tie                        — coauthorship edges incident to
 *     the selected country (heuristic: any edge whose endpoint id mentions a
 *     city/country we know about).
 *   - trade-partner                       — IC trade arcs incident to the
 *     selected country.
 *   - patent-cluster                      — patent cities in the selected
 *     country.
 *   - jobs-cluster                        — AI job posting cities in the
 *     selected country.
 *   - esg-annotation                      — ESG records whose facility_id
 *     equals the selected facility (or any facility in the country when a
 *     country row is selected).
 */
import type {
  AnyFeature,
  CoauthorshipFeature,
  EsgFeature,
  ExportControlFeature,
  FacilityFeature,
  JobPostingFeature,
  MoneyFlowFeature,
  PatentFeature,
  RegulatoryFeature,
  SupplyArcFeature,
  TradeArcFeature,
} from '../types';
import type { FacilityDataByLayer } from '../hooks/useFacilityData';

export type RelationKind =
  | 'supply-upstream'
  | 'supply-downstream'
  | 'co-located'
  | 'regulated-by'
  | 'investment'
  | 'export-controlled'
  | 'research-tie'
  | 'trade-partner'
  | 'patent-cluster'
  | 'jobs-cluster'
  | 'esg-annotation';

export interface Relation {
  /** ID of the related feature. Click-jumping uses this. */
  id: string;
  /** Short human label, e.g. "Fab 18 (TSMC)" or "UK · strict regime". */
  label: string;
  /** Secondary line, e.g. "arc · fab → AWS" or "2024 · $4.5B". */
  detail?: string;
  kind: RelationKind;
  /** The related feature itself so DetailPanel can reselect without scanning. */
  feature: AnyFeature;
}

export interface CorrelationSet {
  /** Stable cache key for updateTriggers — identity of the selection. */
  key: string;
  /** The selected feature's own id (always present in the set). */
  sourceId: string;
  /** Union of every related id AND the source id. */
  ids: Set<string>;
  /** Ordered list of relations, grouped by kind. */
  relations: Relation[];
  /** Great-circle edge spec for the correlation arcs layer. */
  edges: CorrelationEdge[];
}

export interface CorrelationEdge {
  id: string;
  kind: RelationKind;
  from: [number, number];
  to: [number, number];
}

// --- Country lookup helpers -----------------------------------------------

// Regulatory layer uses ISO-3 (USA, CHN, GBR, …). Everything else uses ISO-2
// (US, CN, GB). Keep a minimal bidirectional map for the countries our data
// actually touches.
const ISO3_TO_2: Record<string, string> = {
  USA: 'US', CHN: 'CN', GBR: 'GB', CAN: 'CA', DEU: 'DE', FRA: 'FR',
  JPN: 'JP', KOR: 'KR', IND: 'IN', BRA: 'BR', AUS: 'AU', ISR: 'IL',
  SGP: 'SG', NLD: 'NL', CHE: 'CH', ARE: 'AE', IRL: 'IE', SWE: 'SE',
  ESP: 'ES', ITA: 'IT', MEX: 'MX', RUS: 'RU', AUT: 'AT', BEL: 'BE',
  POL: 'PL', NOR: 'NO', DNK: 'DK', FIN: 'FI', PRT: 'PT', GRC: 'GR',
  TWN: 'TW', SAU: 'SA', THA: 'TH', MYS: 'MY', IDN: 'ID', VNM: 'VN',
  ZAF: 'ZA', TUR: 'TR', ARG: 'AR', EST: 'EE',
};
const ISO2_TO_3: Record<string, string> = Object.fromEntries(
  Object.entries(ISO3_TO_2).map(([a, b]) => [b, a]),
);

function getFeatureId(f: AnyFeature): string {
  return (f.properties as { id?: string }).id ?? '';
}

/**
 * Determine the country (ISO-2) of any feature. Returns '' when no country
 * can be inferred (regulatory zones return their ISO-2 equivalent).
 */
function countryOf(f: AnyFeature): string {
  const p = f.properties as unknown as Record<string, unknown>;
  if ('country' in p && typeof p.country === 'string' && p.country.length === 2) {
    return p.country;
  }
  if ('country_iso' in p && typeof p.country_iso === 'string') {
    const c = p.country_iso;
    if (c.length === 3) return ISO3_TO_2[c] ?? '';
    if (c.length === 2) return c;
  }
  return '';
}

function isFacility(f: AnyFeature): f is FacilityFeature {
  return f.geometry.type === 'Point' && (f.properties as { type?: string }).type != null
    && ['datacenter', 'ai_facility', 'fab'].includes((f.properties as { type: string }).type);
}

function coordsOf(f: AnyFeature): [number, number] | null {
  if (f.geometry.type === 'Point') {
    const [lng, lat] = f.geometry.coordinates as [number, number];
    return [lng, lat];
  }
  if (f.geometry.type === 'LineString') {
    // Arcs have a "self" midpoint — just use the first endpoint for now.
    const [lng, lat] = f.geometry.coordinates[0] as [number, number];
    return [lng, lat];
  }
  // Polygons: compute a cheap centroid from the first ring.
  if (f.geometry.type === 'Polygon') {
    const ring = f.geometry.coordinates[0] as [number, number][];
    return centroid(ring);
  }
  if (f.geometry.type === 'MultiPolygon') {
    const ring = (f.geometry.coordinates[0] ?? [])[0] as [number, number][];
    return ring ? centroid(ring) : null;
  }
  return null;
}

function centroid(ring: [number, number][]): [number, number] {
  if (!ring.length) return [0, 0];
  let sx = 0;
  let sy = 0;
  for (const [x, y] of ring) {
    sx += x;
    sy += y;
  }
  return [sx / ring.length, sy / ring.length];
}

// --- Main builder ---------------------------------------------------------

export function buildCorrelationSet(
  selected: AnyFeature,
  data: FacilityDataByLayer,
  t0: number,
  t1: number,
): CorrelationSet {
  const sourceId = getFeatureId(selected);
  const key = `${sourceId}|${t0}|${t1}`;
  const selfCoords = coordsOf(selected);
  const selfCountry = countryOf(selected);

  const relations: Relation[] = [];
  const edges: CorrelationEdge[] = [];
  const ids = new Set<string>([sourceId]);

  const inWindow = (y: number | undefined): boolean =>
    y == null || (y >= t0 && y <= t1);

  const allFacilities = (): FacilityFeature[] => {
    const arr: FacilityFeature[] = [];
    for (const id of [
      'datacenters-google',
      'datacenters-aws',
      'datacenters-azure',
      'ai-facilities',
      'fabs',
    ] as const) {
      const fc = data[id];
      if (fc) arr.push(...(fc.features as unknown as FacilityFeature[]));
    }
    return arr;
  };

  const push = (rel: Relation, edge?: CorrelationEdge) => {
    if (rel.id === sourceId) return;
    if (ids.has(rel.id)) return;
    ids.add(rel.id);
    relations.push(rel);
    if (edge) edges.push(edge);
  };

  // --- Supply arcs incident to the selection (facility or arc itself) ----
  const supplyArcs = (data['supply-arcs']?.features ?? []) as unknown as SupplyArcFeature[];
  const facilityIndex = new Map<string, FacilityFeature>();
  for (const f of allFacilities()) facilityIndex.set(f.properties.id, f);

  // If the selection is a facility, enumerate arcs touching it.
  if (isFacility(selected)) {
    for (const arc of supplyArcs) {
      if (!inWindow(arc.properties.year)) continue;
      const { from_id, to_id } = arc.properties;
      if (from_id === sourceId) {
        const to = facilityIndex.get(to_id);
        if (to) {
          push(
            {
              id: to.properties.id,
              label: to.properties.name,
              detail: `supplies to · ${to.properties.operator}`,
              kind: 'supply-downstream',
              feature: to,
            },
            selfCoords && {
              id: `corr-${arc.properties.id}-dn`,
              kind: 'supply-downstream',
              from: selfCoords,
              to: to.geometry.coordinates as [number, number],
            } || undefined,
          );
        }
      } else if (to_id === sourceId) {
        const from = facilityIndex.get(from_id);
        if (from) {
          push(
            {
              id: from.properties.id,
              label: from.properties.name,
              detail: `supplied by · ${from.properties.operator}`,
              kind: 'supply-upstream',
              feature: from,
            },
            selfCoords && {
              id: `corr-${arc.properties.id}-up`,
              kind: 'supply-upstream',
              from: from.geometry.coordinates as [number, number],
              to: selfCoords,
            } || undefined,
          );
        }
      }
    }
  }

  // If the selection is itself an arc, pull both endpoints in.
  if (selected.geometry.type === 'LineString' && 'from_id' in (selected.properties as unknown as Record<string, unknown>)) {
    const { from_id, to_id } = selected.properties as { from_id: string; to_id: string };
    const from = facilityIndex.get(from_id);
    const to = facilityIndex.get(to_id);
    if (from) {
      push({
        id: from.properties.id,
        label: from.properties.name,
        detail: `origin · ${from.properties.operator}`,
        kind: 'supply-upstream',
        feature: from,
      });
    }
    if (to) {
      push({
        id: to.properties.id,
        label: to.properties.name,
        detail: `destination · ${to.properties.operator}`,
        kind: 'supply-downstream',
        feature: to,
      });
    }
  }

  // --- Co-located facilities (same country) ------------------------------
  if (selfCountry && isFacility(selected)) {
    for (const f of allFacilities()) {
      if (f.properties.id === sourceId) continue;
      if (f.properties.country !== selfCountry) continue;
      if (!inWindow(f.properties.opened)) continue;
      push({
        id: f.properties.id,
        label: f.properties.name,
        detail: `co-located · ${f.properties.operator}`,
        kind: 'co-located',
        feature: f,
      });
      if (relations.filter((r) => r.kind === 'co-located').length >= 12) break;
    }
  }

  // --- Regulatory zone ---------------------------------------------------
  const regs = (data['regulatory-zones']?.features ?? []) as unknown as RegulatoryFeature[];
  if (selfCountry) {
    const iso3 = ISO2_TO_3[selfCountry];
    const zone = regs.find((r) => r.properties.country_iso === iso3 || r.properties.country_iso === selfCountry);
    if (zone) {
      const zoneCoords = coordsOf(zone);
      push(
        {
          id: zone.properties.id,
          label: `${zone.properties.country_name}`,
          detail: `regulated · ${zone.properties.regime}`,
          kind: 'regulated-by',
          feature: zone,
        },
        selfCoords && zoneCoords
          ? {
              id: `corr-reg-${sourceId}`,
              kind: 'regulated-by',
              from: selfCoords,
              to: zoneCoords,
            }
          : undefined,
      );
    }
  }

  // --- Money flow for same country (latest year in window) ---------------
  const money = (data['money-flow']?.features ?? []) as unknown as MoneyFlowFeature[];
  if (selfCountry) {
    const matches = money
      .filter((m) => m.properties.country_iso === selfCountry && inWindow(m.properties.year))
      .sort((a, b) => b.properties.year - a.properties.year);
    if (matches[0]) {
      const m = matches[0];
      const usd = m.properties.amount_usd;
      const billions = usd / 1e9;
      const detail = `${m.properties.year} · ~$${billions >= 1 ? billions.toFixed(1) + 'B' : (usd / 1e6).toFixed(0) + 'M'} private`;
      const mCoords = coordsOf(m);
      push(
        {
          id: m.properties.id,
          label: `AI investment · ${m.properties.country_name}`,
          detail,
          kind: 'investment',
          feature: m,
        },
        selfCoords && mCoords
          ? { id: `corr-money-${sourceId}`, kind: 'investment', from: selfCoords, to: mCoords }
          : undefined,
      );
    }
  }

  // --- Export controls in same country -----------------------------------
  const csl = (data['export-controls']?.features ?? []) as unknown as ExportControlFeature[];
  if (selfCountry) {
    let added = 0;
    for (const e of csl) {
      if (e.properties.country !== selfCountry) continue;
      if (!inWindow(e.properties.listed_year)) continue;
      const eCoords = coordsOf(e);
      push(
        {
          id: e.properties.id,
          label: e.properties.name,
          detail: `${e.properties.list_name} · ${e.properties.listed_year}`,
          kind: 'export-controlled',
          feature: e,
        },
        selfCoords && eCoords
          ? { id: `corr-ec-${e.properties.id}`, kind: 'export-controlled', from: selfCoords, to: eCoords }
          : undefined,
      );
      added += 1;
      if (added >= 8) break;
    }
  }

  // --- Trade partners incident to country --------------------------------
  const trade = (data['supply-trade']?.features ?? []) as unknown as TradeArcFeature[];
  if (selfCountry) {
    let added = 0;
    for (const t of trade) {
      if (!inWindow(t.properties.year)) continue;
      const fromMatch = t.properties.from_iso === selfCountry;
      const toMatch = t.properties.to_iso === selfCountry;
      if (!fromMatch && !toMatch) continue;
      const billions = t.properties.value_usd / 1e9;
      push({
        id: t.properties.id,
        label: `${t.properties.from_name} → ${t.properties.to_name}`,
        detail: `HS ${t.properties.hs_code} · ${t.properties.year} · ~$${billions.toFixed(1)}B`,
        kind: 'trade-partner',
        feature: t,
      });
      added += 1;
      if (added >= 6) break;
    }
  }

  // --- Co-authorship ties incident to country ----------------------------
  // Coauth endpoints are institution slugs ("stanford", "tsinghua"); we can't
  // geolocate them cheaply so we don't emit edges here — just relation rows.
  const coauth = (data['coauthorship']?.features ?? []) as unknown as CoauthorshipFeature[];
  if (selfCountry && isFacility(selected)) {
    // Heuristic: a lab's institution id matches its facility id stripped of
    // the "ai-" prefix (e.g. ai-openai ↔ "openai"). That only covers AI
    // labs, which is the only selection where this traversal reads well.
    const instKey = sourceId.startsWith('ai-') ? sourceId.slice(3) : sourceId;
    let added = 0;
    for (const c of coauth) {
      if (!inWindow(c.properties.year)) continue;
      if (c.properties.from_id !== instKey && c.properties.to_id !== instKey) continue;
      push({
        id: c.properties.id,
        label: `${c.properties.from_name} ↔ ${c.properties.to_name}`,
        detail: `${c.properties.year} · ${c.properties.weight} papers`,
        kind: 'research-tie',
        feature: c,
      });
      added += 1;
      if (added >= 6) break;
    }
  }

  // --- Patent cluster in country -----------------------------------------
  const patents = (data['patents']?.features ?? []) as unknown as PatentFeature[];
  if (selfCountry) {
    const matches = patents
      .filter((p) => p.properties.country === selfCountry && inWindow(p.properties.year))
      .sort((a, b) => b.properties.count - a.properties.count);
    if (matches[0]) {
      const p = matches[0];
      const pCoords = coordsOf(p);
      push(
        {
          id: p.properties.id,
          label: `${p.properties.city} · patents`,
          detail: `${p.properties.year} · ${p.properties.count.toLocaleString()} grants`,
          kind: 'patent-cluster',
          feature: p,
        },
        selfCoords && pCoords
          ? { id: `corr-pat-${p.properties.id}`, kind: 'patent-cluster', from: selfCoords, to: pCoords }
          : undefined,
      );
    }
  }

  // --- Jobs cluster in country -------------------------------------------
  const jobs = (data['ai-jobs']?.features ?? []) as unknown as JobPostingFeature[];
  if (selfCountry) {
    const matches = jobs
      .filter((j) => j.properties.country === selfCountry && inWindow(j.properties.year))
      .sort((a, b) => b.properties.postings - a.properties.postings);
    for (const j of matches.slice(0, 3)) {
      const jCoords = coordsOf(j);
      push(
        {
          id: j.properties.id,
          label: `${j.properties.city} · jobs`,
          detail: `${j.properties.year} · ${j.properties.postings.toLocaleString()} postings`,
          kind: 'jobs-cluster',
          feature: j,
        },
        selfCoords && jCoords
          ? { id: `corr-job-${j.properties.id}`, kind: 'jobs-cluster', from: selfCoords, to: jCoords }
          : undefined,
      );
    }
  }

  // --- ESG annotation ----------------------------------------------------
  const esg = (data['esg']?.features ?? []) as unknown as EsgFeature[];
  for (const e of esg) {
    if (!inWindow(e.properties.year)) continue;
    const match =
      e.properties.facility_id === sourceId ||
      (isFacility(selected) && e.properties.facility_id === sourceId);
    if (!match) continue;
    const energyTwh = e.properties.energy_mwh / 1e6;
    const waterMm3 = e.properties.water_m3 / 1e6;
    push({
      id: e.properties.id,
      label: `ESG · ${e.properties.facility_name}`,
      detail: `${e.properties.year} · ${energyTwh.toFixed(1)} TWh · ${waterMm3.toFixed(1)}M m³`,
      kind: 'esg-annotation',
      feature: e,
    });
  }

  return { key, sourceId, ids, relations, edges };
}

// --- Render helpers -------------------------------------------------------

/**
 * Fade a per-feature alpha when a correlation is active and the feature is
 * not in the correlated set. `baseAlpha` is the normal alpha.
 */
export function dimIfNeeded(
  baseAlpha: number,
  featureId: string | undefined,
  correlation: CorrelationSet | null,
): number {
  if (!correlation) return baseAlpha;
  if (featureId && correlation.ids.has(featureId)) return baseAlpha;
  // Drop to ~18% of normal alpha to push unrelated features into the basemap.
  return Math.round(baseAlpha * 0.18);
}

/**
 * Color lookup for correlation arcs, per relation kind. Chosen to keep the
 * overlay readable over the CRT phosphor palette.
 */
export const CORRELATION_COLOR: Record<RelationKind, [number, number, number]> = {
  'supply-upstream':   [255, 200, 120],
  'supply-downstream': [120, 255, 180],
  'co-located':        [200, 255, 220],
  'regulated-by':      [130, 190, 255],
  'investment':        [255, 220, 120],
  'export-controlled': [255, 110, 110],
  'research-tie':      [120, 230, 220],
  'trade-partner':     [170, 210, 245],
  'patent-cluster':    [200, 160, 255],
  'jobs-cluster':      [255, 180, 210],
  'esg-annotation':    [140, 220, 180],
};

export const RELATION_LABEL: Record<RelationKind, string> = {
  'supply-upstream':   'Supplied by',
  'supply-downstream': 'Supplies to',
  'co-located':        'Co-located',
  'regulated-by':      'Regulated by',
  'investment':        'Investment',
  'export-controlled': 'Export controls',
  'research-tie':      'Research tie',
  'trade-partner':     'Trade partner',
  'patent-cluster':    'Patent cluster',
  'jobs-cluster':      'Jobs cluster',
  'esg-annotation':    'Energy + water',
};
