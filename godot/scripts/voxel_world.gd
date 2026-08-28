class_name VoxelWorld
extends Node3D

const BlockRegistry = preload("res://godot/scripts/block_registry.gd")
const BlockStateCodec = preload("res://godot/scripts/block_state_codec.gd")
const TerrainGeneratorRuntime = preload("res://godot/scripts/terrain_generator.gd")
const ChunkStreamRuntime = preload("res://godot/scripts/chunk_stream_runtime.gd")

@export var world_seed := "1"
@export var world_prompt := ""
@export var terrain_version := TerrainGeneratorRuntime.TERRAIN_GENERATOR_VERSION
@export_range(0, 8, 1) var render_distance := 1
@export_range(1, 8, 1) var chunk_install_budget := 2
@export_range(1, 8, 1) var mesh_rebuild_budget := 1

var _stream: ChunkStreamRuntime
var _state_keys: Dictionary = {}
var _materials: Dictionary = {}
var _chunk_nodes: Dictionary = {}
var _chunk_render_stats: Dictionary = {}
var _mesh_queue: Array[Vector2i] = []
var _mesh_dirty: Dictionary = {}
var _last_center := Vector2i(2147483647, 2147483647)

const HORIZONTAL_NEIGHBORS: Array[Vector2i] = [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]
const FACE_DEFINITIONS := [
	{"name": "east", "normal": Vector3(1, 0, 0), "neighbor": Vector3i(1, 0, 0), "verts": [Vector3(1, 0, 0), Vector3(1, 1, 0), Vector3(1, 1, 1), Vector3(1, 0, 1)]},
	{"name": "west", "normal": Vector3(-1, 0, 0), "neighbor": Vector3i(-1, 0, 0), "verts": [Vector3(0, 0, 1), Vector3(0, 1, 1), Vector3(0, 1, 0), Vector3(0, 0, 0)]},
	{"name": "top", "normal": Vector3(0, 1, 0), "neighbor": Vector3i(0, 1, 0), "verts": [Vector3(0, 1, 1), Vector3(1, 1, 1), Vector3(1, 1, 0), Vector3(0, 1, 0)]},
	{"name": "bottom", "normal": Vector3(0, -1, 0), "neighbor": Vector3i(0, -1, 0), "verts": [Vector3(0, 0, 0), Vector3(1, 0, 0), Vector3(1, 0, 1), Vector3(0, 0, 1)]},
	{"name": "south", "normal": Vector3(0, 0, 1), "neighbor": Vector3i(0, 0, 1), "verts": [Vector3(1, 0, 1), Vector3(1, 1, 1), Vector3(0, 1, 1), Vector3(0, 0, 1)]},
	{"name": "north", "normal": Vector3(0, 0, -1), "neighbor": Vector3i(0, 0, -1), "verts": [Vector3(0, 0, 0), Vector3(0, 1, 0), Vector3(1, 1, 0), Vector3(1, 0, 0)]},
]
const TRIANGLE_ORDER := [0, 1, 2, 0, 2, 3]
const UVS := [Vector2(0, 1), Vector2(0, 0), Vector2(1, 0), Vector2(1, 1)]
const WATER_TEXTURE_PATH := BlockRegistry.TEXTURE_ROOT + "water_still.png"
const SHORT_GRASS_TEXTURE_PATH := BlockRegistry.TEXTURE_ROOT + "grass.png"
const SHORT_GRASS_TINT := Color(145.0 / 255.0, 189.0 / 255.0, 89.0 / 255.0, 1.0)
const WATER_TINT := Color(63.0 / 255.0, 118.0 / 255.0, 228.0 / 255.0, 0.72)
const PLANT_QUADS := [
	{"normal": Vector3(0.70710678, 0.0, 0.70710678), "verts": [Vector3(0.1818, 0, 0.1818), Vector3(0.1818, 1, 0.1818), Vector3(0.8182, 1, 0.8182), Vector3(0.8182, 0, 0.8182)]},
	{"normal": Vector3(0.70710678, 0.0, -0.70710678), "verts": [Vector3(0.8182, 0, 0.1818), Vector3(0.8182, 1, 0.1818), Vector3(0.1818, 1, 0.8182), Vector3(0.1818, 0, 0.8182)]},
]

func _ready() -> void:
	_stream = ChunkStreamRuntime.new(world_seed, world_prompt, terrain_version, render_distance)
	if not _stream.prime_chunk_sync(Vector2i.ZERO):
		push_error("failed to synchronously prime the native spawn chunk")
		return
	_last_center = Vector2i.ZERO
	_stream.request_around_world(0.5, 0.5)
	_rebuild_chunk_mesh(Vector2i.ZERO)

