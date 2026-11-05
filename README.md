# Frame

**Private self-hosted media management platform**

Frame is a self-hosted platform for organizing, managing and playing personal media libraries. It combines a web-based interface with a local SQLite database, background processing and a command-line maintenance tool.

Frame is designed for private media collections and runs on your own hardware. It does not depend on external metadata services, scraping services or cloud infrastructure. Your media files remain in their original locations; Frame indexes and manages them without importing or duplicating the original files.


## Features

### Media library

- Manage multiple media roots and automatically scan their directory structures
- Organize media by type, directory and metadata
- Search and filter large media collections
- Track file availability and detect changes to existing files
- Store media metadata, technical information and user-defined properties
- Generate thumbnails, posters and additional media assets in the background
- Keep original media files in their existing locations

### Playback and viewing

- Video player with seeking, playback speed controls and frame previews
- Audio player with waveform visualization, seeking and playback speed controls
- Image viewer
- Plain-text viewer
- Playback progress tracking and continue-watching functionality
- Play history, favorites and playlists
- Custom playback markers for videos
- Keyboard shortcuts and player controls

Media is streamed directly from its original location using HTTP range requests. Frame does not transcode media during playback.

### Metadata and organization

- Automatically extract technical metadata using FFprobe
- Extract audio, video and subtitle track information
- Store manually maintained metadata separately from scanned metadata
- Organize media using categories and tags
- Manage playlists and their entries
- Generate and maintain preview assets asynchronously

### Background processing

Frame includes a persistent job queue and background worker.

Depending on the media type, jobs can perform:

- Directory scanning and file fingerprinting
- Technical metadata extraction
- Track extraction
- Poster and thumbnail generation
- Video frame extraction for seek previews
- Audio waveform generation
- Text excerpt extraction

Jobs are prioritized and retried automatically when processing fails. Interrupted jobs are recovered when the worker starts again.

### User management

- Multiple user accounts
- Administrator and editor permissions
- Session management
- User-specific preferences, favorites, playback history and progress
- Optional restriction of media editing to administrators

### Command-line interface

Frame includes a dedicated CLI for initialization, configuration and maintenance. It can be used independently of the web interface to manage media roots, users, jobs, metadata, database information and other resources.


## Supported media formats

Frame identifies media files by their file extensions during scanning. The following extensions are currently recognized.

- **Video:** `mp4`, `m4v`, `mkv`, `mov`, `avi`, `webm`, `mpg`, `mpeg`, `mts`, `m2ts`, `ts`, `wmv`, `flv`, `ogv`
- **Audio:** `mp3`, `m4a`, `aac`, `flac`, `ogg`, `opus`, `wav`, `wma`, `aiff`, `aif`, `ape`, `mid`, `midi`
- **Images:** `jpg`, `jpeg`, `png`, `gif`, `webp`, `avif`, `bmp`, `tif`, `tiff`, `svg`, `heic`, `heif`
- **Text:** `txt`

Text files are processed with support for `UTF-8`, `UTF-8 BOM`, `UTF-16 LE`, `UTF-16 BE` and `Windows-1252` encoding detection.

Playback compatibility: Frame streams original media files without transcoding. Actual playback support therefore depends on the browser and its available codecs. Recognizing a file extension does not guarantee that every browser can play or display that format.


## Requirements

- Linux or another supported Node.js environment
- SQLite
- Node.js 22.12.0 or newer
- npm
- FFmpeg and FFprobe available in `PATH`
- At least 2 GB RAM; 4 GB or more recommended
- At least 2 logical CPU cores recommended

Frame uses Node.js' built-in SQLite support. No separate database server is required.

FFmpeg and FFprobe are used for metadata extraction, preview generation, frame extraction and waveform processing.

Run the built-in system check to verify the installation:

```sh
npm run frame -- check
```

## Installation

### Clone the repository

```sh
git clone https://github.com/komed3/frame.git
cd frame
```

### Install dependencies

```sh
npm ci
```

### Build Frame

```sh
npm run build
```

This builds the server, maintenance CLI and frontend.

### Initialize Frame

Run the interactive initialization wizard:

```sh
npm run frame -- init
```

The wizard guides you through:

1. Initial configuration.
2. Creation of the first administrator account.
3. Registration of media roots.

Registered media roots are scanned automatically by queued background jobs.

The initialization command creates the `.env` configuration file. It can only be run once unless the existing configuration file is removed.

### Start the server

```sh
npm run start
```

By default, Frame listens on:

```sh
http://localhost:3000
```

The default bind address is `0.0.0.0`, so the server can also be accessed from other devices on the network.
