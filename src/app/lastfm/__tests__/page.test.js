import { render, screen, waitFor } from '@testing-library/react';
import Home from '../page';
import { getLastFm } from '../../api/get-data';

// Mock dependencies
jest.mock('../../components/Nav', () => {
    return function MockNav() {
        return <div data-testid="nav">Nav Component</div>;
    };
});

jest.mock('../../api/get-data', () => ({
    getLastFm: jest.fn(),
}));

describe('Last.fm Page', () => {
    beforeEach(() => {
        getLastFm.mockClear();
    });

    it('renders Nav and fetches/displays tracks', async () => {
        const mockTracks = [
            {
                name: 'Track 1',
                artist: { '#text': 'Artist 1' },
                mbid: '1',
            },
            {
                name: 'Track 2',
                artist: { '#text': 'Artist 2' },
                mbid: '2',
            },
        ];

        getLastFm.mockResolvedValue({
            recenttracks: {
                track: mockTracks,
            },
        });

        render(<Home />);

        expect(screen.getByTestId('nav')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Artist 1 - Track 1')).toBeInTheDocument();
            expect(screen.getByText('Artist 2 - Track 2')).toBeInTheDocument();
        });
    });

    it('handles empty data gracefully', async () => {
        getLastFm.mockResolvedValue({
            recenttracks: {
                track: [],
            },
        });

        render(<Home />);

        await waitFor(() => {
            expect(getLastFm).toHaveBeenCalled();
        });

        // Should still render Nav
        expect(screen.getByTestId('nav')).toBeInTheDocument();
    });
});
