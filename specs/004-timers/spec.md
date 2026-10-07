# Feature Specification: Timers on the board

**Feature Branch**: `004-timers`

**Created**: 2026-10-07

**Status**: Approved

**Input**: User description: "A reminder timer tied to a card, with a note on what to do. It goes off as a notification in drawhl." Shaped with the owner: a small bright cube next to an element, settings in a popover, a list of all timers on the board with jump-to, plus a timer that waits for a task's status to change and repeating timers.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A timer next to a card (Priority: P1)

The user waits for something on a task: an answer, a deploy, a review. They drop a timer on the card: a small amber cube appears just left of the card's top edge and starts counting 30 minutes. A popover opens on it: they type what they are waiting for and pick when it should go off, as a duration (15m, 1h, "2h 30m") or a date and time ("tomorrow 10:00", "25.10.2026 15:00"). The popover shows when it goes off and how much is left. The cube shows only the time left ("28m", "3h", "2d"); hovering it shows the note and the exact time. The cube moves with the card and goes away with it. When the time comes, drawhl shows a browser notification with the note, plays a chime, the cube turns coral with a bell and pulses, the tab title gets a count, and a note in the corner of the board offers Done, +10 min and +1 hour.

**Why this priority**: This is the timer itself; the list and the extra triggers build on it.

**Independent Test**: right-click a card → "Add timer": a cube at its top right, popover open, 30m left. Type "ping QA", set "1m", close. Move the card: the cube follows. Wait: notification "ping QA", chime, coral cube, "(1) drawhl" in the title, corner note; press +10 min: the cube counts again. Delete the card: the timer is gone. A timer placed on an empty spot stays when nearby elements are deleted.

**Acceptance Scenarios**:

1. **Given** a board, **When** the user picks the Timer tool (`R`) and clicks an element, or right-clicks an element and chooses "Add timer", **Then** a 40 px amber cube is attached just left of the element's top edge (a spot that stays put when a card grows or collapses), runs 30 minutes and opens its popover.
2. **Given** the Timer tool, **When** the user clicks an empty spot (or "Add timer" on the canvas menu), **Then** a free cube is placed there.
3. **Given** a cube, **When** it is dropped onto an element, **Then** it attaches to that element beside its top edge; dropped near its element (within 48 px) it stays attached where it was dropped; dropped further away it becomes free.
4. **Given** an attached timer, **When** its element is deleted, **Then** the timer is deleted too; a free timer is never deleted with other elements, and a timer in a deleted frame stays like other frame children.
5. **Given** the popover, **When** the user types a duration or a date and time or picks a preset, **Then** the line under it reads "Goes off Sun, 25.10.2026, 15:30 · in 18 days" (English and 24-hour whatever the browser locale), or names what could not be read.
6. **Given** a running timer, **Then** the cube shows the time left in one short unit ("45s", "28m", "3h", "2d") and, under 5 minutes, a ring; hovering it shows the note, the exact time and the time left.
7. **Given** a running timer, **When** its time comes while the board is open, **Then** a browser notification (if allowed) and a chime play once per tab, the cube turns coral with a bell and pulses, the tab title starts with the count of timers that went off, and a note at the top right of the board shows the timer with Done, +10 min and +1 hour.
8. **Given** a notification, **When** the user clicks it, **Then** the tab comes to front and the board moves to the timer.
9. **Given** timers whose time came while the board was closed, **When** the board opens, **Then** they show as gone off and one note says "2 timers went off while the board was closed", without system notifications.
10. **Given** a timer that went off, **When** the user presses Done, **Then** the cube turns gray with a check; snoozing counts again from now.

---

### User Story 2 - All timers of the board (Priority: P2)

The user sees at a glance what they are waiting for. A timer button at the top right shows how many timers run and a coral count of those that went off; hovering it names the next one. Its panel lists every timer of the board: gone off first, then today, later, waiting for a status, done. Clicking a row moves the board to that timer and highlights it; the panel stays open until Esc or ×. The main menu opens the same panel.

**Why this priority**: Makes many timers manageable; one timer is visible without it.

**Independent Test**: place three timers far apart (1 m, 2 h, tomorrow), mark one done. The button shows 2 running; hovering says the next one. Open the panel: rows in groups with time left and the note; click the far one: the board flies there, the cube flashes, the panel is still open; Esc closes it.

**Acceptance Scenarios**:

