# 开发进度

## v0.3.0 — 生存闭环基础

状态：实现完成；Node 语法检查、纯逻辑回归检查和 Worker 几何/地形检查已通过。

- [x] 36 格真实背包数据模型，9 格快捷栏映射 slots 27~35
- [x] 左键整组、右键拆半/单放、Shift 快速移动
- [x] 共用 cursor stack 的背包/合成操作
- [x] 2×2 原木→木板、木板→木棍、4 木板→工作台
- [x] 工作台方块放置和右键打开 3×3 GUI
- [x] 3×3 木镐配方
- [x] 石头→圆石的基础工具门槛
- [x] 方块掉落物、拾取、Q 丢弃、300 秒销毁
- [x] F5 三视角循环和第三人称占位玩家模型
- [x] `/gamemode` `/give` `/tp` `/time set` `/weather` `/help`
- [x] 昼夜环境光变化
- [x] Inventory / Recipes / Commands 自动逻辑测试
- [x] Mesh Worker 边界面测试
- [x] Terrain Worker 生成测试
- [x] GitHub Actions 质量 workflow

## v0.2.0 — 流式世界与持久化

- [x] 玩家跨区块时动态请求新的 chunk
- [x] 超出保留距离的 chunk 数据卸载
- [x] chunk 卸载时显式释放 Three.js `BufferGeometry`
- [x] 独立 `mesh-worker.js`，可见面扫描和顶点/索引构建离开主线程
- [x] Worker 返回精确长度 TypedArray + Transferable buffers
- [x] 网格请求 Set 去重与串行泵
- [x] IndexedDB 世界存档与增量方块修改
- [x] 保存/恢复玩家状态

## v0.1.0 — 可玩体素核心

- [x] 主菜单 / 世界创建 / 暂停菜单
- [x] 第一人称视角与 Pointer Lock
- [x] WASD / Jump / Sprint / Sneak speed
- [x] 生存 / 创造创建选项
- [x] Worker 地形生成
- [x] 区块合并网格与暴露面剔除
- [x] 方块破坏与放置
- [x] 玩家碰撞、重力、跳跃
- [x] HUD 与 GitHub Pages workflow

## 下一阶段 v0.4 目标

- [ ] 基础实体 ECS / Spatial Hash，避免生物数量增长时 O(n²)
- [ ] 牛、羊、鸡、猪；僵尸、骷髅、苦力怕、蜘蛛的第一批 AI
- [ ] 玩家攻击冷却、近战伤害、受伤无敌帧、击退、死亡/重生
- [ ] 生物死亡掉落与经验球
- [ ] 经验等级公式
- [ ] 护甲槽和基础伤害减免
- [ ] 水独立透明 pass、水下检测与氧气/溺水
- [ ] 降雨粒子和基础天气循环
