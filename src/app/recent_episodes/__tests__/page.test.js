import { render, screen, waitFor } from '@testing-library/react';
import Home from '../page';
import { getRecentEpisodes } from '../../api/get-data';

// Mock dependencies
jest.mock('../../components/Nav', () => {
    return function MockNav() {
        return <div data-testid="nav">Nav Component</div>;
    };
});

jest.mock('../../api/get-data', () => ({
    getRecentEpisodes: jest.fn(),
}));

describe('Recent Episodes Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders Nav and recent episodes', async () => {
        const mockEpisodes = [
            {
                id: 1,
                show: { title: 'Show 1', year: 2020 },
                episode: { season: 1, number: 1 },
                watched_at: '2023-01-01T12:00:00Z',
            },
        ];

        getRecentEpisodes.mockResolvedValue(mockEpisodes);

        render(<Home />);

        expect(screen.getByTestId('nav')).toBeInTheDocument();

        await waitFor(() => {
            // Check for fuzzy text match or parts of it since date formatting might vary by locale
            expect(screen.getByText(/Show 1 \(2020\) - Season 1 Episode 1/)).toBeInTheDocument();
        });
    });
});
