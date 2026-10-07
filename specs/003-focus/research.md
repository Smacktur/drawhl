# Research: Focus timer and music

## Music source

- Pixabay Content License forbids distributing content "on a standalone basis", and a public repository with the files is exactly that. Pixabay has no music API either. Rejected.
- Chosen: CC0 tracks from OpenGameArt, no attribution required; credits are kept anyway.
  - HoliznaCC0, "Lo-Fi and Chill" collection (https://opengameart.org/node/161819): Laundry On The Wire, Keeping Cool, First Snow, 2 Hour Delay.
  - HoliznaCC0, "Chill Beats Collection" (https://opengameart.org/content/chill-beats-collection): Families, Autumn.
  - omfgdude, "Lofi Hip Hop Loop" (https://opengameart.org/content/lofi-hip-hop-loop).
- The author's Bandcamp shows a CC BY badge because Bandcamp has no CC0 option; the author's profile and the OpenGameArt pages state CC0.
- The user's own files are played from object URLs in the browser and never uploaded.

## Audio format

MP3 plays in every browser including Safari on iOS; Ogg and Opus do not everywhere. Re-encoded to 112 kbps stereo: about 0.85 MB per minute, 7 tracks ≈ 16 MB.

## Timer accuracy

`setInterval` is throttled in background tabs. The timer stores the end time and derives the remaining time from `Date.now()` on every tick, so throttling delays only the redraw, not the end.

## Chime

A two-note sine chime from Web Audio, no file. A browser `Notification` is shown only after the user grants permission.
