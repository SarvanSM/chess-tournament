<script>
  import {
    matches,
    addMatch,
    updateMatch,
    deleteMatch,
    setMatchResult,
    createMatchesForTournament
  } from "../stores/matches.js";

  import { tournaments } from "../stores/tournaments.js";
  import { players } from "../stores/players.js";


  // =========================================================
  // STATE
  // =========================================================

  let showModal = false;
  let editingMatch = null;

  let searchText = "";
  let statusFilter = "All";
  let tournamentFilter = "All";

  let selectedTournament = "";
  let selectedPlayer1 = "";
  let selectedPlayer2 = "";

  let round = 1;
  let matchDate = "";

  let player1Score = 0;
  let player2Score = 0;

  let matchStatus = "Scheduled";


  // =========================================================
  // PLAYER HELPERS
  // =========================================================

  function getPlayerName(playerId) {
    const player = $players.find(
      (item) => item.id === playerId
    );

    if (!player) {
      return "Unknown Player";
    }

    if (player.name) {
      return player.name;
    }

    const fullName =
      `${player.firstName || ""} ${player.lastName || ""}`.trim();

    return fullName || "Unknown Player";
  }


  function getPlayerInitials(playerId) {
    const name = getPlayerName(playerId);

    if (!name || name === "Unknown Player") {
      return "?";
    }

    const parts = name.trim().split(/\s+/);

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return (
      parts[0].charAt(0) +
      parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }


  // =========================================================
  // TOURNAMENT HELPERS
  // =========================================================

  function getTournamentName(tournamentId) {
    const tournament = $tournaments.find(
      (item) =>
        String(item.id) ===
        String(tournamentId)
    );

    return tournament?.name || "Unknown Tournament";
  }


  function getTournamentPlayers(tournamentId) {
    const tournament = $tournaments.find(
      (item) =>
        String(item.id) ===
        String(tournamentId)
    );

    if (
      !tournament ||
      !Array.isArray(tournament.playerIds)
    ) {
      return [];
    }

    return $players.filter((player) =>
      tournament.playerIds.includes(player.id)
    );
  }


  // =========================================================
  // RESULT / STATUS
  // =========================================================

  function getResult(match) {
    return match.result || "Pending";
  }


  function getStatusClass(status) {
    if (status === "Completed") {
      return "completed";
    }

    if (status === "Ongoing") {
      return "ongoing";
    }

    return "scheduled";
  }


  // =========================================================
  // AUTOMATIC TODAY STATUS
  // =========================================================

  function getTodayDateKey() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }


  function getMatchDateKey(date) {
    if (!date) {
      return "";
    }

    // Dates created by the date input are already YYYY-MM-DD.
    // For timestamp values, only the calendar-date portion is used.
    return String(date).slice(0, 10);
  }


  function updateTodayPendingMatches() {
    const today = getTodayDateKey();

    $matches.forEach((match) => {
      if (
        match.status === "Scheduled" &&
        match.result === "Pending" &&
        getMatchDateKey(match.date) === today
      ) {
        updateMatch(match.id, {
          status: "Ongoing"
        });
      }
    });
  }


  // Keep pending matches scheduled for future dates, but automatically
  // move today's pending matches to Ongoing. Completed matches are never changed.
  $: updateTodayPendingMatches();


  // =========================================================
  // DATE
  // =========================================================

  function formatDate(date) {
    if (!date) {
      return "—";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }


  // =========================================================
  // FILTERING
  // =========================================================

  $: filteredMatches = $matches.filter((match) => {

    const search =
      searchText.toLowerCase().trim();

    const matchesSearch =
      !search ||
      getTournamentName(match.tournamentId)
        .toLowerCase()
        .includes(search) ||
      getPlayerName(match.player1Id)
        .toLowerCase()
        .includes(search) ||
      getPlayerName(match.player2Id)
        .toLowerCase()
        .includes(search) ||
      getResult(match)
        .toLowerCase()
        .includes(search);

    const matchesStatus =
      statusFilter === "All" ||
      match.status === statusFilter;

    const matchesTournament =
      tournamentFilter === "All" ||
      String(match.tournamentId) ===
      String(tournamentFilter);

    return (
      matchesSearch &&
      matchesStatus &&
      matchesTournament
    );
  });


  // =========================================================
  // STATISTICS
  // =========================================================

  $: totalMatches = $matches.length;

  $: completedMatches =
    $matches.filter(
      (match) => match.status === "Completed"
    ).length;

  $: ongoingMatches =
    $matches.filter(
      (match) => match.status === "Ongoing"
    ).length;

  $: scheduledMatches =
    $matches.filter(
      (match) => match.status === "Scheduled"
    ).length;


  // =========================================================
  // MODAL
  // =========================================================

  function resetForm() {
    editingMatch = null;

    selectedTournament = "";
    selectedPlayer1 = "";
    selectedPlayer2 = "";

    round = 1;
    matchDate = "";

    player1Score = 0;
    player2Score = 0;

    matchStatus = "Scheduled";
  }


  function openCreateModal() {
    resetForm();

    showModal = true;
  }


  function openEditModal(match) {
    editingMatch = match;

    selectedTournament =
      match.tournamentId || "";

    selectedPlayer1 =
      match.player1Id || "";

    selectedPlayer2 =
      match.player2Id || "";

    round =
      Number(match.round || 1);

    matchDate =
      match.date || "";

    player1Score =
      Number(match.player1Score || 0);

    player2Score =
      Number(match.player2Score || 0);

    matchStatus =
      match.status || "Scheduled";

    showModal = true;
  }


  function closeModal() {
    showModal = false;

    resetForm();
  }


  // =========================================================
  // TOURNAMENT CHANGE
  // =========================================================

  function handleTournamentChange() {
    selectedPlayer1 = "";
    selectedPlayer2 = "";
  }


  // =========================================================
  // SAVE MATCH
  // =========================================================

  function saveMatch() {

    if (!selectedTournament) {
      alert("Please select a tournament.");
      return;
    }

    if (!selectedPlayer1) {
      alert("Please select Player 1.");
      return;
    }

    if (!selectedPlayer2) {
      alert("Please select Player 2.");
      return;
    }

    if (
      selectedPlayer1 ===
      selectedPlayer2
    ) {
      alert(
        "Player 1 and Player 2 cannot be the same player."
      );

      return;
    }

    if (Number(round) < 1) {
      alert("Round must be at least 1.");
      return;
    }

    if (
      Number(player1Score) < 0 ||
      Number(player2Score) < 0
    ) {
      alert("Scores cannot be negative.");
      return;
    }


    // EDIT
    if (editingMatch) {

      let result =
        editingMatch.result || "Pending";

      if (matchStatus === "Completed") {

        if (
          Number(player1Score) >
          Number(player2Score)
        ) {
          result = "Player 1 Won";
        }

        else if (
          Number(player2Score) >
          Number(player1Score)
        ) {
          result = "Player 2 Won";
        }

        else {
          result = "Draw";
        }
      }

      else {
        result = "Pending";
      }


      updateMatch(
        editingMatch.id,
        {
          tournamentId:
            selectedTournament,

          player1Id:
            selectedPlayer1,

          player2Id:
            selectedPlayer2,

          player1Score:
            Number(player1Score),

          player2Score:
            Number(player2Score),

          result,

          status:
            matchStatus,

          date:
            matchDate,

          round:
            Number(round)
        }
      );
    }


    // CREATE
    else {

      let result = "Pending";

      if (matchStatus === "Completed") {

        if (
          Number(player1Score) >
          Number(player2Score)
        ) {
          result = "Player 1 Won";
        }

        else if (
          Number(player2Score) >
          Number(player1Score)
        ) {
          result = "Player 2 Won";
        }

        else {
          result = "Draw";
        }
      }


      addMatch({
        tournamentId:
          selectedTournament,

        player1Id:
          selectedPlayer1,

        player2Id:
          selectedPlayer2,

        player1Score:
          Number(player1Score),

        player2Score:
          Number(player2Score),

        result,

        status:
          matchStatus,

        date:
          matchDate,

        round:
          Number(round)
      });
    }


    closeModal();
  }


  // =========================================================
  // GENERATE TOURNAMENT MATCHES
  // =========================================================

  function generateMatches(tournament) {

  if (!tournament) {
    alert(
      "Please select a valid tournament."
    );

    return;
  }


  if (
    !Array.isArray(tournament.playerIds)
  ) {
    alert(
      "This tournament has no registered players."
    );

    return;
  }


  const validPlayerIds =
    tournament.playerIds.filter((playerId) => {

      return $players.some((player) => {

        return String(player.id) ===
          String(playerId);

      });

    });


  if (validPlayerIds.length < 2) {

    alert(
      "This tournament needs at least 2 valid players."
    );

    return;
  }


  // -------------------------------------------------------
  // GET ALL EXISTING MATCHES FOR THIS TOURNAMENT
  // -------------------------------------------------------

  const existingMatches =
    $matches.filter((match) => {

      return (
        String(match.tournamentId) ===
        String(tournament.id)
      );

    });


  // -------------------------------------------------------
  // FIND THE NEXT ROUND
  // -------------------------------------------------------

  const currentRounds =
    existingMatches.map((match) => {

      return Number(
        match.round || 1
      );

    });


  const highestRound =
    currentRounds.length > 0
      ? Math.max(...currentRounds)
      : 0;


  const nextRound =
    highestRound + 1;


  // -------------------------------------------------------
  // GENERATE RANDOM MATCHES
  // -------------------------------------------------------

  const newMatches =
    createMatchesForTournament(
      tournament.id,
      validPlayerIds,
      nextRound
    );


  // -------------------------------------------------------
  // SHOW RESULT
  // -------------------------------------------------------

  if (newMatches.length > 0) {

    alert(
      `${newMatches.length} match${
        newMatches.length === 1
          ? ""
          : "es"
      } generated successfully for Round ${nextRound}.`
    );

  }

  else {

    alert(
      "No new matches were generated."
    );

  }

}


  // =========================================================
  // START MATCH
  // =========================================================

  function startMatch(match) {

    updateMatch(
      match.id,
      {
        status: "Ongoing"
      }
    );
  }


  // =========================================================
  // COMPLETE MATCH
  // =========================================================

  function completeMatch(match) {

    const score1 = prompt(
      `Enter score for ${getPlayerName(
        match.player1Id
      )}:`,
      match.player1Score ?? 0
    );


    if (score1 === null) {
      return;
    }


    const score2 = prompt(
      `Enter score for ${getPlayerName(
        match.player2Id
      )}:`,
      match.player2Score ?? 0
    );


    if (score2 === null) {
      return;
    }


    const numericScore1 =
      Number(score1);

    const numericScore2 =
      Number(score2);


    if (
      Number.isNaN(numericScore1) ||
      Number.isNaN(numericScore2) ||
      numericScore1 < 0 ||
      numericScore2 < 0
    ) {
      alert(
        "Please enter valid scores."
      );

      return;
    }


    setMatchResult(
      match.id,
      numericScore1,
      numericScore2
    );
  }


  // =========================================================
  // RESET MATCH
  // =========================================================

  function resetMatch(match) {

    const confirmed =
      confirm(
        "Reset this match?"
      );


    if (!confirmed) {
      return;
    }


    updateMatch(
      match.id,
      {
        player1Score: 0,
        player2Score: 0,
        result: "Pending",
        status: "Scheduled"
      }
    );
  }


  // =========================================================
  // DELETE MATCH
  // =========================================================

  function removeMatch(match) {

    const player1 =
      getPlayerName(
        match.player1Id
      );

    const player2 =
      getPlayerName(
        match.player2Id
      );


    const confirmed =
      confirm(
        `Delete ${player1} vs ${player2}?`
      );


    if (!confirmed) {
      return;
    }


    deleteMatch(match.id);
  }


  // =========================================================
  // CLEAR FILTERS
  // =========================================================

  function clearFilters() {
    searchText = "";
    statusFilter = "All";
    tournamentFilter = "All";
  }

</script>


<!-- =========================================================
     PAGE
========================================================= -->

<div class="matches-page">


  <!-- =======================================================
       HEADER
  ======================================================== -->

  <div class="page-header">

    <div>

      <div class="eyebrow">
        CHESS TOURNAMENT
      </div>

      <h1>
        Matches
      </h1>

      <p>
        Create, manage and record tournament matches.
      </p>

    </div>


    <div class="header-actions">

      <button
        class="secondary-button"
        on:click={() =>
          document
            .getElementById(
              "generate-tournament"
            )
            ?.scrollIntoView({
              behavior: "smooth"
            })
        }
      >
        Generate Matches
      </button>


      <button
        class="create-button"
        on:click={openCreateModal}
      >
        + Create Match
      </button>

    </div>

  </div>


  <!-- =======================================================
       STATISTICS
  ======================================================== -->

  <div class="stats-grid">

    <div class="stat-card">

      <div class="stat-icon">
        ♟
      </div>

      <div>

        <span class="stat-label">
          TOTAL MATCHES
        </span>

        <strong class="stat-value">
          {totalMatches}
        </strong>

      </div>

    </div>


    <div class="stat-card">

      <div class="stat-icon">
        ◷
      </div>

      <div>

        <span class="stat-label">
          SCHEDULED
        </span>

        <strong class="stat-value">
          {scheduledMatches}
        </strong>

      </div>

    </div>


    <div class="stat-card">

      <div class="stat-icon">
        ●
      </div>

      <div>

        <span class="stat-label">
          ONGOING
        </span>

        <strong class="stat-value">
          {ongoingMatches}
        </strong>

      </div>

    </div>


    <div class="stat-card">

      <div class="stat-icon">
        ✓
      </div>

      <div>

        <span class="stat-label">
          COMPLETED
        </span>

        <strong class="stat-value">
          {completedMatches}
        </strong>

      </div>

    </div>

  </div>


  <!-- =======================================================
       GENERATE MATCHES
  ======================================================== -->

  <div
    class="generate-card"
    id="generate-tournament"
  >

    <div class="generate-info">

      <div class="generate-icon">
        ♜
      </div>

      <div>

        <h2>
          Generate Tournament Matches
        </h2>

        <p>
          Automatically create random matches and
          randomly select winners for a tournament.
        </p>

      </div>

    </div>


    <div class="generate-controls">

      <select
        bind:value={selectedTournament}
      >

        <option value="">
          Select tournament
        </option>

        {#each $tournaments as tournament}

          <option value={tournament.id}>
            {tournament.name}
          </option>

        {/each}

      </select>


      <button
        class="generate-button"
        on:click={() => {

          const tournament =
            $tournaments.find(
              (item) =>
                String(item.id) ===
                String(selectedTournament)
            );

          generateMatches(tournament);

        }}
      >
        Generate
      </button>

    </div>

  </div>


  <!-- =======================================================
       MATCHES CARD
  ======================================================== -->

  <div class="matches-card">


    <!-- TOOLBAR -->

    <div class="toolbar">

      <div class="search-box">

        <span class="search-icon">
          ⌕
        </span>

        <input
          type="text"
          placeholder="Search matches, players or tournaments..."
          bind:value={searchText}
        />

      </div>


      <div class="filters">

        <select
          bind:value={tournamentFilter}
        >

          <option value="All">
            All Tournaments
          </option>

          {#each $tournaments as tournament}

            <option value={tournament.id}>
              {tournament.name}
            </option>

          {/each}

        </select>


        <select
          bind:value={statusFilter}
        >

          <option value="All">
            All Status
          </option>

          <option value="Scheduled">
            Scheduled
          </option>

          <option value="Ongoing">
            Ongoing
          </option>

          <option value="Completed">
            Completed
          </option>

        </select>


        {#if searchText ||
          statusFilter !== "All" ||
          tournamentFilter !== "All"}

          <button
            class="clear-button"
            on:click={clearFilters}
          >
            Clear
          </button>

        {/if}

      </div>

    </div>


    <!-- =====================================================
         EMPTY STATE
    ====================================================== -->

    {#if filteredMatches.length === 0}

      <div class="empty-state">

        <div class="empty-icon">
          ⚔
        </div>

        {#if $matches.length === 0}

          <h2>
            No Matches Yet
          </h2>

          <p>
            Create a match manually or generate
            matches from a tournament.
          </p>

          <div class="empty-actions">

            <button
              class="empty-primary"
              on:click={openCreateModal}
            >
              + Create Match
            </button>


            <button
              class="empty-secondary"
              on:click={() =>
                document
                  .getElementById(
                    "generate-tournament"
                  )
                  ?.scrollIntoView({
                    behavior: "smooth"
                  })
              }
            >
              Generate Matches
            </button>

          </div>

        {:else}

          <h2>
            No Matches Found
          </h2>

          <p>
            Try changing your search or filters.
          </p>

          <button
            class="empty-secondary"
            on:click={clearFilters}
          >
            Clear Filters
          </button>

        {/if}

      </div>


    {:else}


      <!-- =====================================================
           TABLE
      ====================================================== -->

      <div class="table-wrapper">

        <table>

          <thead>

            <tr>

              <th>
                TOURNAMENT
              </th>

              <th>
                ROUND
              </th>

              <th>
                PLAYERS
              </th>

              <th>
                SCORE
              </th>

              <th>
                RESULT
              </th>

              <th>
                STATUS
              </th>

              <th>
                DATE
              </th>

              <th>
                ACTIONS
              </th>

            </tr>

          </thead>


          <tbody>

            {#each filteredMatches as match}

              <tr>


                <!-- TOURNAMENT -->

                <td>

                  <div class="tournament-cell">

                    <div class="mini-icon">
                      ♜
                    </div>

                    <div>

                      <strong>
                        {getTournamentName(
                          match.tournamentId
                        )}
                      </strong>

                      <small>
                        Chess Tournament
                      </small>

                    </div>

                  </div>

                </td>


                <!-- ROUND -->

                <td>

                  <span class="round-badge">
                    Round {match.round || 1}
                  </span>

                </td>


                <!-- PLAYERS -->

                <td>

                  <div class="players-cell">


                    <div class="player-row">

                      <div class="avatar">
                        {getPlayerInitials(
                          match.player1Id
                        )}
                      </div>

                      <span>
                        {getPlayerName(
                          match.player1Id
                        )}
                      </span>

                    </div>


                    <div class="versus">
                      VS
                    </div>


                    <div class="player-row">

                      <div class="avatar">
                        {getPlayerInitials(
                          match.player2Id
                        )}
                      </div>

                      <span>
                        {getPlayerName(
                          match.player2Id
                        )}
                      </span>

                    </div>

                  </div>

                </td>


                <!-- SCORE -->

                <td>

                  <div class="score">

                    <strong>
                      {match.player1Score ?? 0}
                    </strong>

                    <span>
                      -
                    </span>

                    <strong>
                      {match.player2Score ?? 0}
                    </strong>

                  </div>

                </td>


                <!-- RESULT -->

                <td>

                  <span class="result-text">
                    {getResult(match)}
                  </span>

                </td>


                <!-- STATUS -->

                <td>

                  <span
                    class="status-badge {getStatusClass(match.status)}"
                  >
                    {match.status || "Scheduled"}
                  </span>

                </td>


                <!-- DATE -->

                <td>

                  <span class="date">
                    {formatDate(match.date)}
                  </span>

                </td>


                <!-- ACTIONS -->

                <td>

                  <div class="actions">


                    {#if match.status === "Scheduled"}

                      <button
                        class="action-start"
                        on:click={() =>
                          startMatch(match)
                        }
                      >
                        Start
                      </button>

                    {/if}


                    {#if match.status !== "Completed"}

                      <button
                        class="action-result"
                        on:click={() =>
                          completeMatch(match)
                        }
                      >
                        Result
                      </button>

                    {:else}

                      <button
                        class="action-reset"
                        on:click={() =>
                          resetMatch(match)
                        }
                      >
                        Reset
                      </button>

                    {/if}


                    <button
                      class="action-edit"
                      on:click={() =>
                        openEditModal(match)
                      }
                    >
                      Edit
                    </button>


                    <button
                      class="action-delete"
                      on:click={() =>
                        removeMatch(match)
                      }
                    >
                      Delete
                    </button>

                  </div>

                </td>

              </tr>

            {/each}

          </tbody>

        </table>

      </div>

    {/if}

  </div>

</div>


<!-- =========================================================
     CREATE / EDIT MODAL
========================================================= -->

{#if showModal}

  <div
    class="modal-overlay"
    on:click|self={closeModal}
  >

    <div class="modal">


      <!-- HEADER -->

      <div class="modal-header">

        <div>

          <span class="modal-eyebrow">
            MATCH MANAGEMENT
          </span>

          <h2>
            {editingMatch
              ? "Edit Match"
              : "Create Match"}
          </h2>

          <p>
            {editingMatch
              ? "Update the match details."
              : "Create a new chess tournament match."}
          </p>

        </div>


        <button
          class="close-button"
          on:click={closeModal}
          aria-label="Close"
        >
          ×
        </button>

      </div>


      <!-- BODY -->

      <div class="modal-body">


        <!-- TOURNAMENT -->

        <div class="form-group">

          <label for="tournament">
            Tournament
          </label>

          <select
            id="tournament"
            bind:value={selectedTournament}
            on:change={handleTournamentChange}
          >

            <option value="">
              Select tournament
            </option>

            {#each $tournaments as tournament}

              <option value={tournament.id}>
                {tournament.name}
              </option>

            {/each}

          </select>

        </div>


        <!-- PLAYERS -->

        <div class="form-row">


          <div class="form-group">

            <label for="player1">
              Player 1
            </label>

            <select
              id="player1"
              bind:value={selectedPlayer1}
              disabled={!selectedTournament}
            >

              <option value="">
                Select Player 1
              </option>

              {#each getTournamentPlayers(
                selectedTournament
              ) as player}

                <option value={player.id}>
                  {getPlayerName(player.id)}
                </option>

              {/each}

            </select>

          </div>


          <div class="form-group">

            <label for="player2">
              Player 2
            </label>

            <select
              id="player2"
              bind:value={selectedPlayer2}
              disabled={!selectedTournament}
            >

              <option value="">
                Select Player 2
              </option>

              {#each getTournamentPlayers(
                selectedTournament
              ) as player}

                <option
                  value={player.id}
                  disabled={
                    player.id ===
                    selectedPlayer1
                  }
                >
                  {getPlayerName(player.id)}
                </option>

              {/each}

            </select>

          </div>

        </div>


        <!-- ROUND / DATE -->

        <div class="form-row">


          <div class="form-group">

            <label for="round">
              Round
            </label>

            <input
              id="round"
              type="number"
              min="1"
              bind:value={round}
            />

          </div>


          <div class="form-group">

            <label for="matchDate">
              Match Date
            </label>

            <input
              id="matchDate"
              type="date"
              bind:value={matchDate}
            />

          </div>

        </div>


        <!-- STATUS -->

        <div class="form-group">

          <label for="status">
            Status
          </label>

          <select
            id="status"
            bind:value={matchStatus}
          >

            <option value="Scheduled">
              Scheduled
            </option>

            <option value="Ongoing">
              Ongoing
            </option>

            <option value="Completed">
              Completed
            </option>

          </select>

        </div>


        <!-- SCORE -->

        <div class="form-row">


          <div class="form-group">

            <label for="score1">
              Player 1 Score
            </label>

            <input
              id="score1"
              type="number"
              min="0"
              step="0.5"
              bind:value={player1Score}
            />

          </div>


          <div class="form-group">

            <label for="score2">
              Player 2 Score
            </label>

            <input
              id="score2"
              type="number"
              min="0"
              step="0.5"
              bind:value={player2Score}
            />

          </div>

        </div>

      </div>


      <!-- FOOTER -->

      <div class="modal-footer">

        <button
          class="cancel-button"
          on:click={closeModal}
        >
          Cancel
        </button>


        <button
          class="save-button"
          on:click={saveMatch}
        >
          {editingMatch
            ? "Save Changes"
            : "Create Match"}
        </button>

      </div>

    </div>

  </div>

{/if}


<!-- =========================================================
     STYLE
========================================================= -->

<style>

  /* ========================================================
     PAGE
  ======================================================== */

  .matches-page {
    width: 100%;
  }


  /* ========================================================
     HEADER
  ======================================================== */

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 30px;
    margin-bottom: 25px;
  }


  .eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.8px;
    color: #b48a3c;
    margin-bottom: 7px;
  }


  h1 {
    margin: 0;
    font-family:
      Georgia,
      "Times New Roman",
      serif;
    font-size: 36px;
    line-height: 1.1;
    color: #111111;
  }


  .page-header p {
    margin: 9px 0 0;
    color: #7d8794;
    font-size: 14px;
  }


  .header-actions {
    display: flex;
    align-items: center;
    gap: 9px;
  }


  /* ========================================================
     BUTTONS
  ======================================================== */

  .create-button,
  .secondary-button {
    border: none;
    border-radius: 9px;
    padding: 12px 17px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
  }


  .create-button {
    background: #dfb867;
    color: #171717;
  }


  .create-button:hover {
    background: #d5aa55;
  }


  .secondary-button {
    background: #ffffff;
    color: #775b2d;
    border: 1px solid #dfd5c5;
  }


  .secondary-button:hover {
    background: #faf7f1;
  }


  /* ========================================================
     STATISTICS
  ======================================================== */

  .stats-grid {
    display: grid;
    grid-template-columns:
      repeat(4, 1fr);
    gap: 14px;
    margin-bottom: 18px;
  }


  .stat-card {
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 16px;
    background: #ffffff;
    border: 1px solid #e7e0d7;
    border-radius: 12px;
  }


  .stat-icon {
    width: 38px;
    height: 38px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 9px;
    background: #f5ead6;
    color: #9c7639;
    font-size: 18px;
  }


  .stat-label {
    display: block;
    color: #969087;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1px;
    margin-bottom: 3px;
  }


  .stat-value {
    display: block;
    color: #171717;
    font-size: 21px;
  }


  /* ========================================================
     GENERATE CARD
  ======================================================== */

  .generate-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    padding: 18px 20px;
    margin-bottom: 18px;
    background: #fffdf9;
    border: 1px solid #e5d9c6;
    border-radius: 13px;
  }


  .generate-info {
    display: flex;
    align-items: center;
    gap: 13px;
  }


  .generate-icon {
    width: 42px;
    height: 42px;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #f2e3c6;
    border-radius: 10px;
    font-size: 20px;
  }


  .generate-info h2 {
    margin: 0;
    font-family:
      Georgia,
      "Times New Roman",
      serif;
    font-size: 18px;
    color: #202020;
  }


  .generate-info p {
    margin: 4px 0 0;
    color: #89847d;
    font-size: 11px;
  }


  .generate-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }


  .generate-controls select {
    width: 220px;
    height: 40px;
    border: 1px solid #ddd5ca;
    border-radius: 8px;
    background: #ffffff;
    padding: 0 10px;
    color: #333333;
    font-size: 12px;
    outline: none;
  }


  .generate-button {
    height: 40px;
    border: none;
    border-radius: 8px;
    padding: 0 15px;
    background: #dfb867;
    color: #171717;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }


  /* ========================================================
     MAIN CARD
  ======================================================== */

  .matches-card {
    background: #ffffff;
    border: 1px solid #e5dfd5;
    border-radius: 16px;
    overflow: hidden;
  }


  /* ========================================================
     TOOLBAR
  ======================================================== */

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 15px;
    padding: 15px 17px;
    border-bottom: 1px solid #e8e2d9;
  }


  .search-box {
    width: 320px;
    height: 40px;
    display: flex;
    align-items: center;
    gap: 7px;
    border: 1px solid #ded8cf;
    border-radius: 9px;
    padding: 0 11px;
    box-sizing: border-box;
  }


  .search-box:focus-within {
    border-color: #d2ad63;
  }


  .search-icon {
    color: #a49b91;
    font-size: 19px;
  }


  .search-box input {
    width: 100%;
    border: none;
    outline: none;
    font-size: 12px;
    color: #222222;
  }


  .search-box input::placeholder {
    color: #aaa49c;
  }


  .filters {
    display: flex;
    align-items: center;
    gap: 7px;
  }


  .filters select {
    height: 40px;
    border: 1px solid #ded8cf;
    border-radius: 8px;
    background: #ffffff;
    padding: 0 10px;
    color: #444444;
    font-size: 11px;
    outline: none;
  }


  .clear-button {
    height: 40px;
    border: none;
    background: #f4ece0;
    color: #88662e;
    border-radius: 8px;
    padding: 0 11px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }


  /* ========================================================
     TABLE
  ======================================================== */

  .table-wrapper {
    width: 100%;
    overflow-x: auto;
  }


  table {
    width: 100%;
    min-width: 1120px;
    border-collapse: collapse;
  }


  th {
    padding: 13px 15px;
    background: #faf9f6;
    border-bottom: 1px solid #e8e2d9;
    color: #98743d;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1.1px;
    text-align: left;
    white-space: nowrap;
  }


  td {
    padding: 14px 15px;
    border-bottom: 1px solid #eeeae4;
    vertical-align: middle;
    color: #343434;
    font-size: 12px;
  }


  tbody tr:last-child td {
    border-bottom: none;
  }


  tbody tr:hover {
    background: #fcfbf9;
  }


  /* ========================================================
     TOURNAMENT
  ======================================================== */

  .tournament-cell {
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 165px;
  }


  .mini-icon {
    width: 31px;
    height: 31px;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #f3ead8;
    border-radius: 8px;
    color: #9b7538;
  }


  .tournament-cell strong {
    display: block;
    color: #222222;
    font-size: 11px;
  }


  .tournament-cell small {
    display: block;
    margin-top: 2px;
    color: #aaa49c;
    font-size: 9px;
  }


  /* ========================================================
     ROUND
  ======================================================== */

  .round-badge {
    display: inline-flex;
    padding: 5px 8px;
    border-radius: 6px;
    background: #f4ead7;
    color: #9a743b;
    font-size: 10px;
    font-weight: 700;
    white-space: nowrap;
  }


  /* ========================================================
     PLAYERS
  ======================================================== */

  .players-cell {
    min-width: 170px;
  }


  .player-row {
    display: flex;
    align-items: center;
    gap: 7px;
    color: #292929;
    font-weight: 600;
  }


  .avatar {
    width: 23px;
    height: 23px;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
    border-radius: 50%;
    background: #ead8ae;
    color: #765623;
    font-size: 8px;
    font-weight: 800;
  }


  .versus {
    margin: 3px 0 3px 30px;
    color: #aaa49c;
    font-size: 8px;
    font-weight: 700;
  }


  /* ========================================================
     SCORE
  ======================================================== */

  .score {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
  }


  .score span {
    color: #aaa49c;
  }


  /* ========================================================
     RESULT
  ======================================================== */

  .result-text {
    color: #444444;
    font-size: 10px;
    font-weight: 600;
    white-space: nowrap;
  }


  /* ========================================================
     STATUS
  ======================================================== */

  .status-badge {
    display: inline-flex;
    padding: 5px 8px;
    border-radius: 7px;
    font-size: 9px;
    font-weight: 700;
    white-space: nowrap;
  }


  .status-badge.scheduled {
    background: #f5ead7;
    color: #a27735;
  }


  .status-badge.ongoing {
    background: #e7effc;
    color: #4269a4;
  }


  .status-badge.completed {
    background: #e6f3e9;
    color: #3f8050;
  }


  .date {
    color: #7c7c7c;
    white-space: nowrap;
    font-size: 10px;
  }


  /* ========================================================
     ACTIONS
  ======================================================== */

  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
    min-width: 210px;
  }


  .actions button {
    border: none;
    border-radius: 6px;
    padding: 6px 8px;
    font-size: 9px;
    font-weight: 700;
    cursor: pointer;
  }


  .action-start {
    background: #e8f0fc;
    color: #416ba8;
  }


  .action-result {
    background: #e6f3e9;
    color: #3d7b4d;
  }


  .action-reset {
    background: #f4ead8;
    color: #967137;
  }


  .action-edit {
    background: #f3eadc;
    color: #80602e;
  }


  .action-delete {
    background: #f8e4e3;
    color: #ad4a45;
  }


  .actions button:hover {
    filter: brightness(0.95);
  }


  /* ========================================================
     EMPTY
  ======================================================== */

  .empty-state {
    min-height: 390px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 40px;
  }


  .empty-icon {
    margin-bottom: 13px;
    color: #252525;
    font-size: 42px;
  }


  .empty-state h2 {
    margin: 0;
    font-family:
      Georgia,
      "Times New Roman",
      serif;
    color: #151515;
    font-size: 25px;
  }


  .empty-state p {
    margin: 9px 0 18px;
    color: #8b8f95;
    font-size: 12px;
  }


  .empty-actions {
    display: flex;
    gap: 8px;
  }


  .empty-primary,
  .empty-secondary {
    border: none;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }


  .empty-primary {
    background: #dfb867;
    color: #171717;
  }


  .empty-secondary {
    background: #f2eee8;
    color: #69522e;
  }


  /* ========================================================
     MODAL
  ======================================================== */

  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
    background: rgba(
      20,
      20,
      20,
      0.48
    );
  }


  .modal {
    width: 100%;
    max-width: 650px;
    max-height: 90vh;
    overflow-y: auto;
    background: #ffffff;
    border-radius: 15px;
    box-shadow:
      0 20px 60px
      rgba(0, 0, 0, 0.18);
  }


  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
    padding: 23px 25px;
    border-bottom: 1px solid #eee9e1;
  }


  .modal-eyebrow {
    display: block;
    margin-bottom: 6px;
    color: #b48a3c;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
  }


  .modal-header h2 {
    margin: 0;
    font-family:
      Georgia,
      "Times New Roman",
      serif;
    color: #171717;
    font-size: 25px;
  }


  .modal-header p {
    margin: 7px 0 0;
    color: #8a8f95;
    font-size: 12px;
  }


  .close-button {
    width: 32px;
    height: 32px;
    border: none;
    background: #f6f4f1;
    border-radius: 8px;
    color: #555555;
    font-size: 21px;
    line-height: 1;
    cursor: pointer;
  }


  /* ========================================================
     FORM
  ======================================================== */

  .modal-body {
    padding: 24px 25px;
  }


  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }


  .form-group {
    margin-bottom: 17px;
  }


  .form-group label {
    display: block;
    margin-bottom: 7px;
    color: #353535;
    font-size: 11px;
    font-weight: 700;
  }


  .form-group input,
  .form-group select {
    width: 100%;
    height: 42px;
    box-sizing: border-box;
    border: 1px solid #ddd7ce;
    border-radius: 8px;
    background: #ffffff;
    padding: 0 11px;
    outline: none;
    color: #222222;
    font-size: 12px;
  }


  .form-group input:focus,
  .form-group select:focus {
    border-color: #d1aa5c;
  }


  .form-group select:disabled {
    background: #f4f3f1;
    color: #999999;
    cursor: not-allowed;
  }


  /* ========================================================
     MODAL FOOTER
  ======================================================== */

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 9px;
    padding: 17px 25px;
    border-top: 1px solid #eee9e1;
  }


  .cancel-button,
  .save-button {
    border: none;
    border-radius: 8px;
    padding: 10px 16px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }


  .cancel-button {
    background: #f3f1ee;
    color: #555555;
  }


  .save-button {
    background: #dfb867;
    color: #171717;
  }


  .save-button:hover {
    background: #d4a952;
  }


  /* ========================================================
     RESPONSIVE
  ======================================================== */

  @media (max-width: 1000px) {

    .stats-grid {
      grid-template-columns:
        repeat(2, 1fr);
    }


    .generate-card {
      align-items: flex-start;
      flex-direction: column;
    }


    .generate-controls {
      width: 100%;
    }


    .generate-controls select {
      flex: 1;
      width: auto;
    }

  }


  @media (max-width: 800px) {

    .page-header {
      align-items: flex-start;
      flex-direction: column;
    }


    .header-actions {
      width: 100%;
    }


    .header-actions button {
      flex: 1;
    }


    .toolbar {
      align-items: stretch;
      flex-direction: column;
    }


    .search-box {
      width: 100%;
    }


    .filters {
      flex-wrap: wrap;
    }


    .filters select {
      flex: 1;
    }


    .form-row {
      grid-template-columns: 1fr;
      gap: 0;
    }

  }


  @media (max-width: 550px) {

    .stats-grid {
      grid-template-columns: 1fr;
    }


    .generate-info {
      align-items: flex-start;
    }


    .generate-controls {
      flex-direction: column;
      align-items: stretch;
    }


    .generate-controls select {
      width: 100%;
    }


    .generate-button {
      width: 100%;
    }


    .empty-actions {
      flex-direction: column;
    }

  }

</style>