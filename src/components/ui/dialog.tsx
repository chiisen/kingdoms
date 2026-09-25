import type { ReactNode } from 'react';
import {
  ModalContent,
  ModalDescription,
  ModalRoot,
  ModalTitle,
} from './modal';

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <ModalRoot open={open} onOpenChange={onOpenChange}>
      {children}
    </ModalRoot>
  );
}

export function DialogContent({
  className,
  children,
  showCloseButton = true,
}: {
  className?: string;
  children?: ReactNode;
  showCloseButton?: boolean;
}) {
  return (
    <ModalContent
      slot="dialog-content"
      overlaySlot="dialog-overlay"
      className={className}
      showCloseButton={showCloseButton}
    >
      {children}
    </ModalContent>
  );
}

export function DialogTitle({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <ModalTitle slot="dialog-title" className={className}>
      {children}
    </ModalTitle>
  );
}

export function DialogDescription({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <ModalDescription slot="dialog-description" className={className}>
      {children}
    </ModalDescription>
  );
}
