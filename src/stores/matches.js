// @ts-nocheck

import { writable } from "svelte/store";

const STORAGE_KEY = "chess_matches";

/* =========================================================
   LOAD MATCHES
========================================================= */

function loadMatches() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Failed to load matches:", error);
  }

  return [];
}


/* =========================================================
   MATCHES STORE
========================================================= */

export const matches = writable(loadMatches());


/* =========================================================
   SAVE MATCHES TO LOCAL STORAGE
========================================================= */

matches.subscribe((value) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(value)
    );
  } catch (error) {
    console.error("Failed to save matches:", error);
  }
});


/* =========================================================
   CREATE MATCH ID
========================================================= */

function createMatchId() {
  return (
    Date.now().toString() +
    "_" +
    Math.random().toString(36).substring(2, 9)
  );
}


/* =========================================================
   ADD SINGLE MATCH
========================================================= */

export function addMatch(matchData = {}) {
  const match = {
    id: createMatchId(),

    tournamentId:
      matchData.tournamentId || "",

    player1Id:
      matchData.player1Id || "",

    player2Id:
      matchData.player2Id || "",

    player1Score:
      Number(matchData.player1Score || 0),

    player2Score:
      Number(matchData.player2Score || 0),

    result:
      matchData.result || "Pending",

    status:
      matchData.status || "Scheduled",

    date:
      matchData.date || "",

    round:
      Number(matchData.round || 1),

    createdAt:
      new Date().toISOString()
  };

  matches.update((items) => {
    return [
      ...items,
      match
    ];
  });

  return match;
}


/* =========================================================
   CREATE RANDOM MATCHES FOR TOURNAMENT

   - Randomly shuffle players
   - Randomly pair players
   - Randomly select winner
   - Automatically record result
   - Automatically complete match
   - Odd player receives BYE
========================================================= */

export function createMatchesForTournament(
  tournamentId,
  playerIds = [],
  round = 1
) {
  if (
    !tournamentId ||
    !Array.isArray(playerIds) ||
    playerIds.length < 2
  ) {
    return [];
  }

  /* ---------------------------------------------------------
     COPY PLAYER IDS
  --------------------------------------------------------- */

  const shuffledPlayers = [
    ...playerIds
  ];


  /* ---------------------------------------------------------
     RANDOM SHUFFLE
  --------------------------------------------------------- */

  for (
    let i = shuffledPlayers.length - 1;
    i > 0;
    i--
  ) {
    const randomIndex =
      Math.floor(
        Math.random() * (i + 1)
      );

    [
      shuffledPlayers[i],
      shuffledPlayers[randomIndex]
    ] = [
      shuffledPlayers[randomIndex],
      shuffledPlayers[i]
    ];
  }


  /* ---------------------------------------------------------
     CREATE RANDOM PAIRS
  --------------------------------------------------------- */

  const newMatches = [];

  for (
    let i = 0;
    i < shuffledPlayers.length;
    i += 2
  ) {
    const player1Id =
      shuffledPlayers[i];

    const player2Id =
      shuffledPlayers[i + 1];


    /* -------------------------------------------------------
       ODD NUMBER OF PLAYERS

       Last player receives a BYE.
    ------------------------------------------------------- */

    if (!player2Id) {
      newMatches.push({
        id: createMatchId(),

        tournamentId,

        player1Id,

        player2Id: "",

        player1Score: 1,

        player2Score: 0,

        winnerId: player1Id,

        result: "BYE",

        status: "Bye",

        date:
          new Date().toISOString(),

        round:
          Number(round) || 1,

        createdAt:
          new Date().toISOString()
      });

      continue;
    }


    /* -------------------------------------------------------
       RANDOMLY SELECT WINNER

       0 = Player 1
       1 = Player 2
    ------------------------------------------------------- */

    const winnerIsPlayer2 =
      Math.random() < 0.5;

    let winnerId;
    let player1Score;
    let player2Score;
    let result;


    if (winnerIsPlayer2) {
      winnerId = player2Id;

      player1Score = 0;
      player2Score = 1;

      result = "Player 2 Won";
    } else {
      winnerId = player1Id;

      player1Score = 1;
      player2Score = 0;

      result = "Player 1 Won";
    }


    /* -------------------------------------------------------
       CREATE COMPLETED MATCH
    ------------------------------------------------------- */

    newMatches.push({
      id: createMatchId(),

      tournamentId,

      player1Id,

      player2Id,

      player1Score,

      player2Score,

      winnerId,

      result,

      status: "Completed",

      date:
        new Date().toISOString(),

      round:
        Number(round) || 1,

      createdAt:
        new Date().toISOString()
    });
  }


  /* ---------------------------------------------------------
     SAVE GENERATED MATCHES
  --------------------------------------------------------- */

  if (newMatches.length > 0) {
    matches.update((items) => {
      return [
        ...items,
        ...newMatches
      ];
    });
  }

  return newMatches;
}


/* =========================================================
   UPDATE MATCH
========================================================= */

export function updateMatch(
  id,
  updatedData = {}
) {
  matches.update((items) => {
    return items.map((match) => {

      if (match.id !== id) {
        return match;
      }

      return {
        ...match,

        tournamentId:
          updatedData.tournamentId ??
          match.tournamentId,

        player1Id:
          updatedData.player1Id ??
          match.player1Id,

        player2Id:
          updatedData.player2Id ??
          match.player2Id,

        player1Score:
          updatedData.player1Score !==
          undefined
            ? Number(
                updatedData.player1Score
              )
            : match.player1Score,

        player2Score:
          updatedData.player2Score !==
          undefined
            ? Number(
                updatedData.player2Score
              )
            : match.player2Score,

        result:
          updatedData.result ??
          match.result,

        status:
          updatedData.status ??
          match.status,

        date:
          updatedData.date ??
          match.date,

        round:
          updatedData.round !==
          undefined
            ? Number(
                updatedData.round
              )
            : match.round
      };
    });
  });
}


