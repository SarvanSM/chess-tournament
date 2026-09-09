// @ts-nocheck

import { writable } from "svelte/store";

const STORAGE_KEY = "chess_tournaments";

// Load tournaments from localStorage
function loadTournaments() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error("Failed to load tournaments:", error);
  }

  return [];
}

// Tournament store
export const tournaments = writable(loadTournaments());

// Save tournaments to localStorage whenever the store changes
tournaments.subscribe((value) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch (error) {
    console.error("Failed to save tournaments:", error);
  }
});

// Create a new tournament
export function addTournament(tournamentData) {
  const tournament = {
    id: Date.now().toString(),
    name: tournamentData.name.trim(),
    date: tournamentData.date,
    description: tournamentData.description?.trim() || "",
    status: tournamentData.status || "Upcoming",
    playerIds: [],
    createdAt: new Date().toISOString()
  };

  tournaments.update((items) => {
    return [...items, tournament];
  });

  return tournament;
}

// Update an existing tournament
export function updateTournament(id, updatedData) {
  tournaments.update((items) => {
    return items.map((tournament) => {
      if (tournament.id !== id) {
        return tournament;
      }

      return {
        ...tournament,
        name: updatedData.name.trim(),
        date: updatedData.date,
        description: updatedData.description?.trim() || "",
        status: updatedData.status || tournament.status
      };
    });
  });
}

// Delete a tournament
export function deleteTournament(id) {
  tournaments.update((items) => {
    return items.filter((tournament) => {
      return tournament.id !== id;
    });
  });
}

// Add a player to a tournament
export function addPlayerToTournament(tournamentId, playerId) {
  tournaments.update((items) => {
    return items.map((tournament) => {
      if (tournament.id !== tournamentId) {
        return tournament;
      }

      // Don't add the same player twice
      if (tournament.playerIds.includes(playerId)) {
        return tournament;
      }

      return {
        ...tournament,
        playerIds: [
          ...tournament.playerIds,
          playerId
        ]
      };
    });
  });
}

// Remove a player from a tournament
export function removePlayerFromTournament(tournamentId, playerId) {
  tournaments.update((items) => {
    return items.map((tournament) => {
      if (tournament.id !== tournamentId) {
        return tournament;
      }

      return {
        ...tournament,
        playerIds: tournament.playerIds.filter((id) => {
          return id !== playerId;
        })
      };
    });
  });
}

// Set all players for a tournament
export function setTournamentPlayers(tournamentId, playerIds) {
  tournaments.update((items) => {
    return items.map((tournament) => {
      if (tournament.id !== tournamentId) {
        return tournament;
      }

      return {
        ...tournament,
        playerIds: [...playerIds]
      };
    });
  });
}

// Get a tournament by ID
export function getTournamentById(tournamentId) {
  let result = null;

  const unsubscribe = tournaments.subscribe((items) => {
    result =
      items.find((tournament) => {
        return tournament.id === tournamentId;
      }) || null;
  });

  unsubscribe();

  return result;
}