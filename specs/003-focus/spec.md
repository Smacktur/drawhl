# Feature Specification: Focus timer and music

**Feature Branch**: `003-focus`

**Created**: 2026-10-07

**Status**: Approved

**Input**: User description: "A pomodoro timer on the board: 25/5, a sound or a notification at the end. Background lofi music right in tiko, next to the timer." Design picked by the owner: a capsule at the top center, a colored dial over a player row, one block with two sections.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Focus in rounds (Priority: P1)

The user starts a 25 minute focus from the capsule at the top of the screen. The digits count down, the dial goes from green through sand and peach to raspberry as the time runs out. At the end they hear a soft chime and get a browser notification, the dial shows a bell, and one click starts a 5 minute break. After 4 rounds the break is 15 minutes. They can pause, resume, reset and skip at any time, and a reload or a closed tab does not lose the countdown.

**Why this priority**: The timer is the feature; music is a companion to it.

**Independent Test**: start focus, pause, resume, reload in the middle: the countdown goes on from the same second. Shorten focus to 1 minute in settings, wait: chime, notification, raspberry dial with a bell; start the break: lavender dial; after the 4th round the break is the long one.

**Acceptance Scenarios**:

1. **Given** an open board, **When** it loads, **Then** the capsule sits at the top center in the idle state: gray, 25:00, four empty round dots.
2. **Given** an idle capsule, **When** the user presses play, **Then** the focus countdown starts and the dial color follows the progress from green to raspberry.
3. **Given** a running phase, **When** the user presses pause, **Then** the countdown stops and the dial turns blue; play resumes from the same second.
4. **Given** a running focus, **When** it ends, **Then** a chime plays (if enabled), a browser notification shows (if enabled and allowed), the dial turns raspberry with a bell and waits for the user, unless "Start the next phase on its own" is on.
5. **Given** a finished focus, **When** the user starts the break, **Then** it is short, or long after every N-th round, and the dial is lavender.
6. **Given** any state, **When** the user hovers the state icon, **Then** a tooltip names the state and the round, e.g. "Focus · round 2 of 4".
7. **Given** a running timer, **When** the page reloads or the tab is closed and opened later, **Then** the state is restored from the stored end time; a phase that ended meanwhile shows as finished.
8. **Given** the settings popover, **When** the user changes focus, short break, long break, rounds, sound, notification or auto start, **Then** the change is kept in the browser and applies from the next phase.

---

### User Story 2 - Background music (Priority: P2)

Under the dial, the player row shows the current track. The user plays and pauses music, skips to the next track, picks one from the list in the settings, sets the volume, and adds their own audio files from disk. Music can pause by itself on breaks.

**Why this priority**: Helps to get into focus, but the timer is useful without it.

**Independent Test**: play music, skip twice, pick the 5th track from the list, change the volume, add a local mp3 and play it; start a break with "Pause music on breaks" on: music stops and comes back with the next focus.

**Acceptance Scenarios**:

1. **Given** the capsule, **When** the user presses play in the player row, **Then** the current track plays and the row shows its title and author; at the end the next track starts, after the last one the first.
2. **Given** the settings popover, **When** the user opens the Music tab, **Then** they see all built-in tracks with duration, the current one marked, volume, "Pause music on breaks", "Add your own tracks" and the credits.
3. **Given** the Music tab, **When** the user adds audio files from disk, **Then** they join the list, play from the browser and are kept in its IndexedDB, so they come back after a reload; nothing is uploaded.
4. **Given** an own track in the list, **When** the user removes it, **Then** it leaves the list and the browser storage.
5. **Given** "Pause music on breaks" on, **When** a break starts, **Then** music pauses and resumes when the next focus starts.

### Edge Cases

- The board changes or no board exists: the capsule stays, the timer is not tied to a board.
- Two tabs open: each shows the same stored state after reload; live sync between tabs is not in scope.
- Notifications denied or unsupported: the notification toggle shows why and the chime still plays.
- Browser storage is full or blocked: an added file still plays until the tab closes, its row says "this tab only", and the Music tab names the file and the cause.
- Browser data is cleared, Safari removes data of a site not opened for 7 days, or tiko is opened on another address: own tracks are gone and must be added again. The Music tab shows how much space own tracks take and whether the browser protects them from automatic cleanup; protection is requested when the first own track is added and needs HTTPS or localhost.
- Browser blocks autoplay: music starts only from a click, which the play button always is.
- Settings out of range are clamped: focus 1–90 min, breaks 1–60 min, rounds 2–8.
- `prefers-reduced-motion`: no gradient drift, no pulse, no popover slide.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A floating capsule at the top center of the screen, 264 px wide, same size in every state.
- **FR-002**: The timer cycles focus → short break → focus … with a long break after every N-th focus; pause, resume, reset, skip.
- **FR-003**: The dial color encodes the state: idle gray, focus green to raspberry by progress, paused blue, finished raspberry, break lavender; same lightness as status lozenges, deep tints in the dark theme.
- **FR-004**: The state is an icon with a tooltip, not text; no other control has a tooltip.
- **FR-005**: The end of a phase plays a chime and shows a browser notification, each optional.
- **FR-006**: Settings and timer state live in the browser (`localStorage`); no backend change.
- **FR-007**: A settings popover centered under the capsule with Timer and Music tabs.
- **FR-008**: Seven built-in CC0 lofi tracks are bundled with the frontend; the user can add local files, kept in the browser's IndexedDB until removed.
- **FR-009**: The capsule can be hidden and shown from the main menu.

### Key Entities

- **Timer settings**: focus, short break, long break minutes, rounds before a long break, sound, notification, auto start.
- **Timer state**: phase (focus, short, long), status (idle, running, paused, finished), end time or remaining time, round.
- **Track**: title, author, duration, source (built-in file or a file kept in IndexedDB).

## Success Criteria *(mandatory)*

- **SC-001**: A user starts their first focus in one click from a fresh board, without docs.
- **SC-002**: The countdown drifts less than 1 s over 25 minutes, including background tabs.
- **SC-003**: The capsule never changes size between states.
- **SC-004**: Built-in music adds at most 20 MB to the repository and needs no network beyond the tiko server.

## Assumptions

- One user per browser; the timer is personal and not part of a board.
- Notification permission is asked when the user turns the toggle on or starts the first focus with it on.

## Out of scope

- Statistics, history of rounds, linking a round to a task.
- Streaming services, internet radio, downloading from music sites.
- Syncing the timer between devices or tabs.
