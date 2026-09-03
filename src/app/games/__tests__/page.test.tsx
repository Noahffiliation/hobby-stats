import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GamesPage from '../page';
import { getGamesList } from '../../api/get-data';

// Mock dependencies
jest.mock('../../components/Nav', () => {
    return function MockNav() {
        return <div data-testid="nav">Nav Component</div>;
    };
});

jest.mock('../../api/get-data', () => ({
    getGamesList: jest.fn(),
}));

describe('Games Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders loading state, backlog tab, and switches to played tab', async () => {
        const mockData = {
            totalBacklog: 240,
            totalPlayed: 281,
            backlog: [
                { title: 'Silksong', platform: 'PC' },
                { title: 'GTA VI' },
            ],
            played: [
                { title: 'The Division 2', status: 'Completed', platform: 'PC', date: 'Jul 12, 2026' },
                { title: 'Crimson Desert' },
            ],
        };

        (getGamesList as jest.Mock).mockResolvedValue(mockData);

        render(<GamesPage />);

        expect(screen.getByTestId('nav')).toBeInTheDocument();
        expect(screen.getByTestId('loading-state')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByRole('tab', { name: /Backlog \(240\)/i })).toBeInTheDocument();
            expect(screen.getByRole('tab', { name: /Played \/ Reviews \(281\)/i })).toBeInTheDocument();
            expect(screen.getByText('Silksong')).toBeInTheDocument();
            expect(screen.getByText('PC')).toBeInTheDocument();
            expect(screen.getByText('GTA VI')).toBeInTheDocument();
            expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
        });

        // Switch to Played / Reviews tab
        const playedTabButton = screen.getByRole('tab', { name: /Played \/ Reviews/i });
        fireEvent.click(playedTabButton);

        expect(screen.getByText('The Division 2')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('Jul 12, 2026')).toBeInTheDocument();
        expect(screen.getByText('Crimson Desert')).toBeInTheDocument();

        // Switch back to Backlog tab
        const backlogTabButton = screen.getByRole('tab', { name: /Backlog/i });
        fireEvent.click(backlogTabButton);

        expect(screen.getByText('Silksong')).toBeInTheDocument();
    });

    it('handles empty backlog and played arrays safely', async () => {
        (getGamesList as jest.Mock).mockResolvedValue({});

        render(<GamesPage />);

        await waitFor(() => {
            expect(screen.getByRole('tab', { name: /Backlog \(0\)/i })).toBeInTheDocument();
            expect(screen.getByRole('tab', { name: /Played \/ Reviews \(0\)/i })).toBeInTheDocument();
            expect(screen.getByText('No backlog games found.')).toBeInTheDocument();
        });

        const playedTabButton = screen.getByRole('tab', { name: /Played \/ Reviews \(0\)/i });
        fireEvent.click(playedTabButton);
        expect(screen.getByText('No played games found.')).toBeInTheDocument();
    });

    it('logs error and displays error state when fetch fails', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        (getGamesList as jest.Mock).mockRejectedValue(new Error('Games fetch failed'));

        render(<GamesPage />);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
            expect(screen.getByTestId('error-state')).toHaveTextContent('Unable to load games data');
        });

        consoleSpy.mockRestore();
    });

    it('cleans up safely when unmounted before fetch resolves', async () => {
        let resolveGames: (val: any) => void = () => {};
        (getGamesList as jest.Mock).mockImplementation(() => new Promise((res) => { resolveGames = res; }));

        const { unmount } = render(<GamesPage />);
        expect(screen.getByTestId('loading-state')).toBeInTheDocument();

        expect(() => {
            unmount();
            resolveGames({ backlog: [], played: [] });
        }).not.toThrow();

        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    });
});
