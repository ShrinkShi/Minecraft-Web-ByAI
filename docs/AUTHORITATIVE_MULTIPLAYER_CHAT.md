# Authoritative multiplayer chat

## Goal

Ordinary multiplayer chat now uses its own strict WebSocket protocol instead of falling through to the legacy singleplayer chat path or sharing gameplay/command sequencing.

This is deliberately a small server-authoritative chat foundation. It is not an account, identity, moderation, private-message, chat-signing, or history system.

## Wire protocol

`src/multiplayer-chat-wire.js` defines version 1 with two message kinds.

### Client → server: `chat-send`

Fields:

- `v: 1`
- `kind: "chat-send"`
- authoritative session id
- independent uint32 `clientSeq`
- trimmed text, 1..256 characters

The client payload has **no sender/name/playerId field**. A client cannot choose or spoof the displayed sender identity. The server derives the sender from the WebSocket session that submitted the message.

Text beginning with `/` is rejected by the chat wire. Slash-prefixed input belongs to the independent authoritative command channel.

Each connection has its own `NetworkSequenceGate` for chat sends. Replayed, duplicate, stale, or backwards `clientSeq` values close the connection with a policy violation instead of rebroadcasting the text.

### Server → clients: `chat-message`

Fields:

- `v: 1`
- `kind: "chat-message"`
- server-global uint32 `messageSeq`
- server-derived sender session
- validated text

Every connected client receives the same encoded broadcast and applies a local sequence gate to `messageSeq`. A duplicate/stale server chat message is a protocol error.

The first message accepted by a newly connected client may start at any uint32 value because the server does not replay chat history.

## Rate limiting

The WebSocket server currently allows at most 8 accepted chat sends per connection in a rolling 5-second window.

The ninth message inside the same window closes that connection with policy code `1008` and reason `chat rate limit exceeded`.

This is a basic transport abuse guard, not production moderation. It does not replace authenticated identities, mute/ban lists, content policy, per-account limits, IP/network controls, or operator tooling.

## Browser integration

The active multiplayer gameplay adapter attaches `client.sendChat()` to `multiplayer-chat-channel.js` for exactly the lifetime of the multiplayer gameplay runtime.

`chat-command-completion.js` owns the capture-phase key handler for the chat input:

- slash-prefixed Enter is routed to the authoritative multiplayer command sender;
- non-empty ordinary Enter is routed to the authoritative multiplayer chat sender;
- when no multiplayer sender exists, existing singleplayer behavior is left untouched.

The browser does not append an optimistic local multiplayer line. It closes the input, sends `chat-send`, and renders the message only after the server broadcasts `chat-message` back. This keeps displayed multiplayer chat aligned with what the server actually accepted.

Until authenticated player profiles exist, the UI renders a short label derived from the opaque session id (for example `玩家-a1b2c3`). That label is intentionally ephemeral and must not be treated as a persistent identity.

## Validation

The repository includes:

- strict send/broadcast wire contract checks, including sender-spoof field rejection;
- fake-WebSocket client checks for independent chat/command sequences and duplicate server-message rejection;
- real two-client WebSocket runtime coverage for identical broadcast, authoritative sender assignment, replay rejection, and the 8-per-5-second rate limit;
- Chromium E2E that types ordinary Chinese text into the real chat input and requires the line to appear only through the server broadcast path.

## Follow-up

Before this should be considered Internet-facing public-server chat, add authenticated player identities, stable display names, operator/moderation controls, mute/ban policy, configurable rate limits, and an explicit decision on persistence/history. Private messages or richer chat components should use separately versioned message kinds rather than weakening the current strict public-chat schema.
