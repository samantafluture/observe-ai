import { useGlobeStore } from '../../store/globeStore';
import { useFacilityData } from '../../hooks/useFacilityData';
import { operatorColor, REGIME_COLOR, REGIME_LABEL } from '../../utils/colors';
import { LAYERS } from '../../utils/constants';
import { formatUsd } from '../../utils/format';
import type {
  AnyFeature,
  CoauthorshipFeature,
  ExportControlFeature,
  FacilityFeature,
  MoneyFlowFeature,
  PatentFeature,
  RegulatoryFeature,
  SupplyArcFeature,
  TradeArcFeature,
} from '../../types';
import { useMemo } from 'react';

export function Tooltip() {
  const feature = useGlobeStore((s) => s.hoveredFeature) as AnyFeature | null;
  const x = useGlobeStore((s) => s.hoverX);
  const y = useGlobeStore((s) => s.hoverY);
  const { data } = useFacilityData();

  const pointsById = useMemo(() => {
    const map = new Map<string, FacilityFeature>();
    for (const meta of LAYERS) {
      if (meta.kind !== 'facility') continue;
      const fc = data[meta.id];
      if (!fc) continue;
      for (const f of fc.features as unknown as FacilityFeature[]) {
        map.set(f.properties.id, f);
      }
    }
    return map;
  }, [data]);

  if (!feature) return null;

  const id = (feature.properties as { id?: string } | undefined)?.id ?? '';
  const isMoney = id.startsWith('money-');
  const isTrade = id.startsWith('trade-');
  const isPatent = id.startsWith('patent-');
  const isExportControl = id.startsWith('ec-');
  const isCoauth = id.startsWith('coauth-');

  return (
    <div
      className="pointer-events-none absolute z-30 max-w-[240px] rounded border border-phosphor-800/80 bg-black/85 px-2.5 py-1.5 text-[11px] shadow-lg backdrop-blur-sm"
      style={{ left: x + 14, top: y + 14 }}
    >
      {feature.geometry.type === 'Point' ? (
        isMoney ? (
          <MoneyTip feature={feature as MoneyFlowFeature} />
        ) : isPatent ? (
          <PatentTip feature={feature as PatentFeature} />
        ) : isExportControl ? (
          <ExportControlTip feature={feature as ExportControlFeature} />
        ) : (
          <FacilityTip feature={feature as FacilityFeature} />
        )
      ) : feature.geometry.type === 'LineString' ? (
        isTrade ? (
          <TradeTip feature={feature as TradeArcFeature} />
        ) : isCoauth ? (
          <CoauthorshipTip feature={feature as CoauthorshipFeature} />
        ) : (
          <ArcTip feature={feature as SupplyArcFeature} pointsById={pointsById} />
        )
      ) : (
        <RegulatoryTip feature={feature as RegulatoryFeature} />
      )}
    </div>
  );
}

function FacilityTip({ feature }: { feature: FacilityFeature }) {
  const { name, operator, region, city } = feature.properties;
  const rgb = operatorColor(operator);
  return (
    <>
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{
            backgroundColor: `rgb(${rgb.join(',')})`,
            boxShadow: `0 0 6px rgb(${rgb.join(',')})`,
          }}
        />
        <span className="font-medium text-phosphor-200">{name}</span>
      </div>
      <div className="mt-0.5 text-[10px] text-phosphor-700">
        {operator}
        {region ? ` · ${region}` : ''}
        {city && !region ? ` · ${city}` : ''}
      </div>
    </>
  );
}

function RegulatoryTip({ feature }: { feature: RegulatoryFeature }) {
  const { country_name, regime } = feature.properties;
  const rgb = REGIME_COLOR[regime];
  return (
    <>
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2 w-2 rounded-sm"
          style={{
            backgroundColor: `rgb(${rgb.join(',')})`,
            boxShadow: `0 0 6px rgb(${rgb.join(',')})`,
          }}
        />
        <span className="font-medium text-phosphor-200">{country_name}</span>
      </div>
      <div className="mt-0.5 text-[10px] text-phosphor-700">{REGIME_LABEL[regime]}</div>
    </>
  );
}

function ArcTip({
  feature,
  pointsById,
}: {
  feature: SupplyArcFeature;
  pointsById: Map<string, FacilityFeature>;
}) {
  const { from_id, to_id } = feature.properties;
  const fromName = pointsById.get(from_id)?.properties.name ?? from_id;
  const toName = pointsById.get(to_id)?.properties.name ?? to_id;
  return (
    <>
      <div className="text-phosphor-200">
        {fromName}
        <span className="mx-1.5 text-phosphor-600">→</span>
        {toName}
      </div>
      <div className="mt-0.5 text-[10px] text-phosphor-700">Supply link</div>
    </>
  );
}

function MoneyTip({ feature }: { feature: MoneyFlowFeature }) {
  const { country_name, amount_usd, year } = feature.properties;
  return (
    <>
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: 'rgb(255,220,120)', boxShadow: '0 0 6px rgb(255,220,120)' }}
        />
        <span className="font-medium text-phosphor-200">{country_name}</span>
      </div>
      <div className="mt-0.5 text-[10px] text-phosphor-700">
        Private AI investment · {year} · {formatUsd(amount_usd)}
      </div>
    </>
  );
}

function TradeTip({ feature }: { feature: TradeArcFeature }) {
  const { from_name, to_name, value_usd, year, hs_code } = feature.properties;
  return (
    <>
      <div className="text-phosphor-200">
        {from_name}
        <span className="mx-1.5 text-phosphor-600">→</span>
        {to_name}
      </div>
      <div className="mt-0.5 text-[10px] text-phosphor-700">
        HS {hs_code} · {year} · {formatUsd(value_usd)}
      </div>
    </>
  );
}

function PatentTip({ feature }: { feature: PatentFeature }) {
  const { city, country, year, count, top_assignee } = feature.properties;
  return (
    <>
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: 'rgb(180,140,255)', boxShadow: '0 0 6px rgb(180,140,255)' }}
        />
        <span className="font-medium text-phosphor-200">{city}</span>
      </div>
      <div className="mt-0.5 text-[10px] text-phosphor-700">
        AI patents · {year} · {count.toLocaleString()} grants · {country}
      </div>
      {top_assignee && (
        <div className="text-[10px] text-phosphor-700">Top assignee: {top_assignee}</div>
      )}
    </>
  );
}

function ExportControlTip({ feature }: { feature: ExportControlFeature }) {
  const { name, list_name, listed_year, country } = feature.properties;
  return (
    <>
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2 w-2 rounded-sm"
          style={{ backgroundColor: 'rgb(255,110,110)', boxShadow: '0 0 6px rgb(255,110,110)' }}
        />
        <span className="font-medium text-phosphor-200">{name}</span>
      </div>
      <div className="mt-0.5 text-[10px] text-phosphor-700">
        {list_name} · listed {listed_year} · {country}
      </div>
    </>
  );
}

function CoauthorshipTip({ feature }: { feature: CoauthorshipFeature }) {
  const { from_name, to_name, year, weight } = feature.properties;
  return (
    <>
      <div className="text-phosphor-200">
        {from_name}
        <span className="mx-1.5 text-phosphor-600">↔</span>
        {to_name}
      </div>
      <div className="mt-0.5 text-[10px] text-phosphor-700">
        {year} · {weight.toLocaleString()} co-authored AI papers
      </div>
    </>
  );
}
