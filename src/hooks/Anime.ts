// @ts-ignore
import { Genres, ANIME, META, StreamingServers } from '@consumet/extensions';
const GogoAnime = new ANIME.Gogoanime();
const anilist = new META.Anilist(GogoAnime);
// advance search

export const advancedSearch = async (params: {
  query?: string;
  page?: number;
  perPage?: number;
  genres?: string | string[];
  sort?: string | string[];
  type?: string;
  id?: string;
  format?: string;
  status?: string;
  year?: number;
  season?: string;
}) => {
  try {
    let {
      query = '',
      page = 1,
      perPage = 16,
      type,
      genres,
      id,
      format,
      sort,
      status,
      year,
      season,
    } = params;

    // Validate genres
    if (genres) {
      JSON.parse(genres as string).forEach((genre: string) => {
        if (!Object.values(Genres).includes(genre as Genres)) {
          return {
            error: `${genre} is not a valid genre`,
          };
        }
      });
      genres = JSON.parse(genres as string);
    }

    // Validate sort
    if (sort) {
      sort = JSON.parse(sort as string);
    }

    // Validate season
    if (season && !['WINTER', 'SPRING', 'SUMMER', 'FALL'].includes(season)) {
      return {
        error: `${season} is not a valid season`,
      };
    }

    const data = await anilist.advancedSearch(
      query,
      type,
      page,
      perPage,
      format,
      sort as string[],
      genres as string[],
      id,
      year,
      status,
      season,
    );

    return {
      data: data,
    };
  } catch (err) {
    console.log(err);
  }
};

// anime data
export async function AnimeData(params: { id?: string }) {
  if (!params.id) {
    return { error: 'Anime ID is required' };
  }
  const data = await anilist.fetchAnilistInfoById(params?.id);
  return {
    data: data,
  };
}

// Anime info
export async function AnimeInfo(params: { id?: string }) {
  if (!params.id) {
    return { error: 'Anime ID is required' };
  }
  const data = await anilist.fetchAnimeInfo(params.id, false, false);
  return { data: data };
}

// Trending
export async function Trending(params: { page?: number; perPage?: number }) {
  if (!params.page) {
    params.page = 1;
  }
  if (!params.perPage) {
    params.perPage = 16;
  }

  const data = await anilist.fetchTrendingAnime(params.page, params.perPage);

  return {
    data: data,
  };
}

// Get Episodes
export async function AnimeEpisodes(params: { id?: string; dub?: boolean }) {
  try {
    if (!params.id) {
      return { error: 'Anime ID is required' };
    }

    const dub = params.dub || false;

    const data = await anilist.fetchEpisodesListById(params.id, dub, false);

    return {
      data: data,
    };
  } catch (err) {
    return {
      error: 'Anime not found',
    };
  }
}

// Get Episode Servers
export async function AnimeServers(params: { id?: string }) {
  if (!params.id) {
    return { error: 'Anime ID is required' };
  }

  const data = await anilist.fetchEpisodeServers(params.id);

  return { data: data };
}

// Anime Watch
export async function AnimeWatch(params: { episodeId?: string }) {
  if (!params.episodeId) {
    return { error: 'Episode ID is required' };
  }

  console.log(params.episodeId);

  try {
    const data = await GogoAnime.fetchEpisodeSources(params.episodeId);
    console.log(data);
    return {
      data: data,
    };
  } catch (err) {
    console.log(err);
    return {
      error: 'Something went wrong. Contact developer for help.',
    };
  }
}

// Recent Anime Episodes
export async function AnimeRecentEpisodes(params: {
  page?: number;
  perPage?: number;
}) {
  if (!params.page) {
    params.page = 1;
  }
  if (!params.perPage) {
    params.perPage = 16;
  }

  const data = await anilist.fetchRecentEpisodes(
    'gogoanime',
    params.page,
    params.perPage,
  );
  return { data: data };
}
