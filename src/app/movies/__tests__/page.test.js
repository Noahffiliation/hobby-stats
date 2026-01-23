import { render, screen, waitFor } from '@testing-library/react';
import Home from '../page';
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

    it('renders Nav and watchlist', async () => {
        const mockMovies = [
            { movie: { title: 'Movie 1', year: 2020, ids: { tmdb: 1 } } },
            { movie: { title: 'Movie 2', year: 2021, ids: { tmdb: 2 } } },
        ];

        getWatchlistMovies.mockResolvedValue(mockMovies); // Already reversed in component logic? Component calls reverse(), so fetch should return array.

        render(<Home />);

        expect(screen.getByTestId('nav')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Movie 1 - 2020')).toBeInTheDocument();
            expect(screen.getByText('Movie 2 - 2021')).toBeInTheDocument();
        });
    });

    it('logs error when fetch fails', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        getWatchlistMovies.mockRejectedValue(new Error('Fetch failed'));

        render(<Home />);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
        });
        consoleSpy.mockRestore();
    });

    it('uses fallback keys for movies without trakt or tmdb ids', async () => {
        const mockMovies = [
            { movie: { title: 'Movie 1', year: 2020, ids: {} } },
            { movie: { title: 'Movie 2', ids: {} } },
        ];

        getWatchlistMovies.mockResolvedValue(mockMovies);

        render(<Home />);

        await waitFor(() => {
            expect(screen.getByText('Movie 1 - 2020')).toBeInTheDocument();
            expect(screen.getByText('Movie 2')).toBeInTheDocument();
        });
    });
});
