import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AnimePage from '../page';
import { getAnimeList } from '../../api/get-data';

// Mock dependencies
jest.mock('../../components/Nav', () => {
    return function MockNav() {
        return <div data-testid="nav">Nav Component</div>;
    };
});

jest.mock('../../api/get-data', () => ({
    getAnimeList: jest.fn(),
}));

describe('Anime Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders loading state, plan to watch tab, and switches to completed tab', async () => {
        const mockData = {
            totalPlanToWatch: 325,
            totalCompleted: 352,
            planToWatch: [
                { id: 1, title: 'Anime PTW 1', episodes: 12, mediaType: 'TV' },
                { id: undefined as any, title: 'Anime PTW 2' },
            ],
            completed: [
                { id: 3, title: 'Anime Comp 1', episodes: 24, score: 9, mediaType: 'TV' },
                { id: undefined as any, title: 'Anime Comp 2' },
            ],
        };

        (getAnimeList as jest.Mock).mockResolvedValue(mockData);

        render(<AnimePage />);

        expect(screen.getByTestId('nav')).toBeInTheDocument();
        expect(screen.getByTestId('loading-state')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByRole('tab', { name: /Plan to Watch \(325\)/i })).toBeInTheDocument();
            expect(screen.getByRole('tab', { name: /Completed \(352\)/i })).toBeInTheDocument();
            expect(screen.getByText('Anime PTW 1')).toBeInTheDocument();
            expect(screen.getByText('(TV)')).toBeInTheDocument();
            expect(screen.getByText('12 eps')).toBeInTheDocument();
            expect(screen.getByText('Anime PTW 2')).toBeInTheDocument();
            expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
        });

        // Switch to Completed tab
        const completedTabButton = screen.getByRole('tab', { name: /Completed/i });
        fireEvent.click(completedTabButton);

        expect(screen.getByText('Anime Comp 1')).toBeInTheDocument();
        expect(screen.getByText('24 eps')).toBeInTheDocument();
        expect(screen.getByText('9/10')).toBeInTheDocument();
        expect(screen.getByText('Anime Comp 2')).toBeInTheDocument();

        // Switch back to Plan to Watch tab
        const ptwTabButton = screen.getByRole('tab', { name: /Plan to Watch/i });
        fireEvent.click(ptwTabButton);

        expect(screen.getByText('Anime PTW 1')).toBeInTheDocument();
    });

    it('handles empty planToWatch and completed arrays safely', async () => {
        (getAnimeList as jest.Mock).mockResolvedValue({});

        render(<AnimePage />);

        await waitFor(() => {
            expect(screen.getByRole('tab', { name: /Plan to Watch \(0\)/i })).toBeInTheDocument();
            expect(screen.getByRole('tab', { name: /Completed \(0\)/i })).toBeInTheDocument();
            expect(screen.getByText('No anime in plan to watch.')).toBeInTheDocument();
        });

        const completedTabButton = screen.getByRole('tab', { name: /Completed \(0\)/i });
        fireEvent.click(completedTabButton);
        expect(screen.getByText('No completed anime found.')).toBeInTheDocument();
    });

    it('logs error and displays error state when fetch fails', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        (getAnimeList as jest.Mock).mockRejectedValue(new Error('Anime fetch failed'));

        render(<AnimePage />);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
            expect(screen.getByTestId('error-state')).toHaveTextContent('Unable to load anime data');
        });

        consoleSpy.mockRestore();
    });

    it('cleans up safely when unmounted before fetch resolves', async () => {
        let resolveAnime: (val: any) => void = () => {};
        (getAnimeList as jest.Mock).mockImplementation(() => new Promise((res) => { resolveAnime = res; }));

        const { unmount } = render(<AnimePage />);
        expect(screen.getByTestId('loading-state')).toBeInTheDocument();

        expect(() => {
            unmount();
            resolveAnime({ planToWatch: [], completed: [] });
        }).not.toThrow();

        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    });
});
