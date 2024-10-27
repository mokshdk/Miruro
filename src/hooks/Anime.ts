// @ts-ignore
import { Genres, ANIME, META, StreamingServers } from '@consumet/extensions';
import axios from 'axios';
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
  const anilist = generateAnilistMeta();

  // Validate genres
  if (params.genres) {
    JSON.parse(params.genres as string).forEach((genre: string) => {
      if (!Object.values(Genres).includes(genre as Genres)) {
        return {
          error: `${genre} is not a valid genre`,
        };
      }
    });
    params.genres = JSON.parse(params.genres as string);
  }

  // Validate sort
  if (params.sort) {
    if (typeof params.sort === 'string') {
      params.sort = JSON.parse(params.sort as string);
    }
  }

  // Validate season
  if (
    params.season &&
    !['WINTER', 'SPRING', 'SUMMER', 'FALL'].includes(params.season)
  ) {
    return {
      error: `${params.season} is not a valid season`,
    };
  }

  const data = await anilist.advancedSearch(
    params.query,
    params.type,
    params.page,
    params.perPage,
    params.format,
    params.sort as string[],
    params.genres as string[],
    params.id,
    params.year,
    params.status,
    params.season,
  );

  return {
    data: data,
  };
};

// anime data
export async function AnimeData(params: { id?: string }) {
  if (!params.id) {
    return { error: 'Anime ID is required' };
  }
  const anilist = generateAnilistMeta();
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
  let anilist = generateAnilistMeta();
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

  const anilist = generateAnilistMeta();
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

    let anilist = generateAnilistMeta();
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
  let anilist = generateAnilistMeta();

  const data = await anilist.fetchEpisodeServers(params.id);

  return { data: data };
}

// Anime Watch
export async function AnimeWatch(params: {
  episodeId?: string;
  server?: StreamingServers;
}) {
  if (!params.episodeId) {
    return { error: 'Episode ID is required' };
  }

  if (
    params.server &&
    !Object.values(StreamingServers).includes(params.server)
  ) {
    return {
      error: 'Invalid server',
    };
  }

  let anilist = generateAnilistMeta();
  try {
    const data = await anilist.fetchEpisodeSources(
      params.episodeId,
      params.server,
    );

    return {
      data: data,
    };
  } catch (err) {
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

  const anilist = generateAnilistMeta();

  const data = await anilist.fetchRecentEpisodes(
    'gogoanime',
    params.page,
    params.perPage,
  );
  return { data: data };
}

// Helpers

// Mal : Anilist Id to Gogo
export async function MalSyncAnilistGogo(params: {
  AnimeID?: string;
  dub?: Boolean;
}) {
  try {
    if (!params?.AnimeID) {
      return { error: 'Anime ID is required' };
    }

    if (!params?.dub) {
      params.dub = false;
    }

    const { data } = await axios.get(
      `https://hq.as2anime.com/anilist$${params?.AnimeID}`,
    );

    if (!data?.Sites?.Gogoanime) {
      return { error: 'No episode found in Gogoanime' };
    }

    const gogoanimeIdentifiers = Object.keys(data.Sites.Gogoanime);
    const identifier = gogoanimeIdentifiers.find((id) =>
      params.dub ? id.endsWith('dub') : !id.endsWith('dub'),
    );

    if (!identifier) {
      return { error: `No ${params.dub ? 'dub' : 'sub'} version found` };
    }

    return {
      data: identifier,
    };
  } catch (err) {
    return {
      error: 'Anime Not Found',
    };
  }
}

// Constructor
const generateAnilistMeta = () => {
  return new META.Anilist(new ANIME.Gogoanime());
};
