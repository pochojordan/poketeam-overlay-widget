import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// FIREBASE CONFIGURATION
// ======================
// Replace the placeholder values below with your Firebase project config.
// To find your config:
//   1. Go to https://console.firebase.google.com/
//   2. Open your project → Project Settings → General → Your apps → Web app
//   3. Copy the "firebaseConfig" object values here
//
// IMPORTANT: For GitHub Pages, these values are public by design.
// Security is enforced through Firebase Authentication and Realtime Database Rules,
// NOT through keeping these values secret.

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export { app, auth, db };
