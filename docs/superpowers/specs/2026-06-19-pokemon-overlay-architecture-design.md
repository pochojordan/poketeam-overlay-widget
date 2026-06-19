# Design Document: Pokémon Champions Live Widget & Management Panel

**Date:** 2026-06-19
**Status:** Approved by User
**Architecture:** Zero-Build Jamstack Serverless (GitHub Pages + Firebase Realtime Database)

---

## 1. Background & Goals

Streamers need a highly customizable, performant, and low-latency widget to display their active Pokémon team in OBS Studio or Streamlabs. Traditional solutions force rigid layouts or require expensive servers. 

This project aims to solve this by providing a modular, zero-build, client-only application. It runs completely for free using GitHub Pages for static file hosting and Firebase Realtime Database for real-time synchronization (<100ms latency) under a generous free-tier consumption model.

### Key Goals:
- **Zero-Build Architecture**: Vanilla HTML5, CSS3, and JavaScript ES modules to ensure ease of deployment and direct compatibility with GitHub Pages.
- **60 FPS Performance**: Smooth, native transitions and animations in OBS without framework overhead.
- **Robust Security & Auth**: Secure data isolation using Firebase Authentication with email mask (`[channel]@tuoverlay.com`) and granular security rules.
- **Seamless Persistence**: Background token refresh (`onIdTokenChanged`) to ensure streams lasting longer than 4 hours do not face write-access issues.

---

## 2. File & Component Architecture Map

The application is structured into isolated modules, keeping logic separated from view files:

```text
stream-overlay-pokemon/
├── index.html                # OBS Widget (displays team sprites & handles real-time updates)
├── panel.html                # Management Panel (streamer login, configuration, and controls)
├── css/
│   ├── variables.css         # Theme design tokens (colors, layout rules, typography)
│   ├── widget.css            # Styles, layout grids, and animations for OBS widget
│   └── panel.css             # Styles, dark mode styling, and mobile responsiveness for the panel
├── data/
│   ├── pokemon_list.json         # Pokedex dictionary (mapping name -> key -> cdn_file)
│   └── item_list.json            # Items dictionary (mapping name -> key)
└── js/
    ├── firebase-config.js     # Shared Firebase SDK initialization (v10+ modular syntax)
    ├── auth-service.js        # Auth state handlers & automatic token refresh observer
    ├── db-service.js          # CRUD operations for Firebase Realtime Database
    ├── importer-service.js    # Showdown team parser
    ├── panel.js               # Event-handling & autocomplete logic for the management panel
    └── widget.js              # Real-time data receiver & image preloader for OBS widget
```

### Component Details

### `data/pokemon_list.json`
Acts as a static translation dictionary for the frontend.
```json
[
  {
    "name": "Tapu Koko",
    "key": "tapu-koko",
    "cdn_file": "tapukoko"
  }
]
```

### `data/item_list.json`
Acts as a static translation dictionary for held items.
```json
[
  {
    "name": "Life Orb",
    "key": "lifeorb"
  }
]
```

---

## 3. Firebase modular SDK (v10+) & Persistent Auth Flow

### Initialization (`js/firebase-config.js`)
Loads the Firebase Modular SDK from Google's gstatic CDN:
```javascript
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "tu-proyecto.firebaseapp.com",
  databaseURL: "https://tu-proyecto-default-rtdb.firebaseio.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export { app, auth, db };
```

### Auth & Token Refresh (`js/auth-service.js`)
Uses `onIdTokenChanged` to handle token changes. This ensures that during long-running streams (>4 hours), the ID token gets refreshed automatically by the Firebase SDK without logging the user out.

```javascript
import { auth } from "./firebase-config.js";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onIdTokenChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

export async function loginStreamer(twitchUser, password) {
  const email = `${twitchUser.toLowerCase().trim()}@tuoverlay.com`;
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logoutStreamer() {
  return signOut(auth);
}

export function setupAuthObserver(onUserChanged) {
  onIdTokenChanged(auth, async (user) => {
    if (user) {
      console.log(`Active session for user: ${user.email}`);
      onUserChanged(user);
    } else {
      console.log("No active session.");
      onUserChanged(null);
    }
  });
}
```

---

## 4. Security Configuration (Security Rules)

The Firebase Realtime Database will be secured using the rules below to enforce data boundaries:

```json
{
  "rules": {
    "canales": {
      "$canal_twitch": {
        ".read": true,
        ".write": "auth != null && auth.token.email === $canal_twitch + '@tuoverlay.com'"
      }
    }
  }
}
```

This enforces that:
1. Anyone (including OBS widget instance) can read the active channel state.
2. Only the owner of the channel (whose Twitch ID username matches the auth email format `[canal]@tuoverlay.com`) can write data.

---

## 5. Verification Plan

### Automated Verification
Since this is a client-side only static site, automated linting and validation of JSON files will be done.

### Manual Verification
1. **Mock Login/Auth Flow**: Verifying credentials and testing that correct Firebase parameters are sent using simulated Twitch names.
2. **Token Refresh Testing**: Simulate token refresh trigger in Firebase DevTools/Auth emulator to verify that `onIdTokenChanged` behaves as expected.
3. **Multi-User Partition Test**: Attempt to write to channel `A` while logged in as channel `B` and verify Firebase rejects the transaction.
