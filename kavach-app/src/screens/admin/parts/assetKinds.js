// Icons and tones per asset kind (labels: admin.assetKind_<kind>).
import { ArrowUpDown, Cable, Container, Droplets, Flame, Fuel } from 'lucide-react';

export const ASSET_KINDS = {
  lift: { icon: ArrowUpDown, tone: 'var(--t-lift)' },
  dg: { icon: Fuel, tone: 'var(--t-power)' },
  transformer: { icon: Cable, tone: 'var(--t-power)' },
  water_pump: { icon: Droplets, tone: 'var(--t-water)' },
  sump: { icon: Container, tone: 'var(--t-water)' },
  fire_pump: { icon: Flame, tone: 'var(--t-fire)' },
};

export function assetKind(kind) {
  return ASSET_KINDS[kind] || ASSET_KINDS.lift;
}
