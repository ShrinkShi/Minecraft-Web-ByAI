# Command completion and browser-safe controls

## Why the desktop bindings differ from native Minecraft

A browser tab is not a native game process. Some keyboard chords belong to the browser or operating system and cannot be treated as dependable gameplay input. In particular, using Ctrl as the required sprint key makes combinations such as Ctrl+W unsafe, while Tab normally participates in browser focus traversal.

The base control scheme therefore must work without any privileged keyboard-capture API.

## Desktop contract

- Move: `W A S D`
- Jump: `Space`
- Sneak: `Shift`
- Sprint: double-tap `W`, or hold `R`
- Inventory: `E`
- Drop: `Q`
- Chat: `T`
- Command chat: `/`
- Hotbar: `1..9` or mouse wheel
- View: `F5`
- Pause / close panel: `Escape`

`Ctrl` is intentionally not a gameplay sprint binding. `Tab` is prevented from moving browser focus while gameplay input owns the page, and while command chat is focused it belongs to command completion.

Keyboard Lock may be considered later as an optional fullscreen enhancement. Core controls must not depend on it.

## Command suggestions

`src/command-suggestions.js` is the shared, side-effect-free suggestion grammar for commands that are already executable by `src/commands.js`.

Current suggestions cover:

- command names and aliases;
- `/gamemode` values;
- `/give` item IDs and aliases;
- `/summon` implemented entity types;
- `/xp add` and `points`;
- `/time set` named values plus numeric hint;
- `/weather` values;
- coordinate hints for teleport, spawnpoint and summon.

`src/chat-command-completion.js` owns only the chat UI behavior. It renders the suggestion list, keeps focus in the input, supports arrow-key selection, and consumes Tab / Shift+Tab for completion navigation.

The command execution layer remains separate, so a later authoritative multiplayer command protocol can replace execution without rewriting the suggestion UI.

## Regression requirements

- pure logic checks lock suggestion replacements and the browser-safe key map;
- the existing desktop sprint test explicitly proves Ctrl no longer affects sprint;
- Chromium E2E proves Tab completes `/gamemode c` and `/summon z` without moving focus out of chat.
