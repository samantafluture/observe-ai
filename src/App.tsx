import { Globe } from './components/Globe';
import { Header } from './components/ui/Header';
import { Tooltip } from './components/ui/Tooltip';
import { DetailPanel } from './components/ui/DetailPanel';
import { Legend } from './components/ui/Legend';
import { AbsencePanel } from './components/ui/AbsencePanel';
import { LayerToggles } from './components/controls/LayerToggles';
import { AutoRotateToggle } from './components/controls/AutoRotateToggle';
import { TimelineScrubber } from './components/controls/TimelineScrubber';

export default function App() {
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

      {/* Bottom-left: rotation toggle */}
      <div className="pointer-events-none absolute left-4 bottom-28 z-20 md:left-6 md:bottom-32">
        <AutoRotateToggle />
      </div>

      {/* Bottom: timeline scrubber spans the viewport */}
      <div className="pointer-events-none absolute left-4 right-4 bottom-4 z-20 md:left-6 md:right-6 md:bottom-6">
        <TimelineScrubber />
      </div>

      <Tooltip />
      <DetailPanel />

      {/* Attribution */}
      <div className="pointer-events-none absolute right-4 bottom-28 z-10 text-[10px] text-phosphor-800 md:right-6 md:bottom-32 max-w-[60vw] text-right">
        Natural Earth · Google / AWS / Azure · Wikipedia + CHIPS Act · OECD.AI / Stanford HAI · UN Comtrade HS 8542 · PatentsView · CSL · OpenAlex
      </div>
    </div>
  );
}
