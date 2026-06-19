import { auth } from "./firebase-config.js";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onIdTokenChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/**
 * Logs in a streamer using a simulated twitch-username email format
 * @param {string} twitchUser 
 * @param {string} password 
 * @returns {Promise<User>}
 */
export async function loginStreamer(twitchUser, password) {
  const email = `${twitchUser.toLowerCase().trim()}@tuoverlay.com`;
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error logging in streamer:", error);
    throw error;
  }
}

/**
 * Logs out the current active streamer session
 * @returns {Promise<void>}
 */
export async function logoutStreamer() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error logging out streamer:", error);
    throw error;
  }
}

/**
 * Subscribes to auth state changes, keeping session keys active in the background.
 * Runs callback function whenever the token refreshes or states change.
 * @param {function} onUserChanged 
 * @returns {function} unsubscribe function
 */
export function setupAuthObserver(onUserChanged) {
  return onIdTokenChanged(auth, async (user) => {
    if (user) {
      console.log(`Active session verified: ${user.email}`);
      onUserChanged(user);
    } else {
      console.log("No active user session.");
      onUserChanged(null);
    }
  });
}
