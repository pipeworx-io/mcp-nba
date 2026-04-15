interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * NBA MCP — player, team, and game data via the BallDontLie API
 *
 * Tools:
 * - search_players: Search NBA players by name
 * - get_player: Get a single player by ID
 * - get_teams: List all NBA teams
 * - get_games: Get games for a season
 *
 * Note: BallDontLie requires an API key for access. Pass it via the
 * BALLDONTLIE_API_KEY environment variable or as the api_key argument.
 */


const BASE_URL = 'https://api.balldontlie.io/v1';

// --- Raw API types ---

type RawPlayer = {
  id: number;
  first_name: string;
  last_name: string;
  position?: string | null;
  height?: string | null;
  weight?: string | null;
  jersey_number?: string | null;
  college?: string | null;
  country?: string | null;
  draft_year?: number | null;
  draft_round?: number | null;
  draft_number?: number | null;
  team?: RawTeam | null;
};

type RawTeam = {
  id: number;
  conference: string;
  division: string;
  city: string;
  name: string;
  full_name: string;
  abbreviation: string;
};

type RawGame = {
  id: number;
  date: string;
  season: number;
  status: string;
  period?: number | null;
  time?: string | null;
  postseason: boolean;
  home_team_score: number;
  visitor_team_score: number;
  home_team: RawTeam;
  visitor_team: RawTeam;
};

type PaginatedResponse<T> = {
  data: T[];
  meta?: {
    total_pages?: number;
    current_page?: number;
    next_page?: number | null;
    per_page?: number;
    total_count?: number;
  };
};

// --- Helpers ---

function getApiKey(): string | null {
  // Try environment variable (available in Cloudflare Workers via bindings)
  if (typeof globalThis !== 'undefined') {
    const g = globalThis as Record<string, unknown>;
    if (typeof g['BALLDONTLIE_API_KEY'] === 'string') return g['BALLDONTLIE_API_KEY'];
  }
  return null;
}

function buildHeaders(): HeadersInit {
  const key = getApiKey();
  return key ? { Authorization: key } : {};
}

// --- Formatters ---

function formatPlayer(p: RawPlayer) {
  return {
    id: p.id,
    name: `${p.first_name} ${p.last_name}`,
    position: p.position ?? null,
    height: p.height ?? null,
    weight: p.weight ?? null,
    jersey_number: p.jersey_number ?? null,
    college: p.college ?? null,
    country: p.country ?? null,
    draft_year: p.draft_year ?? null,
    draft_round: p.draft_round ?? null,
    draft_number: p.draft_number ?? null,
    team: p.team ? formatTeam(p.team) : null,
  };
}

function formatTeam(t: RawTeam) {
  return {
    id: t.id,
    full_name: t.full_name,
    abbreviation: t.abbreviation,
    city: t.city,
    name: t.name,
    conference: t.conference,
    division: t.division,
  };
}

function formatGame(g: RawGame) {
  return {
    id: g.id,
    date: g.date,
    season: g.season,
    status: g.status,
    period: g.period ?? null,
    time: g.time ?? null,
    postseason: g.postseason,
    home_team: g.home_team.full_name,
    home_score: g.home_team_score,
    visitor_team: g.visitor_team.full_name,
    visitor_score: g.visitor_team_score,
  };
}

// --- Tool definitions ---

const tools: McpToolExport['tools'] = [
  {
    name: 'search_players',
    description:
      'Search NBA players by name. Returns player profile including position, height, weight, college, and current team.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Player name or partial name to search for' },
        limit: { type: 'number', description: 'Number of results to return (default: 10, max: 100)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_player',
    description:
      'Get detailed profile for a single NBA player by their BallDontLie player ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'BallDontLie player ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_teams',
    description:
      'List all 30 NBA teams with their full names, abbreviations, conference, and division.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_games',
    description:
      'Get NBA games for a given season. Returns game date, status, teams, and scores.',
    inputSchema: {
      type: 'object',
      properties: {
        season: {
          type: 'number',
          description: 'Season start year (e.g., 2024 for the 2024-25 season)',
        },
        limit: { type: 'number', description: 'Number of results to return (default: 25, max: 100)' },
      },
      required: ['season'],
    },
  },
];

// --- callTool dispatcher ---

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'search_players':
      return searchPlayers(args.query as string, (args.limit as number) ?? 10);
    case 'get_player':
      return getPlayer(args.id as number);
    case 'get_teams':
      return getTeams();
    case 'get_games':
      return getGames(args.season as number, (args.limit as number) ?? 25);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// --- Tool implementations ---

async function searchPlayers(query: string, limit: number) {
  const perPage = Math.min(Math.max(1, limit), 100);
  const params = new URLSearchParams({
    search: query,
    per_page: String(perPage),
  });

  const res = await fetch(`${BASE_URL}/players?${params}`, { headers: buildHeaders() });
  if (!res.ok) throw new Error(`BallDontLie API error: ${res.status}`);

  const data = (await res.json()) as PaginatedResponse<RawPlayer>;

  return {
    query,
    total: data.meta?.total_count ?? data.data.length,
    returned: data.data.length,
    players: data.data.map(formatPlayer),
  };
}

async function getPlayer(id: number) {
  const res = await fetch(`${BASE_URL}/players/${id}`, { headers: buildHeaders() });
  if (!res.ok) throw new Error(`BallDontLie API error: ${res.status}`);

  const data = (await res.json()) as { data: RawPlayer };
  return formatPlayer(data.data);
}

async function getTeams() {
  const res = await fetch(`${BASE_URL}/teams`, { headers: buildHeaders() });
  if (!res.ok) throw new Error(`BallDontLie API error: ${res.status}`);

  const data = (await res.json()) as PaginatedResponse<RawTeam>;

  return {
    total: data.data.length,
    teams: data.data.map(formatTeam),
  };
}

async function getGames(season: number, limit: number) {
  const perPage = Math.min(Math.max(1, limit), 100);
  const params = new URLSearchParams({
    'seasons[]': String(season),
    per_page: String(perPage),
  });

  const res = await fetch(`${BASE_URL}/games?${params}`, { headers: buildHeaders() });
  if (!res.ok) throw new Error(`BallDontLie API error: ${res.status}`);

  const data = (await res.json()) as PaginatedResponse<RawGame>;

  return {
    season,
    total: data.meta?.total_count ?? data.data.length,
    returned: data.data.length,
    games: data.data.map(formatGame),
  };
}

export default { tools, callTool } satisfies McpToolExport;
