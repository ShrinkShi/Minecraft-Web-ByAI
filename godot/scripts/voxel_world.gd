class_name VoxelWorld
extends Node3D

@export var size_x := 32
@export var size_z := 32
@export var base_height := 5
@export var terrain_seed := 12001

var _blocks: Dictionary = {}
var _state_keys: Dictionary = {}
var _materials: Dictionary = {}

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

func _ready() -> void:
	generate_demo_terrain()
	rebuild_mesh()

func generate_demo_terrain() -> void:
	_blocks.clear()
	_state_keys.clear()
	var noise := FastNoiseLite.new()
	noise.seed = terrain_seed
	noise.frequency = 0.045
	noise.fractal_octaves = 3
	var half_x := int(size_x / 2)
	var half_z := int(size_z / 2)
	for x in range(-half_x, size_x - half_x):
		for z in range(-half_z, size_z - half_z):
			var height := base_height + int(round(noise.get_noise_2d(float(x), float(z)) * 2.5))
			height = maxi(height, 2)
			for y in range(0, height + 1):
				var block_id := BlockRegistry.STONE
				if y == height:
					block_id = BlockRegistry.GRASS
				elif y >= height - 2:
					block_id = BlockRegistry.DIRT
				set_block(Vector3i(x, y, z), block_id)

func set_block(cell: Vector3i, block_id: int, state_key := "") -> void:
	if block_id == BlockRegistry.AIR:
		_blocks.erase(cell)
		_state_keys.erase(cell)
		return
	_blocks[cell] = block_id
	var normalized := BlockStateCodec.normalized_key(str(state_key))
	if normalized.is_empty():
		_state_keys.erase(cell)
	else:
		_state_keys[cell] = normalized

func get_block(cell: Vector3i) -> int:
	return int(_blocks.get(cell, BlockRegistry.AIR))

func get_block_identity(cell: Vector3i) -> Dictionary:
	return {"id": get_block(cell), "stateKey": str(_state_keys.get(cell, ""))}

func rebuild_mesh() -> void:
	_remove_generated_nodes()
	var mesh := ArrayMesh.new()
	var builders: Dictionary = {}
	var collision_faces := PackedVector3Array()
	for cell_variant in _blocks:
		var cell: Vector3i = cell_variant
		var block_id := get_block(cell)
		if not BlockRegistry.is_solid(block_id):
			continue
		for face in FACE_DEFINITIONS:
			if BlockRegistry.is_solid(get_block(cell + face["neighbor"])):
				continue
			var texture_path := BlockRegistry.texture_for_face(block_id, str(face["name"]))
			var surface := _surface_for_texture(builders, texture_path)
			_emit_face(surface, collision_faces, cell, face)
	for surface_variant in builders.values():
		var surface: SurfaceTool = surface_variant
		surface.commit(mesh)

	var mesh_instance := MeshInstance3D.new()
	mesh_instance.name = "GeneratedMesh"
	mesh_instance.mesh = mesh
	add_child(mesh_instance)

	if not collision_faces.is_empty():
		var world_body := StaticBody3D.new()
		world_body.name = "GeneratedCollision"
		world_body.collision_layer = 1
		world_body.collision_mask = 1
		var collision_shape := CollisionShape3D.new()
		var shape := ConcavePolygonShape3D.new()
		shape.set_faces(collision_faces)
		collision_shape.shape = shape
		world_body.add_child(collision_shape)
		add_child(world_body)

func _surface_for_texture(builders: Dictionary, texture_path: String) -> SurfaceTool:
	if builders.has(texture_path):
		return builders[texture_path]
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	surface.set_material(_material_for_texture(texture_path))
	builders[texture_path] = surface
	return surface

func _material_for_texture(texture_path: String) -> StandardMaterial3D:
	if _materials.has(texture_path):
		return _materials[texture_path]
	var material := StandardMaterial3D.new()
	material.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
	material.roughness = 1.0
	material.cull_mode = BaseMaterial3D.CULL_DISABLED
	var texture := load(texture_path) as Texture2D
	if texture == null:
		push_warning("Missing Minecraft texture: %s" % texture_path)
	else:
		material.albedo_texture = texture
	_materials[texture_path] = material
	return material

func _emit_face(surface: SurfaceTool, collision_faces: PackedVector3Array, cell: Vector3i, face: Dictionary) -> void:
	var origin := Vector3(cell)
	var vertices: Array = face["verts"]
	var normal: Vector3 = face["normal"]
	for index in TRIANGLE_ORDER:
		var vertex: Vector3 = origin + vertices[index]
		surface.set_normal(normal)
		surface.set_uv(UVS[index])
		surface.add_vertex(vertex)
		collision_faces.append(vertex)

func _remove_generated_nodes() -> void:
	for child in get_children():
		if child.name == "GeneratedMesh" or child.name == "GeneratedCollision":
			remove_child(child)
			child.queue_free()
