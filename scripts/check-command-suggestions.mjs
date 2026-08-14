import assert from 'node:assert/strict';
import {COMMAND_DEFINITIONS,suggestCommands} from '../src/command-suggestions.js';

assert.deepEqual(suggestCommands('hello'),[],'plain chat must not show slash-command suggestions');
const roots=suggestCommands('/');
for(const command of COMMAND_DEFINITIONS)assert.ok(roots.some(entry=>entry.replacement===`/${command.name} `),`root suggestions must expose /${command.name}`);
assert.ok(suggestCommands('/g').some(entry=>entry.replacement==='/gamemode '));
assert.ok(suggestCommands('/g').some(entry=>entry.replacement==='/give '));

let suggestions=suggestCommands('/gamemode c');
assert.deepEqual(suggestions.map(entry=>entry.replacement),['/gamemode creative ']);

suggestions=suggestCommands('/give st');
assert.ok(suggestions.some(entry=>entry.replacement==='/give stick '),'give completion should include executable stick id');
assert.ok(suggestions.some(entry=>entry.replacement==='/give stone '),'give completion should include the existing stone alias');

suggestions=suggestCommands('/summon z');
assert.deepEqual(suggestions.map(entry=>entry.replacement),['/summon zombie ']);
assert.equal(suggestions[0].description,'当前已实现实体类型');

suggestions=suggestCommands('/time s');
assert.deepEqual(suggestions.map(entry=>entry.replacement),['/time set ']);
suggestions=suggestCommands('/time set n');
assert.ok(suggestions.some(entry=>entry.replacement==='/time set noon'));
assert.ok(suggestions.some(entry=>entry.replacement==='/time set night'));
assert.ok(suggestions.some(entry=>entry.kind==='hint'&&entry.label==='<数字>'));

suggestions=suggestCommands('/weather th');
assert.deepEqual(suggestions.map(entry=>entry.replacement),['/weather thunder']);

suggestions=suggestCommands('/tp ');
assert.equal(suggestions.length,1);assert.equal(suggestions[0].kind,'hint');assert.equal(suggestions[0].label,'<x>');assert.equal(suggestions[0].replacement,null);
suggestions=suggestCommands('/teleport ~ ');
assert.equal(suggestions[0].label,'<y>','command aliases must share the canonical argument grammar');

suggestions=suggestCommands('/xp a');
assert.deepEqual(suggestions.map(entry=>entry.replacement),['/xp add ']);
suggestions=suggestCommands('/experience add 5 ');
assert.deepEqual(suggestions.map(entry=>entry.replacement),['/experience add 5 points']);

console.log('structured command hints + tab completion replacements: PASS');
