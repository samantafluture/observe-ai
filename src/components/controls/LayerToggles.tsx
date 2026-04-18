import { useUrlLayers } from '../../hooks/useUrlState';
import { useFacilityData } from '../../hooks/useFacilityData';
import { LAYERS } from '../../utils/constants';
import type { LayerId } from '../../types';

export function LayerToggles() {
  const [active, setActive] = useUrlLayers();
  const { data } = useFacilityData();

  const toggle = (id: LayerId) => {
    const set = new Set(active);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    setActive(LAYERS.map((l) => l.id).filter((l) => set.has(l)));
  };

  return (
    <div className="pointer-events-auto rounded border border-phosphor-800/70 bg-black/70 p-3 backdrop-blur-sm">
      <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-phosphor-700">
        Layers
      </div>
      <ul className="flex flex-col gap-1">
        {LAYERS.map((l) => {
          const isActive = active.includes(l.id);
          const count = data[l.id]?.features.length ?? 0;
          return (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => toggle(l.id)}
                className={
                  'flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-xs transition ' +
                  (isActive
                    ? 'bg-phosphor-900/40 text-phosphor-200'
                    : 'text-phosphor-700 hover:text-phosphor-400')
                }
              >
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: `rgb(${l.color.join(',')})`,
                      opacity: isActive ? 1 : 0.35,
                      boxShadow: isActive ? `0 0 6px rgb(${l.color.join(',')})` : 'none',
                    }}
                  />
                  <span className="tracking-wide">{l.label}</span>
                </span>
                <span className="tabular-nums text-[10px] text-phosphor-700">{count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
