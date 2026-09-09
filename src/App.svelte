<script>
  import { onMount } from "svelte";

  import Players from "./pages/Players.svelte";
  import Tournaments from "./pages/Tournaments.svelte";
  import Matches from "./pages/Matches.svelte";
  import Rankings from "./pages/Rankings.svelte";

  import { matches } from "./stores/matches.js";

  let currentPage = "Dashboard";

  let players = [];
  let tournaments = [];

  // ---------------------------------------------------------
  // LOAD PLAYERS
  // ---------------------------------------------------------

  function loadPlayers() {
    try {
      const saved = localStorage.getItem("chess_players");

      if (!saved) {
        players = [];
        return;
      }

      const parsed = JSON.parse(saved);

      players = Array.isArray(parsed)
        ? parsed
        : [];
    } catch (error) {
      console.error("Failed to load players:", error);
      players = [];
    }
  }

  // ---------------------------------------------------------
  // LOAD TOURNAMENTS
  // ---------------------------------------------------------

  function loadTournaments() {
    try {
      const saved =
        localStorage.getItem("chess_tournaments");

      if (!saved) {
        tournaments = [];
        return;
      }

      const parsed = JSON.parse(saved);

      tournaments = Array.isArray(parsed)
        ? parsed
        : [];
    } catch (error) {
      console.error(
        "Failed to load tournaments:",
        error
      );

      tournaments = [];
    }
  }

  // ---------------------------------------------------------
  // INITIAL LOAD
  // ---------------------------------------------------------

  onMount(() => {
    const savedPage =
      localStorage.getItem("chess_current_page");

    if (savedPage) {
      currentPage = savedPage;
    }

    loadPlayers();
    loadTournaments();

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };
  });

  // ---------------------------------------------------------
  // STORAGE CHANGE
  // ---------------------------------------------------------

  function handleStorageChange(event) {
    if (event.key === "chess_players") {
      loadPlayers();
    }

    if (event.key === "chess_tournaments") {
      loadTournaments();
    }
  }

  // ---------------------------------------------------------
  // NAVIGATION
  // ---------------------------------------------------------

  function navigate(page) {
    currentPage = page;

    localStorage.setItem(
      "chess_current_page",
      page
    );

    loadPlayers();
    loadTournaments();
  }

  // ---------------------------------------------------------
  // PLAYER HELPERS
  // ---------------------------------------------------------

  function getPlayerName(playerId) {
    if (!playerId) {
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
      "Unknown Player"
    );
  }

  function getPlayerInitials(name) {
    if (!name) {
      return "?";
    }

    return name
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  // ---------------------------------------------------------
  // TOURNAMENT HELPERS
  // ---------------------------------------------------------

  function getTournamentName(tournamentId) {
    if (!tournamentId) {
      return "No Tournament";
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

  function formatDate(date) {
    if (!date) {
      return "-";
    }

    try {
      const dateObject = new Date(
        date + "T00:00:00"
      );

      if (Number.isNaN(dateObject.getTime())) {
        return date;
      }

      return dateObject.toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }
      );
    } catch (error) {
      return date;
    }
  }

  // ---------------------------------------------------------
  // DASHBOARD COUNTS
  // ---------------------------------------------------------

  function getPlayerCount() {
    return players.length;
  }

  function getTournamentCount() {
    return tournaments.length;
  }

  function getTotalMatches() {
    return $matches.length;
  }

  function getCompletedMatches() {
    return $matches.filter(
      (match) =>
        String(match.status).toLowerCase() ===
        "completed"
    ).length;
  }

  // ---------------------------------------------------------
  // RECENT TOURNAMENTS
  // ---------------------------------------------------------

  function getRecentTournaments() {
    return [...tournaments]
      .sort((a, b) => {
        const dateA =
          new Date(
            a.createdAt ||
            a.date ||
            0
          ).getTime();

        const dateB =
          new Date(
            b.createdAt ||
            b.date ||
            0
          ).getTime();

        return dateB - dateA;
      })
      .slice(0, 4);
  }

  // ---------------------------------------------------------
  // TOURNAMENT MATCH COUNT
  // ---------------------------------------------------------

  function getTournamentMatchCount(
    tournamentId
  ) {
    return $matches.filter(
      (match) =>
        String(match.tournamentId) ===
        String(tournamentId)
    ).length;
  }

  // ---------------------------------------------------------
  // TOURNAMENT COMPLETION
  // ---------------------------------------------------------

  function getTournamentStatus(
    tournament
  ) {
    const tournamentMatches =
      $matches.filter(
        (match) =>
          String(match.tournamentId) ===
          String(tournament.id)
      );

    if (tournamentMatches.length === 0) {
      return tournament.status ||
        "Upcoming";
    }

    const completed =
      tournamentMatches.filter(
        (match) =>
          String(match.status).toLowerCase() ===
          "completed"
      );

    if (
      completed.length ===
      tournamentMatches.length
    ) {
      return "Completed";
    }

    return "In Progress";
  }

  // ---------------------------------------------------------
  // RANKING CALCULATION
  // ---------------------------------------------------------

  function calculateRankings() {
    const rankingMap = {};

    // Create entries for every player
    players.forEach((player) => {
      const playerId = String(player.id);

      rankingMap[playerId] = {
        id: player.id,
        name:
          player.name ||
          player.fullName ||
          player.playerName ||
          player.username ||
          "Unknown Player",
        matches: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        points: 0
      };
    });

    // Process completed matches
    $matches
      .filter(
        (match) =>
          String(match.status).toLowerCase() ===
          "completed"
      )
      .forEach((match) => {
        const player1Id =
          String(match.player1Id);

        const player2Id =
          String(match.player2Id);

        if (!rankingMap[player1Id]) {
          rankingMap[player1Id] = {
            id: match.player1Id,
            name: getPlayerName(
              match.player1Id
            ),
            matches: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            points: 0
          };
        }

        if (!rankingMap[player2Id]) {
          rankingMap[player2Id] = {
            id: match.player2Id,
            name: getPlayerName(
              match.player2Id
            ),
            matches: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            points: 0
          };
        }

        const player1 =
          rankingMap[player1Id];

        const player2 =
          rankingMap[player2Id];

        player1.matches += 1;
        player2.matches += 1;

        const score1 = Number(
          match.player1Score ?? 0
        );

        const score2 = Number(
          match.player2Score ?? 0
        );

        if (score1 > score2) {
          player1.wins += 1;
          player1.points += 1;

          player2.losses += 1;
        } else if (score2 > score1) {
          player2.wins += 1;
          player2.points += 1;

          player1.losses += 1;
        } else {
          player1.draws += 1;
          player2.draws += 1;

          player1.points += 0.5;
          player2.points += 0.5;
        }
      });

    return Object.values(
      rankingMap
    ).sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }

      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }

      if (b.matches !== a.matches) {
        return b.matches - a.matches;
      }

      return a.name.localeCompare(
        b.name
      );
    });
  }

  // ---------------------------------------------------------
  // TOP 3 PLAYERS
  // ---------------------------------------------------------

  function getTopPlayers() {
    return calculateRankings().slice(0, 3);
  }

  // ---------------------------------------------------------
  // POINT FORMAT
  // ---------------------------------------------------------

  function formatPoints(points) {
    if (
      Number.isInteger(points)
    ) {
      return String(points);
    }

    return Number(points).toFixed(1);
  }

  // ---------------------------------------------------------
  // RANK ICON
  // ---------------------------------------------------------

  function getRankIcon(rank) {
    if (rank === 1) {
      return "🥇";
    }

    if (rank === 2) {
      return "🥈";
    }

    if (rank === 3) {
      return "🥉";
    }

    return String(rank);
  }
