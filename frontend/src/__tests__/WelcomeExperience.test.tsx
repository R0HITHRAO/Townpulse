import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WelcomeExperience } from '../components/WelcomeExperience';

describe('WelcomeExperience', () => {
  it('introduces TownPulse and enters the local guide on activation', () => {
    const onEnter = vi.fn();
    const { unmount } = render(<WelcomeExperience onEnter={onEnter} />);

    expect(
      screen.getByRole('heading', { name: /find your people\. anywhere/i })
    ).toBeInTheDocument();
    expect(screen.queryByTestId('site-background-video')).not.toBeInTheDocument();
    expect(document.body).toHaveClass('tp-welcome-active');
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    expect(onEnter).toHaveBeenCalledOnce();
    unmount();
    expect(document.body).not.toHaveClass('tp-welcome-active');
  });
});
