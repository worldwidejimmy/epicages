# Architecture Notes - State Persistence

## Current Architecture

The game currently uses a **single shared world state** stored in server memory:

- One `world` object in `prod-server.js` that all clients connect to
- State is lost when the server restarts
- All players interact with the same world instance
- No persistence layer - state exists only in memory

## Future State Persistence Options

### Option A: Per-Game State with 6-Digit Codes

**Design:**
- Users can create new games or join existing games with a 6-digit alphanumeric code
- Each game has its own world state stored in database/memory
- Games can be resumed by code after server restart
- Multiple games can run concurrently

**Implementation considerations:**
- Add `gameId: string` field to `World` type
- Database schema: `games` table with columns:
  - `id` (6-char alphanumeric primary key)
  - `world_state` (JSON/text)
  - `created_at`, `updated_at`, `last_activity`
- Game creation/joining flow:
  - Generate unique 6-digit code on creation
  - Store initial world state
  - Route WebSocket connections to correct game instance
- Cleanup: Remove inactive games after timeout (e.g., 7 days)
- API endpoints: `POST /api/games` (create), `GET /api/games/:id` (join)

**Pros:**
- Supports multiple concurrent games
- Games can be shared/resumed
- Clean separation of game instances

**Cons:**
- Database storage grows with active games
- More complex routing logic
- Requires database setup

### Option B: Background Simulation (Games Continue When No Players)

**Design:**
- Games continue running even when no players are connected
- State persists in database
- Players can reconnect to see progress

**Implementation considerations:**
- Same database schema as Option A
- Background worker/scheduler to update games periodically
- Player connection tracking to determine if game should continue
- Periodic cleanup of old/unused games

**Pros:**
- Games progress even when players are offline
- More realistic simulation
- Players can check back later

**Cons:**
- Higher database usage (more frequent updates)
- Background processing overhead
- Storage grows faster than Option A

### Option C: Hybrid - Only Persist Significant Games

**Design:**
- Only save games that have progressed significantly (e.g., past early game)
- Temporary games (quick tests) are not persisted
- Games with multiple players are more likely to be saved

**Implementation considerations:**
- Criteria for persistence:
  - Game age (e.g., > 1 hour)
  - Player count (e.g., > 1 player at some point)
  - World progress (e.g., tick count, tech level)
- Auto-save on milestones (era changes, significant events)
- Manual save option for players

**Pros:**
- Reduces database size
- Focuses storage on meaningful games
- Flexible criteria

**Cons:**
- More complex logic to determine what to save
- Risk of losing games players care about
- Harder to predict what gets saved

## Implementation Considerations

### Database Schema (Example)

```sql
CREATE TABLE games (
  id VARCHAR(6) PRIMARY KEY,
  world_state JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_activity TIMESTAMP NOT NULL DEFAULT NOW(),
  player_count INT DEFAULT 0
);

CREATE INDEX idx_games_last_activity ON games(last_activity);
CREATE INDEX idx_games_created_at ON games(created_at);
```

### State Serialization

- Serialize `World` object to JSON for storage
- Deserialize on game load
- Handle migration if world structure changes
- Consider compression for large worlds

### Game Creation/Joining Flow

1. **Create Game:**
   - Generate unique 6-digit code
   - Create initial world state
   - Store in database
   - Return code to client

2. **Join Game:**
   - Client sends game code
   - Server loads world state from database
   - Create/attach to game instance
   - Send snapshot to client

3. **Reconnection:**
   - Store session/game mapping
   - Reconnect to same game on WebSocket reconnect

### Routing

- WebSocket connections need game context
- Options:
  - URL path: `wss://domain.com/ws/:gameId`
  - Query parameter: `wss://domain.com/ws?gameId=ABC123`
  - First message: Client sends game ID in initial message

### Cleanup Strategy

- Periodic job to remove old games:
  - Last activity > 7 days AND player count = 0
  - Created > 30 days ago (regardless of activity)
- Option to "delete" games manually
- Archive old games instead of deleting (optional)

## Decision

**Defer implementation** - Keep current single-world architecture for now.

**Rationale:**
- Current architecture is simple and works for MVP
- State persistence adds complexity (database, routing, cleanup)
- Can be added later when needed
- Focus on gameplay features first

**When to Revisit:**
- When multiple concurrent games are needed
- When players request game saving/resume
- When scaling requires distributed state
- When implementing multiplayer features
