import { render, screen, waitFor } from '@testing-library/react';
import Home from '../page';
import {
    getBackloggdStats,
    getMyAnimeListStats,
    getMyDramaListStats,
    getTraktStats,
    getWatchedShows,
    getWatchlistMovies,
    getWatchlistShows,
} from '../api/get-data';

// Mock dependencies
jest.mock('../components/Nav', () => {
    return function MockNav() {
        return <div data-testid="nav">Nav Component</div>;
    };
});

jest.mock('../api/get-data', () => ({
    getTraktStats: jest.fn(),
    getWatchedShows: jest.fn(),
    getWatchlistMovies: jest.fn(),
    getWatchlistShows: jest.fn(),
    getBackloggdStats: jest.fn(),
    getMyAnimeListStats: jest.fn(),
    getMyDramaListStats: jest.fn(),
}));

describe('Home Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders loading state then progress bars upon data load', async () => {
        (getTraktStats as jest.Mock).mockResolvedValue({
            movies: { watched: 100 },
        });
        (getWatchedShows as jest.Mock).mockResolvedValue(50);
        (getWatchlistMovies as jest.Mock).mockResolvedValue(new Array(20)); // length 20
        (getWatchlistShows as jest.Mock).mockResolvedValue(new Array(10)); // length 10
        (getBackloggdStats as jest.Mock).mockResolvedValue({ played: 280, backlog: 240 });
        (getMyAnimeListStats as jest.Mock).mockResolvedValue({ completed: 350, planToWatch: 320 });
        (getMyDramaListStats as jest.Mock).mockResolvedValue({ completed: 200, planToWatch: 230 });

        render(<Home />);

        expect(screen.getByTestId('nav')).toBeInTheDocument();
        expect(screen.getByTestId('loading-state')).toBeInTheDocument();

        await waitFor(() => {
            const progresses = screen.getAllByTestId('progress');
            expect(progresses).toHaveLength(5);
            expect(progresses[0]).toHaveTextContent(/Game Progress - 280 \/ 520/);
            expect(progresses[1]).toHaveTextContent(/Movie Progress - 100 \/ 120/);
            expect(progresses[2]).toHaveTextContent(/Show Progress - 50 \/ 60/);
            expect(progresses[3]).toHaveTextContent(/Anime Progress - 350 \/ 670/);
            expect(progresses[4]).toHaveTextContent(/K-Drama Progress - 200 \/ 430/);
            expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
        });
    });

    it('handles 0 totals without division by zero', async () => {
        (getTraktStats as jest.Mock).mockResolvedValue({
            movies: { watched: 0 },
        });
        (getWatchedShows as jest.Mock).mockResolvedValue(0);
        (getWatchlistMovies as jest.Mock).mockResolvedValue([]);
        (getWatchlistShows as jest.Mock).mockResolvedValue([]);
        (getBackloggdStats as jest.Mock).mockResolvedValue({ played: 0, backlog: 0 });
        (getMyAnimeListStats as jest.Mock).mockResolvedValue({ completed: 0, planToWatch: 0 });
        (getMyDramaListStats as jest.Mock).mockResolvedValue({ completed: 0, planToWatch: 0 });

        render(<Home />);

        await waitFor(() => {
            const progresses = screen.getAllByTestId('progress');
            expect(progresses).toHaveLength(5);
            expect(progresses[0]).toHaveTextContent(/Game Progress - 0 \/ 0/);
            expect(progresses[1]).toHaveTextContent(/Movie Progress - 0 \/ 0/);
            expect(progresses[2]).toHaveTextContent(/Show Progress - 0 \/ 0/);
            expect(progresses[3]).toHaveTextContent(/Anime Progress - 0 \/ 0/);
            expect(progresses[4]).toHaveTextContent(/K-Drama Progress - 0 \/ 0/);
        });
    });

    it('handles and displays error state when API calls fail', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        (getTraktStats as jest.Mock).mockRejectedValue(new Error('Trakt stats failed'));
        (getWatchedShows as jest.Mock).mockResolvedValue(0);
        (getWatchlistMovies as jest.Mock).mockResolvedValue([]);
        (getWatchlistShows as jest.Mock).mockResolvedValue([]);
        (getBackloggdStats as jest.Mock).mockResolvedValue({ played: 0, backlog: 0 });
        (getMyAnimeListStats as jest.Mock).mockResolvedValue({ completed: 0, planToWatch: 0 });
        (getMyDramaListStats as jest.Mock).mockResolvedValue({ completed: 0, planToWatch: 0 });

        render(<Home />);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
            expect(screen.getByTestId('error-state')).toHaveTextContent('Unable to load stats');
        });

        consoleSpy.mockRestore();
    });

    it('cleans up safely when unmounted before fetch resolves', async () => {
        let resolveStats: (val: any) => void = () => {};
        (getTraktStats as jest.Mock).mockImplementation(() => new Promise((res) => { resolveStats = res; }));
        (getWatchedShows as jest.Mock).mockResolvedValue(0);
        (getWatchlistMovies as jest.Mock).mockResolvedValue([]);
        (getWatchlistShows as jest.Mock).mockResolvedValue([]);
        (getBackloggdStats as jest.Mock).mockResolvedValue({ played: 0, backlog: 0 });
        (getMyAnimeListStats as jest.Mock).mockResolvedValue({ completed: 0, planToWatch: 0 });
        (getMyDramaListStats as jest.Mock).mockResolvedValue({ completed: 0, planToWatch: 0 });

        const { unmount } = render(<Home />);
        expect(screen.getByTestId('loading-state')).toBeInTheDocument();

        expect(() => {
            unmount();
            resolveStats({ movies: { watched: 10 } });
        }).not.toThrow();

        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    });
});

