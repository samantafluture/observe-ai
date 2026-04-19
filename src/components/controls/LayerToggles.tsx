import { useUrlLayers } from '../../hooks/useUrlState';
import { useFacilityData } from '../../hooks/useFacilityData';
import { CATEGORIES, LAYERS } from '../../utils/constants';
import type { LayerCategory, LayerId, LayerMeta } from '../../types';

type CategoryState = 'all' | 'some' | 'none';

function swatchColor(l: LayerMeta): [number, number, number] {
  if (l.kind === 'regulatory') {
    // Show a representative mid-regime swatch for the category row
    return l.palette.strict;
  }
  return l.color;
}

export function LayerToggles() {
  const [active, setActive] = useUrlLayers();
  const { data } = useFacilityData();

  const activeSet = new Set<LayerId>(active);

  const applyDelta = (add: LayerId[], remove: LayerId[]) => {
    const next = new Set(activeSet);
    for (const id of add) next.add(id);
    for (const id of remove) next.delete(id);
    setActive(LAYERS.map((l) => l.id).filter((id) => next.has(id)));
  };

  const toggle = (id: LayerId) => {
    if (activeSet.has(id)) applyDelta([], [id]);
    else applyDelta([id], []);
  };

  const layersByCategory = new Map<LayerCategory, LayerMeta[]>();
  for (const l of LAYERS) {
    const arr = layersByCategory.get(l.category) ?? [];
    arr.push(l);
    layersByCategory.set(l.category, arr);
  }

  const categoryState = (ids: LayerId[]): CategoryState => {
    const on = ids.filter((id) => activeSet.has(id)).length;
    if (on === 0) return 'none';
    if (on === ids.length) return 'all';
    return 'some';
  };

  const toggleCategory = (ids: LayerId[]) => {
    const state = categoryState(ids);
    if (state === 'none') applyDelta(ids, []);
    else applyDelta([], ids);
  };

  return (
    <div className="pointer-events-auto rounded border border-phosphor-800/70 bg-black/70 p-3 backdrop-blur-sm">
      <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-phosphor-700">
        Layers
      </div>
      <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
        {CATEGORIES.map((cat) => {
          const layers = layersByCategory.get(cat.id) ?? [];
          if (layers.length === 0) return null;
          const ids = layers.map((l) => l.id);
          const state = categoryState(ids);
          return (
            <section key={cat.id}>
              <button
                type="button"
                onClick={() => toggleCategory(ids)}
                className="flex w-full items-center justify-between gap-2 text-left text-[10px] uppercase tracking-[0.22em] text-phosphor-600 hover:text-phosphor-300"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-sm border border-phosphor-700"
                    style={{
                      backgroundColor:
                        state === 'none'
                          ? 'transparent'
                          : state === 'all'
                          ? 'rgb(180,220,180)'
                          : 'rgba(180,220,180,0.4)',
                    }}
                  />
                  {cat.label}
                </span>
                <span className="tabular-nums text-phosphor-800">
                  {layers.filter((l) => activeSet.has(l.id)).length}/{layers.length}
                </span>
              </button>
              <ul className="mt-1 flex flex-col gap-1">
                {layers.map((l) => {
                  const isActive = activeSet.has(l.id);
                  const count = data[l.id]?.features.length ?? 0;
                  const rgb = swatchColor(l);
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
                              backgroundColor: `rgb(${rgb.join(',')})`,
                              opacity: isActive ? 1 : 0.35,
                              boxShadow: isActive ? `0 0 6px rgb(${rgb.join(',')})` : 'none',
                            }}
                          />
                          <span className="tracking-wide">{l.label}</span>
                        </span>
                        <span className="tabular-nums text-[10px] text-phosphor-700">
                          {count}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
