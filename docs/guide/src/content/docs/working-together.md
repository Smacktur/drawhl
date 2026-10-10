---
title: Working together
description: "A shared board is live: what merges, how undo works and what viewers see."
---

A shared board is live: everyone who has it open sees each other's changes as they happen, with no reload and no "someone else changed this board" warnings.

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

## When the connection is not there

A board is editable once its live connection is up, which normally takes a moment. If the connection cannot be made, the board opens view-only with "Live connection unavailable. Viewing the last saved version." and keeps trying. On a self-hosted instance behind your own reverse proxy this usually means the proxy does not pass WebSockets; see [Configuration](../configuration/#behind-your-own-reverse-proxy).

Up to 30 browser tabs can have one board open at the same time.
