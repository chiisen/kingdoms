import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePopupLayer } from './modal';

/** A compact listbox: the trigger stays in flow and the popup is anchored to it. */
type SelectContextValue = {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
};

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelect(name: string) {
  const context = useContext(SelectContext);
  if (!context) throw new Error(`${name} 必须在 Select 内使用。`);
  return context;
}

const POPUP_MAX_HEIGHT = 320;

export function Select({
  value = '',
  onValueChange,
  children,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const change = useMemo(
    () => (next: string) => onValueChange?.(next),
    [onValueChange],
  );
  const context = useMemo(
    () => ({ value, onValueChange: change, open, setOpen, triggerRef }),
    [value, change, open],
  );
  return (
    <SelectContext.Provider value={context}>{children}</SelectContext.Provider>
  );
}

export function SelectTrigger({
  className,
  children,
  ...props
}: ComponentProps<'button'>) {
  const context = useSelect('SelectTrigger');
  return (
    <button
      {...props}
      ref={context.triggerRef}
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={context.open}
      data-slot="select-trigger"
      className={cn('ui-select-trigger', className)}
      onClick={() => context.setOpen(!context.open)}
    >
      {children}
      <ChevronDownIcon size={16} aria-hidden="true" />
    </button>
  );
}

export function SelectValue({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <span data-slot="select-value" className={cn('ui-select-value', className)}>
      {children}
    </span>
  );
}

export function SelectContent({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const context = useSelect('SelectContent');
  const popup = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<CSSProperties | null>(null);
  usePopupLayer(context.open);

  useLayoutEffect(() => {
    if (!context.open) {
      setPlacement(null);
      return;
    }
    const trigger = context.triggerRef.current;
    if (!trigger) return;

    const place = () => {
      const rect = trigger.getBoundingClientRect(),
        margin = 8,
        below = rect.bottom + 4,
        spaceBelow = window.innerHeight - below - margin,
        spaceAbove = rect.top - margin - 4,
        downward = spaceBelow >= Math.min(POPUP_MAX_HEIGHT, 160) || spaceBelow >= spaceAbove,
        width = Math.max(rect.width, 160);
      setPlacement({
        left: Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin)),
        minWidth: rect.width,
        maxHeight: Math.max(120, Math.min(POPUP_MAX_HEIGHT, downward ? spaceBelow : spaceAbove)),
        ...(downward
          ? { top: below }
          : { bottom: window.innerHeight - rect.top + 4 }),
      });
    };

    place();
    const items = () =>
      Array.from(popup.current?.querySelectorAll<HTMLElement>('[data-slot="select-item"]') ?? []);
    const selected = items().find((item) => item.dataset.selected !== undefined);
    (selected ?? items()[0])?.focus();

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (popup.current?.contains(target) || trigger?.contains(target)) return;
      context.setOpen(false);
    }
    function onScroll(event: Event) {
      if (popup.current?.contains(event.target as Node)) return;
      context.setOpen(false);
    }

    window.addEventListener('resize', place);
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', place);
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [context]);

  if (!context.open) return null;

  function move(delta: number) {
    const items = Array.from(
      popup.current?.querySelectorAll<HTMLElement>('[data-slot="select-item"]') ?? [],
    );
    if (!items.length) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = Math.max(0, Math.min(items.length - 1, index + delta));
    items[next].focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      move(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const items = Array.from(
        popup.current?.querySelectorAll<HTMLElement>('[data-slot="select-item"]') ?? [],
      );
      items[event.key === 'Home' ? 0 : items.length - 1]?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      context.setOpen(false);
      context.triggerRef.current?.focus();
    } else if (event.key === 'Tab') {
      context.setOpen(false);
    }
  }

  return createPortal(
    <div
      ref={popup}
      role="listbox"
      data-slot="select-content"
      style={placement ?? undefined}
      className={cn('ui-select-content', className)}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>,
    document.body,
  );
}

export function SelectItem({
  className,
  value,
  children,
  ...props
}: { value: string } & ComponentProps<'div'>) {
  const context = useSelect('SelectItem');
  const selected = context.value === value;
  function choose() {
    context.onValueChange(value);
    context.setOpen(false);
    context.triggerRef.current?.focus();
  }
  return (
    <div
      {...props}
      role="option"
      aria-selected={selected}
      data-slot="select-item"
      data-selected={selected ? '' : undefined}
      tabIndex={-1}
      className={cn('ui-select-item', className)}
      onClick={choose}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          choose();
        }
      }}
    >
      {children}
    </div>
  );
}