</script>


<div class="app">

  <!-- =====================================================
       SIDEBAR
  ====================================================== -->

  <aside class="sidebar">

    <div class="brand">

      <div class="brand-icon">
        ♟
      </div>

      <div>
        <h1>Chess Arena</h1>
        <span>
          Tournament Manager
        </span>
      </div>

    </div>


    <nav>

      <button
        class:active={
          currentPage === "Dashboard"
        }
        on:click={() =>
          navigate("Dashboard")
        }
      >
        <span>⌂</span>
        Dashboard
      </button>


      <button
        class:active={
          currentPage === "Players"
        }
        on:click={() =>
          navigate("Players")
        }
      >
        <span>♙</span>
        Players
      </button>


      <button
        class:active={
          currentPage === "Tournaments"
        }
        on:click={() =>
          navigate("Tournaments")
        }
      >
        <span>♜</span>
        Tournaments
      </button>


      <button
        class:active={
          currentPage === "Matches"
        }
        on:click={() =>
          navigate("Matches")
        }
      >
        <span>⚔</span>
        Matches
      </button>


      <button
        class:active={
          currentPage === "Rankings"
        }
        on:click={() =>
          navigate("Rankings")
        }
      >
        <span>🏆</span>
        Rankings
      </button>

    </nav>


    <div class="sidebar-footer">

      <div class="profile">

        <div class="avatar">
          A
        </div>

        <div>
          <strong>
            Administrator
          </strong>

          <small>
            Tournament Admin
          </small>
        </div>

      </div>

    </div>

  </aside>


  <!-- =====================================================
       MAIN CONTENT
  ====================================================== -->

  <main class="main-content">

    <!-- ===================================================
         TOP BAR
    ==================================================== -->

    <header class="topbar">

      <div>

        <p class="eyebrow">
          CHESS TOURNAMENT
        </p>

        <h2>
          {currentPage}
        </h2>

      </div>


      <div class="header-actions">

        <button class="icon-button">
          🔔
        </button>

        <div class="user-avatar">
          A
        </div>

      </div>

    </header>


    <!-- ===================================================
         DASHBOARD
    ==================================================== -->

    {#if currentPage === "Dashboard"}

      <!-- =================================================
           WELCOME
      ================================================== -->

      <section class="welcome">

        <div>

          <p class="eyebrow">
            WELCOME BACK
          </p>

          <h3>
            Manage your chess tournaments.
          </h3>

          <p>
            Create tournaments, manage players
            and track match results from one place.
          </p>

        </div>


        <div class="chess-piece">
          ♞
        </div>

      </section>


      <!-- =================================================
           STATISTICS
      ================================================== -->

      <section class="stats-grid">


        <!-- PLAYERS -->

        <div class="stat-card">

          <div class="stat-icon">
            ♙
          </div>

          <div>

            <span>
              Total Players
            </span>

            <strong>
              {getPlayerCount()}
            </strong>

          </div>

        </div>


        <!-- TOURNAMENTS -->

        <div class="stat-card">

          <div class="stat-icon">
            ♜
          </div>

          <div>

            <span>
              Tournaments
            </span>

            <strong>
              {getTournamentCount()}
            </strong>

          </div>

        </div>


        <!-- MATCHES -->

        <div class="stat-card">

          <div class="stat-icon">
            ⚔
          </div>

          <div>

            <span>
              Total Matches
            </span>

            <strong>
              {getTotalMatches()}
            </strong>

          </div>

        </div>


        <!-- COMPLETED -->

        <div class="stat-card">

          <div class="stat-icon">
            🏆
          </div>

          <div>

            <span>
              Completed
            </span>

            <strong>
              {getCompletedMatches()}
            </strong>

          </div>

        </div>

      </section>


      <!-- =================================================
           DASHBOARD PANELS
      ================================================== -->

      <section class="content-grid">


        <!-- =================================================
             RECENT TOURNAMENTS
        ================================================== -->

        <div class="panel">

          <div class="panel-header">

            <div>

              <p class="eyebrow">
                TOURNAMENTS
              </p>

              <h3>
                Recent Tournaments
              </h3>

            </div>


            <button
              class="secondary-button"
              on:click={() =>
                navigate("Tournaments")
              }
            >
              View All
            </button>

          </div>


          {#if getRecentTournaments().length > 0}

            <div class="recent-tournaments">

              {#each getRecentTournaments() as tournament}

                <div
                  class="recent-tournament"
                >

                  <div class="recent-tournament-icon">
                    ♜
                  </div>


                  <div class="recent-tournament-info">

                    <strong>
                      {tournament.name}
                    </strong>

                    <span>
                      {formatDate(
                        tournament.date
                      )}
                    </span>

                  </div>


                  <div class="recent-tournament-meta">

                    <span>
                      {tournament.playerIds?.length || 0}
                      players
                    </span>

                    <span>
                      {getTournamentMatchCount(
                        tournament.id
                      )}
                      matches
                    </span>

                  </div>


                  <span
                    class="status-badge"
                    class:completed={
                      getTournamentStatus(
                        tournament
                      ) === "Completed"
                    }
                    class:progress={
                      getTournamentStatus(
                        tournament
                      ) === "In Progress"
                    }
                  >
                    {getTournamentStatus(
                      tournament
                    )}
                  </span>

                </div>

              {/each}

            </div>

          {:else}

            <div class="empty-state">

              <div class="empty-icon">
                ♜
              </div>

              <h4>
                No tournaments yet
              </h4>

              <p>
                Create your first tournament
                to get started.
              </p>

              <button
                class="primary-button"
                on:click={() =>
                  navigate("Tournaments")
                }
              >
                Create Tournament
              </button>

            </div>

          {/if}

        </div>


        <!-- =================================================
             TOP PLAYERS
        ================================================== -->

        <div class="panel">

          <div class="panel-header">

            <div>

              <p class="eyebrow">
                RANKINGS
              </p>

              <h3>
                Top Players
              </h3>

            </div>


            <button
              class="secondary-button"
              on:click={() =>
                navigate("Rankings")
              }
            >
              View Rankings
            </button>

          </div>


          {#if getTopPlayers().length > 0}

            <div class="top-players">

              {#each getTopPlayers() as player, index}

                <div
                  class="top-player"
                >

                  <div class="rank-badge">
                    {getRankIcon(
                      index + 1
                    )}
                  </div>


                  <div class="top-player-avatar">
                    {getPlayerInitials(
                      player.name
                    )}
                  </div>


                  <div class="top-player-info">

                    <strong>
                      {player.name}
                    </strong>

                    <span>
                      {player.matches}
                      {player.matches === 1
                        ? " match"
                        : " matches"}
                    </span>

                  </div>


                  <div class="top-player-points">

                    <strong>
                      {formatPoints(
                        player.points
                      )}
                    </strong>

                    <span>
                      points
                    </span>

                  </div>

                </div>

              {/each}

            </div>


            <button
              class="view-ranking-button"
              on:click={() =>
                navigate("Rankings")
              }
            >
              View Full Rankings →
            </button>

          {:else}

            <div class="empty-state small">

              <div class="empty-icon">
                🏆
              </div>

              <h4>
                No rankings yet
              </h4>

              <p>
                Rankings will appear after
                matches are completed.
              </p>

              <button
                class="primary-button"
                on:click={() =>
                  navigate("Matches")
                }
              >
                Go to Matches
              </button>

            </div>

          {/if}

        </div>

      </section>


    <!-- ===================================================
         PLAYERS
    ==================================================== -->

    {:else if currentPage === "Players"}

      <Players />


    <!-- ===================================================
         TOURNAMENTS
    ==================================================== -->

    {:else if currentPage === "Tournaments"}

      <Tournaments />


    <!-- ===================================================
         MATCHES
    ==================================================== -->

    {:else if currentPage === "Matches"}

      <Matches />


    <!-- ===================================================
         RANKINGS
    ==================================================== -->

    {:else if currentPage === "Rankings"}

      <Rankings />

    {/if}

  </main>

</div>


<style>

  @import url(
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700&display=swap'
  );


  /* =====================================================
     GLOBAL
  ====================================================== */

  :global(:root) {

    font-family:
      "Inter",
      sans-serif;

    color: #171717;

    background: #f5f3ef;

    font-synthesis: none;

    text-rendering:
      optimizeLegibility;

  }


  :global(*) {

    box-sizing:
      border-box;

    margin: 0;

    padding: 0;

  }


  :global(body) {

    min-width: 320px;

    min-height: 100vh;

    background:
      #f5f3ef;

  }


  button {

    font-family:
      inherit;

    border:
      none;

    cursor:
      pointer;

  }


  /* =====================================================
     APP
  ====================================================== */

  .app {

    min-height:
      100vh;

    display:
      flex;

  }


  /* =====================================================
     SIDEBAR
  ====================================================== */

  .sidebar {

    width:
      250px;

    min-height:
      100vh;

    background:
      #171717;

    color:
      white;

    padding:
      28px 18px;

    display:
      flex;

    flex-direction:
      column;

    position:
      fixed;

    left:
      0;

    top:
      0;

    bottom:
      0;

  }


  .brand {

    display:
      flex;

    align-items:
      center;

    gap:
      12px;

    padding:
      0 10px 35px;

  }


  .brand-icon {

    width:
      42px;

    height:
      42px;

    border-radius:
      12px;

    display:
      flex;

    align-items:
      center;

    justify-content:
      center;

    background:
      #d8b56a;

    color:
      #171717;

    font-size:
      24px;

  }


  .brand h1 {

    font-size:
      17px;

    font-weight:
      800;

  }


  .brand span {

    display:
      block;

    margin-top:
      3px;

    color:
      #999;

    font-size:
      10px;

    text-transform:
      uppercase;

    letter-spacing:
      1px;

  }


  /* =====================================================
     NAVIGATION
  ====================================================== */

  nav {

    display:
      flex;

    flex-direction:
      column;

    gap:
      7px;

  }


  nav button {

    width:
      100%;

    padding:
      13px 14px;

    border-radius:
      10px;

    background:
      transparent;

    color:
      #a9a9a9;

    display:
      flex;

    align-items:
      center;

    gap:
      13px;

    text-align:
      left;

    font-size:
      13px;

    transition:
      0.2s;

  }


  nav button span {

    width:
      20px;

    text-align:
      center;

    font-size:
      17px;

  }


  nav button:hover {

    background:
      #242424;

    color:
      white;

  }


  nav button.active {

    background:
      #d8b56a;

    color:
      #171717;

    font-weight:
      700;

  }


  /* =====================================================
     SIDEBAR FOOTER
  ====================================================== */

  .sidebar-footer {

    margin-top:
      auto;

    border-top:
      1px solid #2c2c2c;

    padding:
      20px 8px 5px;

  }


  .profile {

    display:
      flex;

    align-items:
      center;

    gap:
      10px;

  }


  .avatar,
  .user-avatar {

    width:
      36px;

    height:
      36px;

    border-radius:
      50%;

    background:
      #d8b56a;

    color:
      #171717;

    display:
      flex;

    align-items:
      center;

    justify-content:
      center;

    font-weight:
      800;

  }


  .profile strong {

    display:
      block;

    font-size:
      12px;

  }


  .profile small {

    color:
      #888;

    font-size:
      10px;

  }


  /* =====================================================
     MAIN
  ====================================================== */

  .main-content {

    margin-left:
      250px;

    width:
      calc(100% - 250px);

    min-height:
      100vh;

    padding:
      30px 38px;

  }


  /* =====================================================
     TOP BAR
  ====================================================== */

  .topbar {

    display:
      flex;

    justify-content:
      space-between;

    align-items:
      center;

    margin-bottom:
      28px;

  }


  .eyebrow {

    color:
      #a48543;

    font-size:
      10px;

    font-weight:
      800;

    letter-spacing:
      1.5px;

    margin-bottom:
      5px;

  }


  .topbar h2 {

    font-family:
      "Playfair Display",
      serif;

    font-size:
      30px;

  }


  .header-actions {

    display:
      flex;

    align-items:
      center;

    gap:
      12px;

  }


  .icon-button {

    width:
      40px;

    height:
      40px;

    border-radius:
      10px;

    background:
      white;

    border:
      1px solid #e6e1d8;

  }


  .user-avatar {

    width:
      40px;

    height:
      40px;

  }


  /* =====================================================
     WELCOME
  ====================================================== */

  .welcome {

    min-height:
      180px;

    padding:
      30px 35px;

    border-radius:
      18px;

    background:
      #1c1c1c;

    color:
      white;

    display:
      flex;

    align-items:
      center;

    justify-content:
      space-between;

    overflow:
      hidden;

    position:
      relative;

    margin-bottom:
      22px;

  }


  .welcome h3 {

    font-family:
      "Playfair Display",
      serif;

    font-size:
      30px;

    margin-bottom:
      10px;

  }


  .welcome p:not(.eyebrow) {

    color:
      #aaa;

    max-width:
      550px;

    line-height:
      1.6;

    font-size:
      13px;

  }


  .chess-piece {

    font-size:
      130px;

    color:
      #d8b56a;

    opacity:
      0.8;

    margin-right:
      50px;

  }


  /* =====================================================
     STATISTICS
  ====================================================== */

  .stats-grid {

    display:
      grid;

    grid-template-columns:
      repeat(4, 1fr);

    gap:
      16px;

    margin-bottom:
      22px;

  }


  .stat-card {

    background:
      white;

    border:
      1px solid #e6e1d8;

    border-radius:
      14px;

    padding:
      20px;

    display:
      flex;

    align-items:
      center;

    gap:
      15px;

  }


  .stat-icon {

    width:
      42px;

    height:
      42px;

    border-radius:
      11px;

    background:
      #f3ead7;

    display:
      flex;

    align-items:
      center;

    justify-content:
      center;

    font-size:
      19px;

  }


  .stat-card span {

    display:
      block;

    color:
      #858585;

    font-size:
      11px;

    margin-bottom:
      5px;

  }


  .stat-card strong {

    font-size:
      25px;

  }


  /* =====================================================
     CONTENT GRID
  ====================================================== */

  .content-grid {

    display:
      grid;

    grid-template-columns:
      1.5fr 1fr;

    gap:
      20px;

  }


  .panel {

    background:
      white;

    border:
      1px solid #e6e1d8;

    border-radius:
      16px;

    padding:
      23px;

    min-height:
      300px;

  }


  .panel-header {

    display:
      flex;

    justify-content:
      space-between;

    align-items:
      center;

    margin-bottom:
      18px;

  }


  .panel-header h3 {

    font-family:
      "Playfair Display",
      serif;

    font-size:
      20px;

  }


  .secondary-button {

    padding:
      8px 12px;

    border-radius:
      8px;

    background:
      #f5f3ef;

    color:
      #555;

    font-size:
      11px;

    font-weight:
      600;

  }


  /* =====================================================
     RECENT TOURNAMENTS
  ====================================================== */

  .recent-tournaments {

    display:
      flex;

    flex-direction:
      column;

    gap:
      10px;

  }


  .recent-tournament {

    display:
      flex;

    align-items:
      center;

    gap:
      12px;

    padding:
      13px;

    border:
      1px solid #eee9df;

    border-radius:
      11px;

  }


  .recent-tournament-icon {

    width:
      40px;

    height:
      40px;

    flex-shrink:
      0;

    border-radius:
      10px;

    background:
      #f3ead7;

    display:
      flex;

    align-items:
      center;

    justify-content:
      center;

    font-size:
      18px;

  }


  .recent-tournament-info {

    min-width:
      0;

    flex:
      1;

  }


  .recent-tournament-info strong {

    display:
      block;

    font-size:
      12px;

    white-space:
      nowrap;

    overflow:
      hidden;

    text-overflow:
      ellipsis;

  }


  .recent-tournament-info span {

    display:
      block;

    color:
      #999;

    font-size:
      10px;

    margin-top:
      3px;

  }


  .recent-tournament-meta {

    display:
      flex;

    flex-direction:
      column;

    align-items:
      flex-end;

    gap:
      3px;

    color:
      #888;

    font-size:
      9px;

  }


  .status-badge {

    padding:
      6px 9px;

    border-radius:
      20px;

    background:
      #f3ead7;

    color:
      #806426;

    font-size:
      9px;

    font-weight:
      700;

    white-space:
      nowrap;

  }


  .status-badge.completed {

    background:
      #e4f3e8;

    color:
      #238047;

  }


  .status-badge.progress {

    background:
      #fff1d7;

    color:
      #9a6a14;

  }


  /* =====================================================
     TOP PLAYERS
  ====================================================== */

  .top-players {

    display:
      flex;

    flex-direction:
      column;

    gap:
      10px;

  }


  .top-player {

    display:
      flex;

    align-items:
      center;

    gap:
      10px;

    padding:
      11px;

    border:
      1px solid #eee9df;

    border-radius:
      11px;

  }


  .rank-badge {

    width:
      28px;

    font-size:
      18px;

    text-align:
      center;

  }


  .top-player-avatar {

    width:
      38px;

    height:
      38px;

    border-radius:
      50%;

    background:
      #f3ead7;

    color:
      #806426;

    display:
      flex;

    align-items:
      center;

    justify-content:
      center;

    font-size:
      11px;

    font-weight:
      800;

  }


  .top-player-info {

    flex:
      1;

    min-width:
      0;

  }


  .top-player-info strong {

    display:
      block;

    font-size:
      12px;

    white-space:
      nowrap;

    overflow:
      hidden;

    text-overflow:
      ellipsis;

  }


  .top-player-info span {

    display:
      block;

    color:
      #999;

    font-size:
      9px;

    margin-top:
      3px;

  }


  .top-player-points {

    text-align:
      right;

  }


  .top-player-points strong {

    display:
      block;

    font-size:
      16px;

  }


  .top-player-points span {

    display:
      block;

    color:
      #999;

    font-size:
      8px;

  }


  .view-ranking-button {

    width:
      100%;

    margin-top:
      14px;

    padding:
      10px;

    border:
      1px solid #e6e1d8;

    border-radius:
      9px;

    background:
      white;

    color:
      #806426;

    font-size:
      10px;

    font-weight:
      700;

  }


  .view-ranking-button:hover {

    background:
      #f5f3ef;

  }


  /* =====================================================
     EMPTY STATE
  ====================================================== */

  .empty-state {

    min-height:
      210px;

    display:
      flex;

    flex-direction:
      column;

    align-items:
      center;

    justify-content:
      center;

    text-align:
      center;

  }


  .empty-state.small {

    min-height:
      230px;

  }


  .empty-icon {

    width:
      50px;

    height:
      50px;

    border-radius:
      50%;

    background:
      #f3ead7;

    display:
      flex;

    align-items:
      center;

    justify-content:
      center;

    font-size:
      22px;

    margin-bottom:
      12px;

  }


  .empty-state h4 {

    font-size:
      14px;

    margin-bottom:
      6px;

  }


  .empty-state p {

    color:
      #999;

    font-size:
      11px;

    margin-bottom:
      15px;

  }


  .primary-button {

    background:
      #d8b56a;

    color:
      #171717;

    padding:
      10px 16px;

    border-radius:
      9px;

    font-size:
      11px;

    font-weight:
      700;

  }


  /* =====================================================
     RESPONSIVE
  ====================================================== */

  @media (max-width: 1100px) {

    .stats-grid {

      grid-template-columns:
        repeat(2, 1fr);

    }

    .content-grid {

      grid-template-columns:
        1fr;

    }

  }


  @media (max-width: 800px) {

    .recent-tournament-meta {

      display:
        none;

    }

  }


  @media (max-width: 700px) {

    .sidebar {

      width:
        70px;

      padding:
        20px 10px;

    }


    .brand {

      justify-content:
        center;

      padding:
        0 0 30px;

    }


    .brand > div:last-child,
    .profile > div:last-child {

      display:
        none;

    }


    nav button {

      justify-content:
        center;

      padding:
        13px 5px;

    }


    nav button span {

      margin:
        0;

    }


    .main-content {

      margin-left:
        70px;

      width:
        calc(100% - 70px);

      padding:
        20px;

    }


    .welcome {

      padding:
        25px;

    }


    .chess-piece {

      display:
        none;

    }


    .stats-grid {

      grid-template-columns:
        1fr;

    }


    .recent-tournament {

      flex-wrap:
        wrap;

    }


    .recent-tournament-info {

      width:
        calc(100% - 55px);

      flex:
        none;

    }


    .status-badge {

      margin-left:
        52px;

    }

  }

</style>