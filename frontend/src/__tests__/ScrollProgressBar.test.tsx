import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ScrollProgressBar } from '../components/ScrollProgressBar';

const setScrollMetrics = (scrollHeight: number, clientHeight: number, scrollTop: number) => {
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: scrollHeight,
  });
  Object.defineProperty(document.documentElement, 'clientHeight', {
    configurable: true,
    value: clientHeight,
  });
  Object.defineProperty(document.documentElement, 'scrollTop', {
    configurable: true,
    writable: true,
    value: scrollTop,
  });
};

const getProgressBar = (container: HTMLElement) => {
  const track = container.firstElementChild as HTMLElement;
  return track.firstElementChild as HTMLElement;
};

afterEach(() => {
  setScrollMetrics(0, 0, 0);
});

describe('ScrollProgressBar Component', () => {
  it('measures the page scroll on mount', () => {
    setScrollMetrics(2000, 1000, 500);

    const { container } = render(<ScrollProgressBar />);

    expect(getProgressBar(container).style.transform).toBe('scaleX(0.5)');
  });

  it('stays at zero when the page is not scrollable', () => {
    setScrollMetrics(600, 600, 0);

    const { container } = render(<ScrollProgressBar />);

    expect(getProgressBar(container).style.transform).toBe('scaleX(0)');
  });

  it('is hidden from assistive technology and print output', () => {
    const { container } = render(<ScrollProgressBar />);
    const track = container.firstElementChild as HTMLElement;

    expect(track).toHaveAttribute('aria-hidden', 'true');
    expect(track.className).toContain('print:hidden');
  });
});
