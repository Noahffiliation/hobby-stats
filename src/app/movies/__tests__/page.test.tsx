import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MoviesPage from '../page';
import { getRecentMovies, getWatchlistMovies } from '../../api/get-data';

// Mock dependencies
jest.mock('../../components/Nav', () => {
    return function MockNav() {
        return <div data-testid="nav">Nav Component</div>;
    };
});

jest.mock('../../api/get-data', () => ({
    getWatchlistMovies: jest.fn(),
    getRecentMovies: jest.fn(),
}));

describe('Movies Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders loading state, watchlist tab, and switches to recently watched tab', async () => {
        const mockWatchlist = [
            { movie: { title: 'Watchlist Movie 1', year: 2020, ids: { trakt: 101 } } },
            { movie: { title: 'Watchlist Movie 2', year: 2021, ids: { tmdb: 202 } } },
            { movie: { title: 'Watchlist Movie 3', year: 2022, ids: {} } },
            { movie: { title: 'Watchlist Movie 4', ids: null } },
        ];
        const mockRecent = [
            { id: 1, movie: { title: 'Recent Movie 1', year: 2023 }, watched_at: '2026-08-01T12:00:00.000Z' },
            { id: 2, movie: { title: 'Recent Movie 2' }, watched_at: '2026-08-02T12:00:00.000Z' },
        ];

        (getWatchlistMovies as jest.Mock).mockResolvedValue(mockWatchlist);
        (getRecentMovies as jest.Mock).mockResolvedValue(mockRecent);

        render(<MoviesPage />);

        expect(screen.getByTestId('nav')).toBeInTheDocument();
        expect(screen.getByTestId('loading-state')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Watchlist Movie 1')).toBeInTheDocument();
            expect(screen.getByText('2020')).toBeInTheDocument();
            expect(screen.getByText('Watchlist Movie 2')).toBeInTheDocument();
            expect(screen.getByText('Watchlist Movie 3')).toBeInTheDocument();
            expect(screen.getByText('Watchlist Movie 4')).toBeInTheDocument();
            expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
        });

        // Switch to Recently Watched tab
        const recentTabButton = screen.getByRole('tab', { name: /Recently Watched/i });
        fireEvent.click(recentTabButton);

        expect(screen.getByText('Recent Movie 1')).toBeInTheDocument();
        expect(screen.getByText('2023')).toBeInTheDocument();
        expect(screen.getByText('Recent Movie 2')).toBeInTheDocument();

        // Switch back to Watchlist tab
        const watchlistTabButton = screen.getByRole('tab', { name: /Watchlist/i });
        fireEvent.click(watchlistTabButton);

        expect(screen.getByText('Watchlist Movie 1')).toBeInTheDocument();
    });

    it('logs error and displays error state when fetch fails', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        (getWatchlistMovies as jest.Mock).mockRejectedValue(new Error('Fetch failed'));
        (getRecentMovies as jest.Mock).mockResolvedValue([]);

        render(<MoviesPage />);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
            expect(screen.getByTestId('error-state')).toHaveTextContent('Unable to load movie data');
        });
        consoleSpy.mockRestore();
    });

    it('cleans up safely when unmounted before fetch resolves', async () => {
        let resolveWatchlist: (val: any) => void = () => {};
        (getWatchlistMovies as jest.Mock).mockImplementation(() => new Promise((res) => { resolveWatchlist = res; }));
        (getRecentMovies as jest.Mock).mockImplementation(() => new Promise(() => {}));

        const { unmount } = render(<MoviesPage />);
        expect(screen.getByTestId('loading-state')).toBeInTheDocument();

        expect(() => {
            unmount();
            resolveWatchlist([]);
        }).not.toThrow();

        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    });
});
