import { auth } from "./firebase-config.js";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onIdTokenChanged,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { initializeChannel } from "./db-service.js";

/**
 * Registers a new streamer using simulated twitch-username and verify invitation code
 * @param {string} twitchUser 
 * @param {string} password 
 * @param {string} inviteCode 
 * @returns {Promise<User>}
 */
export async function registerStreamer(twitchUser, password, inviteCode) {
  const email = `${twitchUser.toLowerCase().trim()}@tuoverlay.com`;
  let userCredential;
  try {
    userCredential = await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error("Error registering streamer auth:", error);
    throw error;
  }

  try {
    // Try to initialize the channel database records. 
    // The security rules will validate the invite code and the owner UID.
    await initializeChannel(twitchUser, userCredential.user.uid, inviteCode);
    return userCredential.user;
  } catch (error) {
    console.error("Error initializing channel database records:", error);
    // Cleanup orphan user account if database initialization failed
    try {
      await userCredential.user.delete();
    } catch (cleanupError) {
      console.error("Failed to delete user after failed DB initialization:", cleanupError);
    }
    // Provide a user-friendly error message if it was a permission error (bad invite code or channel already exists)
    if (error.code === 'PERMISSION_DENIED' || error.message.includes('PERMISSION_DENIED') || error.message.includes('Permission denied')) {
      throw new Error("Invalid invitation code or the channel name is already registered.");
    }
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
