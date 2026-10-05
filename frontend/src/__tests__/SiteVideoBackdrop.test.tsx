import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SiteVideoBackdrop } from '../components/SiteVideoBackdrop';

describe('SiteVideoBackdrop', () => {
  it('plays the supplied TownPulse video as a muted, looping site background', () => {
    render(<SiteVideoBackdrop />);

    const video = screen.getByTestId('site-background-video');
    expect(video.querySelector('source')).toHaveAttribute('src', '/media/townpulse-welcome.mp4');
    expect(video).toHaveProperty('muted', true);
    expect(video).toHaveProperty('loop', true);
    expect(video).toHaveProperty('playsInline', true);
  });
});
