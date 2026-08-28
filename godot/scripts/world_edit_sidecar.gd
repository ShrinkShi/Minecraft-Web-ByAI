class_name WorldEditSidecarRuntime
extends RefCounted

var entries: Dictionary = {}

func _init(serialized: Dictionary = {}) -> void:
	if not import_snapshot(serialized):
		entries.clear()

func import_snapshot(serialized: Dictionary = {}) -> bool:
	var staged: Dictionary = {}
	for raw_chunk_key in serialized.keys():
		var chunk_key: String = str(raw_chunk_key)
		if chunk_key.is_empty():
			push_error("world edit sidecar chunk key must be a non-empty string")
			return false
		var rows: Variant = serialized[raw_chunk_key]
		if typeof(rows) != TYPE_ARRAY:
			push_error("world edit sidecar %s entries must be an array" % chunk_key)
			return false
		var chunk_entries: Dictionary = {}
		for row_variant in rows:
			if typeof(row_variant) != TYPE_ARRAY:
				push_error("world edit sidecar %s entry must be [index,id]" % chunk_key)
				return false
			var row: Array = row_variant
			if row.size() != 2:
				push_error("world edit sidecar %s entry must be [index,id]" % chunk_key)
				return false
			var index_value: Variant = _json_integer(row[0], 0, 0x7fffffffffffffff)
			if index_value == null:
				push_error("world edit sidecar index must be a non-negative integer")
				return false
			var block_id_value: Variant = _json_integer(row[1], 0, 255)
			if block_id_value == null:
				push_error("world edit block id must be an integer in 0..255")
				return false
			chunk_entries[int(index_value)] = int(block_id_value)
		if not chunk_entries.is_empty():
			staged[chunk_key] = chunk_entries
	entries = staged
	return true

func get_edit(chunk_key: String, index: int) -> Variant:
	if chunk_key.is_empty() or index < 0:
		return null
	var chunk_entries: Variant = entries.get(chunk_key)
	if typeof(chunk_entries) != TYPE_DICTIONARY:
		return null
	return (chunk_entries as Dictionary).get(index)

func set_edit(chunk_key: String, index: int, block_id: int) -> bool:
	if chunk_key.is_empty() or index < 0 or block_id < 0 or block_id > 255:
		return false
	var chunk_entries: Dictionary
	if entries.has(chunk_key):
		chunk_entries = entries[chunk_key]
	else:
		chunk_entries = {}
		entries[chunk_key] = chunk_entries
	var changed: bool = not chunk_entries.has(index) or int(chunk_entries[index]) != block_id
	chunk_entries[index] = block_id
	return changed

func delete_edit(chunk_key: String, index: int) -> bool:
	if chunk_key.is_empty() or index < 0:
		return false
	var chunk_entries: Variant = entries.get(chunk_key)
	if typeof(chunk_entries) != TYPE_DICTIONARY:
		return false
	var chunk_entries_dict: Dictionary = chunk_entries
	var changed: bool = chunk_entries_dict.erase(index)
	if chunk_entries_dict.is_empty():
		entries.erase(chunk_key)
	return changed

func apply_chunk(chunk_key: String, source: PackedByteArray) -> PackedByteArray:
	var result: PackedByteArray = source.duplicate()
	var chunk_entries: Variant = entries.get(chunk_key)
	if typeof(chunk_entries) != TYPE_DICTIONARY:
		return result
	var chunk_entries_dict: Dictionary = chunk_entries
	for raw_index in chunk_entries_dict.keys():
		var index: int = int(raw_index)
		if index >= 0 and index < result.size():
			result[index] = int(chunk_entries_dict[index])
	return result

func entry_count() -> int:
	var total := 0
	for chunk_entries_variant in entries.values():
		var chunk_entries: Dictionary = chunk_entries_variant
		total += chunk_entries.size()
	return total

func clear() -> void:
	entries.clear()

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
			rows.append([index, int(chunk_entries[index])])
		if not rows.is_empty():
			output[chunk_key] = rows
	return output

static func _json_integer(value: Variant, minimum: int, maximum: int) -> Variant:
	var candidate: int
	if typeof(value) == TYPE_INT:
		candidate = int(value)
	elif typeof(value) == TYPE_FLOAT:
		var numeric: float = float(value)
		if not is_finite(numeric) or floor(numeric) != numeric:
			return null
		candidate = int(numeric)
	else:
		return null
	if candidate < minimum or candidate > maximum:
		return null
	return candidate
