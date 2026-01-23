import {
    getTraktStats,
    getWatchlistMovies,
    getWatchlistShows,
    getRecentMovies,
    getRecentEpisodes,
    getLastFm
} from '../get-data';

// Mock global fetch
globalThis.fetch = jest.fn();

describe('API Utils', () => {
    beforeEach(() => {
        fetch.mockClear();
        process.env.NEXT_PUBLIC_TRAKT_API_KEY = 'mock-api-key';
        process.env.NEXT_PUBLIC_LASTFM_API_KEY = 'mock-lastfm-key';
    });

    const mockSuccessResponse = (data) => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => data,
        });
    };

    const mockErrorResponse = () => {
        fetch.mockResolvedValueOnce({
            ok: false,
        });
    };

    it('getTraktStats fetches data successfully', async () => {
        const mockData = { stats: 'some stats' };
        mockSuccessResponse(mockData);

        const result = await getTraktStats();
        expect(result).toEqual(mockData);
        expect(fetch).toHaveBeenCalledWith('https://api.trakt.tv/users/noahffiliation/stats', expect.any(Object));
    });

    it('getWatchlistMovies fetches data successfully', async () => {
        const mockData = [{ title: 'Movie 1' }];
        mockSuccessResponse(mockData);

        const result = await getWatchlistMovies();
        expect(result).toEqual(mockData);
        expect(fetch).toHaveBeenCalledWith('https://api.trakt.tv/users/noahffiliation/watchlist/movies/released', expect.any(Object));
    });

    it('getWatchlistShows fetches data successfully', async () => {
        const mockData = [{ title: 'Show 1' }];
        mockSuccessResponse(mockData);

        const result = await getWatchlistShows();
        expect(result).toEqual(mockData);
        expect(fetch).toHaveBeenCalledWith('https://api.trakt.tv/users/noahffiliation/watchlist/shows/released', expect.any(Object));
    });

    it('getRecentMovies fetches data successfully', async () => {
        const mockData = [{ title: 'Recent Movie 1' }];
        mockSuccessResponse(mockData);

        const result = await getRecentMovies();
        expect(result).toEqual(mockData);
        expect(fetch).toHaveBeenCalledWith('https://api.trakt.tv/users/noahffiliation/history/movies?limit=25', expect.any(Object));
    });

    it('getRecentEpisodes fetches data successfully', async () => {
        const mockData = [{ show: 'Show 1' }];
        mockSuccessResponse(mockData);

        const result = await getRecentEpisodes();
        expect(result).toEqual(mockData);
        expect(fetch).toHaveBeenCalledWith('https://api.trakt.tv/users/noahffiliation/history/shows?limit=25', expect.any(Object));
    });

    it('getLastFm fetches data successfully', async () => {
        const mockData = { recenttracks: { track: [] } };
        mockSuccessResponse(mockData);

        const result = await getLastFm();
        expect(result).toEqual(mockData);
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('ws.audioscrobbler.com'), expect.objectContaining({ method: 'GET' }));
    });

    it('getTraktStats throws error when fetch fails', async () => {
        mockErrorResponse();
        await expect(getTraktStats()).rejects.toThrow('Failed to fetch Trakt stats');
    });

    it('getWatchlistMovies throws error when fetch fails', async () => {
        mockErrorResponse();
        await expect(getWatchlistMovies()).rejects.toThrow('Failed to fetch Trakt movie watchlist');
    });

    it('getWatchlistShows throws error when fetch fails', async () => {
        mockErrorResponse();
        await expect(getWatchlistShows()).rejects.toThrow('Failed to fetch Trakt show watchlist');
    });

    it('getRecentMovies throws error when fetch fails', async () => {
        mockErrorResponse();
        await expect(getRecentMovies()).rejects.toThrow('Failed to fetch recent movies');
    });

    it('getRecentEpisodes throws error when fetch fails', async () => {
        mockErrorResponse();
        await expect(getRecentEpisodes()).rejects.toThrow('Failed to fetch recent episodes');
    });

    it('getLastFm throws error when fetch fails', async () => {
        mockErrorResponse();
        await expect(getLastFm()).rejects.toThrow('Failed to fetch last.fm stats');
    });
});
