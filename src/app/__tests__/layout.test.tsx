import { render, screen } from '@testing-library/react';
import RootLayout, { metadata } from '../layout';

jest.mock('@vercel/analytics/react', () => ({
  Analytics: () => <div data-testid="analytics" />,
}));

jest.mock('@vercel/speed-insights/next', () => ({
  SpeedInsights: () => <div data-testid="speed-insights" />,
}));

describe('RootLayout', () => {
  it('exports valid metadata', () => {
    expect(metadata.title).toBe('Hobby Stats | Media & Music Tracker');
    expect(metadata.description).toContain('Personal media stats tracker');
  });

  it('renders children and analytics components', () => {
    render(
      <RootLayout>
        <div data-testid="child-content">Child Content</div>
      </RootLayout>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByTestId('analytics')).toBeInTheDocument();
    expect(screen.getByTestId('speed-insights')).toBeInTheDocument();
  });
});
