extends SceneTree

const VoxelWorldRuntime = preload("res://godot/scripts/voxel_world.gd")
const BlockRegistry = preload("res://godot/scripts/block_registry.gd")

func _init() -> void:
	call_deferred("_run")

func _run() -> void:
	if not FileAccess.file_exists(VoxelWorldRuntime.WATER_TEXTURE_PATH):
		_fail(null, "missing canonical water_still.png for native water rendering")
		return
	if not FileAccess.file_exists(VoxelWorldRuntime.SHORT_GRASS_TEXTURE_PATH):
		_fail(null, "missing canonical grass.png for native short-grass rendering")
		return
	if not FileAccess.file_exists(BlockRegistry.texture_for_face(BlockRegistry.LEAVES, "top")):
		_fail(null, "missing canonical oak_leaves.png for native cutout rendering")
		return

	if VoxelWorldRuntime.face_visible(BlockRegistry.WATER, BlockRegistry.WATER):
		_fail(null, "water-water internal faces must be culled")
		return
	if VoxelWorldRuntime.face_visible(BlockRegistry.WATER, BlockRegistry.STONE):
		_fail(null, "water faces against solid blocks must be culled")
		return
	if not VoxelWorldRuntime.face_visible(BlockRegistry.STONE, BlockRegistry.WATER):
		_fail(null, "opaque faces bordering transparent water must stay visible")
		return
	if VoxelWorldRuntime.face_visible(BlockRegistry.LEAVES, BlockRegistry.LEAVES):
		_fail(null, "identical leaf cube internal faces must be culled")
		return
	if not VoxelWorldRuntime.face_visible(BlockRegistry.STONE, BlockRegistry.LEAVES):
		_fail(null, "opaque faces bordering transparent leaves must stay visible")
		return
	if VoxelWorldRuntime.face_visible(BlockRegistry.LEAVES, BlockRegistry.STONE):
		_fail(null, "leaf faces buried against opaque solids must be culled")
		return
	if not VoxelWorldRuntime.face_visible(BlockRegistry.STONE, BlockRegistry.SHORT_GRASS):
		_fail(null, "non-full-cube vegetation must not cull neighboring opaque faces")
		return

	var world = VoxelWorldRuntime.new()
	world.render_distance = 0
	world.chunk_install_budget = 1
	world.mesh_rebuild_budget = 1
	get_root().add_child(world)
	if world.loaded_chunk_count() != 1 or not world.has_chunk_mesh(Vector2i.ZERO):
		_fail(world, "transparent-pass test could not initialize the synchronous spawn chunk")
		return

	var water_cell := Vector3i(4, 60, 4)
	var plant_cell := Vector3i(8, 60, 4)
	var leaves_cell := Vector3i(12, 60, 4)
	for cell in [water_cell, plant_cell, leaves_cell]:
		if not _isolated_air(world, cell):
			_fail(world, "transparent-pass fixture requires isolated high-altitude air at %s" % cell)
			return

	var before: Dictionary = world.chunk_render_stats(Vector2i.ZERO)
	if before.is_empty():
		_fail(world, "spawn chunk did not expose render diagnostics")
		return
	if not world.set_block(water_cell, BlockRegistry.WATER):
		_fail(world, "failed to inject water render fixture")
		return
	if not world.set_block(plant_cell, BlockRegistry.SHORT_GRASS):
		_fail(world, "failed to inject short-grass render fixture")
		return
	if not world.set_block(leaves_cell, BlockRegistry.LEAVES):
		_fail(world, "failed to inject leaf render fixture")
		return
	if world.pending_mesh_count() != 1:
		_fail(world, "three same-chunk transparent mutations must deduplicate to one mesh rebuild")
		return
	world.advance_streaming_frame()
	if world.pending_mesh_count() != 0:
		_fail(world, "transparent-pass mesh rebuild did not consume the dirty chunk")
		return

	var after: Dictionary = world.chunk_render_stats(Vector2i.ZERO)
	if int(after.get("water_faces", 0)) - int(before.get("water_faces", 0)) != 6:
		_fail(world, "isolated water cube must contribute exactly six rendered water faces")
		return
	if int(after.get("plant_quads", 0)) - int(before.get("plant_quads", 0)) != 2:
		_fail(world, "isolated short grass must contribute exactly two crossed cutout quads")
		return
	if int(after.get("cutout_faces", 0)) - int(before.get("cutout_faces", 0)) != 6:
		_fail(world, "isolated leaf cube must contribute exactly six cutout faces")
		return
	if int(after.get("collision_faces", 0)) - int(before.get("collision_faces", 0)) != 6:
		_fail(world, "water/short-grass must add no collision while the solid leaf cube adds six collision faces")
		return

	var mesh_instance := world.get_node_or_null("Chunk_0_0/Mesh") as MeshInstance3D
	if mesh_instance == null or mesh_instance.mesh == null:
		_fail(world, "transparent-pass rebuild did not produce a chunk mesh")
		return
	var mesh: Mesh = mesh_instance.mesh
	var found_alpha := false
	var found_scissor := false
	var found_square_water_frame := false
	for surface_index in range(mesh.get_surface_count()):
		var material := mesh.surface_get_material(surface_index)
		if not material is StandardMaterial3D:
			continue
		var standard: StandardMaterial3D = material
		if standard.transparency == BaseMaterial3D.TRANSPARENCY_ALPHA:
			found_alpha = true
			var texture: Texture2D = standard.albedo_texture
			if texture != null and texture.get_width() == texture.get_height():
				found_square_water_frame = true
		elif standard.transparency == BaseMaterial3D.TRANSPARENCY_ALPHA_SCISSOR:
			found_scissor = true
	if not found_alpha:
		_fail(world, "native water surface is missing alpha-blended material")
		return
	if not found_scissor:
		_fail(world, "native leaves/short grass are missing alpha-scissor material")
		return
	if not found_square_water_frame:
		_fail(world, "animated water_still source must be reduced to one square frame before native texturing")
		return

	_cleanup(world)
	print("Godot transparent water/foliage world pass: PASS")
	quit(0)

func _isolated_air(world: Node, cell: Vector3i) -> bool:
	if world.get_block(cell) != BlockRegistry.AIR:
		return false
	for offset in [Vector3i(1, 0, 0), Vector3i(-1, 0, 0), Vector3i(0, 1, 0), Vector3i(0, -1, 0), Vector3i(0, 0, 1), Vector3i(0, 0, -1)]:
		if world.get_block(cell + offset) != BlockRegistry.AIR:
			return false
	return true

func _cleanup(world: Node) -> void:
	if world != null and is_instance_valid(world):
		if world.get_parent() != null:
			world.get_parent().remove_child(world)
		world.free()

func _fail(world: Node, message: String) -> void:
	push_error(message)
	_cleanup(world)
	quit(1)
