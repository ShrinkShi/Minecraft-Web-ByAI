extends SceneTree

const StateSchema = preload("res://godot/scripts/block_state_schema.gd")
const StateRegistry = preload("res://godot/scripts/block_state_registry.gd")
const StateSidecar = preload("res://godot/scripts/block_state_sidecar.gd")

func _init() -> void:
	_test_schema_defaults_and_ordering()
	_test_registry_identity_contract()
	_test_sparse_sidecar_semantics()
	print("Godot block-state runtime parity checks: PASS")
	quit(0)

func _test_schema_defaults_and_ordering() -> void:
	assert(StateSchema.canonical_key(StateSchema.schema("log")) == "axis=y")
	assert(StateSchema.canonical_key(StateSchema.schema("furnace")) == "facing=north,lit=false")
	assert(StateSchema.canonical_key(StateSchema.schema("farmland"), {"moisture": 7}) == "moisture=7")
	assert(StateSchema.canonical_key(StateSchema.schema("wheat"), {"age": "3"}) == "age=3")
	assert(StateSchema.canonical_key(StateSchema.schema("slab")) == "type=bottom,waterlogged=false")
	assert(StateSchema.canonical_key(StateSchema.schema("stair")) == "facing=north,half=bottom,shape=straight,waterlogged=false")
	assert(StateSchema.canonical_key(StateSchema.schema("fence")) == "east=false,north=false,south=false,waterlogged=false,west=false")
	assert(StateSchema.canonical_key(StateSchema.schema("door")) == "facing=north,half=lower,hinge=left,open=false,powered=false")
	assert(StateSchema.parse_canonical_key(StateSchema.schema("log"), "axis=x") == {"axis": "x"})
	assert(StateSchema.parse_canonical_key(StateSchema.schema("furnace"), "facing=east,lit=true") == {"facing": "east", "lit": "true"})

func _test_registry_identity_contract() -> void:
	assert(StateRegistry.default_state_key(6) == "axis=y")
	assert(StateRegistry.default_state_key(26) == "axis=y")
	assert(StateRegistry.default_state_key(21) == "facing=north,lit=false")
	assert(StateRegistry.default_state_key(3) == null)
	assert(StateRegistry.block_identity(3) == {"id": 3, "stateKey": null})
	assert(StateRegistry.block_identity(6, {"axis": "z"}) == {"id": 6, "stateKey": "axis=z"})
	assert(StateRegistry.block_identity_from_key(21, "facing=south,lit=true") == {"id": 21, "stateKey": "facing=south,lit=true"})
	assert(StateRegistry.identity_equal({"id": 6, "stateKey": "axis=x"}, {"id": 6, "stateKey": "axis=x"}))
	assert(not StateRegistry.identity_equal({"id": 6, "stateKey": "axis=x"}, {"id": 6, "stateKey": "axis=z"}))

func _test_sparse_sidecar_semantics() -> void:
	var sidecar := StateSidecar.new()
	assert(sidecar.entry_count() == 0)
	assert(sidecar.set_from_key("0,0", 5, 6, "axis=x") == {"id": 6, "stateKey": "axis=x"})
	assert(sidecar.entry_count() == 1)
	assert(sidecar.get_identity("0,0", 5, 6) == {"id": 6, "stateKey": "axis=x"})
	assert(sidecar.export_snapshot() == {"0,0": [[5, 6, "axis=x"]]})
	assert(sidecar.set_from_key("0,0", 5, 6, "axis=y") == {"id": 6, "stateKey": "axis=y"})
	assert(sidecar.entry_count() == 0)
	assert(sidecar.get_identity("0,0", 5, 6) == {"id": 6, "stateKey": "axis=y"})
	assert(sidecar.set_state("0,0", 7, 21, {"facing": "east", "lit": true}) == {"id": 21, "stateKey": "facing=east,lit=true"})
	assert(sidecar.export_snapshot() == {"0,0": [[7, 21, "facing=east,lit=true"]]})
	assert(sidecar.get_identity("0,0", 7, 3) == {"id": 3, "stateKey": null})
	var dense := PackedByteArray()
	dense.resize(8)
	dense.fill(0)
	dense[7] = 21
	assert(sidecar.reconcile_chunk("0,0", dense) == 0)
	dense[7] = 3
	assert(sidecar.reconcile_chunk("0,0", dense) == 1)
	assert(sidecar.entry_count() == 0)
	var imported := StateSidecar.new({"1,-1": [[3, 6, "axis=z"]], "0,0": [[2, 26, "axis=x"]]})
	assert(imported.entry_count() == 2)
	assert(imported.export_snapshot() == {"0,0": [[2, 26, "axis=x"]], "1,-1": [[3, 6, "axis=z"]]})
