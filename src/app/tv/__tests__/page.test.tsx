import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TvPage from '../page';
import { getRecentEpisodes, getWatchlistShows } from '../../api/get-data';

// Mock dependencies
jest.mock('../../components/Nav', () => {
    return function MockNav() {
        return <div data-testid="nav">Nav Component</div>;
    };
});

jest.mock('../../api/get-data', () => ({
    getWatchlistShows: jest.fn(),
    getRecentEpisodes: jest.fn(),
}));

describe('TV Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders loading state, watchlist tab, and switches to recently watched tab', async () => {
        const mockShows = [
            { id: 1, show: { title: 'Show 1', year: 2020 } },
            { id: null, show: { title: 'Show 2' } },
        ];
        const mockEpisodes = [
            { id: 101, show: { title: 'Recent Show 1', year: 2022 }, episode: { season: 1, number: 5 }, watched_at: '2026-08-01T12:00:00.000Z' },
            { id: null, show: { title: 'Recent Show 2' }, episode: { season: 2, number: 3 }, watched_at: '2026-08-02T12:00:00.000Z' },
        ];

        (getWatchlistShows as jest.Mock).mockResolvedValue(mockShows);
        (getRecentEpisodes as jest.Mock).mockResolvedValue(mockEpisodes);

        render(<TvPage />);

        expect(screen.getByTestId('nav')).toBeInTheDocument();
        expect(screen.getByTestId('loading-state')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Show 1')).toBeInTheDocument();
            expect(screen.getByText('2020')).toBeInTheDocument();
            expect(screen.getByText('Show 2')).toBeInTheDocument();
            expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
        });

        // Switch to Recently Watched tab
        const recentTabButton = screen.getByRole('tab', { name: /Recently Watched/i });
        fireEvent.click(recentTabButton);

        expect(screen.getByText('Recent Show 1')).toBeInTheDocument();
        expect(screen.getByText('(2022)')).toBeInTheDocument();
        expect(screen.getByText('S1 E5')).toBeInTheDocument();
        expect(screen.getByText('Recent Show 2')).toBeInTheDocument();
        expect(screen.getByText('S2 E3')).toBeInTheDocument();

        // Switch back to Watchlist tab
        const watchlistTabButton = screen.getByRole('tab', { name: /Watchlist/i });
        fireEvent.click(watchlistTabButton);

        expect(screen.getByText('Show 1')).toBeInTheDocument();
    });

    it('logs error and displays error state when fetch fails', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        (getWatchlistShows as jest.Mock).mockRejectedValue(new Error('TV fetch failed'));
        (getRecentEpisodes as jest.Mock).mockResolvedValue([]);

        render(<TvPage />);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
            expect(screen.getByTestId('error-state')).toHaveTextContent('Unable to load TV data');
        });

        consoleSpy.mockRestore();
    });

    it('cleans up safely when unmounted before fetch resolves', async () => {
        let resolveShows: (val: any) => void = () => {};
        (getWatchlistShows as jest.Mock).mockImplementation(() => new Promise((res) => { resolveShows = res; }));
        (getRecentEpisodes as jest.Mock).mockImplementation(() => new Promise(() => {}));

        const { unmount } = render(<TvPage />);
        expect(screen.getByTestId('loading-state')).toBeInTheDocument();

        expect(() => {
            unmount();
            resolveShows([]);
        }).not.toThrow();

        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    });
});
