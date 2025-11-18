# Frame / Private Video Platform

**A comprehensive Video-on-Demand platform built with Node.js for managing your private video collection.**

Frame is a small, private self‑hosted video manager and player. It lets you upload videos, automatically generates thumbnails/poster and a waveform overview, prevents duplicate uploads via SHA‑256 hashing, and provides a lightweight search index and simple playlists.

The UI includes a custom player with preview thumbnails on the seekbar and basic playback controls. Frame is intended as a personal/private media archive rather than a public CDN.

**Features:**

- **Upload:** browser upload with server‑side processing (thumbnail, poster, waveform, metadata extraction).
- **Duplicate detection:** SHA‑256 file hashing prevents re‑uploads of identical files.
- **Waveform & previews:** generated waveform data and time‑based preview thumbnails for hover previews on the seekbar.
- **Search index:** small JSON search index to support fast text/tag/category searches and suggested/similar video lookups.
- **Playlists:** simple watchlists saved in `list.json`, navigable via `?list=<uuid>` on watch pages.
- **Player:** custom player with controls, preview hovercard, playback rate settings, and playlist navigation.
- **Server streaming:** designed to serve media files efficiently (range requests / streaming).
