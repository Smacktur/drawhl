---
title: Working together
description: "A shared board is live: what merges, how undo works and what viewers see."
---

A shared board is live: everyone who has it open sees each other's changes as they happen, with no reload and no "someone else changed this board" warnings.

## Who is here

- The top bar shows an avatar for everyone else who has the board open: their initials on their own color. Hover one for the name.
- Each person's cursor carries the same small avatar, so you can tell at a glance who is doing what. The name shows next to it for a moment when they arrive.
- An element someone else has selected gets an outline in their color with their avatar on its corner. Take it as "busy": two people changing the same thing at once do not merge.
- An element someone is dragging moves on your screen while they drag it, and other changes glide into place instead of jumping. With reduced motion turned on in the system, they jump.

## What merges

- Changes to different elements never collide.
- Changes to different parts of one element both stay: one person moves a sticky note while another rewrites it.
- When two people change the same thing at the same moment, such as the text of one sticky note or the contents of one Gantt, the later change wins.
- Deleting wins over editing: if someone deletes an element you are changing, it is gone for both of you.
- If a frame is deleted while someone drops a card into it, the card stays on the board where it was dropped.

Task data is not part of this: each person's cards show what their own tracker token allows, as before.

## Undo

Undo and redo go through your own changes only. Pressing `⌘Z` (`Ctrl+Z`) never takes back what someone else did.

## Your view is yours

Pan and zoom are kept per person in the browser. A board you have not opened in this browser opens fitted to its content.

## Viewers

People with "Can view" see changes live too. They cannot change anything, and the server ignores edits sent from their browser.

## When the connection drops

- **A blip.** You keep working. "Reconnecting…" shows at the top right, and when the connection is back your changes and everyone else's merge, with nothing doubled and nothing lost.
- **Down for a while.** After 30 seconds without a connection, if you have changed something, the notice turns into "Not saved yet. Changes are kept in this tab." and the browser asks before you close the tab. Keep the tab open until it connects.
- **Never connected.** A board is editable once its live connection is up, which normally takes a moment. If it cannot be made, the board opens view-only with "Live connection unavailable. Viewing the last saved version." and keeps trying. On a self-hosted instance behind your own reverse proxy this usually means the proxy does not pass WebSockets; see [Configuration](../configuration/#behind-your-own-reverse-proxy).
- **Access changed.** If your role on the board changes while it is open, the board follows at once: view-only when you become a viewer, editable again when you become an editor. If you lose access, tiko moves you to another board and says "You no longer have access to this board." Signing out everywhere, a password change or a disabled account closes the board and asks you to sign in.

Up to 30 browser tabs can have one board open at the same time; the next one opens view-only with "This board is full right now." and gets in when a place frees up.
