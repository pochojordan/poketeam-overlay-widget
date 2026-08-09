const PREFIX = "saved_teams_";

function storageKey(channelName) {
  return `${PREFIX}${channelName}`;
}

export function loadTeams(channelName) {
  try {
    const raw = localStorage.getItem(storageKey(channelName));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to load saved teams:", error);
    return [];
  }
}

export function persistTeams(channelName, teams) {
  localStorage.setItem(storageKey(channelName), JSON.stringify(teams));
}

export function makeTeamId() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}
