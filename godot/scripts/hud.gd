extends CanvasLayer

@onready var slot_label: Label = $Root/SlotLabel

func set_selected_slot(index: int) -> void:
	slot_label.text = "快捷栏：%d / 9" % (index + 1)
