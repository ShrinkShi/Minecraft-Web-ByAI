# 原版 Minecraft 音频文件

本目录保存用户提供的 Minecraft `assets/objects` 第一批对象。对象文件故意保留 Mojang 内容寻址格式 `两位SHA-1前缀/40位SHA-1`，不直接重命名，以保证后续批次、官方 asset index 和完整性校验可以稳定对应。

## 第一批完整性

- 对象数量：2114
- 对象总字节数：431521776
- 对象集合 SHA-256：`34f8f17290a7e5637d8104aae26f217fddd29c4c216c23729ebf4e95df75d278`
- OGG 对象：2014
- 能由 Java 1.20.1 asset index 解析的对象：1856
- 能由 Java 1.20.1 解析的 OGG 对象：1835

## 开发者如何查音效

查看 `音频文件映射表.csv`：

- `SHA-1` / `仓库对象路径`：仓库里的实际对象；
- `Java1.20.1逻辑路径`：例如 `minecraft/sounds/.../*.ogg`；
- `Java1.20.1 Sound Event`：根据官方 `sounds.json` 解析出的事件名；
- `解析状态`：明确区分已由 1.20.1 官方索引识别的对象和历史缓存/其他版本对象。

`音频文件映射表.json` 是机器可读版本，`对象清单-part1.txt` 是本批精确 SHA-1 清单。对未解析对象不要根据听感或文件大小猜名称；后续可结合其他 Minecraft 版本 asset index 继续补全映射。
