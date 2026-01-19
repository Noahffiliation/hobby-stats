import { render, screen, waitFor } from '@testing-library/react';
import Home from '../page';
import { getTraktStats, getWatchlistMovies, getWatchlistShows } from '../api/get-data';

// Mock dependencies
jest.mock('../components/Nav', () => {
    return function MockNav() {
        return <div data-testid="nav">Nav Component</div>;
    };
});

jest.mock('../api/get-data', () => ({
    getTraktStats: jest.fn(),
    getWatchlistMovies: jest.fn(),
    getWatchlistShows: jest.fn(),
}));

jest.mock('@heroui/react', () => ({
    Progress: ({ label, value }) => <div data-testid="progress" aria-label={label} data-value={value}>{label}</div>,
}));

describe('Home Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders Nav and stats with progress', async () => {
        getTraktStats.mockResolvedValue({
            movies: { watched: 100 },
            shows: { watched: 50 },
        });
        getWatchlistMovies.mockResolvedValue(new Array(20)); // length 20
        getWatchlistShows.mockResolvedValue(new Array(10)); // length 10

        render(<Home />);

        expect(screen.getByTestId('nav')).toBeInTheDocument();

        await waitFor(() => {
            // Movies: 100 watched, 20 watchlist. Total 120. Progress ~83.33%
            // Shows: 50 watched, 10 watchlist. Total 60. Progress ~83.33%
            const progresses = screen.getAllByTestId('progress');
            expect(progresses).toHaveLength(2);
            expect(progresses[0]).toHaveTextContent(/Movie Progress/);
            expect(progresses[1]).toHaveTextContent(/Show Progress/);
        });
    });
});
