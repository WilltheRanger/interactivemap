// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

// React requires this flag for act() outside a test renderer.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Boom({ explode }: { explode: boolean }) {
  if (explode) throw new Error('boom');
  return <p>all good</p>;
}

describe('ErrorBoundary', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    // React logs caught errors loudly; keep test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('renders children when nothing throws', async () => {
    await act(async () => {
      root.render(
        <ErrorBoundary fallback={() => <p>fallback</p>}>
          <Boom explode={false} />
        </ErrorBoundary>,
      );
    });
    expect(container.textContent).toContain('all good');
  });

  it('shows the fallback instead of a blank screen when a child crashes', async () => {
    await act(async () => {
      root.render(
        <ErrorBoundary fallback={() => <p>fallback shown</p>}>
          <Boom explode={true} />
        </ErrorBoundary>,
      );
    });
    expect(container.textContent).toContain('fallback shown');
    expect(container.textContent).not.toContain('all good');
  });

  it('recovers via reset once the cause is gone', async () => {
    let resetFn: (() => void) | null = null;
    const ui = (explode: boolean) => (
      <ErrorBoundary
        fallback={(reset) => {
          resetFn = reset;
          return <p>crashed</p>;
        }}
      >
        <Boom explode={explode} />
      </ErrorBoundary>
    );

    await act(async () => root.render(ui(true)));
    expect(container.textContent).toContain('crashed');

    // Fix the cause, then reset the boundary — children render again.
    await act(async () => root.render(ui(false)));
    await act(async () => resetFn?.());
    expect(container.textContent).toContain('all good');
  });
});
