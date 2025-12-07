# Edits Made

## Rebranding
- Renamed project from "Moon Rider" to "Aurora Beat".
- Updated `index.html` title and meta tags.
- Updated `README.md`.

## Bug Fixes
- **Pause/Resume**: Fixed an issue where the game would not resume correctly after pausing.
- **OpenSSL**: Added `NODE_OPTIONS=--openssl-legacy-provider` to build scripts to support Node.js v17+.

## Features
- **Safety**: Added an "Out of Bounds" warning system.
- **Input**: Added `keyboard-input` component for better accessibility.
- **Multiplayer**:
    - Implemented Node.js server with Socket.io (`server/index.js`).
    - Created client-side component (`src/components/multiplayer.js`).
    - Added "Multiplayer" mode to the main menu.
    - Implemented player synchronization (Head, Hands, Score, Combo).
    - Added Room support (Create/Join Private Rooms).
    - Added Mode selection within Multiplayer (Classic/Punch).
    - Consolidated build/run commands into `npm start`.

## Configuration
- **Dependencies**: Added `express`, `socket.io`, `socket.io-client`.
- **Build**: Updated `package.json` scripts to streamline development and production runs.
