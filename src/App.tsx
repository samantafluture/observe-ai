import { Globe } from './components/Globe';
import { Header } from './components/ui/Header';
import { Tooltip } from './components/ui/Tooltip';
import { DetailPanel } from './components/ui/DetailPanel';
import { Legend } from './components/ui/Legend';
import { AbsencePanel } from './components/ui/AbsencePanel';
import { LayerToggles } from './components/controls/LayerToggles';
import { AutoRotateToggle } from './components/controls/AutoRotateToggle';
import { TimelineScrubber } from './components/controls/TimelineScrubber';
import { CompareToggle } from './components/controls/CompareToggle';
import { useUrlCompare, useUrlEmbed } from './hooks/useUrlState';
import { useGlobeStore } from './store/globeStore';

export default function App() {
  const [compare] = useUrlCompare();
  const embed = useUrlEmbed();

  if (compare) {
    return <CompareLayout />;
  }
  if (embed) {
    return <EmbedLayout />;
  }
  return <FullLayout />;
}

function FullLayout() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-phosphor-300">
      <Globe />

      <Header />

      {/* Left/side controls */}
      <div className="pointer-events-none absolute left-4 top-20 z-20 flex flex-col gap-3 md:left-6 md:top-24 md:w-[230px]">
        <LayerToggles />
        <Legend />
        <AbsencePanel />
      </div>

      {/* Bottom-left: rotation + compare */}
      <div className="pointer-events-none absolute left-4 bottom-28 z-20 flex flex-col gap-2 md:left-6 md:bottom-32">
        <AutoRotateToggle />
        <CompareToggle />
      </div>

      {/* Bottom: timeline scrubber spans the viewport */}
      <div className="pointer-events-none absolute left-4 right-4 bottom-4 z-20 md:left-6 md:right-6 md:bottom-6">
        <TimelineScrubber />
      </div>

      <Tooltip />
      <DetailPanel />

      {/* Attribution */}
      <div className="pointer-events-none absolute right-4 bottom-28 z-10 text-[10px] text-phosphor-800 md:right-6 md:bottom-32 max-w-[60vw] text-right">
        Natural Earth · Google / AWS / Azure · Wikipedia + CHIPS Act · OECD.AI / Stanford HAI · UN Comtrade HS 8542 · PatentsView · CSL · OpenAlex · Sustainability Reports · Lightcast + BLS
      </div>
    </div>
  );
}

/**
 * Phase 5 — side-by-side compare mode.
 *
 * Two independent Globes share the browser viewport. Each has its own URL-
 * scoped view state, layer set, timeline window, and selection (primary ↔
 * `cmp_*` params). Shared chrome — header, scrubber, tooltip — only reflects
 * the primary globe so the visual split stays readable.
 */
function CompareLayout() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-phosphor-300">
      <div className="absolute inset-0 grid grid-cols-2">
        <div className="relative border-r border-phosphor-900/80">
          <Globe variant="primary" />
          <div className="pointer-events-none absolute left-3 top-16 z-20 text-[10px] uppercase tracking-[0.24em] text-phosphor-600">
            Left · primary
          </div>
        </div>
        <div className="relative">
          <Globe variant="compare" />
          <div className="pointer-events-none absolute left-3 top-16 z-20 text-[10px] uppercase tracking-[0.24em] text-phosphor-600">
            Right · compare · cmp_* params
          </div>
        </div>
      </div>

      <Header />

      <div className="pointer-events-none absolute left-4 top-20 z-30 flex flex-col gap-3 md:left-6 md:top-24 md:w-[230px]">
        <LayerToggles />
      </div>

      <div className="pointer-events-none absolute left-4 bottom-28 z-30 flex flex-col gap-2 md:left-6 md:bottom-32">
        <AutoRotateToggle />
        <CompareToggle />
      </div>

      <div className="pointer-events-none absolute left-4 right-4 bottom-4 z-30 md:left-6 md:right-6 md:bottom-6">
        <TimelineScrubber />
      </div>

      <Tooltip />
      <DetailPanel />

      <div className="pointer-events-none absolute right-4 bottom-28 z-10 text-[10px] text-phosphor-800 md:right-6 md:bottom-32 max-w-[50vw] text-right">
        Compare mode — primary pane + `cmp_*` URL params drive each globe independently.
      </div>
    </div>
  );
}

/**
 * Phase 5 — embeddable mini-globe.
 *
 * `?embed=1` strips every control so the canvas can live inside an iframe.
 * `?focus=<id>` (read by Globe) recenters on a specific feature at mount.
 * A minimal bottom strip shows just the selected feature name + attribution.
 */
function EmbedLayout() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-phosphor-300">
      <Globe />
      <Tooltip />
      <EmbedFooter />
    </div>
  );
}

function EmbedFooter() {
  const selected = useGlobeStore((s) => s.selectedFeature);
  const name =
    (selected?.properties as { name?: string; country_name?: string } | undefined)?.name ??
    (selected?.properties as { name?: string; country_name?: string } | undefined)?.country_name ??
    '';
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 border-t border-phosphor-900/80 bg-black/75 px-3 py-2 text-[10px] text-phosphor-700 backdrop-blur-sm flex items-center justify-between">
      <span className="uppercase tracking-[0.22em]">God&apos;s Eye View · AI</span>
      <span className="truncate text-phosphor-400">{name}</span>
      <span className="text-phosphor-800">saminprogress.tech</span>
    </div>
  );
}
