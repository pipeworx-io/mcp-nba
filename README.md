# mcp-nba

NBA MCP — player, team, and game data via the BallDontLie API

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `search_players` | "Find NBA player [name]" / "search NBA roster for [X]" / "is [player] in the NBA" — search NBA players by name on BallDontLie. Returns position, height, weight, college, country, draft info, and current team. NOTE: per-season averages (PPG/RPG/APG) and career stats are NOT in this response — those require BallDontLie's ALL-STAR tier ($9.99/mo at https://www.balldontlie.io/) via the /season_averages endpoint, which is not currently exposed by Pipeworx. Free-tier _apiKey works for this tool. |
| `get_player` | Direct lookup of a single NBA player by BallDontLie ID. ⚠️ TIER-GATED: the /players/{id} endpoint requires the ALL-STAR tier ($9.99/mo) or higher; free-tier _apiKey gets a 403 with "No approval received". search_players covers the same player metadata (name/position/height/weight/team) on the free tier, so prefer that unless you already have a paid BallDontLie key. |
| `get_teams` | Get all 30 NBA teams with full names, abbreviations, conference, and division. Use to find team info or prepare for get_games queries. Requires a free BallDontLie API key. |
| `get_games` | Get NBA games for a season (e.g., 2023, 2024). Returns game date, status, matchup teams, and final or live scores. Requires a free BallDontLie API key. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "nba": {
      "url": "https://gateway.pipeworx.io/nba/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/nba/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Nba data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
