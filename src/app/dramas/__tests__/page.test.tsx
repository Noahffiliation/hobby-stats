import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DramasPage from '../page';
import { getDramaList } from '../../api/get-data';

// Mock dependencies
jest.mock('../../components/Nav', () => {
    return function MockNav() {
        return <div data-testid="nav">Nav Component</div>;
    };
});

jest.mock('../../api/get-data', () => ({
    getDramaList: jest.fn(),
}));

describe('Dramas Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders loading state, plan to watch tab, and switches to completed tab', async () => {
        const mockData = {
            totalPlanToWatch: 237,
            totalCompleted: 205,
            planToWatch: [
                { title: 'Moving Season 2', year: 2026, type: 'Drama', country: 'South Korea' },
                { title: 'Weak Hero' },
            ],
            completed: [
                { title: '13 Assassins', year: 2010, type: 'Movie', country: 'Japan', episodes: '1/1', score: 9.0 },
                { title: 'Big Man Japan' },
            ],
        };

        (getDramaList as jest.Mock).mockResolvedValue(mockData);

        render(<DramasPage />);

        expect(screen.getByTestId('nav')).toBeInTheDocument();
        expect(screen.getByTestId('loading-state')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByRole('tab', { name: /Plan to Watch \(237\)/i })).toBeInTheDocument();
            expect(screen.getByRole('tab', { name: /Completed \(205\)/i })).toBeInTheDocument();
            expect(screen.getByText('Moving Season 2')).toBeInTheDocument();
            expect(screen.getByText('(2026)')).toBeInTheDocument();
            expect(screen.getByText('• South Korea')).toBeInTheDocument();
            expect(screen.getByText('Drama')).toBeInTheDocument();
            expect(screen.getByText('Weak Hero')).toBeInTheDocument();
            expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
        });

        // Switch to Completed tab
        const completedTabButton = screen.getByRole('tab', { name: /Completed/i });
        fireEvent.click(completedTabButton);

        expect(screen.getByText('13 Assassins')).toBeInTheDocument();
        expect(screen.getByText('(2010)')).toBeInTheDocument();
        expect(screen.getByText('• Japan')).toBeInTheDocument();
        expect(screen.getByText('1/1')).toBeInTheDocument();
        expect(screen.getByText('9/10')).toBeInTheDocument();
        expect(screen.getByText('Big Man Japan')).toBeInTheDocument();

        // Switch back to Plan to Watch tab
        const ptwTabButton = screen.getByRole('tab', { name: /Plan to Watch/i });
        fireEvent.click(ptwTabButton);

        expect(screen.getByText('Moving Season 2')).toBeInTheDocument();
    });

    it('handles empty planToWatch and completed arrays safely', async () => {
        (getDramaList as jest.Mock).mockResolvedValue({});

        render(<DramasPage />);

        await waitFor(() => {
            expect(screen.getByRole('tab', { name: /Plan to Watch \(0\)/i })).toBeInTheDocument();
            expect(screen.getByRole('tab', { name: /Completed \(0\)/i })).toBeInTheDocument();
            expect(screen.getByText('No K-dramas in plan to watch.')).toBeInTheDocument();
        });

        const completedTabButton = screen.getByRole('tab', { name: /Completed \(0\)/i });
        fireEvent.click(completedTabButton);
        expect(screen.getByText('No completed K-dramas found.')).toBeInTheDocument();
    });

    it('logs error and displays error state when fetch fails', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        (getDramaList as jest.Mock).mockRejectedValue(new Error('Dramas fetch failed'));

        render(<DramasPage />);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
            expect(screen.getByTestId('error-state')).toHaveTextContent('Unable to load K-drama data');
        });

        consoleSpy.mockRestore();
    });

    it('cleans up safely when unmounted before fetch resolves', async () => {
        let resolveDramas: (val: any) => void = () => {};
        (getDramaList as jest.Mock).mockImplementation(() => new Promise((res) => { resolveDramas = res; }));

        const { unmount } = render(<DramasPage />);
        expect(screen.getByTestId('loading-state')).toBeInTheDocument();

        expect(() => {
            unmount();
            resolveDramas({ planToWatch: [], completed: [] });
        }).not.toThrow();

        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    });
});
