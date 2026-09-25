import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export type DeltaDirection = 'up' | 'down';

export type DeltaChange = { delta: number; direction: DeltaDirection; id: number };

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Reports how a value just changed, then clears the report. */
export function useValueDelta(value: number, ms = 1500): DeltaChange | null {
  const previous = useRef(value);
  const sequence = useRef(0);
  const [change, setChange] = useState<DeltaChange | null>(null);

  useEffect(() => {
    const before = previous.current;
    if (before === value) return;
    previous.current = value;
    const delta = value - before;
    if (!Number.isFinite(delta) || delta === 0) return;
    sequence.current += 1;
    setChange({
      delta,
      direction: delta > 0 ? 'up' : 'down',
      id: sequence.current,
    });
    const timer = window.setTimeout(() => setChange(null), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);

  return change;
}

/** Eases a displayed number towards its target so changes are readable. */
export function useCountUp(value: number, duration = 640) {
  const [display, setDisplay] = useState(value);
  const shown = useRef(value);

  useEffect(() => {
    if (shown.current === value) return;
    if (reducedMotion()) {
      shown.current = value;
      setDisplay(value);
      return;
    }
    const from = shown.current;
    const start = performance.now();
    let frame = 0;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      shown.current = value;
      setDisplay(value);
    };
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      shown.current = from + (value - from) * eased;
      setDisplay(shown.current);
      if (progress < 1) frame = requestAnimationFrame(step);
      else finish();
    };
    frame = requestAnimationFrame(step);
    // Animation frames pause in a background tab, so the counter also has a
    // timer that snaps it to the real value instead of leaving it stale.
    const fallback = window.setTimeout(finish, duration + 140);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(fallback);
    };
  }, [value, duration]);

  return display;
}

/**
 * A number that counts to its new value, flashes in the direction it moved and
 * floats the difference beside it.
 */
export default function AnimatedNumber({
  value,
  className,
  format,
  showDelta = true,
}: {
  value: number;
  className?: string;
  format?: (value: number) => string;
  showDelta?: boolean;
}) {
  const display = useCountUp(value);
  const change = useValueDelta(value);
  const render = format ?? ((input: number) => Math.round(input).toLocaleString('zh-TW'));

  return (
    <span
      className={cn('animated-number', change && `is-${change.direction}`, className)}
    >
      <span className="animated-number-value">{render(display)}</span>
      {showDelta && change && (
        <i
          key={change.id}
          className={cn('delta-chip', change.direction)}
          aria-hidden="true"
        >
          {change.direction === 'up' ? '+' : '−'}
          {Math.abs(change.delta).toLocaleString('zh-TW')}
        </i>
      )}
    </span>
  );
}

/** Flags city ids whose owner just changed, so the map can highlight a conquest. */
export function useOwnerChanges(owners: string[], ms = 1800) {
  // The signature keeps the effect keyed on the contents, not the array identity.
  const signature = owners.join('|');
  const previous = useRef<string | null>(null);
  const [changed, setChanged] = useState<number[]>([]);

  useEffect(() => {
    const before = previous.current;
    previous.current = signature;
    if (before === null || before === signature) return;
    const prior = before.split('|');
    if (prior.length !== owners.length) return;
    const indexes = owners
      .map((owner, index) => (owner === prior[index] ? -1 : index))
      .filter((index) => index >= 0);
    if (!indexes.length) return;
    setChanged(indexes);
    const timer = window.setTimeout(() => setChanged([]), ms);
    return () => window.clearTimeout(timer);
  }, [signature, ms]);

  return changed;
}
