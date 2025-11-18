# Frame / Private Video Platform

**A comprehensive Video-on-Demand platform built with Node.js for managing your private video collection.**

Frame is a small, private self‑hosted video manager and player. It lets you upload videos, automatically generates thumbnails/poster and a waveform overview, prevents duplicate uploads via SHA‑256 hashing, and provides a lightweight search index and simple playlists.

The UI includes a custom player with preview thumbnails on the seekbar and basic playback controls. Frame is intended as a personal/private media archive rather than a public CDN.

## Features

- **Upload:** browser upload with server‑side processing (thumbnail, poster, waveform, metadata extraction).
- **Duplicate detection:** SHA‑256 file hashing prevents re‑uploads of identical files.
- **Waveform & previews:** generated waveform data and time‑based preview thumbnails for hover previews on the seekbar.
- **Search index:** small JSON search index to support fast text/tag/category searches and suggested/similar video lookups.
- **Playlists:** simple watchlists saved in `list.json`, navigable via `?list=<uuid>` on watch pages.
- **Player:** custom player with controls, preview hovercard, playback rate settings, and playlist navigation.
- **Server streaming:** designed to serve media files efficiently (range requests / streaming).

## Who is it for?

Frame is built for private use — for users who want a personal, self‑hosted way to store and browse a small media collection (archival, personal clips, educational content). It is intentionally lightweight and file‑system based (no heavy database by default).

## Requirements

- Node.js (LTS, e.g. >= 18)
- ffmpeg (for thumbnail, poster, waveform extraction)
- Git (for cloning) and a modern browser for the UI
- Optional: npm or yarn

## Install

Clone and install:

```sh
git clone https://github.com/komed3/frame.git
cd frame
npm install
```

Ensure [ffmpeg](https://ffmpeg.org) is installed and available on PATH. On Windows you can download a build and add it to your PATH, or use a package manager like Chocolatey:

```sh
choco install ffmpeg
```

For Linux (Debian/Ubuntu), install ffmpeg via the package manager:

```sh
sudo apt update
sudo apt install ffmpeg
```

Start the app:

```sh
npm start
```

Open a browser to: `http://localhost:3000`
