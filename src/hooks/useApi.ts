import {
  advancedSearch,
  AnimeData,
  AnimeInfo,
  Trending,
  AnimeEpisodes,
  AnimeServers,
  AnimeWatch,
  AnimeRecentEpisodes,
} from './Anime';
import { year, getCurrentSeason, getNextSeason } from '../index';
import axios from 'axios';

// Utility function to ensure URL ends with a slash
function ensureUrlEndsWithSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`;
}

const SKIP_TIMES = ensureUrlEndsWithSlash(
  import.meta.env.VITE_SKIP_TIMES as string,
);

// Function to handle errors and throw appropriately
function handleError(error: any) {
  let errorMessage = 'An error occurred';

  if (error.message && error.message.includes('Access-Control-Allow-Origin')) {
    errorMessage = 'A CORS error occurred';
  } else if (error.message) {
    errorMessage += `: ${error.message}`;
  }

  console.error(`${errorMessage}`, error);
  throw new Error(errorMessage);
}

// Cache key generator
// Function to generate cache key from arguments
function generateCacheKey(...args: string[]) {
  return args.join('-');
}

interface CacheItem {
  value: any; // Replace 'any' with a more specific type if possible
  timestamp: number;
}

// Session storage cache creation
// Function to create a cache in session storage
function createOptimizedSessionStorageCache(
  maxSize: number,
  maxAge: number,
  cacheKey: string,
) {
  const cache = new Map<string, CacheItem>(
    JSON.parse(sessionStorage.getItem(cacheKey) || '[]'),
  );
  const keys = new Set<string>(cache.keys());

  function isItemExpired(item: CacheItem) {
    return Date.now() - item.timestamp > maxAge;
  }

  function updateSessionStorage() {
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify(Array.from(cache.entries())),
    );
  }

  return {
    get(key: string) {
      if (cache.has(key)) {
        const item = cache.get(key);
        if (!isItemExpired(item!)) {
          keys.delete(key);
          keys.add(key);
          return item!.value;
        }
        cache.delete(key);
        keys.delete(key);
      }
      return undefined;
    },
    set(key: string, value: any) {
      if (cache.size >= maxSize) {
        const oldestKey = keys.values().next().value;
        if (oldestKey) {
          cache.delete(oldestKey);
          keys.delete(oldestKey);
        }
      }
      keys.add(key);
      cache.set(key, { value, timestamp: Date.now() });
      updateSessionStorage();
    },
  };
}

// Constants for cache configuration
// Cache size and max age constants
const CACHE_SIZE = 20;
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Factory function for cache creation
// Function to create cache with given cache key
function createCache(cacheKey: string) {
  return createOptimizedSessionStorageCache(
    CACHE_SIZE,
    CACHE_MAX_AGE,
    cacheKey,
  );
}

interface FetchOptions {
  type?: string;
  season?: string;
  format?: string;
  sort?: string[];
  genres?: string[];
  id?: string;
  year?: string;
  status?: string;
}

// Individual caches for different types of data
// Creating caches for anime data, anime info, and video sources
const advancedSearchCache = createCache('Advanced Search');
const animeDataCache = createCache('Data');
const animeInfoCache = createCache('Info');
const animeEpisodesCache = createCache('Episodes');
const fetchAnimeEmbeddedEpisodesCache = createCache('Video Embedded Sources');
const videoSourcesCache = createCache('Video Sources');

// Fetch data from proxy with caching
// Function to fetch data from proxy with caching
async function fetchFromProxy(
  functionName: string,
  parameters: any,
  cache: any,
  cacheKey: string,
) {
  try {
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    let response: any;
    try {
      switch (functionName) {
        case 'AdvancedSearch':
          response = await advancedSearch(parameters);
          break;
        case 'animedata':
          response = await AnimeData(parameters);
          break;
        case 'animeinfo':
          response = await AnimeInfo(parameters);
          break;
        case 'animetrending':
          response = await Trending(parameters);
          break;
        case 'animeepisodes':
          response = await AnimeEpisodes(parameters);
          break;
        case 'animeservers':
          response = await AnimeServers(parameters);
          break;
        case 'animewatch':
          response = await AnimeWatch(parameters);
          break;
        case 'animerecentepisodes':
          response = await AnimeRecentEpisodes(parameters);
          break;
      }
    } catch (err) {
      console.log(err);
    }

    if (!response || !response?.data) {
      const errorMessage = 'Unknown server error';
      throw new Error(`Server error: ${errorMessage}`);
    } else if (response && response?.error) {
      throw new Error(`${response?.error}`);
    }

    cache.set(cacheKey, response.data);

    return response.data;
  } catch (error) {
    handleError(error);
    throw error;
  }
}

// Function to fetch anime data
export async function fetchAdvancedSearch(
  searchQuery: string = '',
  page: number = 1,
  perPage: number = 20,
  options: FetchOptions = {},
) {
  const searchParams = {
    ...(searchQuery && { query: searchQuery }),
    page: page.toString(),
    perPage: perPage.toString(),
    type: options.type ?? 'ANIME',
    ...(options.season && { season: options.season }),
    ...(options.format && { format: options.format }),
    ...(options.id && { id: options.id }),
    ...(options.year && { year: options.year }),
    ...(options.status && { status: options.status }),
    ...(options.sort && { sort: JSON.stringify(options.sort) }),
  };

  const queryParams = new URLSearchParams(searchParams);

  if (options.genres && options.genres.length > 0) {
    // Correctly encode genres as a JSON array
    queryParams.set('genres', JSON.stringify(options.genres));
  }

  const cacheKey = generateCacheKey('advancedSearch', queryParams.toString());

  return fetchFromProxy(
    'AdvancedSearch',
    searchParams,
    advancedSearchCache,
    cacheKey,
  );
}

// Fetch Anime DATA Function
export async function fetchAnimeData(
  animeId: string,
  provider: string = 'gogoanime',
) {
  const cacheKey = generateCacheKey('animeData', animeId, provider);

  return fetchFromProxy('animedata', { id: animeId }, animeDataCache, cacheKey);
}

// Fetch Anime INFO Function
export async function fetchAnimeInfo(
  animeId: string,
  provider: string = 'gogoanime',
) {
  const cacheKey = generateCacheKey('animeInfo', animeId, provider);

  return fetchFromProxy('animeinfo', { id: animeId }, animeInfoCache, cacheKey);
}

// Function to fetch list of anime based on type (TopRated, Trending, Popular)
async function fetchList(type: string, page: number = 1, perPage: number = 16) {
  let cacheKey: string;

  if (
    ['TopRated', 'Trending', 'Popular', 'TopAiring', 'Upcoming'].includes(type)
  ) {
    // creating cache
    cacheKey = generateCacheKey(
      `${type}Anime`,
      page.toString(),
      perPage.toString(),
    );
    const specificCache = createCache(`${type}`);

    // top rated
    if (type === 'TopRated') {
      return await fetchFromProxy(
        'AdvancedSearch',
        {
          type: 'ANIME',
          sort: ['["SCORE_DESC"]'],
          page: page,
          perPage: perPage,
        },
        specificCache,
        cacheKey,
      );
    } else if (type === 'Trending') {
      return await fetchFromProxy(
        'animetrending',
        {
          page: page,
          perPage: perPage,
        },
        specificCache,
        cacheKey,
      );
    } else if (type === 'Popular') {
      return await fetchFromProxy(
        'AdvancedSearch',
        {
          type: 'ANIME',
          sort: ['["POPULARITY_DESC"]'],
          page: page,
          perPage: perPage,
        },
        specificCache,
        cacheKey,
      );
    } else if (type === 'TopAiring') {
      const season = getCurrentSeason();
      return await fetchFromProxy(
        'AdvancedSearch',
        {
          sort: ['["POPULARITY_DESC"]'],
          type: 'ANIME',
          status: 'RELEASING',
          season: season,
          year: year.toString(),
          page: page,
          perPage: perPage,
        },
        specificCache,
        cacheKey,
      );
    } else if (type === 'Upcoming') {
      const season = getCurrentSeason();
      return await fetchFromProxy(
        'AdvancedSearch',
        {
          type: 'ANIME',
          season: season,
          year: year.toString(),
          status: 'NOT_YET_RELEASED',
          sort: ['["POPULARITY_DESC"]'],
          page: page,
          perPage: perPage,
        },
        specificCache,
        cacheKey,
      );
    } else {
      console.log(`${type}: Not found "fetchlist" function`);
      return {
        error: `${type}: Not found "fetchlist" function`,
      };
    }
  }
}

// Functions to fetch top, trending, and popular anime
export const fetchTopAnime = (page: number, perPage: number) =>
  fetchList('TopRated', page, perPage);
export const fetchTrendingAnime = (page: number, perPage: number) =>
  fetchList('Trending', page, perPage);
export const fetchPopularAnime = (page: number, perPage: number) =>
  fetchList('Popular', page, perPage);
export const fetchTopAiringAnime = (page: number, perPage: number) =>
  fetchList('TopAiring', page, perPage);
export const fetchUpcomingSeasons = (page: number, perPage: number) =>
  fetchList('Upcoming', page, perPage);

// Fetch Anime Episodes Function
export async function fetchAnimeEpisodes(
  animeId: string,
  provider: string = 'gogoanime',
  dub: boolean = false,
) {
  const cacheKey = generateCacheKey(
    'animeEpisodes',
    animeId,
    provider,
    dub ? 'dub' : 'sub',
  );

  return fetchFromProxy(
    'animeepisodes',
    {
      id: animeId,
      dub: dub,
    },
    animeEpisodesCache,
    cacheKey,
  );
}

// Fetch Embedded Anime Episodes Servers
export async function fetchAnimeEmbeddedEpisodes(episodeId: string) {
  const cacheKey = generateCacheKey('animeEmbeddedServers', episodeId);

  return fetchFromProxy(
    'animeservers',
    { id: episodeId },
    fetchAnimeEmbeddedEpisodesCache,
    cacheKey,
  );
}

// Function to fetch anime streaming links
export async function fetchAnimeStreamingLinks(episodeId: string) {
  const cacheKey = generateCacheKey('animeStreamingLinks', episodeId);

  return fetchFromProxy(
    'animewatch',
    { episodeId: episodeId },
    videoSourcesCache,
    cacheKey,
  );
}

// Function to fetch skip times for an anime episode
interface FetchSkipTimesParams {
  malId: string;
  episodeNumber: string;
  episodeLength?: string;
}

// Function to fetch skip times for an anime episode
export async function fetchSkipTimes({
  malId,
  episodeNumber,
  episodeLength = '0',
}: FetchSkipTimesParams) {
  const types = ['ed', 'mixed-ed', 'mixed-op', 'op', 'recap'];

  const url = new URL(`${SKIP_TIMES}v2/skip-times/${malId}/${episodeNumber}`);

  url.searchParams.append('episodeLength', episodeLength.toString());

  types.forEach((type) => url.searchParams.append('types[]', type));

  const cacheKey = generateCacheKey(
    'skipTimes',
    malId,
    episodeNumber,
    episodeLength || '',
  );

  const cache = createCache('SkipTimes');

  const cachedResponse = cache.get(cacheKey);
  if (cachedResponse) {
    return cachedResponse;
  }

  let response: any;
  try {
    response = await axios.get(`${url.toString()}`, {
      headers: {
        'user-agent:':
          'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
      },
    });
  } catch (err) {
    return handleError(
      `Server error: ${
        response.data.statusCode || response.status
      } Unknown server error`,
    );
  }

  if (
    response.status !== 200 ||
    (response.data.statusCode && response.data.statusCode >= 400)
  ) {
    const errorMessage = response.data.message || 'Unknown server error';
    return handleError(
      `Server error: ${
        response.data.statusCode || response.status
      } ${errorMessage}`,
    );
  }

  cache.set(cacheKey, response.data);

  return response.data;
}

// Fetch Recent Anime Episodes Function
export async function fetchRecentEpisodes(
  page: number = 1,
  perPage: number = 18,
  provider: string = 'gogoanime',
) {
  const cacheKey = generateCacheKey(
    'recentEpisodes',
    page.toString(),
    perPage.toString(),
    provider,
  );

  return fetchFromProxy(
    'animerecentepisodes',
    { page: page, perPage: perPage },
    createCache('RecentEpisodes'),
    cacheKey,
  );
}
