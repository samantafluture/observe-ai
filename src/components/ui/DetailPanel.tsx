import { useGlobeStore } from '../../store/globeStore';
import { useUrlSelected } from '../../hooks/useUrlState';
import { operatorColor } from '../../utils/colors';

export function DetailPanel() {
  const feature = useGlobeStore((s) => s.selectedFeature);
  const clear = useGlobeStore((s) => s.clearSelection);
  const [, setUrlSelected] = useUrlSelected();

  if (!feature) return null;

  const { name, operator, region, city, country, role, type, opened } = feature.properties;
  const [lng, lat] = feature.geometry.coordinates;
  const rgb = operatorColor(operator);

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
              {type === 'datacenter' ? 'Data center' : 'AI facility'}
            </span>
          </div>
          <h2 className="mt-1 truncate text-base font-medium text-phosphor-200">{name}</h2>
          <div className="text-xs text-phosphor-400">{operator}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="shrink-0 rounded border border-phosphor-800 px-2 py-1 text-xs text-phosphor-600 hover:border-phosphor-500 hover:text-phosphor-200"
        >
          Close
        </button>
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
    </aside>
  );
}
