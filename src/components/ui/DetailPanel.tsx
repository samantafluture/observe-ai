import { useMemo } from 'react';
import { useGlobeStore } from '../../store/globeStore';
import { useUrlSelected } from '../../hooks/useUrlState';
import { useFacilityData } from '../../hooks/useFacilityData';
import { operatorColor, REGIME_COLOR, REGIME_LABEL } from '../../utils/colors';
import { LAYERS } from '../../utils/constants';
import type {
  FacilityFeature,
  RegulatoryFeature,
  SupplyArcFeature,
} from '../../types';

export function DetailPanel() {
  const feature = useGlobeStore((s) => s.selectedFeature);
  const clear = useGlobeStore((s) => s.clearSelection);
  const [, setUrlSelected] = useUrlSelected();
  const { data } = useFacilityData();

  // Flat index of points for arc endpoint name lookup.
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

  const onClose = () => {
    clear();
    void setUrlSelected(null);
  };

  return (
    <aside
      className="
        pointer-events-auto
        absolute z-30
        left-4 right-4 bottom-4
        md:left-auto md:right-6 md:top-24 md:bottom-auto
        md:w-[320px]
        rounded border border-phosphor-800/70 bg-black/85 p-4
        backdrop-blur-sm shadow-2xl
      "
    >
      {feature.geometry.type === 'Point' ? (
        <FacilityDetail feature={feature as FacilityFeature} onClose={onClose} />
      ) : feature.geometry.type === 'LineString' ? (
        <ArcDetail
          feature={feature as SupplyArcFeature}
          onClose={onClose}
          pointsById={pointsById}
        />
      ) : (
        <RegulatoryDetail feature={feature as RegulatoryFeature} onClose={onClose} />
      )}
    </aside>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close details"
      className="shrink-0 rounded border border-phosphor-800 px-2 py-1 text-xs text-phosphor-600 hover:border-phosphor-500 hover:text-phosphor-200"
    >
      Close
    </button>
  );
}

function FacilityDetail({
  feature,
  onClose,
}: {
  feature: FacilityFeature;
  onClose: () => void;
}) {
  const {
    name,
    operator,
    region,
    city,
    country,
    role,
    type,
    opened,
    node_nm,
    wafer_size_mm,
  } = feature.properties;
  const [lng, lat] = feature.geometry.coordinates;
  const rgb = operatorColor(operator);

  const typeLabel =
    type === 'datacenter' ? 'Data center' : type === 'fab' ? 'Fab' : 'AI facility';

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: `rgb(${rgb.join(',')})`,
                boxShadow: `0 0 8px rgb(${rgb.join(',')})`,
              }}
            />
            <span className="text-[10px] uppercase tracking-[0.22em] text-phosphor-700">
              {typeLabel}
            </span>
          </div>
          <h2 className="mt-1 truncate text-base font-medium text-phosphor-200">{name}</h2>
          <div className="text-xs text-phosphor-400">{operator}</div>
        </div>
        <CloseButton onClose={onClose} />
      </div>

      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
        {region && (
          <>
            <dt className="text-phosphor-700">Region</dt>
            <dd className="text-phosphor-300 font-mono">{region}</dd>
          </>
        )}
        {city && (
          <>
            <dt className="text-phosphor-700">City</dt>
            <dd className="text-phosphor-300">{city}</dd>
          </>
        )}
        {country && (
          <>
            <dt className="text-phosphor-700">Country</dt>
            <dd className="text-phosphor-300">{country}</dd>
          </>
        )}
        {role && (
          <>
            <dt className="text-phosphor-700">Role</dt>
            <dd className="text-phosphor-300">{role}</dd>
          </>
        )}
        {type === 'fab' && node_nm ? (
          <>
            <dt className="text-phosphor-700">Node</dt>
            <dd className="text-phosphor-300 font-mono">{node_nm} nm</dd>
          </>
        ) : null}
        {type === 'fab' && wafer_size_mm ? (
          <>
            <dt className="text-phosphor-700">Wafer</dt>
            <dd className="text-phosphor-300 font-mono">{wafer_size_mm} mm</dd>
          </>
        ) : null}
        {opened && (
          <>
            <dt className="text-phosphor-700">Opened</dt>
            <dd className="text-phosphor-300">{opened}</dd>
          </>
        )}
        <dt className="text-phosphor-700">Location</dt>
        <dd className="text-phosphor-300 font-mono">
          {lat.toFixed(3)}, {lng.toFixed(3)}
        </dd>
      </dl>
    </>
  );
}

