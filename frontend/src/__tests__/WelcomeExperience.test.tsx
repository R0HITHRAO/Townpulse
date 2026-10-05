import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WelcomeExperience } from '../components/WelcomeExperience';

describe('WelcomeExperience', () => {
  it('introduces TownPulse and enters the local guide on activation', () => {
    const onEnter = vi.fn();
    render(<WelcomeExperience onEnter={onEnter} />);

    expect(
      screen.getByRole('heading', { name: /find your people\. anywhere/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId('welcome-video').querySelector('source')).toHaveAttribute(
      'src',
      '/media/townpulse-welcome.mp4'
    );
    expect(screen.getByTestId('welcome-video')).toHaveProperty('muted', true);
    expect(screen.getByTestId('welcome-video')).toHaveProperty('loop', true);
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    expect(onEnter).toHaveBeenCalledOnce();
  });
});
