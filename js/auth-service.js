import { auth } from "./firebase-config.js";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onIdTokenChanged,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Invite code loaded from invite-config.js (non-module script in panel.html)
const REGISTRATION_INVITE_CODE = window.__INVITE_CODE__ || null;

/**
 * Registers a new streamer using simulated twitch-username and verify invitation code
 * @param {string} twitchUser 
 * @param {string} password 
 * @param {string} inviteCode 
 * @returns {Promise<User>}
 */
export async function registerStreamer(twitchUser, password, inviteCode) {
  if (inviteCode !== REGISTRATION_INVITE_CODE) {
    throw new Error("Invalid registration invitation code.");
  }
  const email = `${twitchUser.toLowerCase().trim()}@tuoverlay.com`;
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error registering streamer:", error);
    throw error;
  }
}


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
