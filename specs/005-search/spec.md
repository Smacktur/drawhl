# Feature Specification: Search on the board

**Feature Branch**: `005-search`

**Created**: 2026-10-07

**Status**: Approved

**Input**: User description: "Board search like Spotlight or Raycast: Cmd+K opens an input in the middle of the screen, typing finds any text on the board, click or Enter moves to it." Shaped with the owner: live preview while browsing results, matches lit on the canvas and selectable at once, filters by assignee, status, type and frames, app commands and other boards in the same palette, wrong keyboard layout forgiven, recent jumps.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find anything and jump to it (Priority: P1)

The board has grown: dozens of cards, notes and frames, and the user remembers only a word. They press `⌘K` (or `⌘F`, `Ctrl` on Windows and Linux). A palette opens in the middle of the screen over a lightly dimmed board: one input, results under it. They type "deploy qa": every element whose text holds both words shows up, best first, with the matching parts highlighted, an icon for its kind and where it lives ("in Sprint 12"). Arrows move the pick, Enter or a click closes the palette, moves the board to the element, selects it and flashes it. With an empty input the palette lists recent jumps and the frames of the board, a table of contents. Text typed in the Russian layout by mistake ("вузднщн") still finds "deploy".

**Why this priority**: This is the search itself; the rest builds on the palette.

**Independent Test**: on a board with a sticky "Ping QA after deploy" far off screen, press `⌘K`, type "qa dep": the sticky is the first row with "QA" and "dep" highlighted; Enter: the board flies to it, it is selected and flashes. Type "вузд": the same sticky. Reopen with an empty input: it is under Recent, frames listed below.

**Acceptance Scenarios**:

1. **Given** a board, **When** the user presses `⌘K` or `⌘F` (`Ctrl+K`, `Ctrl+F`) outside a text field or dialog, **Then** a 560 px palette opens 20% from the top with the input focused; the shortcut while it is open, Esc or a click outside closes it.
2. **Given** the palette, **When** the user types, **Then** results come from every text on the board: sticky notes, text, frame titles, Jira cards (key, title, status, assignee, type, priority, from the latest snapshot), timer notes, module titles, Gantt row titles and milestones.
3. **Given** a query of several words, **Then** an element matches when each word is found somewhere in its text, ignoring case and accents; results rank exact key match, then title starting with the query, then word starts, then any match, then board order; at most 50 rows show, with "N more" under them.
4. **Given** a result, **Then** its row shows a kind icon, the text around the first match with matches highlighted, and muted context: the frame or module it sits in, the card it is attached to, or the card's status for cards.
5. **Given** results, **When** the user presses ↑ or ↓ (wrapping), Enter, or clicks a row, **Then** the palette closes, the board moves to the element at the current zoom (at least 80%, the whole element in view when it is bigger than the screen), selects only it and flashes it; a Gantt row or milestone moves to its module.
6. **Given** a query typed in the Russian layout that finds nothing, **Then** the palette searches the same keys in the English layout and the other way round, and says "Showing results for deploy".
7. **Given** an empty input, **Then** the palette lists up to 5 recent jumps on this board that still exist, then all frames in board order.
8. **Given** a query with no matches, **Then** the palette reads "Nothing on this board matches 'xyz'".

---

### User Story 2 - Preview and highlight (Priority: P2)

Browsing the results moves the board to each one, like Raycast's preview; Esc takes the camera back where it was. While the palette is open, matches are lit on the canvas and the rest fades. `⌘Enter` selects every match at once, so the user can collapse those cards, delete them or move them together.

**Why this priority**: Makes search a way to look at the board, not only to jump; the jump works without it.

**Independent Test**: type "qa", press ↓ twice: the board follows each row; press Esc: the board is back where it started. Type "demo": all DEMO cards are ringed, the rest faded; `⌘Enter`: they are all selected, right-click shows "Collapse cards".

**Acceptance Scenarios**:

1. **Given** results, **When** the pick changes by keyboard, **Then** after 120 ms of rest the board moves to the picked element (no zoom in under 50%); hovering rows does not move it.
2. **Given** a preview moved the board, **When** the user closes the palette with Esc or a click outside, **Then** the board returns to the viewport it had when the palette opened; Enter keeps the new place.
3. **Given** an open palette with a query, **Then** matching elements on the canvas get a 2 px `--primary` ring, the rest drops to 35% opacity, and the board stays lit around the palette.
4. **Given** results, **When** the user presses `⌘Enter` or clicks "Select all N", **Then** the palette closes and exactly the matching elements are selected (Gantt rows select their module), the board fits them in view.

---

### User Story 3 - Filters (Priority: P3)

The user narrows search with the words they know from Jira: `@anna` for an assignee, `status:review`, `type:bug`, and `#` for frames only. A filter becomes a chip in the input, and the palette suggests values that exist on the board.

