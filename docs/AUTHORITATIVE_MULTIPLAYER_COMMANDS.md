# Authoritative multiplayer commands

## Security model

Multiplayer slash commands are not normal movement/action input. They use a dedicated strict request/result protocol and are never executed by the browser against local gameplay state.

The server is deny-by-default:

- `/help` is always available because it does not mutate world/player state;
- `/gamemode` and `/give` are rejected unless the server starts with `MCWEB_ALLOW_COMMANDS=true`;
- unsupported singleplayer commands such as `/tp`, `/summon`, `/kill`, `/xp`, `/time`, `/weather`, and `/spawnpoint` remain unsupported in multiplayer until each receives an authoritative server implementation.

`MCWEB_ALLOW_COMMANDS=true` is a global development/admin switch, **not** an operator identity/authentication system. When enabled, every connected client may use the currently whitelisted cheat commands. Public servers should leave it disabled until authenticated operator permissions exist.

## Wire boundary

`src/multiplayer-command-wire.js` defines version 1:

### Client request

- `kind: "command-request"`
- `v: 1`
- authoritative session id
- independent uint32 `requestId`
- slash-prefixed command text, maximum 256 characters

Command requests do not consume or share the gameplay input `packetSeq`. The server maintains a separate sequence gate so duplicate/replayed request IDs are rejected.

### Server result

- `kind: "command-result"`
- matching session and `requestId`
- `ok`
- strict result code
- bounded human-readable message

The browser only accepts results for requests it still has pending. Unsolicited/mismatched results are protocol failures.

## Current authoritative commands

### `/help`

Returns the server-supported multiplayer command set and whether cheat mutations are enabled.

### `/give <item> [count]`

When commands are enabled, item resolution occurs on the server. The server mutates `ServerPlayerInventoryHub`, advances the authoritative inventory revision, and replicates the resulting full snapshot. The browser does not add the item locally.

### `/gamemode <mode>`

When commands are enabled, the server changes both:

1. authoritative player simulation mode;
2. authoritative inventory mode.

Changing inventory mode advances its revision exactly once but preserves existing carried stacks. The next normal player tick carries the new player mode; the inventory snapshot is replicated immediately. This avoids sending a duplicate inventory revision with different mode metadata.

## Browser integration

The active multiplayer gameplay adapter registers the current WebSocket client's `sendCommand` method with `src/multiplayer-command-channel.js`.

`src/chat-command-completion.js` already owns the chat input capture phase for Tab completion. In multiplayer only, it also intercepts Enter for slash-prefixed input before the legacy singleplayer `runCommand` listener can execute. It closes chat, sends the request to the server, and renders the eventual authoritative result in the chat log.

When no multiplayer command sender is attached, Enter is not intercepted and existing singleplayer command execution remains unchanged.

## Follow-up

Before enabling cheat commands on an Internet-facing public server, add authenticated player identities plus operator/permission levels. Future command implementations should be added one by one with authoritative domain APIs rather than exposing arbitrary browser-side callbacks or reusing local singleplayer mutation code.
