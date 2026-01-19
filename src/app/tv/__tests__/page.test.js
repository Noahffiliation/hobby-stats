import { render, screen, waitFor } from '@testing-library/react';
import Home from '../page';
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

    it('renders Nav and watchlist', async () => {
        const mockShows = [
            { id: 1, show: { title: 'Show 1', year: 2020 } },
            { id: 2, show: { title: 'Show 2', year: 2021 } },
        ];

        getWatchlistShows.mockResolvedValue(mockShows);

        render(<Home />);

        expect(screen.getByTestId('nav')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Show 1 - 2020')).toBeInTheDocument();
            expect(screen.getByText('Show 2 - 2021')).toBeInTheDocument();
        });
    });
});