func _process(_delta: float) -> void:
	advance_streaming_frame()

func _exit_tree() -> void:
	if _stream != null:
		_stream.dispose()

func update_stream_center(world_position: Vector3) -> void:
	if _stream == null:
		return
	var center: Vector2i = ChunkStreamRuntime.chunk_from_world(world_position.x, world_position.z)
	if center == _last_center:
		return
	_last_center = center
	_stream.request_around_world(world_position.x, world_position.z)
	_sync_unloaded_chunk_nodes()

func advance_streaming_frame() -> void:
	if _stream == null:
		return
	var installed: Array[Vector2i] = _stream.poll_completed(chunk_install_budget)
	for key in installed:
		_queue_chunk_and_neighbors(key)
	_sync_unloaded_chunk_nodes()
	_process_mesh_queue(mesh_rebuild_budget)

func spawn_position_at(world_x: float, world_z: float) -> Vector3:
	if _stream == null:
		return Vector3(world_x, 12.0, world_z)
	var key: Vector2i = ChunkStreamRuntime.chunk_from_world(world_x, world_z)
	if not _stream.has_chunk(key) and not _stream.prime_chunk_sync(key):
		return Vector3(world_x, 12.0, world_z)
	var cell_x: int = int(floor(world_x))
	var cell_z: int = int(floor(world_z))
	for y in range(TerrainGeneratorRuntime.WORLD_HEIGHT - 1, -1, -1):
		var block_id: int = get_block(Vector3i(cell_x, y, cell_z))
		if BlockRegistry.is_solid(block_id) or block_id == BlockRegistry.WATER:
			return Vector3(float(cell_x) + 0.5, float(y) + 1.95, float(cell_z) + 0.5)
	return Vector3(float(cell_x) + 0.5, 12.0, float(cell_z) + 0.5)

func set_block(cell: Vector3i, block_id: int, state_key := "") -> bool:
	if _stream == null or not _stream.set_block(cell, block_id):
		return false
	if block_id == BlockRegistry.AIR:
		_state_keys.erase(cell)
	else:
		var normalized: String = BlockStateCodec.normalized_key(str(state_key))
		if normalized.is_empty():
			_state_keys.erase(cell)
		else:
			_state_keys[cell] = normalized
	_queue_changed_cell(cell)
	return true

func get_block(cell: Vector3i) -> int:
	return BlockRegistry.AIR if _stream == null else _stream.get_block(cell)

func get_block_identity(cell: Vector3i) -> Dictionary:
	return {"id": get_block(cell), "stateKey": str(_state_keys.get(cell, ""))}

func loaded_chunk_count() -> int:
	return 0 if _stream == null else _stream.chunks.size()

func generated_chunk_node_count() -> int:
	return _chunk_nodes.size()

func pending_mesh_count() -> int:
	return _mesh_queue.size()

func has_chunk_mesh(key: Vector2i) -> bool:
	return _chunk_nodes.has(key)

func chunk_render_stats(key: Vector2i) -> Dictionary:
	var stats: Variant = _chunk_render_stats.get(key)
	return stats.duplicate() if typeof(stats) == TYPE_DICTIONARY else {}

static func face_visible(block_id: int, neighbor_id: int) -> bool:
	if neighbor_id == BlockRegistry.AIR:
		return true
	var current: Dictionary = BlockRegistry.DEFINITIONS.get(block_id, BlockRegistry.DEFINITIONS[BlockRegistry.AIR])
	var neighbor: Dictionary = BlockRegistry.DEFINITIONS.get(neighbor_id, BlockRegistry.DEFINITIONS[BlockRegistry.AIR])
	if not bool(neighbor.get("full_cube", true)):
		return true
	if bool(current.get("liquid", false)):
		return neighbor_id != block_id and not bool(neighbor.get("solid", false))
	if bool(current.get("transparent", false)):
		return neighbor_id != block_id and not bool(neighbor.get("solid", false))
	return bool(neighbor.get("transparent", false))

func _queue_changed_cell(cell: Vector3i) -> void:
	var key: Vector2i = ChunkStreamRuntime.chunk_from_cell(cell)
	_queue_chunk_mesh(key)
	var local_x: int = posmod(cell.x, TerrainGeneratorRuntime.CHUNK_SIZE)
	var local_z: int = posmod(cell.z, TerrainGeneratorRuntime.CHUNK_SIZE)
	if local_x == 0:
		_queue_chunk_mesh(key + Vector2i(-1, 0))
	elif local_x == TerrainGeneratorRuntime.CHUNK_SIZE - 1:
		_queue_chunk_mesh(key + Vector2i(1, 0))
	if local_z == 0:
		_queue_chunk_mesh(key + Vector2i(0, -1))
	elif local_z == TerrainGeneratorRuntime.CHUNK_SIZE - 1:
		_queue_chunk_mesh(key + Vector2i(0, 1))

