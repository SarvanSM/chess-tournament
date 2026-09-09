<script>
  import {
    players,
    addPlayer,
    updatePlayer,
    deletePlayer
  } from "../stores/players.js";

  let showModal = false;
  let editingPlayer = null;
  let search = "";

  let form = {
    name: "",
    email: "",
    rating: 1200
  };

  function openAddPlayer() {
    editingPlayer = null;

    form = {
      name: "",
      email: "",
      rating: 1200
    };

    showModal = true;
  }

  function openEditPlayer(player) {
    editingPlayer = player;

    form = {
      name: player.name,
      email: player.email,
      rating: player.rating
    };

    showModal = true;
  }

  function savePlayer() {
    if (!form.name.trim() || !form.email.trim()) {
      alert("Please enter player name and email.");
      return;
    }

    if (editingPlayer) {
      updatePlayer(editingPlayer.id, {
        name: form.name.trim(),
        email: form.email.trim(),
        rating: Number(form.rating)
      });
    } else {
      addPlayer({
        name: form.name.trim(),
        email: form.email.trim(),
        rating: Number(form.rating)
      });
    }

    showModal = false;
  }

  function removePlayer(id) {
    const confirmed = confirm(
      "Are you sure you want to delete this player?"
    );

    if (confirmed) {
      deletePlayer(id);
    }
  }

  $: filteredPlayers = $players.filter((player) => {
    const searchValue = search.toLowerCase();

    return (
      player.name.toLowerCase().includes(searchValue) ||
      player.email.toLowerCase().includes(searchValue)
    );
  });
</script>

<section class="players-page">

  <div class="page-heading">

    <div>
      <p class="eyebrow">PLAYER MANAGEMENT</p>

      <h3>Chess Players</h3>

      <p class="description">
        Manage all registered players in your chess tournament system.
      </p>
    </div>

    <button class="primary-button" onclick={openAddPlayer}>
      + Add Player
    </button>

  </div>

  <div class="player-toolbar">

    <input
      type="text"
      placeholder="Search players..."
      bind:value={search}
    />

    <span>
      Total Players: <strong>{$players.length}</strong>
    </span>

  </div>

  <div class="players-table">

    <div class="table-header">
      <span>PLAYER</span>
      <span>EMAIL</span>
      <span>RATING</span>
      <span>ACTIONS</span>
    </div>

    {#if filteredPlayers.length === 0}

      <div class="empty-players">

        <div class="empty-icon">
          ♙
        </div>

        <h4>
          {search ? "No players found" : "No players yet"}
        </h4>

        <p>
          {search
            ? "Try a different search."
            : "Add your first chess player to get started."}
        </p>

      </div>

    {:else}

      {#each filteredPlayers as player}

        <div class="player-row">

          <div class="player-name">

            <div class="player-avatar">
              {player.name.charAt(0).toUpperCase()}
            </div>

            <strong>{player.name}</strong>

          </div>

          <span class="email">
            {player.email}
          </span>

          <span class="rating">
            {player.rating}
          </span>

          <div class="actions">

            <button
              class="edit-button"
              onclick={() => openEditPlayer(player)}
            >
              Edit
            </button>

            <button
              class="delete-button"
              onclick={() => removePlayer(player.id)}
            >
              Delete
            </button>

          </div>

        </div>

      {/each}

    {/if}

  </div>

</section>

{#if showModal}

  <div
    class="modal-backdrop"
    onclick={(event) => {
      if (event.target === event.currentTarget) {
        showModal = false;
      }
    }}
  >

    <div class="modal">

      <div class="modal-header">

        <div>
          <p class="eyebrow">PLAYER</p>

          <h3>
            {editingPlayer ? "Edit Player" : "Add Player"}
          </h3>
        </div>

        <button
          class="close-button"
          onclick={() => showModal = false}
        >
          ×
        </button>

      </div>

      <div class="form">

        <label>
          Player Name

          <input
            type="text"
            placeholder="Enter player name"
            bind:value={form.name}
          />
        </label>

        <label>
          Email

          <input
            type="email"
            placeholder="Enter email address"
            bind:value={form.email}
          />
        </label>

        <label>
          Chess Rating

          <input
            type="number"
            min="0"
            bind:value={form.rating}
          />
        </label>

      </div>

      <div class="modal-actions">

        <button
          class="cancel-button"
          onclick={() => showModal = false}
        >
          Cancel
        </button>

        <button
          class="primary-button"
          onclick={savePlayer}
        >
          {editingPlayer ? "Update Player" : "Add Player"}
        </button>

      </div>

    </div>

  </div>

{/if}