<script>
  import { onMount } from "svelte";
  import { matches } from "../stores/matches.js";

  // =========================================================
  // STATE
  // =========================================================

  let players = [];
  let tournaments = [];

  let searchText = "";
  let selectedTournament = "All";

  // =========================================================
  // LOAD PLAYERS
  // =========================================================

  function loadPlayers() {
    try {
      const saved = localStorage.getItem("chess_players");

      if (!saved) {
        return [];
      }

      const parsed = JSON.parse(saved);

      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Failed to load players:", error);
      return [];
    }
  }

  // =========================================================
  // LOAD TOURNAMENTS
  // =========================================================

  function loadTournaments() {
    try {
      const saved = localStorage.getItem("chess_tournaments");

      if (!saved) {
        return [];
      }

      const parsed = JSON.parse(saved);

      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Failed to load tournaments:", error);
      return [];
    }
  }

  // =========================================================
  // REFRESH DATA
  // =========================================================

  function refreshData() {
    players = loadPlayers();
    tournaments = loadTournaments();
  }

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  onMount(() => {
    refreshData();
  });

  // =========================================================
  // PLAYER NAME
  // =========================================================

  function getPlayerName(playerId) {
    if (
      playerId === null ||
      playerId === undefined ||
      playerId === ""
    ) {
      return "Unknown Player";
    }

    const player = players.find(
      (item) =>
        String(item.id) === String(playerId)
    );

    if (!player) {
      return "Unknown Player";
    }

    return (
      player.name ||
      player.fullName ||
      player.playerName ||
      player.username ||
      player.email ||
      "Unknown Player"
    );
  }

  // =========================================================
  // TOURNAMENT NAME
  // =========================================================

  function getTournamentName(tournamentId) {
    if (
      tournamentId === null ||
      tournamentId === undefined ||
      tournamentId === ""
    ) {
      return "Unknown Tournament";
    }

    const tournament = tournaments.find(
      (item) =>
        String(item.id) ===
        String(tournamentId)
    );

    if (!tournament) {
      return "Unknown Tournament";
    }

    return (
      tournament.name ||
      tournament.title ||
      tournament.tournamentName ||
      "Unnamed Tournament"
    );
  }

  // =========================================================
  // CREATE PLAYER STATISTICS
  // =========================================================

  function calculateRankings(allMatches) {
    const rankingMap = {};

    // -------------------------------------------------------
    // CREATE ENTRIES FOR ALL CURRENT PLAYERS
    // -------------------------------------------------------

    players.forEach((player) => {
      rankingMap[String(player.id)] = {
        playerId: player.id,

        name:
          player.name ||
          player.fullName ||
          player.playerName ||
          player.username ||
          player.email ||
          "Unknown Player",

        points: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        matchesPlayed: 0
      };
    });

    // -------------------------------------------------------
    // PROCESS ONLY COMPLETED MATCHES
    // -------------------------------------------------------

    allMatches
      .filter(
        (match) =>
          match &&
          String(match.status).toLowerCase() ===
            "completed"
      )
      .forEach((match) => {
        const player1Id =
          match.player1Id !== null &&
          match.player1Id !== undefined &&
          match.player1Id !== ""
            ? String(match.player1Id)
            : null;

        const player2Id =
          match.player2Id !== null &&
          match.player2Id !== undefined &&
          match.player2Id !== ""
            ? String(match.player2Id)
            : null;

        // ---------------------------------------------------
        // IGNORE INVALID / BYE MATCHES
        // ---------------------------------------------------

        if (!player1Id || !player2Id) {
          return;
        }

        // ---------------------------------------------------
        // GET PLAYER RECORDS
        // ---------------------------------------------------

        const player1 = rankingMap[player1Id];
        const player2 = rankingMap[player2Id];

        // ---------------------------------------------------
        // IMPORTANT:
        // Do NOT let one invalid match break the whole
        // "All Tournaments" ranking calculation.
        // ---------------------------------------------------

        if (!player1 && !player2) {
          return;
        }

        // If only one player exists, we cannot safely
        // calculate a normal two-player result.
        if (!player1 || !player2) {
          return;
        }

        // ---------------------------------------------------
        // MATCHES PLAYED
        // ---------------------------------------------------

        player1.matchesPlayed += 1;
        player2.matchesPlayed += 1;

        // ---------------------------------------------------
        // READ SCORES
        // ---------------------------------------------------

        const score1 = Number(
          match.player1Score ?? 0
        );

        const score2 = Number(
          match.player2Score ?? 0
        );

        // ---------------------------------------------------
        // PLAYER 1 WINS
        // ---------------------------------------------------

        if (score1 > score2) {
          player1.wins += 1;
          player1.points += 1;

          player2.losses += 1;

          return;
        }

        // ---------------------------------------------------
        // PLAYER 2 WINS
        // ---------------------------------------------------

        if (score2 > score1) {
          player2.wins += 1;
          player2.points += 1;

          player1.losses += 1;

          return;
        }

        // ---------------------------------------------------
        // DRAW
        // ---------------------------------------------------

        player1.draws += 1;
        player2.draws += 1;

        player1.points += 0.5;
        player2.points += 0.5;
      });

    // -------------------------------------------------------
    // ONLY RETURN PLAYERS WHO ACTUALLY PLAYED
    // -------------------------------------------------------

    return Object.values(rankingMap)
      .filter(
        (player) =>
          player.matchesPlayed > 0
      )
      .sort((a, b) => {
        // 1. Points
        if (b.points !== a.points) {
          return b.points - a.points;
        }

        // 2. Wins
        if (b.wins !== a.wins) {
          return b.wins - a.wins;
        }

        // 3. Matches played
        if (
          b.matchesPlayed !==
          a.matchesPlayed
        ) {
          return (
            b.matchesPlayed -
            a.matchesPlayed
          );
        }

        // 4. Alphabetical
        return a.name.localeCompare(
          b.name
        );
      });
  }

  // =========================================================
  // TOURNAMENT FILTER
  // =========================================================

  $: tournamentMatches =
    selectedTournament === "All"
      ? $matches
      : $matches.filter(
          (match) =>
            String(match.tournamentId) ===
            String(selectedTournament)
        );

  // =========================================================
  // CALCULATE RANKINGS
  // =========================================================

  $: rankings =
    calculateRankings(
      tournamentMatches
    );

  // =========================================================
  // SEARCH FILTER
  // =========================================================

  $: filteredRankings =
    rankings.filter((player) => {
      const search =
        searchText
          .trim()
          .toLowerCase();

      if (!search) {
        return true;
      }

      return player.name
        .toLowerCase()
        .includes(search);
    });

  // =========================================================
  // TOP PLAYERS
  // =========================================================

  $: firstPlace =
    filteredRankings[0] || null;

  $: secondPlace =
    filteredRankings[1] || null;

  $: thirdPlace =
    filteredRankings[2] || null;

  // =========================================================
  // COMPLETED MATCHES
  // =========================================================

  $: completedMatches =
    tournamentMatches.filter(
      (match) =>
        match &&
        String(match.status).toLowerCase() ===
          "completed"
    ).length;

  // =========================================================
  // RANKED PLAYERS
  // =========================================================

  $: rankedPlayers =
    filteredRankings.length;

  // =========================================================
  // FORMAT POINTS
  // =========================================================

  function formatPoints(points) {
    if (Number.isInteger(points)) {
      return points;
    }

    return Number(points).toFixed(1);
  }

  // =========================================================
  // INITIALS
  // =========================================================

  function getInitials(name) {
    if (!name) {
      return "?";
    }

    const parts =
      name
        .trim()
        .split(/\s+/);

    if (parts.length === 1) {
      return parts[0]
        .charAt(0)
        .toUpperCase();
    }

    return (
      parts[0].charAt(0) +
      parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }

  // =========================================================
  // CLEAR FILTERS
  // =========================================================

  function clearFilters() {
    searchText = "";
    selectedTournament = "All";
  }
</script>


<!-- =========================================================
     PAGE
========================================================= -->

<div class="rankings-page">

  <!-- =======================================================
       HEADER
  ======================================================== -->

  <div class="page-header">

    <div>

      <div class="eyebrow">
        CHESS TOURNAMENT
      </div>

      <h1>
        Rankings
      </h1>

      <p>
        Track player performance and tournament standings.
      </p>

    </div>

  </div>


  <!-- =======================================================
       STATISTICS
  ======================================================== -->

  <div class="stats-grid">

    <div class="stat-card">

      <div class="stat-icon">
        🏆
      </div>

      <div>

        <span>
          Ranked Players
        </span>

        <strong>
          {rankedPlayers}
        </strong>

      </div>

    </div>


    <div class="stat-card">

      <div class="stat-icon">
        ⚔
      </div>

      <div>

        <span>
          Completed Matches
        </span>

        <strong>
          {completedMatches}
        </strong>

      </div>

    </div>


    <div class="stat-card">

      <div class="stat-icon">
        🥇
      </div>

      <div>

        <span>
          Leader
        </span>

        <strong>
          {firstPlace
            ? firstPlace.name
            : "-"}
        </strong>

      </div>

    </div>


    <div class="stat-card">

      <div class="stat-icon">
        ⭐
      </div>

      <div>

        <span>
          Leader Points
        </span>

        <strong>
          {firstPlace
            ? formatPoints(
                firstPlace.points
              )
            : "0"}
        </strong>

      </div>

    </div>

  </div>


  <!-- =======================================================
       FILTERS
  ======================================================== -->

  <div class="filter-card">

    <div class="search-wrapper">

      <span>
        ⌕
      </span>

      <input
        type="text"
        placeholder="Search player..."
        bind:value={searchText}
      />

    </div>


    <select
      bind:value={selectedTournament}
    >

      <option value="All">
        All Tournaments
      </option>

      {#each tournaments as tournament}

        <option value={tournament.id}>
          {tournament.name ||
            tournament.title ||
            tournament.tournamentName ||
            "Unnamed Tournament"}
        </option>

      {/each}

    </select>


    {#if searchText || selectedTournament !== "All"}

      <button
        class="clear-button"
        on:click={clearFilters}
      >
        Clear
      </button>

    {/if}

  </div>


  <!-- =======================================================
       RANKINGS CONTENT
  ======================================================== -->

  {#if filteredRankings.length > 0}

    <!-- =====================================================
         PODIUM
    ====================================================== -->

    <div class="podium-section">

      <div class="section-heading">

        <div>

          <div class="eyebrow">
            TOP PLAYERS
          </div>

          <h2>
            Tournament Leaders
          </h2>

        </div>

      </div>


      <div class="podium">

        <!-- SECOND PLACE -->

        {#if secondPlace}

          <div class="podium-player second">

            <div class="rank-number">
              2
            </div>

            <div class="podium-avatar">
              {getInitials(
                secondPlace.name
              )}
            </div>

            <h3>
              {secondPlace.name}
            </h3>

            <p>
              {formatPoints(
                secondPlace.points
              )}
              points
            </p>

            <div class="podium-base">
              <span>
                🥈
              </span>
            </div>

          </div>

        {/if}


        <!-- FIRST PLACE -->

        {#if firstPlace}

          <div class="podium-player first">

            <div class="crown">
              👑
            </div>

            <div class="rank-number">
              1
            </div>

            <div class="podium-avatar">
              {getInitials(
                firstPlace.name
              )}
            </div>

            <h3>
              {firstPlace.name}
            </h3>

            <p>
              {formatPoints(
                firstPlace.points
              )}
              points
            </p>

            <div class="podium-base">
              <span>
                🥇
              </span>
            </div>

          </div>

        {/if}


        <!-- THIRD PLACE -->

        {#if thirdPlace}

          <div class="podium-player third">

            <div class="rank-number">
              3
            </div>

            <div class="podium-avatar">
              {getInitials(
                thirdPlace.name
              )}
            </div>

            <h3>
              {thirdPlace.name}
            </h3>

            <p>
              {formatPoints(
                thirdPlace.points
              )}
              points
            </p>

            <div class="podium-base">
              <span>
                🥉
              </span>
            </div>

          </div>

        {/if}

      </div>

    </div>


    <!-- =====================================================
         LEADERBOARD
    ====================================================== -->

    <div class="leaderboard-card">

      <div class="leaderboard-header">

        <div>

          <div class="eyebrow">
            LEADERBOARD
          </div>

          <h2>
            Player Standings
          </h2>

        </div>

        <span class="player-total">
          {filteredRankings.length}
          players
        </span>

      </div>


      <div class="table-wrapper">

        <table>

          <thead>

            <tr>

              <th>
                RANK
              </th>

              <th>
                PLAYER
              </th>

              <th>
                MATCHES
              </th>

              <th>
                WINS
              </th>

              <th>
                DRAWS
              </th>

              <th>
                LOSSES
              </th>

              <th>
                POINTS
              </th>

            </tr>

          </thead>


          <tbody>

            {#each filteredRankings as player, index}

              <tr>

                <!-- RANK -->

                <td>

                  <div class="rank-cell">

                    {#if index === 0}

                      <span class="medal">
                        🥇
                      </span>

                    {:else if index === 1}

                      <span class="medal">
                        🥈
                      </span>

                    {:else if index === 2}

                      <span class="medal">
                        🥉
                      </span>

                    {:else}

                      <span class="rank-text">
                        {index + 1}
                      </span>

                    {/if}

                  </div>

                </td>


                <!-- PLAYER -->

                <td>

                  <div class="player-cell">

                    <div class="player-avatar">
                      {getInitials(
                        player.name
                      )}
                    </div>

                    <strong>
                      {player.name}
                    </strong>

                  </div>

                </td>


                <!-- MATCHES -->

                <td>
                  {player.matchesPlayed}
                </td>


                <!-- WINS -->

                <td>

                  <span class="win-text">
                    {player.wins}
                  </span>

                </td>


                <!-- DRAWS -->

                <td>

                  <span class="draw-text">
                    {player.draws}
                  </span>

                </td>


                <!-- LOSSES -->

                <td>

                  <span class="loss-text">
                    {player.losses}
                  </span>

                </td>


                <!-- POINTS -->

                <td>

                  <strong class="points">
                    {formatPoints(
                      player.points
                    )}
                  </strong>

                </td>

              </tr>

            {/each}

          </tbody>

        </table>

      </div>

    </div>

  {:else}

    <!-- =====================================================
         EMPTY STATE
    ====================================================== -->

    <div class="empty-card">

      <div class="empty-icon">
        🏆
      </div>

      <h2>
        No rankings yet
      </h2>

      <p>
        Rankings will appear after completed matches are recorded.
      </p>

    </div>

  {/if}

</div>


<style>

  /* =========================================================
     PAGE
  ========================================================= */

  .rankings-page {
    width: 100%;
  }


  /* =========================================================
     HEADER
  ========================================================= */

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 28px;
  }

  .eyebrow {
    color: #a37a2c;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 1.5px;
    margin-bottom: 7px;
  }

  .page-header h1 {
    font-family: "Playfair Display", serif;
    font-size: 38px;
    line-height: 1.1;
    color: #171717;
    margin-bottom: 8px;
  }

  .page-header p {
    color: #7d7d7d;
    font-size: 14px;
  }


  /* =========================================================
     STATS
  ========================================================= */

  .stats-grid {
    display: grid;
    grid-template-columns:
      repeat(4, minmax(0, 1fr));

    gap: 16px;

    margin-bottom: 22px;
  }

  .stat-card {
    background: #ffffff;
    border: 1px solid #e4ddd1;
    border-radius: 16px;
    padding: 20px;

    display: flex;
    align-items: center;
    gap: 15px;

    min-width: 0;
  }

  .stat-icon {
    width: 46px;
    height: 46px;

    border-radius: 13px;

    background: #f5ead4;

    display: flex;
    align-items: center;
    justify-content: center;

    font-size: 21px;

    flex-shrink: 0;
  }

  .stat-card span {
    display: block;
    color: #7d7d7d;
    font-size: 12px;
    margin-bottom: 5px;
  }

  .stat-card strong {
    display: block;
    color: #171717;
    font-family: "Playfair Display", serif;
    font-size: 21px;

    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    max-width: 150px;
  }


  /* =========================================================
     FILTERS
  ========================================================= */

  .filter-card {
    background: #ffffff;
    border: 1px solid #e4ddd1;
    border-radius: 16px;

    padding: 16px;

    display: flex;
    align-items: center;
    gap: 12px;

    margin-bottom: 24px;
  }

  .search-wrapper {
    position: relative;
    flex: 1;
  }

  .search-wrapper span {
    position: absolute;

    left: 14px;
    top: 50%;

    transform: translateY(-50%);

    color: #8c8c8c;
    font-size: 18px;
  }

  .search-wrapper input {
    width: 100%;

    height: 42px;

    border: 1px solid #ddd4c7;
    border-radius: 10px;

    padding:
      0
      14px
      0
      40px;

    font-family: inherit;
    font-size: 13px;

    outline: none;
  }

  .search-wrapper input:focus {
    border-color: #d8b56a;
  }

  .filter-card select {
    height: 42px;

    min-width: 220px;

    border: 1px solid #ddd4c7;
    border-radius: 10px;

    background: white;

    padding: 0 12px;

    font-family: inherit;
    font-size: 13px;

    outline: none;
  }

  .filter-card select:focus {
    border-color: #d8b56a;
  }

  .clear-button {
    height: 42px;

    padding: 0 16px;

    border: none;
    border-radius: 10px;

    background: #171717;
    color: white;

    font-weight: 700;
    font-size: 12px;

    cursor: pointer;
  }

  .clear-button:hover {
    opacity: 0.9;
  }


  /* =========================================================
     PODIUM
  ========================================================= */

  .podium-section {
    background: #ffffff;

    border: 1px solid #e4ddd1;
    border-radius: 18px;

    padding: 28px;

    margin-bottom: 24px;
  }

  .section-heading {
    margin-bottom: 20px;
  }

  .section-heading h2 {
    font-family: "Playfair Display", serif;
    font-size: 25px;
    color: #171717;
  }

  .podium {
    min-height: 330px;

    display: flex;
    align-items: flex-end;
    justify-content: center;

    gap: 22px;

    padding-top: 30px;
  }

  .podium-player {
    width: 220px;

    text-align: center;

    position: relative;
  }

  .podium-player h3 {
    margin-top: 11px;

    font-size: 15px;
    color: #171717;
  }

  .podium-player p {
    margin-top: 4px;

    font-size: 13px;
    color: #8a8a8a;
  }

  .podium-avatar {
    width: 68px;
    height: 68px;

    margin: 0 auto;

    border-radius: 50%;

    background: #f1e4ca;

    color: #76551e;

    display: flex;
    align-items: center;
    justify-content: center;

    font-size: 20px;
    font-weight: 800;
  }

  .first .podium-avatar {
    width: 82px;
    height: 82px;

    border: 4px solid #d8b56a;

    font-size: 24px;
  }

  .rank-number {
    position: absolute;

    top: -14px;
    left: 50%;

    transform: translateX(-50%);

    width: 28px;
    height: 28px;

    border-radius: 50%;

    background: #171717;
    color: white;

    display: flex;
    align-items: center;
    justify-content: center;

    font-size: 12px;
    font-weight: 800;

    z-index: 2;
  }

  .first .rank-number {
    background: #d8b56a;
    color: #171717;
  }

  .crown {
    font-size: 25px;
    margin-bottom: 7px;
  }

  .podium-base {
    margin-top: 15px;

    border-radius: 12px 12px 0 0;

    background: #f5ead4;

    display: flex;
    align-items: center;
    justify-content: center;

    font-size: 26px;
  }

  .first .podium-base {
    height: 125px;
  }

  .second .podium-base {
    height: 95px;
  }

  .third .podium-base {
    height: 75px;
  }


  /* =========================================================
     LEADERBOARD
  ========================================================= */

  .leaderboard-card {
    background: #ffffff;

    border: 1px solid #e4ddd1;
    border-radius: 18px;

    overflow: hidden;
  }

  .leaderboard-header {
    padding: 22px 24px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    border-bottom: 1px solid #ebe4da;
  }

  .leaderboard-header h2 {
    font-family: "Playfair Display", serif;
    font-size: 25px;
    color: #171717;
  }

  .player-total {
    color: #8a8a8a;
    font-size: 12px;
  }

  .table-wrapper {
    overflow-x: auto;
  }

  table {
    width: 100%;

    border-collapse: collapse;

    min-width: 760px;
  }

  th {
    text-align: left;

    padding: 14px 20px;

    background: #faf8f4;

    color: #8a8a8a;

    font-size: 10px;
    font-weight: 800;

    letter-spacing: 1px;

    border-bottom: 1px solid #ebe4da;
  }

  td {
    padding: 16px 20px;

    color: #555;

    font-size: 13px;

    border-bottom: 1px solid #f0ebe4;
  }

  tbody tr:hover {
    background: #fcfaf6;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  .rank-cell {
    width: 50px;

    display: flex;
    align-items: center;
  }

  .medal {
    font-size: 21px;
  }

  .rank-text {
    font-weight: 800;
    color: #777;
    padding-left: 6px;
  }

  .player-cell {
    display: flex;
    align-items: center;
    gap: 11px;
  }

  .player-avatar {
    width: 34px;
    height: 34px;

    border-radius: 50%;

    background: #f1e4ca;

    color: #76551e;

    display: flex;
    align-items: center;
    justify-content: center;

    font-size: 11px;
    font-weight: 800;

    flex-shrink: 0;
  }

  .player-cell strong {
    color: #171717;
    font-size: 13px;
  }

  .win-text {
    color: #3c8055;
    font-weight: 700;
  }

  .draw-text {
    color: #9a7b35;
    font-weight: 700;
  }

  .loss-text {
    color: #a04c4c;
    font-weight: 700;
  }

  .points {
    color: #171717;

    font-family: "Playfair Display", serif;

    font-size: 17px;
  }


  /* =========================================================
     EMPTY
  ========================================================= */

  .empty-card {
    min-height: 350px;

    background: #ffffff;

    border: 1px solid #e4ddd1;
    border-radius: 18px;

    display: flex;
    flex-direction: column;

    align-items: center;
    justify-content: center;

    text-align: center;

    padding: 40px;
  }

  .empty-icon {
    width: 70px;
    height: 70px;

    border-radius: 20px;

    background: #f5ead4;

    display: flex;
    align-items: center;
    justify-content: center;

    font-size: 30px;

    margin-bottom: 18px;
  }

  .empty-card h2 {
    font-family: "Playfair Display", serif;

    font-size: 26px;

    margin-bottom: 8px;
  }

  .empty-card p {
    color: #8a8a8a;
    font-size: 13px;
  }


  /* =========================================================
     RESPONSIVE
  ========================================================= */

  @media (max-width: 1000px) {

    .stats-grid {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

  }


  @media (max-width: 700px) {

    .filter-card {
      flex-direction: column;
      align-items: stretch;
    }

    .filter-card select {
      width: 100%;
    }

    .podium {
      gap: 8px;
    }

    .podium-player {
      width: 30%;
    }

  }


  @media (max-width: 560px) {

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .podium-section {
      padding: 18px;
    }

    .podium {
      gap: 4px;
    }

    .podium-player h3 {
      font-size: 12px;
    }

    .podium-player p {
      font-size: 11px;
    }

    .podium-avatar {
      width: 58px;
      height: 58px;
      font-size: 17px;
    }

    .first .podium-avatar {
      width: 68px;
      height: 68px;
      font-size: 20px;
    }

  }

</style>