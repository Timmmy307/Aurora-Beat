# Edits Made to Aurora Beat

This document tracks the modifications made to the original Moon Rider codebase to transform it into Aurora Beat.

## 1. Project Renaming
**Goal**: Rebrand the application from "Moon Rider" to "Aurora Beat".

*   **`index.html`**:
    *   Updated `<title>` tag to "Aurora Beat".
    *   Updated Open Graph and Twitter meta tags (`og:title`, `twitter:title`) to "Aurora Beat".
*   **`package.json`**:
    *   Changed `"name"` property to `"aurora-beat"`.
*   **`README.md`**:
    *   Updated the main header and description text to refer to "Aurora Beat".
*   **`src/templates/news.html`**:
    *   Updated the news text header to "Aurora Beat (v2.9)".
    *   Updated the support text to refer to "Aurora Beat's hosting".

## 2. Bug Fixes
**Goal**: Fix the issue where the game controls became unresponsive after the window lost focus (e.g., opening a system menu in VR).

*   **`src/components/pauser.js`**:
    *   Modified the `visibilitychange` event listener.
    *   Added logic to emit the `gamemenuresume` event when `document.visibilityState` is no longer `hidden`. This ensures the game state and controls resume correctly when the user returns to the tab/app.

## 3. Feature Additions
**Goal**: Add a placeholder for a requested Multiplayer mode.

*   **`src/templates/modes.html`**:
    *   Added a new mode entry for "Multiplayer".
    *   Currently set as a "Coming Soon" feature that defaults to the "Classic" game mode logic when clicked, but provides the visual UI element requested.

## 4. Build Configuration
**Goal**: Fix build errors related to OpenSSL on newer Node.js versions.

*   **`package.json`**:
    *   Updated `build` and `start` scripts to include `NODE_OPTIONS=--openssl-legacy-provider`. This resolves the `ERR_OSSL_EVP_UNSUPPORTED` error by enabling the legacy OpenSSL provider required by the project's Webpack 4 configuration.

## 7. Desktop Input Support
**Goal**: Enable physical keyboard typing in the browser version for search.

*   **`src/components/keyboard-input.js`**:
    *   Created a new component that listens for global `keydown` events.
    *   Forwards key presses (characters and Backspace) to the `super-keyboard` component if it is visible.
*   **`src/scene.html`**:
    *   Added the `keyboard-input` component to the `<a-scene>` to ensure it's active globally.
