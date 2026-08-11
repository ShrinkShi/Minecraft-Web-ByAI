# 开发进度

## 当前版本口径

- 稳定发布基线：`v0.3.0`。
- 当前 `main` 开发线：`v0.4.0-dev`。
- 版本完成度只按 GitHub `main` 已落库代码和通过的质量门认定；未形成远端 commit 的本地/临时实现不计入完成。

## 工程质量基础

- [x] Node 22 `src/*.js` 与 `scripts/*.mjs` 语法检查。
- [x] `npm run test:logic`：世界/实体/Worker 回归 + 独立 Equipment/Armor 回归。
- [x] GitHub Pages 仓库源设置为 GitHub Actions，并验证真实 Pages Deployment 成功。
- [x] Playwright Chromium browser smoke：页面加载→生存世界创建→护甲装备/存档→虚空死亡/重生→IndexedDB 状态核对。
- [x] 浏览器失败时保留 Playwright trace / screenshot 报告目录。
- [ ] 将 Three.js 从运行时 jsDelivr 依赖迁移为版本锁定的本地 vendor / 构建依赖，降低外部 CDN 对运行时和 E2E 的影响。
- [ ] 扩展浏览器 E2E 到普通死亡掉落/拾回、真实战斗减伤、存档重载和更多指令链。

## v0.4.0 — 实体、战斗与生存扩展（开发中）

状态：开发中。实体基础、四种敌对生物、奖励闭环、生存死亡损失和第一版护甲/Equipment 已落库；死亡界面、水/氧气、天气粒子和完整 Java 伤害/护甲公式仍未完成。

- [x] `EntityStore`：实体 ID、类型、组件数据、位置的统一注册与生命周期
- [x] `SpatialHash`：按 X/Z 网格分桶的半径 / AABB 邻域查询，实体移动时同步迁移桶
- [x] EntityStore / SpatialHash Node 回归测试
- [x] 牛、羊、猪、鸡：被动生物数据定义与运行时接入
- [x] 被动生物在草地/泥土地表附近生成，10 Hz 漫游 AI、受击逃跑、距离回收和实体数量上限
- [x] 玩家左键在实体与方块之间按距离选择目标
- [x] 公共 `combat.js`：攻击冷却、受击无敌窗口、伤害结算和击退方向纯逻辑
- [x] 木镐基础攻击伤害；普通攻击 600 ms 冷却；被动/敌对实体共用受击无敌与击退路径
- [x] 玩家受伤、水平/垂直击退、0 HP/掉出世界后的出生点重生
- [x] 僵尸：夜间地表生成、24 格基础追踪、近战攻击、受击和击退
- [x] 被动生物/敌对生物死亡事件统一回调到奖励编排层
- [x] 第一批战利品：生牛肉/皮革、羊毛/生羊肉、生猪排、生鸡肉/羽毛、腐肉、骨头/箭、火药、线
- [x] `ExperienceOrbSystem`：经验球物理、吸附、拾取和 300 秒销毁
- [x] Java 风格经验等级阈值/总经验公式；`totalXp` 写入世界快照
- [x] Loot / Experience 确定性 Node 回归测试
- [x] 骷髅：夜间敌对生成池、距离控制、侧移、箭矢远程攻击
- [x] `ProjectileSystem`：箭矢重力、轨迹朝向、方块阻挡、玩家线段/AABB 命中和生命周期
- [x] 投射物纯规则：线段/AABB 首次命中时间和带重力瞄准初速度；Node 回归测试
- [x] 苦力怕：夜间敌对生成池、接近/引信/取消范围、爆炸事件
- [x] `ExplosionSystem` / explosion rules：基础距离伤害、击退和附近地形破坏
- [x] 蜘蛛：16 HP、宽体低矮视觉模板、夜间生成、近战追击、线掉落和基础经验
- [x] `spider-rules.js`：最多约 3 格局部高度差的有界攀爬、最大 2 格下落约束；不是完整墙面寻路
- [x] `death-rules.js`：生存/冒险损失策略、死亡 XP 公式 `min(100, level × 7)` 和可恢复死亡位置判断
- [x] 生存/冒险死亡统一抽空 36 格背包、cursor、2×2/3×3 合成输入；普通死亡在原死亡点生成物品和经验球并清零总经验
- [x] `y < -10` 虚空死亡直接损失携带物品/经验，不创建无法回收的掉落实体；创造/旁观不执行死亡损失
- [x] `Equipment`：head/chest/legs/feet 四个独立可序列化槽，不占用 36 格背包
- [x] 皮革帽子/外套/裤子/靴子：1/3/2/1 护甲点，可通过 cursor 拖放到匹配部位
- [x] `armor-rules.js`：当前过渡减伤为每点 4%、最高 80%；整套皮革 7 点 = 28%
- [x] 敌对近战、箭矢和苦力怕爆炸经过基础护甲减伤；虚空绕过护甲
- [x] 世界快照版本 v5 保存/恢复 Equipment；非法部位/非护甲快照会被过滤
- [x] 生存/冒险死亡会把已装备护甲与背包/cursor/合成输入一起结算
- [x] `scripts/check-armor.mjs`：槽位兼容、存档过滤、drain、护甲公式和 `/give leather_*` 回归
- [x] Chromium E2E：`/give leather_chestplate`→真实背包拖放→护甲 HUD→v5 IndexedDB 快照→虚空死亡→装备/背包/XP 全清空
- [ ] 普通可恢复死亡的浏览器 E2E：物品/经验/护甲生成、死亡点存在与重新拾回
- [ ] 死亡界面、死亡统计、床/重生点和 `keepInventory`
- [ ] 死亡掉落/经验球跨页面重载持久化
- [ ] Java armor+toughness 正式公式、耐久、更多材质、附魔和 Armor Trim
- [ ] Shift-click 自动装备、快捷右键装备和护甲合成配方
- [ ] 将 DropSystem / ExperienceOrbSystem / ProjectileSystem 统一到 EntityStore / SpatialHash（只有规模证明需要时再做）
- [ ] 被动生物繁殖和跨存档实体持久化
- [ ] Looting、火焰烹饪掉落、幼体掉落等精确战利品规则
- [ ] 僵尸/骷髅日照燃烧、完整寻路、视线/亮度生成和障碍交互
- [ ] 玩家弓、箭的拾回/卡墙、蓄力和远程武器规则
- [ ] 完整武器属性、攻击强度曲线、暴击、扫击和精确 Java 版伤害规则
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
- [x] mesh 请求 Set 去重与串行泵
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