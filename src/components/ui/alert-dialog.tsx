import type { ReactNode } from 'react';
import {
  ModalContent,
  ModalDescription,
  ModalRoot,
  ModalTitle,
  useModal,
} from './modal';

export function AlertDialog({
  open,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <ModalRoot
      open={open}
      onOpenChange={onOpenChange}
      // A confirmation stays until one of its answers is chosen.
      dismissOnOutsidePress={false}
    >
      {children}
    </ModalRoot>
  );
}

export function AlertDialogContent({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <ModalContent
      slot="alert-dialog-content"
      overlaySlot="alert-dialog-overlay"
      className={className}
    >
      {children}
    </ModalContent>
  );
}

export function AlertDialogTitle({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <ModalTitle slot="alert-dialog-title" className={className}>
      {children}
    </ModalTitle>
  );
}

export function AlertDialogDescription({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <ModalDescription slot="alert-dialog-description" className={className}>
      {children}
    </ModalDescription>
  );
}

export function AlertDialogCancel({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const context = useModal('AlertDialogCancel');
  return (
    <button
      type="button"
      data-slot="alert-dialog-cancel"
      className={className}
      onClick={() => context.setOpen(false)}
    >
      {children}
    </button>
  );
}
