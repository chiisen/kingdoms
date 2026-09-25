import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Shared modal plumbing for Dialog and AlertDialog: portal, focus handling and dismissal. */
export type ModalContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
  dismissOnOutsidePress: boolean;
};

const ModalContext = createContext<ModalContextValue | null>(null);

export function useModal(name: string) {
  const context = useContext(ModalContext);
  if (!context) throw new Error(`${name} 必須在 Dialog 或 AlertDialog 內使用。`);
  return context;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/* An anchored popup (a Select) sits above the modal it was opened from: while one is
   open it owns the keyboard, so Escape closes the popup first and the modal second. */
let openPopups = 0;

export function usePopupLayer(open: boolean) {
  useEffect(() => {
    if (!open) return;
    openPopups += 1;
    return () => {
      openPopups = Math.max(0, openPopups - 1);
    };
  }, [open]);
}

export function ModalRoot({
  open = false,
  onOpenChange,
  dismissOnOutsidePress = true,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  dismissOnOutsidePress?: boolean;
  children: ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const setOpen = useCallback(
    (next: boolean) => {
      onOpenChange?.(next);
    },
    [onOpenChange],
  );
  const value = useMemo(
    () => ({ open, setOpen, titleId, descriptionId, dismissOnOutsidePress }),
    [open, setOpen, titleId, descriptionId, dismissOnOutsidePress],
  );
  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
}

export function ModalContent({
  slot,
  overlaySlot,
  className,
  children,
  showCloseButton = false,
  closeLabel = '關閉',
}: {
  slot: string;
  overlaySlot: string;
  className?: string;
  children?: ReactNode;
  showCloseButton?: boolean;
  closeLabel?: string;
}) {
  const context = useModal(slot);
  const panel = useRef<HTMLDivElement>(null);
  // The latest handlers are read through a ref so the effect only reacts to open/close.
  const latest = useRef(context);
  latest.current = context;

  useEffect(() => {
    if (!context.open) return;
    const node = panel.current;
    const restore = document.activeElement as HTMLElement | null;
    const first = node?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (openPopups > 0 || event.defaultPrevented) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        latest.current.setOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null,
      );
      if (!items.length) return;
      const firstItem = items[0],
        lastItem = items[items.length - 1],
        active = document.activeElement;
      if (event.shiftKey && (active === firstItem || !node.contains(active))) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && (active === lastItem || !node.contains(active))) {
        event.preventDefault();
        firstItem.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      restore?.focus?.();
    };
  }, [context.open]);

  if (!context.open) return null;

  return createPortal(
    <>
      <div
        data-slot={overlaySlot}
        className={`ui-overlay ${overlaySlot}`}
        onClick={
          context.dismissOnOutsidePress ? () => context.setOpen(false) : undefined
        }
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={context.titleId}
        aria-describedby={context.descriptionId}
        data-slot={slot}
        tabIndex={-1}
        className={cn('ui-dialog-content', className)}
      >
        {children}
        {showCloseButton && (
          <button
            type="button"
            data-slot="dialog-close"
            aria-label={closeLabel}
            title={closeLabel}
            onClick={() => context.setOpen(false)}
          >
            <XIcon size={16} />
          </button>
        )}
      </div>
    </>,
    document.body,
  );
}

export function ModalTitle({
  slot,
  className,
  children,
}: {
  slot: string;
  className?: string;
  children?: ReactNode;
}) {
  const context = useModal(slot);
  return (
    <h2 id={context.titleId} data-slot={slot} className={className}>
      {children}
    </h2>
  );
}

export function ModalDescription({
  slot,
  className,
  children,
}: {
  slot: string;
  className?: string;
  children?: ReactNode;
}) {
  const context = useModal(slot);
  return (
    <p id={context.descriptionId} data-slot={slot} className={className}>
      {children}
    </p>
  );
}
