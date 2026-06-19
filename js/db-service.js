import { db, auth } from "./firebase-config.js";
import { ref, set, get, remove, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const CHANNELS_ROOT = "canales";
const CHANNEL_NAME_RE = /^[a-zA-Z0-9_-]+$/;

/**
 * Validate and normalize a channel name
 */
function validateChannel(channelName) {
  if (!channelName || typeof channelName !== "string") {
    throw new Error("Invalid channel name.");
  }
  const name = channelName.toLowerCase().trim();
  if (!CHANNEL_NAME_RE.test(name) || name.length > 64) {
    throw new Error("Channel name contains invalid characters.");
  }
  return name;
}

/**
 * Build the Firebase path for a given channel
 */
function channelPath(channelName) {
  return `${CHANNELS_ROOT}/${validateChannel(channelName)}`;
}

/**
 * Save team configuration to Firebase
 * @param {string} channelName 
 * @param {object} teamData - { slots: [{pokemonKey, itemKey, shiny}], config: {style, color, layout} }
 * @returns {Promise<void>}
 * @throws {Error} if not logged in, invalid input, or Firebase write fails
 */
export async function saveTeamConfig(channelName, teamData) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("You must be logged in to save.");
  }
  if (!teamData || !Array.isArray(teamData.slots)) {
    throw new Error("Invalid team data: slots array is required.");
  }
  const path = channelPath(channelName);
  try {
    await set(ref(db, path), {
      ownerUid: user.uid,
      team: teamData.slots,
      config: teamData.config || {},
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error("Error saving team config:", error);
    throw error;
  }
}

/**
 * Read team configuration from Firebase (one-time)
 * @param {string} channelName 
 * @returns {Promise<object|null>}
 */
export async function getTeamConfig(channelName) {
  const path = channelPath(channelName);
  try {
    const snapshot = await get(ref(db, path));
    return snapshot.val();
  } catch (error) {
    console.error("Error reading team config:", error);
    throw error;
  }
}

/**
 * Subscribe to real-time updates for a channel
 * @param {string} channelName 
 * @param {function} onData - callback with data object (may receive null)
 * @returns {function} unsubscribe function
 */
export function subscribeChannel(channelName, onData) {
  const path = channelPath(channelName);
  const dbRef = ref(db, path);
  return onValue(dbRef, (snapshot) => {
    onData(snapshot.val());
  }, (error) => {
    console.error("Firebase subscription error:", error);
  });
}

/**
 * Initial registration of a channel in the database using the invite code.
 * Validated by Firebase Database Security Rules.
 * @param {string} channelName 
 * @param {string} ownerUid 
 * @param {string} inviteCode 
 * @returns {Promise<void>}
 */
export async function initializeChannel(channelName, ownerUid, inviteCode) {
  const normalizedChannel = validateChannel(channelName);
  const requestRef = ref(db, `registration_requests/${normalizedChannel}`);
  const channelRef = ref(db, `canales/${normalizedChannel}`);

  // Step 1: Write to registration_requests (this checks the invite code in Security Rules)
  await set(requestRef, {
    inviteCode: inviteCode,
    ownerUid: ownerUid
  });

  // Step 2: Initialize the channel data (this checks ownerUid against registration_requests in Security Rules)
  try {
    await set(channelRef, {
      ownerUid: ownerUid,
      team: [],
      config: {
        style: "glow",
        color: "#8257e5",
        layout: "horizontal",
        circleSize: 72,
        slotGap: 8,
        itemPos: "right"
      },
      updatedAt: Date.now()
    });
  } catch (error) {
    // If channel initialization fails, clean up the registration request and propagate error
    try {
      await remove(requestRef);
    } catch (cleanupError) {
      console.error("Failed to clean up registration request:", cleanupError);
    }
    throw error;
  }

  // Step 3: Clean up the registration request since we have successfully initialized the channel
  try {
    await remove(requestRef);
  } catch (cleanupError) {
    console.warn("Failed to delete temp registration request:", cleanupError);
  }
}