func _queue_chunk_and_neighbors(key: Vector2i) -> void:
	_queue_chunk_mesh(key)
	for offset in HORIZONTAL_NEIGHBORS:
		_queue_chunk_mesh(key + offset)

func _queue_chunk_mesh(key: Vector2i) -> void:
	if _stream == null or not _stream.has_chunk(key) or _mesh_dirty.has(key):
		return
	_mesh_dirty[key] = true
	_mesh_queue.append(key)

func _process_mesh_queue(budget: int) -> void:
	var remaining: int = maxi(0, budget)
	while remaining > 0 and not _mesh_queue.is_empty():
		var key: Vector2i = _mesh_queue.pop_front()
		_mesh_dirty.erase(key)
		if _stream.has_chunk(key):
			_rebuild_chunk_mesh(key)
		remaining -= 1

func _sync_unloaded_chunk_nodes() -> void:
	if _stream == null:
		return
	for key_variant in _chunk_nodes.keys():
		var key: Vector2i = key_variant
		if _stream.has_chunk(key):
			continue
		_remove_chunk_node(key)
		_mesh_dirty.erase(key)
		for offset in HORIZONTAL_NEIGHBORS:
			_queue_chunk_mesh(key + offset)

func _rebuild_chunk_mesh(key: Vector2i) -> void:
	_remove_chunk_node(key)
	var data: PackedByteArray = _stream.get_chunk(key)
	if data.is_empty():
		return
	var container := Node3D.new()
	container.name = "Chunk_%d_%d" % [key.x, key.y]
	container.position = Vector3(
		key.x * TerrainGeneratorRuntime.CHUNK_SIZE,
		0.0,
		key.y * TerrainGeneratorRuntime.CHUNK_SIZE
	)
	var mesh := ArrayMesh.new()
	var builders: Dictionary = {}
	var collision_faces := PackedVector3Array()
	var stats := {
		"opaque_faces": 0,
		"cutout_faces": 0,
		"water_faces": 0,
		"plant_quads": 0,
		"collision_faces": 0,
	}
	for y in range(TerrainGeneratorRuntime.WORLD_HEIGHT):
		for lz in range(TerrainGeneratorRuntime.CHUNK_SIZE):
			for lx in range(TerrainGeneratorRuntime.CHUNK_SIZE):
				var index: int = TerrainGeneratorRuntime.terrain_chunk_index(lx, y, lz)
				var block_id: int = int(data[index])
				if block_id == BlockRegistry.AIR:
					continue
				var world_cell := Vector3i(
					key.x * TerrainGeneratorRuntime.CHUNK_SIZE + lx,
					y,
					key.y * TerrainGeneratorRuntime.CHUNK_SIZE + lz
				)
				var local_cell := Vector3i(lx, y, lz)
				if block_id == BlockRegistry.SHORT_GRASS:
					var plant_surface: SurfaceTool = _surface_for_render_class(builders, SHORT_GRASS_TEXTURE_PATH, "plant")
					_emit_cross_plant(plant_surface, local_cell)
					stats["plant_quads"] = int(stats["plant_quads"]) + PLANT_QUADS.size()
					continue
				if block_id == BlockRegistry.WATER:
					for face_variant in FACE_DEFINITIONS:
						var water_face: Dictionary = face_variant
						var water_neighbor: int = get_block(world_cell + Vector3i(water_face["neighbor"]))
						if not face_visible(block_id, water_neighbor):
							continue
						var water_surface: SurfaceTool = _surface_for_render_class(builders, WATER_TEXTURE_PATH, "water")
						_emit_render_face(water_surface, local_cell, water_face)
						stats["water_faces"] = int(stats["water_faces"]) + 1
					continue
				if not BlockRegistry.is_solid(block_id):
					continue
				for face_variant in FACE_DEFINITIONS:
					var face: Dictionary = face_variant
					var neighbor_offset: Vector3i = face["neighbor"]
					var neighbor_id: int = get_block(world_cell + neighbor_offset)
					if face_visible(block_id, neighbor_id):
						var texture_path: String = BlockRegistry.texture_for_face(block_id, str(face["name"]))
						var render_class := "cutout" if _is_cutout_cube(block_id) else "opaque"
						var surface: SurfaceTool = _surface_for_render_class(builders, texture_path, render_class)
						_emit_render_face(surface, local_cell, face)
						var stat_key := "cutout_faces" if render_class == "cutout" else "opaque_faces"
						stats[stat_key] = int(stats[stat_key]) + 1
					if not BlockRegistry.is_solid(neighbor_id):
						_append_collision_face(collision_faces, local_cell, face)
						stats["collision_faces"] = int(stats["collision_faces"]) + 1
	for surface_variant in builders.values():
		var surface: SurfaceTool = surface_variant
		surface.commit(mesh)
	if mesh.get_surface_count() > 0:
		var mesh_instance := MeshInstance3D.new()
		mesh_instance.name = "Mesh"
		mesh_instance.mesh = mesh
		container.add_child(mesh_instance)
	if not collision_faces.is_empty():
		var world_body := StaticBody3D.new()
		world_body.name = "Collision"
		world_body.collision_layer = 1
		world_body.collision_mask = 1
		var collision_shape := CollisionShape3D.new()
		var shape := ConcavePolygonShape3D.new()
		shape.set_faces(collision_faces)
		collision_shape.shape = shape
		world_body.add_child(collision_shape)
		container.add_child(world_body)
	add_child(container)
	_chunk_nodes[key] = container
	_chunk_render_stats[key] = stats

