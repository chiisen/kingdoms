import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { cn } from '@/lib/utils';

/** Single-thumb slider matching the array-based value API of the game. */
export function Slider({
  className,
  value,
  defaultValue,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  'aria-label': ariaLabel,
}: {
  className?: string;
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  'aria-label'?: string;
}) {
  const current = value?.[0] ?? defaultValue?.[0] ?? min;
  const track = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const latest = useRef({ min, max, step, onValueChange });
  latest.current = { min, max, step, onValueChange };

  const clamp = useCallback((raw: number) => {
    const { min: low, max: high, step: size } = latest.current;
    const stepped = low + Math.round((raw - low) / size) * size;
    return Math.max(low, Math.min(high, stepped));
  }, []);

  function commit(raw: number) {
    const next = clamp(raw);
    if (next !== current) latest.current.onValueChange?.([next]);
  }

  function valueAt(clientX: number) {
    const rect = track.current?.getBoundingClientRect();
    if (!rect || !rect.width) return current;
    const { min: low, max: high } = latest.current;
    return low + ((clientX - rect.left) / rect.width) * (high - low);
  }

  useEffect(() => {
    if (!dragging) return;
    function onMove(event: globalThis.PointerEvent) {
      commit(valueAt(event.clientX));
    }
    function onUp() {
      setDragging(false);
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    };
  });

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    event.preventDefault();
    setDragging(true);
    commit(valueAt(event.clientX));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    const { step: size } = latest.current;
    const jump =
      event.key === 'ArrowRight' || event.key === 'ArrowUp'
        ? size
        : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
          ? -size
          : event.key === 'PageUp'
            ? size * 5
            : event.key === 'PageDown'
              ? -size * 5
              : 0;
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      commit(event.key === 'Home' ? min : max);
    } else if (jump) {
      event.preventDefault();
      commit(current + jump);
    }
  }

  const percent = max > min ? ((current - min) / (max - min)) * 100 : 0;

  return (
    <div
      className={cn('ui-slider', className)}
      data-slot="slider"
      data-dragging={dragging ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      onPointerDown={onPointerDown}
    >
      <div ref={track} data-slot="slider-track">
        <div data-slot="slider-range" style={{ width: `${percent}%` }} />
      </div>
      <div
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={current}
        aria-disabled={disabled || undefined}
        data-slot="slider-thumb"
        style={{ left: `${percent}%` }}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
