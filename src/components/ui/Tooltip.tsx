import { useGlobeStore } from '../../store/globeStore';
import { operatorColor } from '../../utils/colors';

export function Tooltip() {
  const feature = useGlobeStore((s) => s.hoveredFeature);
  const x = useGlobeStore((s) => s.hoverX);
  const y = useGlobeStore((s) => s.hoverY);
  if (!feature) return null;

  const { name, operator, region, city } = feature.properties;
  const rgb = operatorColor(operator);

  return (
    <div
      className="pointer-events-none absolute z-30 max-w-[220px] rounded border border-phosphor-800/80 bg-black/85 px-2.5 py-1.5 text-[11px] shadow-lg backdrop-blur-sm"
      style={{ left: x + 14, top: y + 14 }}
    >
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
    </div>
  );
}