/* =========================================================
   DELETE MATCH
========================================================= */

export function deleteMatch(id) {
  matches.update((items) => {
    return items.filter((match) => {
      return match.id !== id;
    });
  });
}


/* =========================================================
   SET MATCH RESULT USING SCORES
========================================================= */

export function setMatchResult(
  id,
  player1Score,
  player2Score
) {
  const score1 =
    Number(player1Score);

  const score2 =
    Number(player2Score);

  let result = "Draw";
  let winnerId = null;

  if (score1 > score2) {
    result = "Player 1 Won";
  }

  if (score2 > score1) {
    result = "Player 2 Won";
  }

  matches.update((items) => {
    return items.map((match) => {

      if (match.id !== id) {
        return match;
      }

      if (score1 > score2) {
        winnerId = match.player1Id;
      }

      else if (score2 > score1) {
        winnerId = match.player2Id;
      }

      else {
        winnerId = null;
      }

      return {
        ...match,

        player1Score: score1,

        player2Score: score2,

        winnerId,

        result,

        status: "Completed"
      };
    });
  });
}


/* =========================================================
   SET MATCH WINNER
========================================================= */

export function setMatchWinner(
  id,
  winnerId
) {
  matches.update((items) => {
    return items.map((match) => {

      if (match.id !== id) {
        return match;
      }

      let result = "Draw";

      let player1Score =
        match.player1Score;

      let player2Score =
        match.player2Score;

      let finalWinnerId = null;


      if (
        winnerId === match.player1Id
      ) {
        result = "Player 1 Won";

        player1Score = 1;
        player2Score = 0;

        finalWinnerId =
          match.player1Id;
      }


      else if (
        winnerId === match.player2Id
      ) {
        result = "Player 2 Won";

        player1Score = 0;
        player2Score = 1;

        finalWinnerId =
          match.player2Id;
      }


      else if (
        winnerId === "draw" ||
        winnerId === null ||
        winnerId === undefined
      ) {
        result = "Draw";

        player1Score = 0.5;
        player2Score = 0.5;

        finalWinnerId = null;
      }


      return {
        ...match,

        player1Score,

        player2Score,

        winnerId: finalWinnerId,

        result,

        status: "Completed"
      };
    });
  });
}


/* =========================================================
   COMPLETE MATCH
========================================================= */

export function completeMatch(
  id,
  player1Score,
  player2Score
) {
  setMatchResult(
    id,
    player1Score,
    player2Score
  );
}


/* =========================================================
   RESET MATCH
========================================================= */

export function resetMatch(id) {
  matches.update((items) => {
    return items.map((match) => {

      if (match.id !== id) {
        return match;
      }

      return {
        ...match,

        player1Score: 0,

        player2Score: 0,

        result: "Pending",

        status: "Scheduled"
      };
    });
  });
}


/* =========================================================
   GET MATCH BY ID
========================================================= */

export function getMatchById(
  matchId
) {
  let result = null;

  const unsubscribe =
    matches.subscribe((items) => {

      result =
        items.find((match) => {
          return (
            match.id === matchId
          );
        }) || null;

    });

  unsubscribe();

  return result;
}


/* =========================================================
   GET MATCHES BY TOURNAMENT
========================================================= */

export function getMatchesByTournament(
  tournamentId
) {
  let result = [];

  const unsubscribe =
    matches.subscribe((items) => {

      result =
        items.filter((match) => {
          return (
            match.tournamentId ===
            tournamentId
          );
        });

    });

  unsubscribe();

  return result;
}


/* =========================================================
   GET MATCHES BY PLAYER
========================================================= */

export function getMatchesByPlayer(
  playerId
) {
  let result = [];

  const unsubscribe =
    matches.subscribe((items) => {

      result =
        items.filter((match) => {

          return (
            match.player1Id ===
              playerId ||
            match.player2Id ===
              playerId
          );

        });

    });

  unsubscribe();

  return result;
}


/* =========================================================
   GET TOTAL MATCH COUNT
========================================================= */

export function getMatchCount() {
  let count = 0;

  const unsubscribe =
    matches.subscribe((items) => {
      count = items.length;
    });

  unsubscribe();

  return count;
}


/* =========================================================
   GET COMPLETED MATCH COUNT
========================================================= */

export function getCompletedMatchCount() {
  let count = 0;

  const unsubscribe =
    matches.subscribe((items) => {

      count =
        items.filter((match) => {
          return (
            match.status ===
            "Completed"
          );
        }).length;

    });

  unsubscribe();

  return count;
}


/* =========================================================
   GET PENDING MATCH COUNT
========================================================= */

export function getPendingMatchCount() {
  let count = 0;

  const unsubscribe =
    matches.subscribe((items) => {

      count =
        items.filter((match) => {
          return (
            match.status !==
            "Completed"
          );
        }).length;

    });

  unsubscribe();

  return count;
}


/* =========================================================
   CLEAR TOURNAMENT MATCHES
========================================================= */

export function clearTournamentMatches(
  tournamentId
) {
  matches.update((items) => {

    return items.filter((match) => {
      return (
        match.tournamentId !==
        tournamentId
      );
    });

  });
}


/* =========================================================
   CLEAR ALL MATCHES
========================================================= */

export function clearMatches() {
  matches.set([]);
}