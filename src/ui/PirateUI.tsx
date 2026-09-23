import type { ComponentProps } from 'react';
import { Button as BaseButton } from '@/components/ui/button';
import { Card as BaseCard } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type SpriteIcon = 'forward' | 'turn_left' | 'turn_right' | 'fire_front' | 'fire_left' | 'fire_right' | 'pause' | 'plus' | 'minus' | 'close' | 'heart' | 'score' | 'time';

export function Icon({ name }: { name: SpriteIcon }) {
  const family = ['heart', 'score', 'time'].includes(name) ? 'hud' : 'controls';
  return <img className="sprite-icon" src={`/assets/png/retina/ui/${family}/icon_${name}.png`} alt="" draggable={false} />;
}

export function Button({ className, variant, ...props }: ComponentProps<typeof BaseButton>) {
  return <BaseButton variant={variant} className={cn('pirate-button', (variant === 'secondary' || variant === 'link') && 'pirate-button-secondary', className)} {...props} />;
}

export function RoundButton({ icon, className, ...props }: ComponentProps<typeof BaseButton> & { icon: SpriteIcon }) {
  return <BaseButton type="button" className={cn('pirate-round', className)} {...props}><Icon name={icon} /></BaseButton>;
}

export function Card({ className, ...props }: ComponentProps<typeof BaseCard>) {
  return <BaseCard className={cn('pirate-panel', className)} {...props} />;
}

export function HullBar({ health, maxHealth }: { health: number; maxHealth: number }) {
  const ratio = Math.max(0, Math.min(1, health / maxHealth));
  const color = ratio > 0.55 ? 'green' : ratio > 0.25 ? 'amber' : 'red';
  return <div className="sprite-health" role="progressbar" aria-label="Hull health" aria-valuemin={0} aria-valuemax={maxHealth} aria-valuenow={health}>
    <img src="/assets/png/retina/ui/hud/health_frame.png" alt="" />
    <img src={`/assets/png/retina/ui/hud/health_fill_${color}.png`} alt="" style={{ clipPath: `inset(0 ${100 - (30 + 196 * ratio) / 256 * 100}% 0 0)` }} />
    <strong>{health} / {maxHealth}</strong>
  </div>;
}
