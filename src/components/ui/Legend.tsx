import { REGIME_COLOR, REGIME_LABEL } from '../../utils/colors';

const REGIME_ORDER: (keyof typeof REGIME_COLOR)[] = [
  'strict',
  'executive-order',
  'state-directed',
  'emerging',
  'minimal',
];

export function Legend() {
  return (
    <div className="pointer-events-auto hidden rounded border border-phosphor-800/70 bg-black/70 px-3 py-2 text-[10px] text-phosphor-700 backdrop-blur-sm md:block">
      <div className="uppercase tracking-[0.22em]">Phase 05</div>
      <div className="mt-1 max-w-[220px] leading-relaxed text-phosphor-500">
        Cross-layer correlation · energy + water · AI job postings · side-by-side · embed.
      </div>
      <div className="mt-2 border-t border-phosphor-900 pt-2">
        <div className="mb-1 uppercase tracking-[0.22em] text-phosphor-800">Regulatory regime</div>
        <ul className="flex flex-col gap-0.5">
          {REGIME_ORDER.map((r) => {
            const rgb = REGIME_COLOR[r];
            return (
              <li key={r} className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-3 rounded-sm"
                  style={{
                    backgroundColor: `rgba(${rgb.join(',')},0.55)`,
                    boxShadow: `inset 0 0 0 1px rgba(${rgb.join(',')},0.9)`,
                  }}
                />
                <span className="text-phosphor-500">{REGIME_LABEL[r]}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="mt-2 border-t border-phosphor-900 pt-2">
        <div className="mb-1 uppercase tracking-[0.22em] text-phosphor-800">Flows & signals</div>
        <ul className="flex flex-col gap-0.5 text-phosphor-500">
          <li className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: 'rgb(255,220,120)', boxShadow: '0 0 6px rgb(255,220,120)' }}
            />
            <span>Money · sqrt(USD invested)</span>
          </li>
          <li className="flex items-center gap-2">
            <span
              className="inline-block h-[3px] w-5 rounded-full"
              style={{
                background: 'linear-gradient(90deg, rgb(150,200,240), rgb(210,235,255))',
              }}
            />
            <span>IC trade · HS 8542 value</span>
          </li>
          <li className="flex items-center gap-2">
            <span
              className="inline-block h-[3px] w-5 rounded-full"
              style={{
                background: 'linear-gradient(90deg, rgb(255,200,120), rgb(120,255,180))',
              }}
            />
            <span>Supply · fab → customer (curated)</span>
          </li>
          <li className="flex items-center gap-2">
            <span
              className="inline-block h-[3px] w-5 rounded-full"
              style={{
                background: 'linear-gradient(90deg, rgb(120,230,220), rgb(200,240,255))',
              }}
            />
            <span>Co-authorship · OpenAlex pairs</span>
          </li>
          <li className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: 'rgb(180,140,255)', boxShadow: '0 0 6px rgb(180,140,255)' }}
            />
            <span>Patents · sqrt(USPTO grants)</span>
          </li>
          <li className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: 'rgb(255,110,110)', boxShadow: '0 0 6px rgb(255,110,110)' }}
            />
            <span>Export controls · CSL listings</span>
          </li>
          <li className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgb(255,230,150) 40%, rgb(120,220,230) 80%)',
                boxShadow: '0 0 6px rgba(120,220,230,0.6)',
              }}
            />
            <span>Energy (core) + water (halo)</span>
          </li>
          <li className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: 'rgb(255,180,210)', boxShadow: '0 0 6px rgb(255,180,210)' }}
            />
            <span>AI job postings · sqrt(count)</span>
          </li>
        </ul>
      </div>
      <div className="mt-2 border-t border-phosphor-900 pt-2">
        <div className="mb-1 uppercase tracking-[0.22em] text-phosphor-800">
          Correlation engine
        </div>
        <div className="max-w-[220px] leading-relaxed text-phosphor-500">
          Click any entity: unrelated layers dim, related entities across every layer light up, arcs draw the graph edges. Click "Related" rows to walk the graph one hop at a time.
        </div>
      </div>
    </div>
  );
}
