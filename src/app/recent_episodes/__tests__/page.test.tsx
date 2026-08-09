import { render, screen, waitFor } from '@testing-library/react';
import RecentEpisodesPage from '../page';
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

    it('renders loading state and recent episodes with and without id/year', async () => {
        const mockEpisodes = [
            {
                id: 1,
                show: { title: 'Show 1', year: 2020 },
                episode: { season: 1, number: 1 },
                watched_at: '2023-01-01T12:00:00Z',
            },
            {
                id: null,
                show: { title: 'Show 2' },
                episode: { season: 2, number: 5 },
                watched_at: '2023-01-02T12:00:00Z',
            },
        ];

        (getRecentEpisodes as jest.Mock).mockResolvedValue(mockEpisodes);

        render(<RecentEpisodesPage />);

        expect(screen.getByTestId('nav')).toBeInTheDocument();
        expect(screen.getByTestId('loading-state')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Show 1')).toBeInTheDocument();
            expect(screen.getByText('(2020)')).toBeInTheDocument();
            expect(screen.getByText('S1 E1')).toBeInTheDocument();
            expect(screen.getByText('Show 2')).toBeInTheDocument();
            expect(screen.getByText('S2 E5')).toBeInTheDocument();
            expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
        });
    });

    it('logs error and displays error state when fetch fails', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        (getRecentEpisodes as jest.Mock).mockRejectedValue(new Error('Recent episodes fetch failed'));

        render(<RecentEpisodesPage />);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
            expect(screen.getByTestId('error-state')).toHaveTextContent('Unable to load recent episodes');
        });

        consoleSpy.mockRestore();
    });

    it('cleans up safely when unmounted before fetch resolves', async () => {
        let resolveEpisodes: (val: any) => void = () => {};
        (getRecentEpisodes as jest.Mock).mockImplementation(() => new Promise((res) => { resolveEpisodes = res; }));

        const { unmount } = render(<RecentEpisodesPage />);
        expect(screen.getByTestId('loading-state')).toBeInTheDocument();

        expect(() => {
            unmount();
            resolveEpisodes([]);
        }).not.toThrow();

        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    });
});
