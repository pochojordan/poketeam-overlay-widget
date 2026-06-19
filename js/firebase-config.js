import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Public Firebase project configuration placeholder
const firebaseConfig = {
  apiKey: "PLACEHOLDER_API_KEY",
  authDomain: "placeholder-project.firebaseapp.com",
  databaseURL: "https://placeholder-project-default-rtdb.firebaseio.com",
  projectId: "placeholder-project",
  storageBucket: "placeholder-project.appspot.com",
  messagingSenderId: "PLACEHOLDER_SENDER_ID",
  appId: "PLACEHOLDER_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export { app, auth, db };
