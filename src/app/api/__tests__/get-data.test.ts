import {
    getTraktStats,
    getWatchedShows,
    getWatchlistMovies,
    getWatchlistShows,
    getRecentMovies,
    getRecentEpisodes,
    getLastFm,
    getBackloggdStats,
    getMyAnimeListStats,
    getMyDramaListStats,
    getGamesList,
    getAnimeList,
    getDramaList,
} from '../get-data';

// Mock global fetch
globalThis.fetch = jest.fn();

describe('API Utils (get-data)', () => {
    beforeEach(() => {
        (fetch as jest.Mock).mockClear();
    });

    const mockSuccessResponse = (data: unknown) => {
        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => data,
        });
    };

    const mockErrorResponse = () => {
        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
        });
    };

    it('getTraktStats fetches data successfully', async () => {
        const mockData = { movies: { watched: 100 } };
        mockSuccessResponse(mockData);

        const result = await getTraktStats();
        expect(result).toEqual(mockData);
        expect(fetch).toHaveBeenCalledWith('/api/trakt?endpoint=stats', { method: 'GET' });
    });

    it('getTraktStats throws error when fetch is not ok', async () => {
        mockErrorResponse();
        await expect(getTraktStats()).rejects.toThrow('Failed to fetch Trakt stats');
    });

    it('getWatchedShows fetches count successfully', async () => {
        mockSuccessResponse({ count: 504 });

        const result = await getWatchedShows();
        expect(result).toBe(504);
        expect(fetch).toHaveBeenCalledWith('/api/trakt?endpoint=watched-shows', { method: 'GET' });
    });

    it('getWatchedShows throws error when fetch is not ok', async () => {
        mockErrorResponse();
        await expect(getWatchedShows()).rejects.toThrow('Failed to fetch Trakt watched shows');
    });

    it('getWatchlistMovies fetches data successfully', async () => {
        const mockData = [{ movie: { title: 'Movie 1' } }];
        mockSuccessResponse(mockData);

        const result = await getWatchlistMovies();
        expect(result).toEqual(mockData);
        expect(fetch).toHaveBeenCalledWith('/api/trakt?endpoint=watchlist-movies', { method: 'GET' });
    });

    it('getWatchlistMovies throws error when fetch is not ok', async () => {
        mockErrorResponse();
        await expect(getWatchlistMovies()).rejects.toThrow('Failed to fetch Trakt movie watchlist');
    });

    it('getWatchlistShows fetches data successfully', async () => {
        const mockData = [{ show: { title: 'Show 1' } }];
        mockSuccessResponse(mockData);

        const result = await getWatchlistShows();
        expect(result).toEqual(mockData);
        expect(fetch).toHaveBeenCalledWith('/api/trakt?endpoint=watchlist-shows', { method: 'GET' });
    });

    it('getWatchlistShows throws error when fetch is not ok', async () => {
        mockErrorResponse();
        await expect(getWatchlistShows()).rejects.toThrow('Failed to fetch Trakt show watchlist');
    });

    it('getRecentMovies fetches data successfully', async () => {
        const mockData = [{ id: 1, movie: { title: 'Recent Movie 1' }, watched_at: '2026-08-14' }];
        mockSuccessResponse(mockData);

        const result = await getRecentMovies();
        expect(result).toEqual(mockData);
        expect(fetch).toHaveBeenCalledWith('/api/trakt?endpoint=recent-movies', { method: 'GET' });
    });

    it('getRecentMovies throws error when fetch is not ok', async () => {
        mockErrorResponse();
        await expect(getRecentMovies()).rejects.toThrow('Failed to fetch recent movies');
    });

    it('getRecentEpisodes fetches data successfully', async () => {
        const mockData = [{ id: 1, show: { title: 'Show 1' }, episode: { season: 1, number: 1 }, watched_at: '2026-08-14' }];
        mockSuccessResponse(mockData);

        const result = await getRecentEpisodes();
        expect(result).toEqual(mockData);
        expect(fetch).toHaveBeenCalledWith('/api/trakt?endpoint=recent-episodes', { method: 'GET' });
    });

    it('getRecentEpisodes throws error when fetch is not ok', async () => {
        mockErrorResponse();
        await expect(getRecentEpisodes()).rejects.toThrow('Failed to fetch recent episodes');
    });

    it('getLastFm fetches data successfully', async () => {
        const mockData = { recenttracks: { track: [] } };
        mockSuccessResponse(mockData);

        const result = await getLastFm();
        expect(result).toEqual(mockData);
        expect(fetch).toHaveBeenCalledWith('/api/lastfm', { method: 'GET' });
    });

    it('getLastFm throws error when fetch fails', async () => {
        mockErrorResponse();
        await expect(getLastFm()).rejects.toThrow('Failed to fetch last.fm stats');
    });

    it('getBackloggdStats fetches data successfully', async () => {
        const mockData = { played: 280, backlog: 240 };
        mockSuccessResponse(mockData);

        const result = await getBackloggdStats();
        expect(result).toEqual(mockData);
        expect(fetch).toHaveBeenCalledWith('/api/backloggd', { method: 'GET' });
    });

    it('getBackloggdStats throws error when fetch is not ok', async () => {
        mockErrorResponse();
        await expect(getBackloggdStats()).rejects.toThrow('Failed to fetch Backloggd stats');
    });

    it('getMyAnimeListStats fetches data successfully', async () => {
        const mockData = { completed: 352, planToWatch: 325 };
        mockSuccessResponse(mockData);

        const result = await getMyAnimeListStats();
        expect(result).toEqual(mockData);
        expect(fetch).toHaveBeenCalledWith('/api/myanimelist', { method: 'GET' });
    });

    it('getMyAnimeListStats throws error when fetch is not ok', async () => {
        mockErrorResponse();
        await expect(getMyAnimeListStats()).rejects.toThrow('Failed to fetch MyAnimeList stats');
    });

    it('getMyDramaListStats fetches data successfully', async () => {
        const mockData = { completed: 205, planToWatch: 237 };
        mockSuccessResponse(mockData);

        const result = await getMyDramaListStats();
        expect(result).toEqual(mockData);
        expect(fetch).toHaveBeenCalledWith('/api/mydramalist', { method: 'GET' });
    });

    it('getMyDramaListStats throws error when fetch is not ok', async () => {
        mockErrorResponse();
        await expect(getMyDramaListStats()).rejects.toThrow('Failed to fetch MyDramaList stats');
    });

    it('getGamesList fetches data successfully', async () => {
        const mockData = { backlog: [{ title: 'Game 1' }], played: [{ title: 'Game 2' }] };
        mockSuccessResponse(mockData);

        const result = await getGamesList();
        expect(result).toEqual(mockData);
        expect(fetch).toHaveBeenCalledWith('/api/games', { method: 'GET' });
    });

    it('getGamesList throws error when fetch is not ok', async () => {
        mockErrorResponse();
        await expect(getGamesList()).rejects.toThrow('Failed to fetch games list');
    });

    it('getAnimeList fetches data successfully', async () => {
        const mockData = { planToWatch: [{ id: 1, title: 'Anime 1' }], completed: [{ id: 2, title: 'Anime 2' }] };
        mockSuccessResponse(mockData);

        const result = await getAnimeList();
        expect(result).toEqual(mockData);
        expect(fetch).toHaveBeenCalledWith('/api/anime', { method: 'GET' });
    });

    it('getAnimeList throws error when fetch is not ok', async () => {
        mockErrorResponse();
        await expect(getAnimeList()).rejects.toThrow('Failed to fetch anime list');
    });

    it('getDramaList fetches data successfully', async () => {
        const mockData = { planToWatch: [{ title: 'Drama 1' }], completed: [{ title: 'Drama 2' }] };
        mockSuccessResponse(mockData);

        const result = await getDramaList();
        expect(result).toEqual(mockData);
        expect(fetch).toHaveBeenCalledWith('/api/dramas', { method: 'GET' });
    });

    it('getDramaList throws error when fetch is not ok', async () => {
        mockErrorResponse();
        await expect(getDramaList()).rejects.toThrow('Failed to fetch drama list');
    });
});
