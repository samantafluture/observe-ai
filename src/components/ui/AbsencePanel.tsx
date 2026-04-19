import { useMemo, useState } from 'react';
import { useFacilityData } from '../../hooks/useFacilityData';
import { useUrlTimeline } from '../../hooks/useUrlState';
import type {
  CoauthorshipFeature,
  ExportControlFeature,
  FacilityFeature,
  MoneyFlowFeature,
  RegulatoryFeature,
} from '../../types';

// Map common 3-letter country codes (regulatory layer) to the 2-letter codes
// used by everything else. We only care about the regulatory countries that
// have a regime declared.
const ISO3_TO_2: Record<string, string> = {
  USA: 'US', CHN: 'CN', GBR: 'GB', CAN: 'CA', DEU: 'DE', FRA: 'FR',
  JPN: 'JP', KOR: 'KR', IND: 'IN', BRA: 'BR', AUS: 'AU', ISR: 'IL',
  SGP: 'SG', NLD: 'NL', CHE: 'CH', ARE: 'AE', IRL: 'IE', SWE: 'SE',
  ESP: 'ES', ITA: 'IT', MEX: 'MX', RUS: 'RU', AUT: 'AT', BEL: 'BE',
  POL: 'PL', NOR: 'NO', DNK: 'DK', FIN: 'FI', PRT: 'PT', GRC: 'GR',
  CZE: 'CZ', HUN: 'HU', ROU: 'RO', LVA: 'LV', LTU: 'LT', LUX: 'LU',
  MLT: 'MT', SVK: 'SK', SVN: 'SI', BGR: 'BG', HRV: 'HR', CYP: 'CY',
  EST: 'EE', IDN: 'ID', VNM: 'VN', ZAF: 'ZA', TUR: 'TR', ARG: 'AR',
};

interface Finding {
  iso2: string;
  name: string;
  reason: string;
}

/**
 * Absence-detection panel — surfaces correlations *by their absence*:
 *
 *   - countries with "strict" or "executive-order" regimes that host zero
 *     listed semiconductor fabs ("regulating an industry they don't have");
 *   - countries hosting compute (data center / AI lab) but no measurable
 *     private AI investment in the latest year ("infrastructure without
 *     capital");
 *   - countries that appear in the export-controls layer but have no
 *     OpenAlex co-authorship ties to U.S. institutions in the window
 *     ("severed knowledge edges").
 *
 * Findings update live with the timeline scrubber.
 */
export function AbsencePanel() {
  const [open, setOpen] = useState(true);
  const { data } = useFacilityData();
  const { t0, t1 } = useUrlTimeline();

  const findings = useMemo<Finding[]>(() => {
    const reg = (data['regulatory-zones']?.features ?? []) as unknown as RegulatoryFeature[];
    const fabs = (data.fabs?.features ?? []) as unknown as FacilityFeature[];
    const labs = (data['ai-facilities']?.features ?? []) as unknown as FacilityFeature[];
    const dcs = ([
      ...(data['datacenters-google']?.features ?? []),
      ...(data['datacenters-aws']?.features ?? []),
      ...(data['datacenters-azure']?.features ?? []),
    ] as unknown) as FacilityFeature[];
    const money = (data['money-flow']?.features ?? []) as unknown as MoneyFlowFeature[];
    const csl = (data['export-controls']?.features ?? []) as unknown as ExportControlFeature[];
    const coauth = (data.coauthorship?.features ?? []) as unknown as CoauthorshipFeature[];

    const inWindow = <T extends { properties: { year?: number; opened?: number; listed_year?: number } }>(
      f: T,
      key: 'year' | 'opened' | 'listed_year',
    ) => {
      const y = f.properties[key];
      return y == null || (y >= t0 && y <= t1);
    };

    const fabCountries = new Set(fabs.filter((f) => inWindow(f, 'opened')).map((f) => f.properties.country ?? ''));
    const computeCountries = new Set(
      [...labs, ...dcs].filter((f) => inWindow(f, 'opened')).map((f) => f.properties.country ?? ''),
    );
    const moneyCountries = new Set(
      money.filter((f) => inWindow(f, 'year')).map((f) => f.properties.country_iso),
    );
    const cslCountries = new Set(
      csl.filter((f) => inWindow(f, 'listed_year')).map((f) => f.properties.country),
    );

    const out: Finding[] = [];

    // 1. Strict/EO regulators with no fabs in window
    for (const f of reg) {
      const p = f.properties;
      if (p.regime !== 'strict' && p.regime !== 'executive-order') continue;
      if (p.effective_year && p.effective_year > t1) continue;
      const iso2 = ISO3_TO_2[p.country_iso];
      if (!iso2) continue;
      if (!fabCountries.has(iso2)) {
        out.push({
          iso2,
          name: p.country_name,
          reason: 'regulating compute without listed fabs',
        });
      }
    }

    // 2. Compute hosts with no investment recorded in window
    for (const iso2 of computeCountries) {
      if (!iso2) continue;
      if (!moneyCountries.has(iso2)) {
        // Find a friendly name from any facility with this country
        const fac = [...labs, ...dcs].find((f) => f.properties.country === iso2);
        out.push({
          iso2,
          name: fac?.properties.country ?? iso2,
          reason: 'compute hosted but no private AI investment recorded',
        });
      }
    }

    // 3. CSL-listed entities in countries with severed US co-authorship edges
    const usConnected = new Set<string>();
    for (const c of coauth) {
      if (c.properties.year < t0 || c.properties.year > t1) continue;
      // Heuristic: institutions in our snapshot are US-anchored if from_id
      // or to_id has a US institution; we just count any pair as a tie.
      usConnected.add(c.properties.from_id);
      usConnected.add(c.properties.to_id);
    }
    if (cslCountries.has('CN') && usConnected.size > 0) {
      // Only flag if there's at least one Chinese institution NOT in usConnected
      const cnInsts = ['tsinghua', 'peking'];
      const severed = cnInsts.every((id) => !usConnected.has(id));
      if (severed) {
        out.push({
          iso2: 'CN',
          name: 'China',
          reason: 'on US export controls and no co-authorship ties in window',
        });
      }
    }

    // De-dupe by iso+reason
    const seen = new Set<string>();
    return out.filter((f) => {
      const key = `${f.iso2}::${f.reason}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data, t0, t1]);

  if (findings.length === 0) return null;

  return (
    <div className="pointer-events-auto rounded border border-phosphor-800/70 bg-black/75 px-3 py-2 backdrop-blur-sm max-w-[280px]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-[10px] uppercase tracking-[0.22em] text-phosphor-700">
          Absence detection
        </span>
        <span className="tabular-nums text-[10px] text-phosphor-500">
          {findings.length} {open ? '−' : '+'}
        </span>
      </button>
      {open && (
        <ul className="mt-2 flex flex-col gap-1 text-[11px] text-phosphor-400 max-h-[28vh] overflow-y-auto">
          {findings.slice(0, 12).map((f) => (
            <li key={`${f.iso2}-${f.reason}`} className="leading-snug">
              <span className="font-mono text-phosphor-300">{f.iso2}</span>{' '}
              <span className="text-phosphor-600">·</span> {f.reason}
            </li>
          ))}
          {findings.length > 12 && (
            <li className="text-phosphor-700 italic">
              +{findings.length - 12} more
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
