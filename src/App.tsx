import { Globe } from './components/Globe';
import { Header } from './components/ui/Header';
import { Tooltip } from './components/ui/Tooltip';
import { DetailPanel } from './components/ui/DetailPanel';
import { Legend } from './components/ui/Legend';
import { LayerToggles } from './components/controls/LayerToggles';
import { AutoRotateToggle } from './components/controls/AutoRotateToggle';

export default function App() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-phosphor-300">
      <Globe />

      <Header />

      {/* Left/side controls */}
      <div className="pointer-events-none absolute left-4 top-20 z-20 flex flex-col gap-3 md:left-6 md:top-24 md:w-[220px]">
        <LayerToggles />
        <Legend />
      </div>

      {/* Bottom-left: rotation toggle */}
      <div className="pointer-events-none absolute left-4 bottom-4 z-20 md:left-6 md:bottom-6">
        <AutoRotateToggle />
      </div>

      <Tooltip />
      <DetailPanel />

      {/* Attribution */}
      <div className="pointer-events-none absolute right-4 bottom-4 z-10 text-[10px] text-phosphor-800 md:right-6 md:bottom-6">
        Natural Earth · Google / AWS / Azure · Wikipedia + CHIPS Act · OECD.AI / Stanford HAI · UN Comtrade HS 8542
      </div>
    </div>
  );
}
