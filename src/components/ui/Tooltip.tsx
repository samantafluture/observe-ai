import { useGlobeStore } from '../../store/globeStore';
import { useFacilityData } from '../../hooks/useFacilityData';
import { operatorColor, REGIME_COLOR, REGIME_LABEL } from '../../utils/colors';
import { LAYERS } from '../../utils/constants';
import type {
  AnyFeature,
  FacilityFeature,
  RegulatoryFeature,
  SupplyArcFeature,
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

  return (
    <div
      className="pointer-events-none absolute z-30 max-w-[240px] rounded border border-phosphor-800/80 bg-black/85 px-2.5 py-1.5 text-[11px] shadow-lg backdrop-blur-sm"
      style={{ left: x + 14, top: y + 14 }}
    >
      {feature.geometry.type === 'Point' ? (
        <FacilityTip feature={feature as FacilityFeature} />
      ) : feature.geometry.type === 'LineString' ? (
        <ArcTip feature={feature as SupplyArcFeature} pointsById={pointsById} />
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
