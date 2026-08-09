import { render, screen, waitFor } from '@testing-library/react';
import RecentMoviesPage from '../page';
import { getRecentMovies } from '../../api/get-data';

// Mock dependencies
jest.mock('../../components/Nav', () => {
    return function MockNav() {
        return <div data-testid="nav">Nav Component</div>;
    };
});

jest.mock('../../api/get-data', () => ({
    getRecentMovies: jest.fn(),
}));

describe('Recent Movies Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders loading state and recent movies with and without year', async () => {
        const mockMovies = [
            {
                id: 1,
                movie: { title: 'Movie 1', year: 2020 },
                watched_at: '2023-01-01T12:00:00Z',
            },
            {
                id: 2,
                movie: { title: 'Movie 2' },
                watched_at: '2023-01-02T12:00:00Z',
            },
        ];

        (getRecentMovies as jest.Mock).mockResolvedValue(mockMovies);

        render(<RecentMoviesPage />);

        expect(screen.getByTestId('nav')).toBeInTheDocument();
        expect(screen.getByTestId('loading-state')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Movie 1')).toBeInTheDocument();
            expect(screen.getByText('2020')).toBeInTheDocument();
            expect(screen.getByText('Movie 2')).toBeInTheDocument();
            expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
        });
    });

    it('logs error and displays error state when fetch fails', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        (getRecentMovies as jest.Mock).mockRejectedValue(new Error('Fetch failed'));

        render(<RecentMoviesPage />);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
            expect(screen.getByTestId('error-state')).toHaveTextContent('Unable to load recent movies');
        });
        consoleSpy.mockRestore();
    });

    it('cleans up safely when unmounted before fetch resolves', async () => {
        let resolveMovies: (val: any) => void = () => {};
        (getRecentMovies as jest.Mock).mockImplementation(() => new Promise((res) => { resolveMovies = res; }));

        const { unmount } = render(<RecentMoviesPage />);
        expect(screen.getByTestId('loading-state')).toBeInTheDocument();

        expect(() => {
            unmount();
            resolveMovies([]);
        }).not.toThrow();

        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    });
});
