import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// IMPORTANT: These values are public by design.
// Security is enforced through Firebase Authentication and Realtime Database Rules.

const firebaseConfig = {
  apiKey: "AIzaSyANa7bYMOf2Jwdp4PvJ-WsSWNqU6nkaJgk",
  authDomain: "pokemon-champions-widget.firebaseapp.com",
  databaseURL: "https://pokemon-champions-widget-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "pokemon-champions-widget",
  storageBucket: "pokemon-champions-widget.firebasestorage.app",
  messagingSenderId: "297306516668",
  appId: "1:297306516668:web:946902107bed29cc9074b9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export { app, auth, db };
