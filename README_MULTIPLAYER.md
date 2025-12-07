# Multiplayer Feature

This project now supports a real-time multiplayer mode using Socket.io.

## How to Run

1.  **Start the Multiplayer Server**:
    Open a terminal and run:
    ```bash
    npm run server
    ```
    This starts the Node.js server on port 3001 (or `PORT` env var).

2.  **Start the Client**:
    Open another terminal and run:
    ```bash
    npm start
    ```
    This starts the Webpack Dev Server on port 3000.

3.  **Play**:
    - Open the game in your browser (usually `http://localhost:3000`).
    - In the main menu, select the **MULTIPLAYER** mode (it's the 4th option in VR mode).
    - You will see other players as red avatars with blue hands.
    - Your movement and score are synced with other players.

## Architecture

-   **Server**: `server/index.js` - Handles socket connections, player state (position, rotation, score), and broadcasting updates.
-   **Client**: `src/components/multiplayer.js` - A-Frame component that connects to the server, renders other players, and syncs local player data.
-   **Integration**: `src/scene.html` binds the `multiplayer` component to the game state (`gameMode`, `score`, `combo`).

## Notes

-   The server serves static files from the root directory if accessed directly (e.g., `http://localhost:3001`).
-   The client is configured to connect to the same host/port if running in production, or `http://localhost:3001` for local development.
