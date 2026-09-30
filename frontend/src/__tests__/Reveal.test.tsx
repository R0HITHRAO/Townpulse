import { render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Reveal } from '../components/Reveal';

type ObserverCallback = (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void;

let observerCallback: ObserverCallback | null = null;

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(callback: ObserverCallback) {
    observerCallback = callback;
  }
}

const stubObserver = () => vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

afterEach(() => {
  observerCallback = null;
  vi.unstubAllGlobals();
});

describe('Reveal Component', () => {
  it('renders its children inside an animated wrapper', () => {
    stubObserver();
    render(
      <Reveal direction="left" delay={120}>
        Community clinics
      </Reveal>
    );

    const wrapper = screen.getByText('Community clinics');
    expect(wrapper).toHaveClass('reveal', 'reveal-left');
    expect(wrapper).not.toHaveClass('is-visible');
    expect(wrapper.style.transitionDelay).toBe('120ms');
  });

  it('reveals content once the element scrolls into view', () => {
    stubObserver();
    render(<Reveal>Hidden until scrolled</Reveal>);

    const wrapper = screen.getByText('Hidden until scrolled');
    expect(wrapper).not.toHaveClass('is-visible');

    act(() => {
      observerCallback?.(
        [{ isIntersecting: true, target: wrapper } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    expect(wrapper).toHaveClass('is-visible');
  });

  it('shows content immediately when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<Reveal>Always visible</Reveal>);

    expect(screen.getByText('Always visible')).toHaveClass('is-visible');
  });

  it('skips the observer entirely when the user prefers reduced motion', () => {
    stubObserver();
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );

    render(<Reveal>Reduced motion</Reveal>);

    expect(screen.getByText('Reduced motion')).toHaveClass('is-visible');
  });
});
