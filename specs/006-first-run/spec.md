# Feature Specification: First run and polish

**Feature Branch**: `006-first-run`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "Before showing drawhl on Hacker News, Reddit and Product Hunt: a fresh install should open on a board that shows what drawhl can do, not an empty canvas, and the rough edges people hit first should go." Step 4 of the launch plan agreed with the owner on 2026-10-07; the polish items are draft ideas 5, 8 and 10 of the owner's list.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A board to start from (Priority: P1)

Someone runs `docker compose up` for the first time and opens drawhl. Instead of an empty canvas and a "Create a board" form, they land on "Welcome to drawhl": a frame of demo task cards with live statuses, sticky notes that explain what to try, arrows between them, a Gantt with a few bars, a milestone and a dependency, and a timer on one card. Everything is a regular element: they can move it, edit it, delete it or delete the whole board.

**Why this priority**: The first minute decides whether a visitor from a launch post stays; an empty canvas shows nothing of the product.

**Independent Test**: start with an empty `data/` folder, open http://localhost:3000: the board "Welcome to drawhl" is open and shows frames, sticky notes, arrows, DEMO cards with statuses, a Gantt with bars dated around today and a timer. Delete the board and reload: the "Create a board" form shows, no welcome board comes back.

**Acceptance Scenarios**:

1. **Given** a database with no boards that has never been seeded, **When** the boards list is requested, **Then** the server creates "Welcome to drawhl" once and returns it.
2. **Given** the welcome board, **Then** it holds: a "Start here" frame with 3 to 5 sticky notes on what to try (add a card with the Jira card tool, drag cards into a frame, `⌘K` to search, `?` for shortcuts, connect your tracker in Settings); a "This sprint" frame with 5 or 6 DEMO cards, one of them collapsed; arrows between a note and a card and between two cards; a Gantt module next to the frames with 3 DEMO rows, one plain row, a milestone and a dependency, dated from today; a timer attached to one card with a note, going off a day after the board was created.
3. **Given** the welcome board opens, **Then** the viewport fits all its elements, and every element is ordinary: it moves, edits, deletes and undoes like one the user made.
4. **Given** the user deleted the welcome board or every board, **When** the list is requested again, **Then** no board is created and the "Create a board" form shows as today.
5. **Given** an install that already has boards (an upgrade), **Then** no welcome board is added.

---

### User Story 2 - Sticky text fits the note (Priority: P2)

A long note no longer spills out under the sticky. As the user types, the text gets smaller to stay inside, like in Miro.

**Why this priority**: The most visible rough edge on a board full of notes; draft idea 8.

**Independent Test**: type a paragraph into a default sticky: the font steps down and the text stays inside; delete most of it: the font grows back. Resize the sticky: the font follows.

**Acceptance Scenarios**:

1. **Given** a sticky, **When** its text grows past the note while typing or viewing, **Then** the font shrinks from 16 px in steps down to 10 px until the text fits; it grows back when the text gets shorter or the note bigger.
2. **Given** text that does not fit even at 10 px, **Then** it is cut at the bottom edge with a fade, and the full text shows while editing, with a scroll inside the note.
3. **Given** a board with many stickies, **Then** fitting does not make panning or zooming stutter: it runs only when a note's text or size changes.

---

### User Story 3 - Scrollbars in the app's style (Priority: P3)

Panels, menus and dialogs scroll with thin scrollbars in the theme's colors instead of the browser's default bars.

**Why this priority**: Small, but the default bars are the first thing that looks unfinished; draft idea 10.

**Independent Test**: open Keyboard shortcuts, the timer list and the JQL suggestions in light and dark theme on macOS and Windows Chrome and Firefox: every scrollbar is thin, uses theme colors and shows on hover or scroll.

**Acceptance Scenarios**:

1. **Given** any scrolling area of the app, **Then** its scrollbar is thin, its thumb uses a muted theme token and darkens on hover, and its track is transparent, in both themes.
2. **Given** a browser with overlay scrollbars (macOS), **Then** nothing changes in how they appear and fade.

---

### User Story 4 - Paste text onto the board (Priority: P4)

The user copies a line from a chat or a doc and presses `⌘V` over the board: a text element with that text appears under the pointer. A setting makes pasted text a sticky note instead.

**Why this priority**: A fast way to bring notes in; today pasting outside text does nothing. Draft idea 5.

**Independent Test**: copy "Ask Sam about the proxy" from another app, hover the board, press `⌘V`: a text element with it appears at the pointer, selected. Switch "Paste text as" to sticky note in Settings: the next paste makes a sticky. Copy a card inside drawhl and paste: the card is pasted, as today.

**Acceptance Scenarios**:

1. **Given** plain text in the system clipboard and no text field focused, **When** the user pastes over the board, **Then** a text element with that text appears at the pointer (or the center of the screen), selected; text longer than 5000 characters is cut.
2. **Given** the setting "Paste text as: Sticky note", **Then** the paste creates a yellow sticky instead.
3. **Given** the user copied elements in drawhl last, **When** they paste, **Then** the elements are pasted as today, not their text.
4. **Given** a paste into a text field, the search palette or a dialog, **Then** the field gets the text as usual and nothing is added to the board.

### Edge Cases

- A real tracker is connected before the first board is opened: the welcome board's DEMO cards show as not found; a sticky on the board says the cards are demo tasks and the board can be deleted.
- Two browser tabs open a fresh install at once: only one welcome board is created.
- The welcome board's Gantt and timer dates are fixed when the board is created; an old welcome board shows them in the past, like any board.
- Pasted text with line breaks keeps them; an empty or whitespace-only paste does nothing.
- An image or a file in the clipboard: nothing happens, as today.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The server MUST create the welcome board at most once per database, only when the database has no boards and was never seeded, and remember that it did.
- **FR-002**: The welcome board MUST pass the same validation as a saved board and use only demo task keys and made-up text.
- **FR-003**: The welcome board's dates (Gantt bars, milestone, timer) MUST be computed from the creation date.
- **FR-004**: A sticky's font MUST shrink from 16 px to no less than 10 px to fit its text, and grow back when there is room.
- **FR-005**: Every scrolling area of the app MUST use the themed thin scrollbar.
- **FR-006**: Pasting plain text over the board MUST add a text element, or a sticky note when the setting says so; pasting copied drawhl elements MUST keep working.
- **FR-007**: The "Paste text as" setting MUST be stored in the browser and default to text.

### Key Entities

- **Welcome board**: an ordinary board created by the server on first run.
- **Seed flag**: a settings entry that says the welcome board was already offered.

## Success Criteria *(mandatory)*

- **SC-001**: A fresh `docker compose up` shows a populated board in the first screen, without any click.
- **SC-002**: No text overflows a sticky at its default size up to about 400 characters.
- **SC-003**: No default browser scrollbar is visible anywhere in the app in Chrome and Firefox on Windows.
- **SC-004**: Outside text reaches the board with one paste.

## Assumptions

- The welcome board is in English, like the rest of the UI.
- Fit-to-note applies to sticky notes only; free text elements grow as today.
- The paste setting lives in the browser like the other UI preferences, not on the server.

## Out of scope

- A home page with boards and folders (draft idea 32).
- An interactive tour or tooltips that walk the user through the board.
- Pasting images, files or rich text.
- Re-creating the welcome board on demand.
