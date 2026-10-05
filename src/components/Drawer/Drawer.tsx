import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { cx } from '../../shared/utils/format';
import './drawer.css';

interface DrawerContextValue {
  onClose: () => void;
  titleId: string;
}

const DrawerContext = createContext<DrawerContextValue | null>(null);

function useDrawerContext(component: string): DrawerContextValue {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error(`Drawer.${component} must be rendered inside <Drawer.Root>`);
  return ctx;
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export interface DrawerRootProps {
  open: boolean;
  onClose: () => void;
  titleId: string;
  children: ReactNode;
}

/**
 * Compound-component Drawer: `<Drawer.Root>` owns open state/focus-trap and
 * exposes `<Drawer.Header>`, `<Drawer.Body>`, `<Drawer.Footer>` so features
 * compose their own content without the shell knowing anything about it
 * (no business logic lives here).
 */
function Root({ open, onClose, titleId, children }: DrawerRootProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusable = panel ? getFocusable(panel) : [];
    (focusable[0] ?? panel)?.focus();

    return () => {
      previouslyFocused.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key === 'Tab' && panelRef.current) {
      const focusable = getFocusable(panelRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }

  return (
    <DrawerContext.Provider value={{ onClose, titleId }}>
      <div className="op-drawer__overlay" onClick={onClose} data-testid="drawer-overlay">
        <div
          ref={panelRef}
          className="op-drawer__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          {children}
        </div>
      </div>
    </DrawerContext.Provider>
  );
}

function Header({ children }: { children: ReactNode }) {
  const { onClose, titleId } = useDrawerContext('Header');
  return (
    <div className="op-drawer__header">
      <h2 id={titleId} className="op-drawer__title">
        {children}
      </h2>
      <button type="button" className="op-drawer__close" onClick={onClose} aria-label="Close drawer">
        ×
      </button>
    </div>
  );
}

function Body({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('op-drawer__body', className)}>{children}</div>;
}

function Footer({ children }: { children: ReactNode }) {
  return <div className="op-drawer__footer">{children}</div>;
}

export const Drawer = { Root, Header, Body, Footer };
