import { render, screen, waitFor } from '@testing-library/react';
import MoviesPage from '../page';
import { getWatchlistMovies } from '../../api/get-data';

// Mock dependencies
jest.mock('../../components/Nav', () => {
    return function MockNav() {
        return <div data-testid="nav">Nav Component</div>;
    };
});

jest.mock('../../api/get-data', () => ({
    getWatchlistMovies: jest.fn(),
}));

describe('Movies Watchlist Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders loading state and watchlist with various id structures', async () => {
        const mockMovies = [
            { movie: { title: 'Movie 1', year: 2020, ids: { trakt: 101 } } },
            { movie: { title: 'Movie 2', year: 2021, ids: { tmdb: 202 } } },
            { movie: { title: 'Movie 3', year: 2022, ids: {} } },
            { movie: { title: 'Movie 4', ids: null } },
        ];

        (getWatchlistMovies as jest.Mock).mockResolvedValue(mockMovies);

        render(<MoviesPage />);

        expect(screen.getByTestId('nav')).toBeInTheDocument();
        expect(screen.getByTestId('loading-state')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Movie 1')).toBeInTheDocument();
            expect(screen.getByText('2020')).toBeInTheDocument();
            expect(screen.getByText('Movie 2')).toBeInTheDocument();
            expect(screen.getByText('Movie 3')).toBeInTheDocument();
            expect(screen.getByText('Movie 4')).toBeInTheDocument();
            expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
        });
    });

    it('logs error and displays error state when fetch fails', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        (getWatchlistMovies as jest.Mock).mockRejectedValue(new Error('Fetch failed'));

        render(<MoviesPage />);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
            expect(screen.getByTestId('error-state')).toHaveTextContent('Unable to load movie watchlist');
        });
        consoleSpy.mockRestore();
    });

    it('cleans up safely when unmounted before fetch resolves', async () => {
        let resolveMovies: (val: any) => void = () => {};
        (getWatchlistMovies as jest.Mock).mockImplementation(() => new Promise((res) => { resolveMovies = res; }));

        const { unmount } = render(<MoviesPage />);
        expect(screen.getByTestId('loading-state')).toBeInTheDocument();

        expect(() => {
            unmount();
            resolveMovies([]);
        }).not.toThrow();

        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    });
});
