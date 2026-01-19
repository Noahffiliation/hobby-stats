import { render, screen, waitFor } from '@testing-library/react';
import Home from '../page';
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

    it('renders Nav and recent movies', async () => {
        const mockMovies = [
            {
                id: 1,
                movie: { title: 'Movie 1', year: 2020 },
                watched_at: '2023-01-01T12:00:00Z',
            },
        ];

        getRecentMovies.mockResolvedValue(mockMovies);

        render(<Home />);

        expect(screen.getByTestId('nav')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText(/Movie 1 \(2020\)/)).toBeInTheDocument();
        });
    });
});
