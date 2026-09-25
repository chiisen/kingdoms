import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

type TabsContextValue = {
  active: string;
  setActive: (value: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs(name: string) {
  const context = useContext(TabsContext);
  if (!context) throw new Error(`${name} 必须在 Tabs 内使用。`);
  return context;
}

export function Tabs({
  defaultValue = '',
  value,
  onValueChange,
  className,
  children,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children?: ReactNode;
}) {
  const [internal, setInternal] = useState(defaultValue);
  const active = value ?? internal;
  const context = useMemo(
    () => ({
      active,
      setActive: (next: string) => {
        setInternal(next);
        onValueChange?.(next);
      },
    }),
    [active, onValueChange],
  );
  return (
    <TabsContext.Provider value={context}>
      <div data-slot="tabs" className={cn('ui-tabs', className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div role="tablist" data-slot="tabs-list" className={cn('ui-tabs-list', className)}>
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children?: ReactNode;
}) {
  const context = useTabs('TabsTrigger');
  const active = context.active === value;
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${value}`}
      aria-selected={active}
      aria-controls={`panel-${value}`}
      tabIndex={active ? 0 : -1}
      data-slot="tabs-trigger"
      data-active={active ? '' : undefined}
      className={cn('ui-tabs-trigger', className)}
      onClick={() => context.setActive(value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          context.setActive(value);
        }
      }}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children?: ReactNode;
}) {
  const context = useTabs('TabsContent');
  if (context.active !== value) return null;
  return (
    <div
      role="tabpanel"
      id={`panel-${value}`}
      aria-labelledby={`tab-${value}`}
      data-slot="tabs-content"
      className={cn('ui-tabs-content', className)}
    >
      {children}
    </div>
  );
}
