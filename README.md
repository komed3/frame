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

```bash
npm run frame -- check
```

## Installation

### Clone the repository

```bash
git clone https://github.com/komed3/frame.git
cd frame
```

### Install dependencies

```bash
npm ci
```

### Build Frame

```bash
npm run build
```

This builds the server, maintenance CLI and frontend.

### Initialize Frame

Run the interactive initialization wizard:

```bash
npm run frame -- init
```

The wizard guides you through:

1. Initial configuration.
2. Creation of the first administrator account.
3. Registration of media roots.

Registered media roots are scanned automatically by queued background jobs.

The initialization command creates the `.env` configuration file. It can only be run once unless the existing configuration file is removed.

### Start the server

```bash
npm run start
```

By default, Frame listens on:

```bash
http://localhost:3000
```

The default bind address is `0.0.0.0`, so the server can also be accessed from other devices on the network.


## Configuration

Frame stores its configuration in a `.env` file in the project directory.

The initialization wizard creates this file and provides defaults for all configuration options.

Configuration can also be inspected and changed using the CLI:

```bash
npm run frame -- config list
npm run frame -- config get PORT
npm run frame -- config set PORT 3000
npm run frame -- config unset PORT
```

Changes made to the configuration require a server restart.

### Important configuration options

| Option | Default | Description |
| --- | --- | --- |
| `NODE_ENV` | `dev` | Runtime environment |
| `HOST` | `0.0.0.0` | HTTP bind address |
| `PORT` | `3000` | HTTP port |
| `DB_PATH` | `data/frame.sqlite` | SQLite database location |
| `ASSETS_PATH` | `data/assets` | Generated media assets |
| `WORKER_CONCURRENCY` | `1` | Maximum concurrent background jobs |
| `EDITOR_ADMIN_ONLY` | `true` | Restrict media editing to administrators |
| `PASSWORD_STRICT` | `true` | Enforce strong passwords |

Additional options are available for database timeouts, worker polling and retries, FFmpeg processing timeouts and video scrubber generation.

Use npm `npm run frame -- config list` to see the complete configuration schema and current values.


## Command-line interface

The Frame CLI is available through npm:

```bash
npm run frame -- <command>
```

To display the available commands and options:

```bash
npm run frame -- --help
npm run frame -- <command> --help
```

### Available command groups

| Command | Description |
| --- | --- |
| `init` | Initialize Frame and create the first administrator |
| `check` | Check system requirements |
| `config` | Inspect and modify configuration |
| `db` | Inspect migrations and database statistics |
| `user` | Manage user accounts |
| `auth` | Inspect and revoke authentication sessions |
| `pref` | Manage user preferences |
| `search` | Search indexed media |
| `root` | Register, list, enable and disable media roots |
| `directory` | Inspect media directories |
| `media` | Inspect and manage media records |
| `metadata` | Inspect and manage media metadata |
| `track` | Inspect extracted media tracks |
| `asset` | Inspect and clean generated assets |
| `category` | Manage media categories |
| `tag` | Manage media tags |
| `playlist` | Manage playlists and entries |
| `favorite` | Manage favorites |
| `marker` | Manage playback markers |
| `play` | Inspect playback history |
| `job` | Inspect, enqueue, cancel and retry background jobs |
| `scan` | Queue scans for all enabled media roots |

Examples:

```bash
# List registered media roots
npm run frame -- root list

# Register another media root
npm run frame -- root add /mnt/media

# Queue scans for all enabled roots
npm run frame -- scan

# Inspect background jobs
npm run frame -- job list

# Show database statistics
npm run frame -- db stats

# List users
npm run frame -- user list

# Inspect generated assets for a media record
npm run frame -- asset list <media-id>
```

The CLI is intended for administrative and maintenance tasks. Most commands can be executed while the server is running. Database reset operations require the server to be stopped.


## Running Frame as a Linux service

For a permanent installation, Frame can be managed by systemd. This allows the server to start automatically during boot and restart after unexpected failures.

The following example assumes:

- A dedicated Linux user named `frame`.
- The repository is installed in `/opt/frame`.
- Node.js and npm are available in `/usr/bin`.
- The project directory is owned by the `frame` user.

Adjust paths and permissions to match your system.

### Prepare the installation

Clone the repository and build Frame as described in the installation section.

Make sure the service user has:

- Read access to all registered media roots.
- Write access to the project directory.
- Write access to the database and generated asset directories.

Initialize Frame before enabling the service:

```bash
npm run frame -- init
```

### Create the update script

The service checks the upstream repository every time it starts. If the local installation is behind the remote `master` branch, it updates the working tree using a fast-forward merge and rebuilds the application.