1. **Given** a board with timers, **Then** a button with a timer icon and the count of running timers sits left of the sync indicator; a coral badge counts timers that went off; with no timers it is hidden.
2. **Given** the button, **When** hovered, **Then** a tooltip names the next timer: "Next: ping QA · in 28m".
3. **Given** the button or the main menu item "Timers", **When** used, **Then** a panel opens under the top right corner, non-modal, with rows grouped as Gone off, Today, Later, Waiting for status, Done; each row has the cube color, time left or the trigger, the note (or "Timer") and what it is attached to.
4. **Given** the panel, **When** the user clicks a row, **Then** the board moves to the timer at the current zoom (at least 80%) and the cube flashes; the panel stays open.
5. **Given** the panel, **When** the user presses Esc or ×, **Then** it closes.
6. **Given** a row of a timer that went off, **Then** Done and +10 min act on it in place.

---

### User Story 3 - Wait for a status, repeat (Priority: P3)

A timer on a Jira card can wait for the task instead of the clock: "Goes off when DEMO-1 leaves In Review". It goes off like any timer as soon as the board sees the new status. A clock timer can repeat every day, on weekdays or every week; Done moves it to the next time.

**Why this priority**: Makes "I am waiting for something" precise; the clock covers the basic need.

**Independent Test**: attach a timer to a mock card, pick "When the status changes": the cube shows an eye, the popover names the status. Change the task's status in the mock: on the next refresh the timer goes off. Set a clock timer to "Every day" at a past minute: after it goes off, Done shows tomorrow's time.

**Acceptance Scenarios**:

1. **Given** a timer attached to a Jira card, **When** the user picks "When the status changes", **Then** the timer remembers the current status, the cube shows an eye instead of the time, and the popover reads "Goes off when DEMO-1 leaves In Review".
2. **Given** a status timer, **When** the board's refresh shows another status for the task, **Then** the timer goes off as in US1 and the note says the new status.
3. **Given** a clock timer, **When** the user picks Every day, Weekdays or Every week, **Then** the popover shows the repeat and the cube a small loop mark.
4. **Given** a repeating timer that went off, **When** the user presses Done, **Then** it runs again until the next time of the series after now; snoozing shifts only this time.

### Edge Cases

- Notifications denied or unsupported: the popover says so once; the chime, the coral cube, the title and the corner note still work.
- Several tabs on the same board: each shows a notification for the same timer with the same tag, so the browser shows one; writes that collide go through the usual conflict reload.
- Background tabs: timers are checked once a second while visible and at least once a minute in the background; the time goes from the stored moment, so nothing drifts. The board's refresh normally pauses in a background tab; while a status timer waits it keeps polling, so the timer goes off while the user is in the tracker's tab.
- A timer attached to a card that a module takes in (a Gantt row): it becomes free at the same place.
- A timer is copied, pasted and duplicated with its element; undo and redo cover every timer change.
- A status timer on a card that is not found or not loaded yet: it waits; the cube does not go off on missing data.
- Input that cannot be read or a time in the past: the timer keeps its previous time and the line says why.
- `prefers-reduced-motion`: no pulse, no flash, no fly animation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A `timer` element on the board: a 40 × 40 px cube, amber while running, coral when gone off, gray when done; it is never resized.
- **FR-002**: A timer is attached to an element (card, sticky note, text, module) by being its child, or free; attached timers move and are deleted with their element.
- **FR-003**: A timer holds a note (up to 500 characters) and either a moment in time or a watched task status; a moment can repeat daily, on weekdays or weekly.
- **FR-004**: Durations and dates are typed in one field: `15m`, `1h 30m`, `2d`, `tomorrow 10:00`, `mon 9:00`, `25.10 15:00`, `25.10.2026 15:00`, `2026-10-25 15:00`, `15:00`; presets 15m, 30m, 1h, 2h, Tomorrow 10:00.
- **FR-005**: Going off: browser notification (permission asked when the first timer is created), chime, coral pulsing cube, tab title count, corner note with Done, +10 min, +1 hour.
- **FR-006**: Timers are part of the board document and its undo history; notification bookkeeping lives in the browser.
- **FR-007**: A board timer button and panel list all timers of the current board and move the board to a timer on click; the panel closes only by Esc or ×.
- **FR-008**: Creation by toolbar tool (`R`), right-click on an element or on the canvas.

### Key Entities

- **Timer**: note, due moment, snoozed-until moment, repeat (none, daily, weekdays, weekly), watched task (key and the status at the time it was set), done flag, parent element.

## Success Criteria *(mandatory)*

- **SC-001**: A timer on a card is set in two clicks plus typing the note.
- **SC-002**: A timer goes off within 1 s of its time in a visible tab and within 1 minute in a background tab.
- **SC-003**: A timer is noticeable on a board of 50 cards at 50% zoom.

## Assumptions

- Timers go off only while drawhl is open in some tab; a closed browser gets them on the next open (US1 scenario 9). Web Push is a separate idea.
- The list covers the current board only.
- Times are stored as UTC moments and shown in the browser's time zone; the text stays English.

## Out of scope

- Timers across boards, web push with the browser closed, e-mail or messenger reminders.
- Writing anything back to Jira.
