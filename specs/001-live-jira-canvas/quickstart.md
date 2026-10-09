# Quickstart validation: Live Jira Canvas (MVP)

## Prerequisites

Docker with Compose. Optional: a Jira DC instance and a personal access token.

## Run without keys (demo)

```bash
cp .env.example .env
docker compose up --build
make smoke
```

Expected: smoke passes the core scenario on the demo provider ([contract](contracts/api.md)):

1. `POST /api/boards` creates a board.
2. `POST /api/tasks/resolve {"ref": "DEMO-1"}` and `{"ref": "https://jira.example.com/browse/DEMO-2"}` return tasks.
3. `PUT /api/boards/{id}` saves a doc with two cards, a frame containing one card, a sticky and an edge; `GET` returns it unchanged.
4. `PUT /api/demo/tasks/DEMO-1/status {"status": "Done"}`, then `POST /api/boards/{id}/refresh` returns `DEMO-1` with `status_category: "done"`.
5. No response body contains the token string.

## Manual check in the browser

Open `http://localhost:3000`, create a board, add `DEMO-1` with the Jira card tool, drag it into a frame, reload: same layout. Change its status through the demo endpoint: the card is struck through within 30 s.

## Large board (300 cards)

`docker compose exec -T api python - < scripts/bench_board.py` creates a "bench 300" board: 10 frames, 300 demo cards. Open the printed link and check by hand:

- the board is interactive in under 3 s after a hard reload (DevTools → Performance, or a stopwatch);
- panning and zooming across all frames stays smooth, and dragging a frame moves its 30 cards together.

Delete the board from the board menu afterwards.

## With real Jira DC

1. Set `TIKO_SECRET_KEY` in `.env` (`openssl rand -base64 32`), restart.
2. Settings → provider `jira`, base URL, PAT → "Test connection" shows your name.
3. Add a real key, change its status in Jira: the board shows it within 60 s.

## Checks

```bash
make check      # lint + tests, includes the token-leak test
make licenses   # httpx, cryptography, @xyflow/react are permissive
```
