# Feature Specification: Toasts

**Feature Branch**: `016-toasts`

**Created**: 2026-10-11

**Status**: Owner told the agent on 2026-10-11 to build without waiting for G2; shown at G3.

**Input**: Owner's idea: proper notifications, toasts, in place of lines of text written into the interface. Errors are written on the component, a success is mostly not said at all.

## Why

Every action reported its failure as a red line under the nearest button, each component in its own way, and three places drew their own timed `Alert`. A success was said in three places ("Saved." in two forms, "Copied" on a button) and nowhere else: a person who revoked a link or handed a board over had to look for the change to believe it.

## Decisions

1. **A toast is for an event, not for a state.** What happened once and is over goes to a toast. What still holds stays on the screen where it holds: the connection notice, the sync indicator, a board or a list that did not load.
2. **An error of typed input stays at its field.** A wrong password, a taken username, a bad query or a token that does not connect is shown under the form, next to what has to be fixed, until the next try. An error of an action with nothing to fix (a menu item, a switch, a confirm dialog) is a toast.
3. **A success gets a toast when its result is not already in front of the person.** Saving a form, deleting a board, changing someone's role in a menu: a toast. A switch that moved, a row that left the list, a link that appeared, a "Copied" on the button: no toast.
4. **Bottom right, above the zoom buttons.** The other corners and edges are taken by the top bar, the sync row, the focus timer and the toolbar.
5. **A toast leaves by itself**: 4 s for a success, 8 s for an error or a notice, and it can be swiped away. A dialog under it stays open when the toast is clicked.
6. **Web app only.** No API answer changes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Actions answer in one place (Priority: P1) 🎯

An admin opens Settings → People, disables a person and revokes an old invite. Each time a toast in the bottom right says what happened. The server refuses the next change: the toast says why, in the server's words.

**Independent Test**: on the compose stack save the profile, change the password, save the task source, disable a person, revoke a link, share a board, make someone its owner, delete a board: each shows a success toast. Paste two keys that do not exist: one error toast lists both. Click a toast over the Settings window: the window stays.

**Acceptance Scenarios**:

1. **Given** a saved profile, password, task source or token, **Then** a success toast names it and the form carries no "Saved." line.
2. **Given** an action in Share or People that the server refuses, **Then** an error toast shows the server's message for 8 s and no red line appears in the window.
3. **Given** a sign-in, sign-up, invite, new board, profile, password, token or card form with wrong input, **Then** the error shows under the form as before.
4. **Given** pasted task keys of which some fail, **Then** one error toast "Not added" lists each failed key with its reason.
5. **Given** a board the person lost access to, **Then** the app moves to another board and a toast says "You no longer have access to this board."
6. **Given** an open dialog and a toast, **When** the toast is clicked or swiped, **Then** the dialog stays open.
7. **Given** the dark theme, **Then** toasts use the popover colors of the theme.

## Requirements *(mandatory)*

- **FR-001**: The app MUST show toasts through one `Toaster`, bottom right, clear of the zoom buttons.
- **FR-002**: Errors of actions without input, and the three timed alerts (failed paste, lost board, share errors), MUST be toasts.
- **FR-003**: Errors of typed input and states that still hold MUST stay where they are.
- **FR-004**: Saves and changes whose result is not visible at once MUST show a success toast.
- **FR-005**: A toast MUST NOT close a dialog it is shown over.

## Out of scope

- Browser or system notifications; timers and the focus timer keep their own.
- Toasts for another person's actions on a live board.
- Undo in a toast.
- A history of notifications.
