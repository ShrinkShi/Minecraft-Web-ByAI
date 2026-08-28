class_name BlockStateSidecarRuntime
extends RefCounted

const StateRegistry = preload("res://godot/scripts/block_state_registry.gd")

var entries: Dictionary = {}

func _init(serialized: Dictionary = {}) -> void:
	import_snapshot(serialized)

func import_snapshot(serialized: Dictionary = {}) -> bool:
	for raw_chunk_key in serialized.keys():
		var chunk_key: String = str(raw_chunk_key)
		if chunk_key.is_empty():
			push_error("block-state sidecar chunk key must be a non-empty string")
			return false
		var rows: Variant = serialized[raw_chunk_key]
		if typeof(rows) != TYPE_ARRAY:
			push_error("block-state sidecar %s entries must be an array" % chunk_key)
			return false
		var seen: Dictionary = {}
		for row_variant in rows:
			if typeof(row_variant) != TYPE_ARRAY:
				push_error("block-state sidecar %s entry must be [index,id,stateKey]" % chunk_key)
				return false
			var row: Array = row_variant
			if row.size() != 3:
				push_error("block-state sidecar %s entry must be [index,id,stateKey]" % chunk_key)
				return false
			if typeof(row[0]) != TYPE_INT or int(row[0]) < 0:
				push_error("block-state sidecar index must be a non-negative integer")
				return false
			var index: int = int(row[0])
			if seen.has(index):
				push_error("block-state sidecar %s contains duplicate cell index: %d" % [chunk_key, index])
				return false
			seen[index] = true
			if typeof(row[1]) != TYPE_INT:
				push_error("block id must be an integer in 0..255")
				return false
			var identity: Variant = StateRegistry.block_identity_from_key(int(row[1]), row[2])
			if identity == null:
				return false
			var identity_dict: Dictionary = identity
			var default_key: Variant = StateRegistry.default_state_key(int(identity_dict["id"]))
			if identity_dict["stateKey"] == default_key:
				continue
			var chunk_entries: Variant = _chunk_entries(chunk_key, true)
			var chunk_entries_dict: Dictionary = chunk_entries
			chunk_entries_dict[index] = identity_dict.duplicate(true)
	_prune_empty_chunks()
	return true

func get_identity(chunk_key: String, index: int, block_id: int) -> Variant:
	if not _valid_location(chunk_key, index):
		return null
	var stored_chunk: Variant = entries.get(chunk_key)
	if typeof(stored_chunk) == TYPE_DICTIONARY:
		var stored_dict: Dictionary = stored_chunk
		var stored: Variant = stored_dict.get(index)
		if typeof(stored) == TYPE_DICTIONARY:
			var identity: Dictionary = stored
			if int(identity.get("id", -1)) == block_id:
				return identity.duplicate(true)
	return StateRegistry.block_identity(block_id)

func set_state(chunk_key: String, index: int, block_id: int, state: Dictionary = {}) -> Variant:
	if not _valid_location(chunk_key, index):
		return null
	var identity: Variant = StateRegistry.block_identity(block_id, state)
	if identity == null:
		return null
	return _store_identity(chunk_key, index, identity)

func set_from_key(chunk_key: String, index: int, block_id: int, state_key: Variant = null) -> Variant:
	if not _valid_location(chunk_key, index):
		return null
	var identity: Variant = StateRegistry.block_identity_from_key(block_id, state_key)
	if identity == null:
		return null
	return _store_identity(chunk_key, index, identity)

func delete(chunk_key: String, index: int) -> bool:
	if not _valid_location(chunk_key, index):
		return false
	var chunk_entries: Variant = entries.get(chunk_key)
	if typeof(chunk_entries) != TYPE_DICTIONARY:
		return false
	var chunk_entries_dict: Dictionary = chunk_entries
	var changed: bool = chunk_entries_dict.erase(index)
	if chunk_entries_dict.is_empty():
		entries.erase(chunk_key)
	return changed

func reconcile_chunk(chunk_key: String, block_ids: PackedByteArray) -> int:
	if chunk_key.is_empty():
		push_error("block-state sidecar chunk key must be a non-empty string")
		return 0
	var chunk_entries: Variant = entries.get(chunk_key)
	if typeof(chunk_entries) != TYPE_DICTIONARY:
		return 0
	var chunk_entries_dict: Dictionary = chunk_entries
	var removed := 0
	var indexes: Array = chunk_entries_dict.keys()
	for raw_index in indexes:
		var index: int = int(raw_index)
		var identity: Dictionary = chunk_entries_dict[index]
		if index >= block_ids.size() or int(block_ids[index]) != int(identity["id"]):
			chunk_entries_dict.erase(index)
			removed += 1
	if chunk_entries_dict.is_empty():
		entries.erase(chunk_key)
	return removed

func clear() -> void:
	entries.clear()

func entry_count() -> int:
	var total := 0
	for chunk_entries_variant in entries.values():
		var chunk_entries: Dictionary = chunk_entries_variant
		total += chunk_entries.size()
	return total

func export_snapshot() -> Dictionary:
	var output: Dictionary = {}
	var chunk_keys: Array = entries.keys()
	chunk_keys.sort()
	for raw_chunk_key in chunk_keys:
		var chunk_key: String = str(raw_chunk_key)
		var chunk_entries: Dictionary = entries[chunk_key]
		var indexes: Array = chunk_entries.keys()
		indexes.sort()
		var rows: Array = []
		for raw_index in indexes:
			var index: int = int(raw_index)
			var identity: Dictionary = chunk_entries[index]
			rows.append([index, int(identity["id"]), identity["stateKey"]])
		if not rows.is_empty():
			output[chunk_key] = rows
	return output

func _store_identity(chunk_key: String, index: int, identity_value: Variant) -> Dictionary:
	var identity: Dictionary = identity_value
	var default_key: Variant = StateRegistry.default_state_key(int(identity["id"]))
	if identity["stateKey"] == default_key:
		delete(chunk_key, index)
		return identity.duplicate(true)
	var chunk_entries: Variant = _chunk_entries(chunk_key, true)
	var chunk_entries_dict: Dictionary = chunk_entries
	chunk_entries_dict[index] = identity.duplicate(true)
	return identity.duplicate(true)

func _chunk_entries(chunk_key: String, create: bool) -> Variant:
	if entries.has(chunk_key):
		return entries[chunk_key]
	if not create:
		return null
	var created: Dictionary = {}
	entries[chunk_key] = created
	return created

func _prune_empty_chunks() -> void:
	for raw_chunk_key in entries.keys():
		var chunk_entries: Dictionary = entries[raw_chunk_key]
		if chunk_entries.is_empty():
			entries.erase(raw_chunk_key)

func _valid_location(chunk_key: String, index: int) -> bool:
	if chunk_key.is_empty():
		push_error("block-state sidecar chunk key must be a non-empty string")
		return false
	if index < 0:
		push_error("block-state sidecar index must be a non-negative integer")
		return false
	return true
