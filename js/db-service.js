import { db, auth } from "./firebase-config.js";
import { ref, set, get, onValue, off } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const CHANNELS_ROOT = "canales";

/**
 * Build the Firebase path for a given channel
 */
function channelPath(channelName) {
  return `${CHANNELS_ROOT}/${channelName.toLowerCase().trim()}`;
}

/**
 * Save team configuration to Firebase
 * @param {string} channelName 
 * @param {object} teamData - { slots: [{pokemonKey, itemKey, shiny}], config: {style, color, layout} }
 * @returns {Promise<void>}
 */
export async function saveTeamConfig(channelName, teamData) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("You must be logged in to save.");
  }
  const path = channelPath(channelName);
  await set(ref(db, path), {
    team: teamData.slots,
    config: teamData.config,
    updatedAt: Date.now()
  });
}

/**
 * Read team configuration from Firebase (one-time)
 * @param {string} channelName 
 * @returns {Promise<object|null>}
 */
export async function getTeamConfig(channelName) {
  const snapshot = await get(ref(db, channelPath(channelName)));
  return snapshot.val();
}

/**
 * Subscribe to real-time updates for a channel
 * @param {string} channelName 
 * @param {function} onData - callback with data object
 * @returns {function} unsubscribe function
 */
export function subscribeChannel(channelName, onData) {
  const path = channelPath(channelName);
  const dbRef = ref(db, path);
  onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    onData(data);
  });
  return () => off(dbRef);
}
