extends SceneTree

const VoxelWorldRuntime = preload("res://godot/scripts/voxel_world.gd")
const BlockRegistry = preload("res://godot/scripts/block_registry.gd")
const TerrainGeneratorRuntime = preload("res://godot/scripts/terrain_generator.gd")

func _init() -> void:
	call_deferred("_run")

func _run() -> void:
	var world = VoxelWorldRuntime.new()
	world.render_distance = 0
	world.chunk_install_budget = 1
	world.mesh_rebuild_budget = 1
	get_root().add_child(world)

	if world.loaded_chunk_count() != 1:
		_fail(world, "native VoxelWorld expected one synchronously primed spawn chunk, got %d" % world.loaded_chunk_count())
		return
	if not world.has_chunk_mesh(Vector2i.ZERO) or world.generated_chunk_node_count() != 1:
		_fail(world, "native VoxelWorld expected one synchronous spawn mesh, got %d chunk nodes" % world.generated_chunk_node_count())
		return
	var chunk_node: Node = world.get_node_or_null("Chunk_0_0")
	if chunk_node == null or chunk_node.get_node_or_null("Mesh") == null or chunk_node.get_node_or_null("Collision") == null:
		_fail(world, "spawn chunk is missing mesh or collision nodes")
		return

	var spawn: Vector3 = world.spawn_position_at(0.0, 0.0)
	if spawn.y <= 2.0 or not is_equal_approx(spawn.x, 0.5) or not is_equal_approx(spawn.z, 0.5):
		_fail(world, "native spawn position was not derived from the primed terrain chunk")
		return
	var support_y := -1
	for y in range(TerrainGeneratorRuntime.WORLD_HEIGHT - 1, -1, -1):
		var block_id: int = world.get_block(Vector3i(0, y, 0))
		if BlockRegistry.is_solid(block_id) or block_id == BlockRegistry.WATER:
			support_y = y
			break
	if support_y < 0 or not is_equal_approx(spawn.y, float(support_y) + 1.95):
		_fail(world, "native spawn height does not match the highest solid/liquid terrain cell")
		return

	var mutation_cell := Vector3i(0, 0, 0)
	if world.get_block(mutation_cell) == BlockRegistry.AIR:
		_fail(world, "expected terrain foundation block at y=0")
		return
	if not world.set_block(mutation_cell, BlockRegistry.AIR):
		_fail(world, "loaded chunk mutation was not accepted")
		return
	if world.get_block(mutation_cell) != BlockRegistry.AIR or world.pending_mesh_count() < 1:
		_fail(world, "chunk mutation did not update dense storage and queue a mesh rebuild")
		return
	world.advance_streaming_frame()
	if world.pending_mesh_count() != 0 or not world.has_chunk_mesh(Vector2i.ZERO):
		_fail(world, "mesh rebuild budget did not consume the dirty spawn chunk")
		return

	get_root().remove_child(world)
	world.free()
	print("Godot streamed VoxelWorld mesh/collision integration: PASS")
	quit(0)

func _fail(world: Node, message: String) -> void:
	push_error(message)
	if world != null and is_instance_valid(world):
		if world.get_parent() != null:
			world.get_parent().remove_child(world)
		world.free()
	quit(1)
