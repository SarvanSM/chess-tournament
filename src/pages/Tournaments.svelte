<script>
  import { onMount } from "svelte";

  let tournaments = [];
  let players = [];

  let showModal = false;
  let editingTournament = null;

  let tournamentName = "";
  let tournamentDate = "";
  let selectedPlayers = [];

  let searchTerm = "";

  // ---------------------------------------------------------
  // LOAD DATA
  // ---------------------------------------------------------

  onMount(() => {
    loadTournaments();
    loadPlayers();
  });

  function loadTournaments() {
    const saved = localStorage.getItem("chess_tournaments");

    if (saved) {
      try {
        tournaments = JSON.parse(saved).map((tournament) => ({
          ...tournament,
          status: getTournamentStatus(tournament.date)
        }));

        saveTournaments();
      } catch (error) {
        console.error("Could not load tournaments:", error);
        tournaments = [];
      }
    }
  }

  function loadPlayers() {
    /*
      Players are loaded from localStorage.

      We will connect this to the Players store/database
      when we complete the data persistence section.
    */

    const saved = localStorage.getItem("chess_players");

    if (saved) {
      try {
        players = JSON.parse(saved);
      } catch (error) {
        console.error("Could not load players:", error);
        players = [];
      }
    }
  }

  function saveTournaments() {
    localStorage.setItem(
      "chess_tournaments",
      JSON.stringify(tournaments)
    );
  }

  // ---------------------------------------------------------
  // TOURNAMENT STATUS
  // ---------------------------------------------------------

  function getTodayDate() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getTournamentStatus(date) {
    if (!date) {
      return "Upcoming";
    }

    const today = getTodayDate();

    if (date < today) {
      return "Completed";
    }

    if (date === today) {
      return "Ongoing";
    }

    return "Upcoming";
  }

  // ---------------------------------------------------------
  // MODAL
  // ---------------------------------------------------------

  function openAddModal() {
    editingTournament = null;

    tournamentName = "";
    tournamentDate = "";
    selectedPlayers = [];

    showModal = true;
  }

  function openEditModal(tournament) {
    editingTournament = tournament;

    tournamentName = tournament.name;
    tournamentDate = tournament.date;
    selectedPlayers = [...tournament.playerIds];

    showModal = true;
  }

  function closeModal() {
    showModal = false;
    editingTournament = null;

    tournamentName = "";
    tournamentDate = "";
    selectedPlayers = [];
  }

  // ---------------------------------------------------------
  // PLAYER SELECTION
  // ---------------------------------------------------------

  function togglePlayer(playerId) {
    if (selectedPlayers.includes(playerId)) {
      selectedPlayers = selectedPlayers.filter(
        (id) => id !== playerId
      );
    } else {
      selectedPlayers = [...selectedPlayers, playerId];
    }
  }

  function isPlayerSelected(playerId) {
    return selectedPlayers.includes(playerId);
  }

  // ---------------------------------------------------------
  // CREATE / UPDATE
  // ---------------------------------------------------------

  function saveTournament() {
    const name = tournamentName.trim();

    if (!name) {
      alert("Please enter a tournament name.");
      return;
    }

    if (!tournamentDate) {
      alert("Please select a tournament date.");
      return;
    }

    if (selectedPlayers.length < 2) {
      alert("Please select at least 2 players.");
      return;
    }

    if (editingTournament) {
      tournaments = tournaments.map((tournament) => {
        if (tournament.id === editingTournament.id) {
          return {
            ...tournament,
            name,
            date: tournamentDate,
            status: getTournamentStatus(tournamentDate),
            playerIds: [...selectedPlayers]
          };
        }

        return tournament;
      });
    } else {
      const newTournament = {
        id: Date.now(),
        name,
        date: tournamentDate,
        status: getTournamentStatus(tournamentDate),
        playerIds: [...selectedPlayers],
        createdAt: new Date().toISOString()
      };

      tournaments = [newTournament, ...tournaments];
    }

    saveTournaments();
    closeModal();
  }

  // ---------------------------------------------------------
  // DELETE
  // ---------------------------------------------------------

  function deleteTournament(id) {
    const tournament = tournaments.find(
      (item) => item.id === id
    );

    if (!tournament) {
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to delete "${tournament.name}"?`
    );

    if (!confirmed) {
      return;
    }

    tournaments = tournaments.filter(
      (item) => item.id !== id
    );

    saveTournaments();
  }

  // ---------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------

  function getPlayerName(playerId) {
    const player = players.find(
      (item) => item.id === playerId
    );

    return player ? player.name : "Unknown Player";
  }

  function formatDate(date) {
    if (!date) {
      return "-";
    }

    const dateObject = new Date(date + "T00:00:00");

    return dateObject.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  $: filteredTournaments = tournaments.filter((tournament) =>
    tournament.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );
</script>

<div class="tournaments-page">

  <!-- PAGE HEADER -->

  <div class="page-heading">
    <div>
      <p class="eyebrow">TOURNAMENT MANAGEMENT</p>

      <h3>Chess Tournaments</h3>

      <p class="description">
        Create tournaments, select players and manage your chess events.
      </p>
    </div>

    <button
      class="primary-button"
      on:click={openAddModal}
    >
      + Create Tournament
    </button>
  </div>

  <!-- TOURNAMENT LIST -->

  <div class="tournament-card">

    <div class="tournament-toolbar">

      <input
        type="text"
        placeholder="Search tournaments..."
        bind:value={searchTerm}
      />

      <div class="tournament-count">
        Total Tournaments:
        <strong>{tournaments.length}</strong>
      </div>

    </div>

    {#if filteredTournaments.length > 0}

      <div class="tournament-table">

        <div class="table-header">
          <span>TOURNAMENT</span>
          <span>DATE</span>
          <span>PLAYERS</span>
          <span>STATUS</span>
          <span>ACTIONS</span>
        </div>

        {#each filteredTournaments as tournament}

          <div class="tournament-row">

            <div class="tournament-name">

              <div class="tournament-icon">
                ♜
              </div>

              <div>
                <strong>{tournament.name}</strong>

                <small>
                  Chess Tournament
                </small>
              </div>

            </div>

            <div class="tournament-date">
              {formatDate(tournament.date)}
            </div>

            <div class="player-count">
              <strong>
                {tournament.playerIds.length}
              </strong>

              players
            </div>

            <div>
              <span
                class:completed={getTournamentStatus(tournament.date) === "Completed"}
                class:ongoing={getTournamentStatus(tournament.date) === "Ongoing"}
                class:upcoming={getTournamentStatus(tournament.date) === "Upcoming"}
                class="status-badge"
              >
                {getTournamentStatus(tournament.date)}
              </span>
            </div>

            <div class="actions">

              <button
                class="edit-button"
                on:click={() => openEditModal(tournament)}
              >
                Edit
              </button>

              <button
                class="delete-button"
                on:click={() => deleteTournament(tournament.id)}
              >
                Delete
              </button>

            </div>

          </div>

        {/each}

      </div>

    {:else}

      <!-- EMPTY STATE -->

      <div class="empty-tournaments">

        <div class="empty-icon">
          ♜
        </div>

        <h4>
          {searchTerm
            ? "No tournaments found"
            : "No tournaments yet"}
        </h4>

        <p>
          {searchTerm
            ? "Try searching for a different tournament."
            : "Create your first chess tournament to get started."}
        </p>

        {#if !searchTerm}

          <button
            class="primary-button"
            on:click={openAddModal}
          >
            Create Tournament
          </button>

        {/if}

      </div>

    {/if}

  </div>

</div>


<!-- ========================================================
     CREATE / EDIT MODAL
     ======================================================== -->

{#if showModal}

  <div
    class="modal-backdrop"
    role="presentation"
    on:click={(event) => {
      if (event.target === event.currentTarget) {
        closeModal();
      }
    }}
  >

    <div
      class="modal tournament-modal"
      role="dialog"
      aria-modal="true"
    >

      <div class="modal-header">

        <div>
          <p class="eyebrow">
            TOURNAMENT
          </p>

          <h3>
            {editingTournament
              ? "Edit Tournament"
              : "Create Tournament"}
          </h3>
        </div>

        <button
          class="close-button"
          on:click={closeModal}
          aria-label="Close"
        >
          ×
        </button>

      </div>


      <!-- FORM -->

      <div class="form">

        <label>
          Tournament Name

          <input
            type="text"
            placeholder="Enter tournament name"
            bind:value={tournamentName}
          />
        </label>


        <label>
          Tournament Date

          <input
            type="date"
            bind:value={tournamentDate}
          />
        </label>


        <!-- PLAYERS -->

        <div class="player-selection">

          <div class="selection-header">

            <div>
              <label class="selection-label">
                Select Players
              </label>

              <p>
                Choose at least 2 players
              </p>
            </div>

            <span>
              {selectedPlayers.length} selected
            </span>

          </div>


          {#if players.length > 0}

            <div class="players-list">

              {#each players as player}

                <label
                  class:selected={isPlayerSelected(player.id)}
                  class="player-option"
                >

                  <input
                    type="checkbox"
                    checked={isPlayerSelected(player.id)}
                    on:change={() => togglePlayer(player.id)}
                  />

                  <div class="selection-avatar">
                    {player.name
                      ? player.name.charAt(0).toUpperCase()
                      : "P"}
                  </div>

                  <div class="selection-player-info">

                    <strong>
                      {player.name}
                    </strong>

                    <small>
                      Rating:
                      {player.rating ?? "-"}
                    </small>

                  </div>

                  <div class="check-mark">
                    ✓
                  </div>

                </label>

              {/each}

            </div>

          {:else}

            <div class="no-players">

              <div class="empty-icon">
                ♟
              </div>

              <strong>
                No players available
              </strong>

              <p>
                Add players first from the Players page.
              </p>

            </div>

          {/if}

        </div>


        <!-- MODAL ACTIONS -->

        <div class="modal-actions">

          <button
            class="cancel-button"
            on:click={closeModal}
          >
            Cancel
          </button>

          <button
            class="primary-button"
            on:click={saveTournament}
          >
            {editingTournament
              ? "Save Changes"
              : "Create Tournament"}
          </button>

        </div>

      </div>

    </div>

  </div>

{/if}


<style>
  /* =========================================================
     TOURNAMENT PAGE
     ========================================================= */

  .tournaments-page {
    width: 100%;
    animation: fadeIn 0.25s ease;
  }

  .page-heading {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 20px;
    margin-bottom: 25px;
  }

  .page-heading h3 {
    font-family: "Playfair Display", serif;
    font-size: 30px;
    margin-bottom: 7px;
  }

  .description {
    color: #777;
    font-size: 13px;
    line-height: 1.5;
  }

  /* =========================================================
     TOURNAMENT CARD
     ========================================================= */

  .tournament-card {
    background: white;
    border: 1px solid #e6e1d8;
    border-radius: 14px;
    overflow: hidden;
  }

  .tournament-toolbar {
    padding: 15px 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 15px;
    border-bottom: 1px solid #e6e1d8;
  }

  .tournament-toolbar input {
    width: 300px;
    padding: 11px 14px;
    border: 1px solid #ded9d0;
    border-radius: 9px;
    outline: none;
    background: white;
    color: #171717;
    font-size: 12px;
    transition: 0.2s;
  }

  .tournament-toolbar input::placeholder {
    color: #aaa;
  }

  .tournament-toolbar input:focus {
    border-color: #d8b56a;
    box-shadow: 0 0 0 3px rgba(216, 181, 106, 0.12);
  }

  .tournament-count {
    color: #888;
    font-size: 11px;
  }

  .tournament-count strong {
    color: #171717;
  }

  /* =========================================================
     TABLE
     ========================================================= */

  .tournament-table {
    width: 100%;
  }

  .table-header,
  .tournament-row {
    display: grid;
    grid-template-columns: 1.7fr 1fr 0.8fr 0.9fr 1fr;
    align-items: center;
    gap: 18px;
    padding: 16px 20px;
  }

  .table-header {
    background: #faf9f6;
    border-bottom: 1px solid #e6e1d8;
    color: #9b8a68;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 1px;
  }

  .tournament-row {
    min-height: 78px;
    border-bottom: 1px solid #eeeae3;
    transition: 0.2s;
  }

  .tournament-row:hover {
    background: #fcfbf9;
  }

  .tournament-row:last-child {
    border-bottom: none;
  }

  /* =========================================================
     TOURNAMENT NAME
     ========================================================= */

  .tournament-name {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .tournament-icon {
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    border-radius: 11px;
    background: #f3ead7;
    color: #8d7138;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
  }

  .tournament-name strong {
    display: block;
    font-size: 12px;
    margin-bottom: 4px;
  }

  .tournament-name small {
    color: #999;
    font-size: 10px;
  }

  .tournament-date {
    color: #666;
    font-size: 11px;
  }

  .player-count {
    color: #888;
    font-size: 10px;
  }

  .player-count strong {
    color: #171717;
    font-size: 12px;
  }

  /* =========================================================
     STATUS
     ========================================================= */

  .status-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px 9px;
    border-radius: 7px;
    background: #f3ead7;
    color: #7d632c;
    font-size: 9px;
    font-weight: 700;
  }

  .status-badge.completed {
    background: #e7f2e8;
    color: #47714d;
  }

  .status-badge.upcoming {
    background: #f3ead7;
    color: #7d632c;
  }

  .status-badge.ongoing {
    background: #e8eef8;
    color: #3f5f91;
  }

  /* =========================================================
     ACTIONS
     ========================================================= */

  .actions {
    display: flex;
    gap: 7px;
  }

  .edit-button,
  .delete-button {
    padding: 7px 10px;
    border-radius: 7px;
    font-size: 10px;
    font-weight: 600;
    transition: 0.2s;
  }

  .edit-button {
    background: #f3ead7;
    color: #705726;
  }

  .edit-button:hover {
    background: #e9dcc1;
  }

  .delete-button {
    background: #f7e7e5;
    color: #a33d34;
  }

  .delete-button:hover {
    background: #efd3d0;
  }

  /* =========================================================
     EMPTY STATE
     ========================================================= */

  .empty-tournaments {
    min-height: 350px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    text-align: center;
    padding: 30px;
  }

  .empty-tournaments .empty-icon {
    width: 55px;
    height: 55px;
    margin-bottom: 14px;
  }

  .empty-tournaments h4 {
    font-size: 14px;
    margin-bottom: 6px;
  }

  .empty-tournaments p {
    color: #999;
    font-size: 11px;
    margin-bottom: 15px;
  }

  /* =========================================================
     MODAL
     ========================================================= */

  .tournament-modal {
    max-height: 90vh;
    overflow-y: auto;
  }

  .selection-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .selection-label {
    display: block;
    color: #555;
    font-size: 11px;
    font-weight: 700;
  }

  .selection-header p {
    margin-top: 4px;
    color: #999;
    font-size: 10px;
  }

  .selection-header > span {
    padding: 5px 8px;
    border-radius: 6px;
    background: #f3ead7;
    color: #7d632c;
    font-size: 9px;
    font-weight: 700;
  }

  /* =========================================================
     PLAYER SELECTION
     ========================================================= */

  .players-list {
    max-height: 220px;
    overflow-y: auto;
    border: 1px solid #e2ddd4;
    border-radius: 10px;
  }

  .player-option {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-bottom: 1px solid #eeeae3;
    cursor: pointer;
    transition: 0.2s;
  }

  .player-option:last-child {
    border-bottom: none;
  }

  .player-option:hover {
    background: #faf9f6;
  }

  .player-option.selected {
    background: #fcf8ed;
  }

  .player-option input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .selection-avatar {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border-radius: 50%;
    background: #f3ead7;
    color: #8d7138;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 800;
  }

  .selection-player-info {
    flex: 1;
  }

  .selection-player-info strong {
    display: block;
    color: #171717;
    font-size: 11px;
    margin-bottom: 3px;
  }

  .selection-player-info small {
    color: #999;
    font-size: 9px;
  }

  .check-mark {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #eeeae3;
    color: transparent;
    font-size: 11px;
    font-weight: 800;
  }

  .player-option.selected .check-mark {
    background: #d8b56a;
    color: #171717;
  }

  .no-players {
    min-height: 160px;
    border: 1px solid #e2ddd4;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .no-players .empty-icon {
    margin-bottom: 10px;
  }

  .no-players strong {
    font-size: 12px;
    margin-bottom: 5px;
  }

  .no-players p {
    color: #999;
    font-size: 10px;
  }

  /* =========================================================
     ANIMATION
     ========================================================= */

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(5px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* =========================================================
     RESPONSIVE
     ========================================================= */

  @media (max-width: 1000px) {
    .table-header,
    .tournament-row {
      grid-template-columns: 1.5fr 1fr 0.7fr 0.8fr 1fr;
      gap: 10px;
    }
  }

  @media (max-width: 700px) {
    .page-heading {
      align-items: flex-start;
      flex-direction: column;
    }

    .page-heading .primary-button {
      width: 100%;
    }

    .tournament-toolbar {
      align-items: stretch;
      flex-direction: column;
    }

    .tournament-toolbar input {
      width: 100%;
    }

    .table-header {
      display: none;
    }

    .tournament-row {
      grid-template-columns: 1fr;
      gap: 10px;
      padding: 18px;
    }

    .tournament-row > div:not(.tournament-name):not(.actions) {
      padding-left: 50px;
    }

    .actions {
      padding-left: 50px;
    }
  }
</style>