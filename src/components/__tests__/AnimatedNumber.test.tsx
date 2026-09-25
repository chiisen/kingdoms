import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AnimatedNumber, { useOwnerChanges } from '@/components/AnimatedNumber';
import { setReducedMotion } from '@/test/motion';

const shown = (container: HTMLElement) =>
  container.querySelector('.animated-number-value')?.textContent;
const chip = (container: HTMLElement) => container.querySelector('.delta-chip');

describe('AnimatedNumber', () => {
  it('prints its value without advertising a change on first render', () => {
    const { container } = render(<AnimatedNumber value={4200} />);
    expect(shown(container)).toBe('4,200');
    expect(chip(container)).toBeNull();
  });

  it('floats a signed difference upwards when the value grows', () => {
    const { container, rerender } = render(<AnimatedNumber value={16000} />);
    rerender(<AnimatedNumber value={18500} />);

    expect(chip(container)?.textContent).toBe('+2,500');
    expect(chip(container)?.className).toContain('up');
    expect(container.querySelector('.animated-number')?.className).toContain('is-up');
  });

  it('floats a negative difference downwards when the value shrinks', () => {
    const { container, rerender } = render(<AnimatedNumber value={4200} />);
    rerender(<AnimatedNumber value={3677} />);

    expect(chip(container)?.textContent).toBe('−523');
    expect(chip(container)?.className).toContain('down');
    expect(container.querySelector('.animated-number')?.className).toContain('is-down');
  });

  it('takes the difference away again after its window', () => {
    vi.useFakeTimers();
    const { container, rerender } = render(<AnimatedNumber value={100} />);
    rerender(<AnimatedNumber value={200} />);
    expect(chip(container)).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(chip(container)).toBeNull();
  });

  it('stays quiet when the caller asks for no difference', () => {
    const { container, rerender } = render(
      <AnimatedNumber value={75} showDelta={false} />,
    );
    rerender(<AnimatedNumber value={87} showDelta={false} />);
    expect(chip(container)).toBeNull();
  });

  it('counts through intermediate values instead of jumping', () => {
    vi.useFakeTimers();
    const { container, rerender } = render(<AnimatedNumber value={0} />);
    rerender(<AnimatedNumber value={1000} />);

    act(() => {
      vi.advanceTimersByTime(200);
    });
    const midway = Number(shown(container)?.replace(/,/g, ''));
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(1000);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(shown(container)).toBe('1,000');
  });

  it('settles on the exact value even when animation frames never run', () => {
    // A background tab pauses requestAnimationFrame; the counter still has to
    // reach the real figure rather than showing a stale one.
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
    const { container, rerender } = render(<AnimatedNumber value={4200} />);
    rerender(<AnimatedNumber value={3941} />);

    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(shown(container)).toBe('3,941');
  });

  it('shows the new value straight away when reduced motion is requested', () => {
    setReducedMotion(true);
    const { container, rerender } = render(<AnimatedNumber value={1000} />);
    rerender(<AnimatedNumber value={2500} />);
    expect(shown(container)).toBe('2,500');
  });
});

describe('useOwnerChanges', () => {
  function Harness({ owners }: { owners: string[] }) {
    const changed = useOwnerChanges(owners);
    return <output data-testid="changed">{changed.join(',')}</output>;
  }

  it('reports only the cities whose owner changed', () => {
    const { getByTestId, rerender } = render(<Harness owners={['wei', 'qun', 'shu']} />);
    rerender(<Harness owners={['wei', 'shu', 'shu']} />);
    expect(getByTestId('changed').textContent).toBe('1');
  });

  it('reports nothing when the map is unchanged', () => {
    const { getByTestId, rerender } = render(<Harness owners={['wei', 'shu']} />);
    rerender(<Harness owners={['wei', 'shu']} />);
    expect(getByTestId('changed').textContent).toBe('');
  });

  it('clears the highlight after the conquest window', () => {
    vi.useFakeTimers();
    const { getByTestId, rerender } = render(<Harness owners={['qun', 'qun']} />);
    rerender(<Harness owners={['shu', 'qun']} />);
    expect(getByTestId('changed').textContent).toBe('0');

    act(() => {
      vi.advanceTimersByTime(1900);
    });
    expect(getByTestId('changed').textContent).toBe('');
  });
});
