import { useUrlCompare } from '../../hooks/useUrlState';

/**
 * Phase 5 — toggle the side-by-side compare mode.
 *
 * Toggling on seeds the compare pane with the same URL state that the
 * primary pane currently holds; if the user wants the panes to diverge they
 * can edit the `cmp_*` URL params (layer toggles automatically target the
 * primary pane, so a common workflow is: freeze one pane, then toggle off
 * layers on the other by editing the URL directly or via the layer panel).
 */
export function CompareToggle() {
  const [cmp, setCmp] = useUrlCompare();
  return (
    <button
      type="button"
      onClick={() => setCmp(!cmp)}
      className={
        'pointer-events-auto rounded border px-2 py-1 text-[11px] uppercase tracking-[0.22em] transition ' +
        (cmp
          ? 'border-phosphor-500 bg-phosphor-900/60 text-phosphor-200'
          : 'border-phosphor-800 bg-black/70 text-phosphor-600 hover:border-phosphor-600 hover:text-phosphor-300')
      }
      title="Side-by-side compare mode (Phase 5)"
    >
      {cmp ? 'Compare · on' : 'Compare'}
    </button>
  );
}