function RegulatoryDetail({
  feature,
  onClose,
}: {
  feature: RegulatoryFeature;
  onClose: () => void;
}) {
  const { country_name, country_iso, regime, key_policies } = feature.properties;
  const rgb = REGIME_COLOR[regime];
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{
                backgroundColor: `rgb(${rgb.join(',')})`,
                boxShadow: `0 0 8px rgb(${rgb.join(',')})`,
              }}
            />
            <span className="text-[10px] uppercase tracking-[0.22em] text-phosphor-700">
              Regulatory zone
            </span>
          </div>
          <h2 className="mt-1 truncate text-base font-medium text-phosphor-200">
            {country_name}
          </h2>
          <div className="text-xs text-phosphor-400">{country_iso}</div>
        </div>
        <CloseButton onClose={onClose} />
      </div>

      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
        <dt className="text-phosphor-700">Regime</dt>
        <dd
          className="inline-flex items-center gap-2 text-phosphor-200"
          style={{ color: `rgb(${rgb.join(',')})` }}
        >
          {REGIME_LABEL[regime]}
        </dd>
      </dl>

      {key_policies && key_policies.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-[0.22em] text-phosphor-700">
            Key policies
          </div>
          <ul className="mt-1 list-disc pl-4 text-xs text-phosphor-300">
            {key_policies.map((p) => (
              <li key={p} className="leading-snug">
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function ArcDetail({
  feature,
  onClose,
  pointsById,
}: {
  feature: SupplyArcFeature;
  onClose: () => void;
  pointsById: Map<string, FacilityFeature>;
}) {
  const { from_id, to_id, weight, label } = feature.properties;
  const from = pointsById.get(from_id);
  const to = pointsById.get(to_id);
  const fromName = from?.properties.name ?? from_id;
  const toName = to?.properties.name ?? to_id;

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-4 rounded-full"
              style={{
                background: 'linear-gradient(90deg, rgb(255,200,120), rgb(120,255,180))',
                boxShadow: '0 0 6px rgba(180,220,255,0.6)',
              }}
            />
            <span className="text-[10px] uppercase tracking-[0.22em] text-phosphor-700">
              Supply link
            </span>
          </div>
          <h2 className="mt-1 text-base font-medium text-phosphor-200 leading-tight">
            {fromName}
            <span className="mx-1.5 text-phosphor-600">→</span>
            {toName}
          </h2>
        </div>
        <CloseButton onClose={onClose} />
      </div>

      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
        <dt className="text-phosphor-700">From</dt>
        <dd className="text-phosphor-300">
          {fromName}
          {from?.properties.city ? ` · ${from.properties.city}` : ''}
        </dd>
        <dt className="text-phosphor-700">To</dt>
        <dd className="text-phosphor-300">
          {toName}
          {to?.properties.city ? ` · ${to.properties.city}` : ''}
        </dd>
        {weight != null && (
          <>
            <dt className="text-phosphor-700">Weight</dt>
            <dd className="text-phosphor-300 font-mono">{weight.toFixed(2)}</dd>
          </>
        )}
      </dl>

      {label && (
        <div className="mt-3 text-xs text-phosphor-400 leading-snug">{label}</div>
      )}
    </>
  );
}
