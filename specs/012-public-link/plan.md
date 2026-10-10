# Implementation Plan: Public link

**Spec**: [spec.md](spec.md) | **Data**: [data-model.md](data-model.md) | **Contract**: [contracts/api.md](contracts/api.md)

## Summary

A board gets an optional random token. Routes under `/api/public/{token}` are open at the gate and can only read. The web app serves `/p/{token}` as a page of its own that reuses the canvas view-only, without a socket in slice 1.

## Structure

```text
backend/app/domain/public.py       PublicLinks (token on and off, lookup, request budget), the guest's board view
backend/app/api/public.py          the three guest routes
backend/app/api/gate.py            /api/public/ is open
backend/app/api/boards.py          PUT /boards/{id}/public; members answer carries the link state
frontend/src/api/public.ts         guest calls, reading the token from the path
frontend/src/public/PublicBoard.tsx the guest page and its bar
frontend/src/canvas/Canvas.tsx     BoardCanvas takes `guest`: no socket, no people, no timer alerts
frontend/src/board/ShareDialog.tsx "Anyone with the link can view"
frontend/src/settings/sections/Sharing.tsx  the admin's switch
frontend/nginx.conf.template       /p/ with noindex and no-referrer
```

## Decisions

- **Guest routes take no dependency on a person.** They read the board through `PublicLinks.find`, never through `Members`, and never call `deps.provider`, which would need a session.
- **Tasks for a guest come only from the cache that belongs to nobody.** With the demo tracker that is the shared cache and the demo provider. With Jira the routes build `private` tasks from the keys in the document and never read a person's cache.
- **Slice 1 has no guest socket.** The page reads the board once, asks `/version` every 5 s and reads the board again when the number changes; a 404 there shows "This board is not available." This meets "within 5 s" for both a change and a dead link. Slice 2 replaces the poll with a read-only socket.
- **The limit is per link.** nginx and the platform edge sit in front of the API, so a client address is not known without trusting `X-Forwarded-For`. A budget per token keeps one popular link from taking the instance down and needs no address.
- **The real board id never reaches a guest.** The web app keys the guest's viewport and recent search by `public:{token}`.
- **`BoardCanvas` is shared, not copied.** A `guest` prop turns the socket off in `useLiveBoard`, points `useRefresh` at the guest route and leaves out timer alerts; the existing view-only mode does the rest.

## Slices

| Branch | Story | Done when |
|---|---|---|
| `feat/public-link` | US1 | an owner turns the link on in Share, a clean browser opens it view-only, a change shows within 5 s, a link turned off shows "This board is not available.", an admin can switch public links off |
| `feat/public-live` | US2 | the guest page is fed by a read-only socket without presence, with its own connection limit |

## Risks

| Risk | Answer |
|---|---|
| Task data leaks through a public board | guest routes never touch a person's cache; byte test on a Jira-backed board |
| A token opens something else | access matrix: token in a cookie, header or query on other routes changes nothing |
| A popular link overloads the instance | budget per link; `/version` is one indexed read |
| A link in a referrer | `Referrer-Policy: no-referrer` on `/p/`, `rel="noreferrer"` on tracker links |
