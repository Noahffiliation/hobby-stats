import { render, screen, waitFor } from '@testing-library/react';
import Home from '../page';
import { getTraktStats, getWatchedShows, getWatchlistMovies, getWatchlistShows } from '../api/get-data';

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

        render(<Home />);

        expect(screen.getByTestId('nav')).toBeInTheDocument();
        expect(screen.getByTestId('loading-state')).toBeInTheDocument();

        await waitFor(() => {
            const progresses = screen.getAllByTestId('progress');
            expect(progresses).toHaveLength(2);
            expect(progresses[0]).toHaveTextContent(/Movie Progress - 100 \/ 120/);
            expect(progresses[1]).toHaveTextContent(/Show Progress - 50 \/ 60/);
            expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
        });
    });

    it('handles 0 total movies and 0 total shows without division by zero', async () => {
        (getTraktStats as jest.Mock).mockResolvedValue({
            movies: { watched: 0 },
        });
        (getWatchedShows as jest.Mock).mockResolvedValue(0);
        (getWatchlistMovies as jest.Mock).mockResolvedValue([]);
        (getWatchlistShows as jest.Mock).mockResolvedValue([]);

        render(<Home />);

        await waitFor(() => {
            const progresses = screen.getAllByTestId('progress');
            expect(progresses).toHaveLength(2);
            expect(progresses[0]).toHaveTextContent(/Movie Progress - 0 \/ 0/);
            expect(progresses[1]).toHaveTextContent(/Show Progress - 0 \/ 0/);
        });
    });

    it('handles and displays error state when API calls fail', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        (getTraktStats as jest.Mock).mockRejectedValue(new Error('Trakt stats failed'));
        (getWatchedShows as jest.Mock).mockResolvedValue(0);
        (getWatchlistMovies as jest.Mock).mockResolvedValue([]);
        (getWatchlistShows as jest.Mock).mockResolvedValue([]);

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

        const { unmount } = render(<Home />);
        expect(screen.getByTestId('loading-state')).toBeInTheDocument();

        expect(() => {
            unmount();
            resolveStats({ movies: { watched: 10 } });
        }).not.toThrow();

        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    });
});