func _remove_chunk_node(key: Vector2i) -> void:
	var node_variant: Variant = _chunk_nodes.get(key)
	if node_variant is Node:
		var node: Node = node_variant
		if node.get_parent() == self:
			remove_child(node)
		node.queue_free()
	_chunk_nodes.erase(key)
	_chunk_render_stats.erase(key)

static func _is_cutout_cube(block_id: int) -> bool:
	var definition: Dictionary = BlockRegistry.DEFINITIONS.get(block_id, {})
	return bool(definition.get("transparent", false)) and bool(definition.get("solid", false))

func _surface_for_render_class(builders: Dictionary, texture_path: String, render_class: String) -> SurfaceTool:
	var builder_key := "%s|%s" % [render_class, texture_path]
	if builders.has(builder_key):
		return builders[builder_key]
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	surface.set_material(_material_for_render_class(texture_path, render_class))
	builders[builder_key] = surface
	return surface

func _material_for_render_class(texture_path: String, render_class: String) -> StandardMaterial3D:
	var material_key := "%s|%s" % [render_class, texture_path]
	if _materials.has(material_key):
		return _materials[material_key]
	var material := StandardMaterial3D.new()
	material.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
	material.roughness = 1.0
	material.cull_mode = BaseMaterial3D.CULL_DISABLED
	material.texture_repeat = false
	match render_class:
		"cutout":
			material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA_SCISSOR
			material.alpha_scissor_threshold = 0.5
		"plant":
			material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA_SCISSOR
			material.alpha_scissor_threshold = 0.5
			material.albedo_color = SHORT_GRASS_TINT
		"water":
			material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
			material.albedo_color = WATER_TINT
	var texture := _load_texture(texture_path, render_class == "water")
	if texture != null:
		material.albedo_texture = texture
	_materials[material_key] = material
	return material

func _load_texture(texture_path: String, first_frame_only: bool) -> Texture2D:
	if not FileAccess.file_exists(texture_path):
		push_warning("Missing Minecraft texture: %s" % texture_path)
		return null
	var image := Image.load_from_file(texture_path)
	if image == null or image.is_empty():
		push_warning("Failed to decode Minecraft texture: %s" % texture_path)
		return null
	if first_frame_only and image.get_height() > image.get_width():
		image = image.get_region(Rect2i(0, 0, image.get_width(), image.get_width()))
	return ImageTexture.create_from_image(image)

func _emit_render_face(surface: SurfaceTool, cell: Vector3i, face: Dictionary) -> void:
	var origin := Vector3(cell)
	var vertices: Array = face["verts"]
	var normal: Vector3 = face["normal"]
	for index in TRIANGLE_ORDER:
		var vertex: Vector3 = origin + vertices[index]
		surface.set_normal(normal)
		surface.set_uv(UVS[index])
		surface.add_vertex(vertex)

func _append_collision_face(collision_faces: PackedVector3Array, cell: Vector3i, face: Dictionary) -> void:
	var origin := Vector3(cell)
	var vertices: Array = face["verts"]
	for index in TRIANGLE_ORDER:
		collision_faces.append(origin + Vector3(vertices[index]))

func _emit_cross_plant(surface: SurfaceTool, cell: Vector3i) -> void:
	var origin := Vector3(cell)
	for quad_variant in PLANT_QUADS:
		var quad: Dictionary = quad_variant
		var vertices: Array = quad["verts"]
		var normal: Vector3 = quad["normal"]
		for index in TRIANGLE_ORDER:
			surface.set_normal(normal)
			surface.set_uv(UVS[index])
			surface.add_vertex(origin + Vector3(vertices[index]))
