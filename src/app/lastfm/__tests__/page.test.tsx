import { render, screen, waitFor } from '@testing-library/react';
import LastFmPage from '../page';
import { getLastFm } from '../../api/get-data';

// Mock dependencies
jest.mock('../../components/Nav', () => {
    return function MockNav() {
        return <div data-testid="nav">Nav Component</div>;
    };
});

jest.mock('../../api/get-data', () => ({
    getLastFm: jest.fn(),
}));

describe('Last.fm Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders loading state and tracks with and without mbid', async () => {
        const mockTracks = [
            {
                name: 'Track 1',
                artist: { '#text': 'Artist 1' },
                mbid: '1',
            },
            {
                name: 'Track 2',
                artist: { '#text': 'Artist 2' },
                mbid: '',
            },
        ];

        (getLastFm as jest.Mock).mockResolvedValue({
            recenttracks: {
                track: mockTracks,
            },
        });

        render(<LastFmPage />);

        expect(screen.getByTestId('nav')).toBeInTheDocument();
        expect(screen.getByTestId('loading-state')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Track 1')).toBeInTheDocument();
            expect(screen.getByText('Artist 1')).toBeInTheDocument();
            expect(screen.getByText('Track 2')).toBeInTheDocument();
            expect(screen.getByText('Artist 2')).toBeInTheDocument();
            expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
        });
    });

    it('logs error and displays error state when fetch fails', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        (getLastFm as jest.Mock).mockRejectedValue(new Error('LastFm fetch failed'));

        render(<LastFmPage />);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
            expect(screen.getByTestId('error-state')).toHaveTextContent('Unable to load Last.fm scrobbles');
        });

        consoleSpy.mockRestore();
    });

    it('cleans up safely when unmounted before fetch resolves', async () => {
        let resolveTracks: (val: any) => void = () => {};
        (getLastFm as jest.Mock).mockImplementation(() => new Promise((res) => { resolveTracks = res; }));

        const { unmount } = render(<LastFmPage />);
        expect(screen.getByTestId('loading-state')).toBeInTheDocument();

        expect(() => {
            unmount();
            resolveTracks({ recenttracks: { track: [] } });
        }).not.toThrow();

        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    });
});
