# Authoritative Multiplayer PvP

## Purpose

This stage makes player-vs-player melee combat server authoritative without pretending that the still-local mob/projectile systems are authoritative too.

The server owns player HP, death, attack timing, melee target resolution, armor mitigation, knockback impulses, death inventory cleanup, and respawn. The browser sends only input intent and renders replicated state.

## Authority domains

### Combat state

Each connected player has a server-owned combat state with:

- current HP and maximum HP;
- an independent combat revision;
- attack cooldown state;
- hurt/invulnerability cooldown state;
- alive/dead state.

The server replicates this as strict `player-combat-snapshot` messages. Combat snapshots are a live realtime domain, not part of the world bootstrap barrier and not part of movement interpolation.

The client may display HP/death UI, but it does not submit replacement HP, damage results, death flags, or respawn coordinates.

### Attack input

A primary-button press does two separate jobs:

1. continuous `primary=true` remains part of the normal control state so server-authoritative mining can continue while the button is held;
2. the press edge sends exactly one referenced `attack` action.

The attack action carries the sequence number of an already accepted player view. It does **not** carry a player ID, hit result, target coordinates, damage amount, or knockback vector.

The server resolves the target from the authoritative attacker position plus that referenced yaw/pitch.

### Melee targeting

The server intersects the attack ray with authoritative player collision AABBs, selects the nearest eligible player within melee reach, and compares that distance with an authoritative block raycast.

A solid block closer than the player target occludes the hit. Dead players, spectators, the attacker itself, and out-of-reach players are not valid targets.

This prevents clients from attacking through walls or submitting arbitrary target IDs.

## Damage and timing

The server owns:

- attack cooldown;
- target hurt cooldown;
- selected-item attack damage;
- creative one-hit behavior used by the current game rules;
- armor mitigation from authoritative equipment state.

If an attack ray selects a player, that player target takes priority over mining for that press. A cooldown-rejected player attack still does not fall through into a block strike behind the player.

If no player is selected, ordinary server-authoritative mining remains available.

## Knockback

The server derives knockback direction from authoritative attacker/target positions and applies the impulse through the existing `ServerPlayerSimulation` velocity state. There is no separate combat-owned position copy and the client never submits a knockback vector.

## Death

When server HP reaches zero, the player is dead immediately in the combat domain. Dead players:

- receive neutralized movement/control state on the server;
- cannot attack, mine, use/drop, or mutate inventory/equipment/player-crafting state;
- are excluded from authoritative item pickup so a corpse cannot immediately collect its own drops;
- remain connected and continue receiving realtime snapshots.

Before producing death drops, the server closes any active Workbench through its existing authoritative cleanup path. Then it drains, in order:

1. permanent player 2×2 crafting inputs;
2. equipped armor;
3. inventory slots and inventory cursor.

Derived recipe results are never duplicated as death drops. Every real drained stack becomes an authoritative item entity in the world.

The same cleanup path is used for server-authoritative void death in damageable modes.

## Death presentation and respawn

The browser listens to combat snapshots. When `dead=true`, the multiplayer combat presentation:

- updates hearts from server HP;
- releases Pointer Lock;
- hides open inventory/workbench/chat input surfaces;
- shows the death screen.

The death screen does not run the singleplayer inventory drain or choose a spawn point.

Clicking `重生` is intercepted by the multiplayer presentation and sends a no-view `respawn` action. The server resets combat HP and relocates the player through the existing authoritative world spawn calculation. The death screen is removed only after an authoritative movement tick advances following the respawn request.

## Respawn input

`respawn` is intentionally different from `attack`, `use`, and `drop`:

- it has no referenced view;
- it contains no coordinates or spawn hint;
- it is accepted only for a server-dead session;
- the server chooses the location and resets velocity.

## Security properties

- Session identity comes from the authenticated WebSocket envelope.
- Attack action sequencing uses the existing strict input/action sequence gates.
- Attack view must already exist in retained server input history.
- Client target IDs and target coordinates are not part of the attack wire contract.
- HP, damage, armor, death, item loss, knockback, and respawn position are server-derived.
- Solid blocks occlude melee targeting.
- Dead sessions are server-frozen even if a modified client keeps transmitting movement or mutation requests.
- Combat revisions are strictly increasing and independent from movement, inventory, equipment, crafting, command, and chat sequencing.

## Current boundary

This PR deliberately covers **PvP melee only**.

It does not yet make these systems authoritative:

- passive/hostile mobs and their AI;
- melee attacks against mobs;
- arrows or other projectiles;
- explosions and explosion damage;
- hunger/food regeneration;
- experience death loss;
- multiplayer player/world persistence.

Those domains currently depend on client-side systems and must migrate to explicit server-owned entity/state models before they can safely participate in multiplayer combat.
