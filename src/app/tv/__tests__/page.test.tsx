import { render, screen, waitFor } from '@testing-library/react';
import TvPage from '../page';
import { getWatchlistShows } from '../../api/get-data';

// Mock dependencies
jest.mock('../../components/Nav', () => {
    return function MockNav() {
        return <div data-testid="nav">Nav Component</div>;
    };
});

jest.mock('../../api/get-data', () => ({
    getWatchlistShows: jest.fn(),
}));

describe('TV Watchlist Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders loading state and watchlist with and without show year/id', async () => {
        const mockShows = [
            { id: 1, show: { title: 'Show 1', year: 2020 } },
            { id: null, show: { title: 'Show 2' } },
        ];

        (getWatchlistShows as jest.Mock).mockResolvedValue(mockShows);

        render(<TvPage />);

        expect(screen.getByTestId('nav')).toBeInTheDocument();
        expect(screen.getByTestId('loading-state')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Show 1')).toBeInTheDocument();
            expect(screen.getByText('2020')).toBeInTheDocument();
            expect(screen.getByText('Show 2')).toBeInTheDocument();
            expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
        });
    });

    it('logs error and displays error state when fetch fails', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        (getWatchlistShows as jest.Mock).mockRejectedValue(new Error('TV watchlist fetch failed'));

        render(<TvPage />);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
            expect(screen.getByTestId('error-state')).toHaveTextContent('Unable to load TV watchlist');
        });

        consoleSpy.mockRestore();
    });

    it('cleans up safely when unmounted before fetch resolves', async () => {
        let resolveShows: (val: any) => void = () => {};
        (getWatchlistShows as jest.Mock).mockImplementation(() => new Promise((res) => { resolveShows = res; }));

        const { unmount } = render(<TvPage />);
        expect(screen.getByTestId('loading-state')).toBeInTheDocument();

        expect(() => {
            unmount();
            resolveShows([]);
        }).not.toThrow();

        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    });
});