**Why this priority**: Answers "what is on Anna's plate on this board" in one line; plain text search covers the basic need.

**Independent Test**: type "@an": the palette suggests "Anna Lee" from the board's cards, Tab turns it into a chip, only her cards remain; add "status:prog": only her cards in progress; Backspace on an empty input removes the last chip. Type "#spr": only frames named Sprint.

**Acceptance Scenarios**:

1. **Given** the input, **When** the user types `@`, `status:`, `type:` or `priority:`, **Then** a suggestion list shows matching values present on the board's cards with counts; Tab or Enter inserts the picked value as a chip.
2. **Given** chips, **Then** only Jira cards whose field contains the chip's value (ignoring case) match; free words still apply; several chips of the same field mean any of them, different fields mean all.
3. **Given** `#` at the start of the query, **Then** only frames and modules match, and an empty `#` lists all of them.
4. **Given** chips, **When** the user presses Backspace in an empty input, **Then** the last chip turns back into text.

---

### User Story 4 - Commands and boards (Priority: P4)

The palette becomes the one entry to the app. Typing "time" also offers "Show timers", "the" offers "Switch theme", and the names of other boards show as "Go to board". Commands carry their shortcut on the right, so the palette also teaches them.

**Why this priority**: Convenience for keyboard users; every command already has a button or a menu item.

**Independent Test**: type "sticky": "Add sticky note N" is listed under the board results; Enter: the Sticky tool is active. Type the name of another board: Enter opens it. Type ">" : only commands.

**Acceptance Scenarios**:

1. **Given** a query, **Then** under board results the palette lists matching commands: Add Jira card, Add sticky note, Add text, Add frame, Add timer, Add module, Add Gantt (and any other module), Show timers, Show or Hide focus timer, Switch to light, dark or system theme, Keyboard shortcuts, Settings, New board, Rename board, each with its shortcut.
2. **Given** a query, **Then** other boards whose name matches are listed as "Go to board <name>"; Enter opens that board.
3. **Given** `>` at the start, **Then** only commands and boards are listed; with an empty query after it, all of them.
4. **Given** a command, **When** chosen, **Then** the palette closes and the command runs as if from its button or shortcut: an "Add" command picks the tool, the next click places the element; a module is added at the viewport center.

### Edge Cases

- Text inside an element being edited is searched as last saved; the palette does not open while typing in a text field.
- Cards whose task is not loaded yet are found by key only; not-found tasks by key with the "Not found" context.
- An element inside a collapsed Gantt branch: the jump goes to the module.
- A result whose element was deleted while the palette was open is dropped on the next keystroke; choosing it does nothing.
- Very long texts: snippets show at most 80 characters around the first match, with an ellipsis.
- `prefers-reduced-motion`: jumps and previews move instantly, no flash.
- Another dialog, sheet or popover open: the shortcut is ignored; the palette closes other menus when it opens.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: One palette per board opened with `⌘K` and `⌘F` (`Ctrl` elsewhere), listed in the shortcuts dialog and in the main menu as "Search".
- **FR-002**: The search index is built in the browser from the board document and the task snapshots; nothing is sent to the server.
- **FR-003**: Matching: every word of the query is a case- and accent-insensitive substring of the element's text; a query in the wrong Russian or English layout is retried in the other one when it finds nothing.
- **FR-004**: A jump moves the board, selects only the element and flashes it; recent jumps (up to 5 per board) are kept in `localStorage`.
- **FR-005**: Preview follows the picked result and is undone on Esc; matches are ringed and the rest faded while the palette is open; `⌘Enter` selects all matches.
- **FR-006**: Filters `@`, `status:`, `type:`, `priority:` and `#` with value suggestions from the board.
- **FR-007**: Commands and other boards in the palette, with `>` for commands only; `⌘P` and `⌘⇧P` (`Ctrl` elsewhere) and "Commands" in the main menu open the palette with `>` typed, like an editor's command palette.

### Key Entities

- **Search entry**: element id, kind, text fields to match, display title, context, jump target (the element or its module).

## Success Criteria *(mandatory)*

- **SC-001**: From the keyboard, any element is reached in `⌘K`, a few letters and Enter.
- **SC-002**: Results update within one frame (16 ms) on a board of 1000 elements.
- **SC-003**: A user who never saw the palette finds it from the main menu and learns `⌘K` there.

## Assumptions

- Search covers the current board; other boards are found by name only (US4).
- `⌘F` is taken over on the board page only; the browser's find still works from its menu.
- Text in arrows (edges) is not searched: edges carry no labels today.

## Out of scope

- Full-text search across all boards, server-side search, searching Jira beyond the cards on the board.
- Saved searches, regular expressions.
