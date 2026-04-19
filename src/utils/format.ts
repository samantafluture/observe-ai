// Human-readable USD magnitudes. Used by money + trade surfaces.
export function formatUsd(valueUsd: number): string {
  const abs = Math.abs(valueUsd);
  if (abs >= 1e12) return `$${(valueUsd / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `$${(valueUsd / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(valueUsd / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(valueUsd / 1e3).toFixed(1)}K`;
  return `$${valueUsd.toFixed(0)}`;
}
