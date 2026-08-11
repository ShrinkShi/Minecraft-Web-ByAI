# 开发进度

## v0.4.0 — 实体、战斗与生存扩展（开发中）

状态：开发中。实体基础、第一批被动生物和基础近战链已经接入；当前只有僵尸一种敌对生物，掉落/经验、其余敌对 AI、护甲和实体持久化仍未完成。

- [x] `EntityStore`：实体 ID、类型、组件数据、位置的统一注册与生命周期
- [x] `SpatialHash`：按 X/Z 网格分桶的半径 / AABB 邻域查询，实体移动时同步迁移桶
- [x] EntityStore / SpatialHash Node 回归测试
- [x] 牛、羊、猪、鸡：被动生物数据定义与运行时接入
- [x] 被动生物在草地/泥土地表附近生成，10 Hz 漫游 AI、受击逃跑、距离回收和实体数量上限
- [x] 被动生物使用 EntityStore / SpatialHash 做注册、移动和命中候选查询
- [x] 玩家左键在实体与方块之间按距离选择目标
- [x] 公共 `combat.js`：攻击冷却、受击无敌窗口、伤害结算和击退方向纯逻辑
- [x] 木镐基础攻击伤害；普通攻击 600 ms 冷却；被动/敌对实体共用受击无敌与击退路径
- [x] 玩家受伤、水平/垂直击退、0 HP/掉出世界后的出生点重生
- [x] 僵尸：夜间地表生成、24 格基础追踪、近战攻击、受击和击退
- [x] Mob / Combat 规则 Node 回归测试
- [ ] 将世界掉落物迁移到统一 EntityStore / SpatialHash
- [ ] 被动生物死亡掉落、经验、繁殖和跨存档持久化
- [ ] 僵尸日照燃烧、寻路、门/障碍交互与更精确生成规则
- [ ] 骷髅远程 AI
- [ ] 苦力怕接近/引信/爆炸 AI
- [ ] 蜘蛛追击/攀爬 AI
- [ ] 完整武器属性、攻击强度曲线、暴击、扫击和精确 Java 版伤害规则
- [ ] 生物死亡掉落与经验球
- [ ] 经验等级公式
- [ ] 护甲槽和基础伤害减免
- [ ] 水独立透明 pass、水下检测与氧气/溺水
- [ ] 降雨粒子和基础天气循环

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