Create `/usr/local/lib/frame-update.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/frame"
BRANCH="master"

cd "$APP_DIR"

echo "[Frame] Checking repository status..."

if [[ -n "$(git status --porcelain)" ]]; then
  echo "[Frame] Working tree is not clean. Refusing automatic update."
  exit 1
fi

git fetch --prune origin "$BRANCH"

LOCAL_COMMIT="$(git rev-parse HEAD)"
REMOTE_COMMIT="$(git rev-parse "origin/$BRANCH")"

if git merge-base --is-ancestor "$LOCAL_COMMIT" "$REMOTE_COMMIT"; then
  if [[ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]]; then
    echo "[Frame] New version available. Updating..."
    git merge --ff-only "$REMOTE_COMMIT"
  fi
elif ! git merge-base --is-ancestor "$REMOTE_COMMIT" "$LOCAL_COMMIT"; then
  echo "[Frame] Local and remote branches have diverged."
  echo "[Frame] Manual intervention is required."
  exit 1
fi

CURRENT_COMMIT="$(git rev-parse HEAD)"
BUILD_MARKER="$(git rev-parse --git-path frame-built)"
BUILT_COMMIT=""

if [[ -f "$BUILD_MARKER" ]]; then
  BUILT_COMMIT="$(cat "$BUILD_MARKER")"
fi

if [[ "$BUILT_COMMIT" == "$CURRENT_COMMIT" ]]; then
  echo "[Frame] Installation is up to date."
  exit 0
fi

echo "[Frame] Build required."

INSTALL_DEPS=false

if [[ -z "$BUILT_COMMIT" ]] || ! git cat-file -e "$BUILT_COMMIT^{commit}" 2>/dev/null; then
  INSTALL_DEPS=true
elif ! git diff --quiet "$BUILT_COMMIT" "$CURRENT_COMMIT" -- package.json package-lock.json; then
  INSTALL_DEPS=true
fi

if [[ "$INSTALL_DEPS" == true ]]; then
  echo "[Frame] Installing dependencies..."
  npm ci --include=dev
fi

echo "[Frame] Building application..."
npm run build

printf '%s\n' "$CURRENT_COMMIT" > "$BUILD_MARKER"

echo "[Frame] Update completed successfully."
```

Make the script executable:

```bash
sudo chmod 755 /usr/local/lib/frame-update.sh
```

The update procedure deliberately has a few safeguards:

- Local modifications or untracked files prevent automatic updates.
- Updates are only applied when they can be fast-forwarded safely.
- Diverged branches require manual intervention.
- Dependencies are reinstalled only when the dependency manifests change or no successful build has been recorded.
- The successful build marker is written only after the complete build finishes.

This also means that a failed build is retried on the next service start instead of being mistaken for an already completed update.

The script uses the `master` branch. Change `BRANCH` if your installation tracks a different branch.

### Create the systemd unit

Create `/etc/systemd/system/frame.service`:

```ini
[Unit]
Description=Frame Media Server
After=network.target

[Service]
Type=simple
User=frame
Group=frame
WorkingDirectory=/opt/frame

Environment=NODE_ENV=production
Environment=PATH=/usr/local/bin:/usr/bin:/bin

ExecStartPre=/usr/local/lib/frame-update.sh
ExecStart=/usr/bin/node dist/server/run.js

Restart=on-failure
RestartSec=5
TimeoutStopSec=60

[Install]
WantedBy=multi-user.target
```

Make sure the configured Node.js executable and npm are available at the paths used by the service. If Node.js is installed through a version manager, configure the service environment accordingly rather than relying on an interactive shell.

### Enable and start the service

Reload systemd and enable Frame:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now frame
```

Check the service status:

```bash
sudo systemctl status frame
```

Follow the logs:

```bash
sudo journalctl -u frame -f
```

Stop or restart Frame:

```bash
sudo systemctl stop frame
sudo systemctl restart frame
```

With this setup, Frame starts automatically at boot. Every service start checks for updates, and a successful update is compiled before the server process starts.


## Development

To run Frame in development mode:

```bash
npm run dev
```

This starts the Express server with the Vite development middleware and React frontend.

To build the production application:

```bash
npm run build
```

The build process compiles the server and maintenance CLI, then builds the frontend into `dist/client`.


## Data and storage

Frame keeps its database and generated assets separate from the original media files.

By default:

```text
data/
├── frame.sqlite
└── assets/
```

The database stores media records, metadata, user accounts, playback information, playlists, markers and background jobs.

Generated assets include posters, thumbnails, waveform data and video frame previews.

Original media files are never copied into the Frame data directory. They remain in the registered media roots.

Make sure the database and asset directories are included in your backup strategy. The original media files must be backed up separately.
