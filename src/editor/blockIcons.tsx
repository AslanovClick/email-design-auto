import {
  Image, List, ListOrdered, Minus, MousePointerClick, Newspaper, PanelBottom, PanelTop,
  Percent, SquareDashed, Star, TableProperties, Timer, Trophy, Type, type LucideIcon,
} from 'lucide-react';
import type { BlockType } from '@/model/types';

export const BLOCK_ICONS: Record<BlockType, LucideIcon> = {
  hero: PanelTop,
  footer: PanelBottom,
  body: Newspaper,
  inner: SquareDashed,
  text: Type,
  bullets: List,
  facts: TableProperties,
  odds: Percent,
  recodds: Star,
  multibet: ListOrdered,
  league: Trophy,
  timer: Timer,
  cta: MousePointerClick,
  separator: Minus,
};

export function TypeIcon({ type, size = 15 }: { type: BlockType; size?: number }) {
  const Icon = BLOCK_ICONS[type] ?? Image;
  return <span className="type-ico"><Icon size={size} strokeWidth={2} /></span>;
}
