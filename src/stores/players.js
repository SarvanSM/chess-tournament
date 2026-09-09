// @ts-nocheck

import { writable } from "svelte/store";

const savedPlayers = localStorage.getItem("chess_players");

const initialPlayers = savedPlayers
  ? JSON.parse(savedPlayers)
  : [];

export const players = writable(initialPlayers);

players.subscribe((value) => {
  localStorage.setItem("chess_players", JSON.stringify(value));
});

export function addPlayer(player) {
  players.update((currentPlayers) => [
    ...currentPlayers,
    {
      ...player,
      id: crypto.randomUUID()
    }
  ]);
}

export function updatePlayer(id, updatedPlayer) {
  players.update((currentPlayers) =>
    currentPlayers.map((player) =>
      player.id === id
        ? {
            ...player,
            ...updatedPlayer
          }
        : player
    )
  );
}

export function deletePlayer(id) {
  players.update((currentPlayers) =>
    currentPlayers.filter((player) => player.id !== id)
  );
}