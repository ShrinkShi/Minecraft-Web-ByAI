from pathlib import Path


def patch(path, replacements):
    p=Path(path); text=p.read_text(encoding='utf-8')
    for label,old,new in replacements:
        count=text.count(old)
        if count!=1:
            raise SystemExit(f'{path} / {label}: expected 1 match, got {count}')
        text=text.replace(old,new,1)
    p.write_text(text,encoding='utf-8')

patch('README.md',[
('version summary',
'> 稳定发布基线：`v0.3.0`。当前 `main` 开发线为 `v0.4.0-dev`：实体数据层、第一批被动生物、四种敌对生物、基础战斗、箭矢/爆炸、战利品/经验、生存死亡损失、第一版护甲装备系统、水独立透明渲染 pass、水下氧气/溺水、基础游泳/浮力，以及可见降雨/雷雨粒子已经落库；流体传播、完整冲刺游泳、自动天气周期/闪电和完整伤害公式等仍属于后续工作。',
'> 稳定发布基线：`v0.3.0`。当前 `main` 开发线为 `v0.4.0-dev`：实体数据层、第一批被动生物、四种敌对生物、基础战斗、箭矢/爆炸、战利品/经验、生存死亡损失、显式死亡界面/重生、第一版护甲装备系统、水独立透明渲染 pass、水下氧气/溺水、基础游泳/浮力，以及可见降雨/雷雨粒子已经落库；流体传播、完整冲刺游泳、自动天气周期/闪电和完整伤害公式等仍属于后续工作。'),
('death behavior',
'- 生存/冒险死亡：36 格背包、cursor、四个护甲槽和 2×2/3×3 合成输入统一清算；普通死亡把物品掉在死亡点，并掉落 `min(100, 当前等级 × 7)` 点经验后清零总经验。',
'- 生存/冒险死亡：36 格背包、cursor、四个护甲槽和 2×2/3×3 合成输入在原死亡位置统一清算；普通死亡把物品掉在死亡点，并掉落 `min(100, 当前等级 × 7)` 点经验后清零总经验。\n- 死亡结算后不会立即传送：游戏进入独立死亡界面并阻断普通输入/本地世界更新，只有点击“重生”才调用 `Player.respawn(0,0)` 返回出生点；也可在死亡结算已保存后返回标题画面。'),
('browser quality',
'`Repository quality` 在 PR 和 `main` push 时先执行 Node 规则层，再用 Chromium 创建固定海洋测试世界，验证水体/氧气/游泳，并实际执行 `/weather rain → thunder → clear`，要求 WeatherFX 活跃条数 446 → 720 → 0；随后继续验证护甲 v5 IndexedDB 快照和虚空死亡清算。测试边界见 [`docs/TESTING.md`](docs/TESTING.md)。',
'`Repository quality` 在 PR 和 `main` push 时先执行 Node 规则层，再用 Chromium 创建固定海洋测试世界，验证水体/氧气/游泳，并实际执行 `/weather rain → thunder → clear`，要求 WeatherFX 活跃条数 446 → 720 → 0；随后验证护甲 v5 IndexedDB 快照、虚空死亡界面持续存在、Escape 无法绕入暂停菜单，以及点击“重生”后才写入 hp=20 的出生点状态。测试边界见 [`docs/TESTING.md`](docs/TESTING.md)。'),
('future death work',
'- 后续：死亡界面/床重生、完整伤害/护甲/耐久/附魔、流体传播/水流/冲刺游泳与水下视觉、自动天气/闪电/雪、状态效果、村民交易、酿造、维度、结构、多人生存网络层、真正 AI 地形管线。',
'- 后续：死亡统计/床重生/`keepInventory`、完整伤害/护甲/耐久/附魔、流体传播/水流/冲刺游泳与水下视觉、自动天气/闪电/雪、状态效果、村民交易、酿造、维度、结构、多人生存网络层、真正 AI 地形管线。')
])

patch('docs/PROGRESS.md',[
('browser smoke summary',
'- [x] Playwright Chromium browser smoke：海洋世界→氧气→游泳→rain/thunder/clear WeatherFX→护甲装备/存档→虚空死亡/重生→IndexedDB 核对。',
'- [x] Playwright Chromium browser smoke：海洋世界→氧气→游泳→rain/thunder/clear WeatherFX→护甲装备/存档→虚空死亡界面→显式重生→IndexedDB 核对。'),
('v04 status',
'状态：开发中。实体基础、四种敌对生物、奖励闭环、生存死亡损失、第一版护甲、透明水 pass、氧气/溺水、基础游泳/浮力和可见降雨 FX 已落库；死亡界面、完整流体/冲刺游泳、自动天气/闪电/雪、水下视觉和正式 Java 伤害/护甲公式仍未完成。',
'状态：开发中。实体基础、四种敌对生物、奖励闭环、生存死亡损失、显式死亡界面/重生、第一版护甲、透明水 pass、氧气/溺水、基础游泳/浮力和可见降雨 FX 已落库；死亡统计/床重生、完整流体/冲刺游泳、自动天气/闪电/雪、水下视觉和正式 Java 伤害/护甲公式仍未完成。'),
('death checklist',
'- [x] Chromium 虚空死亡 E2E：背包/装备/XP 清空且重生位置有效\n- [ ] 普通死亡浏览器 E2E、死亡界面/统计、床/重生点、`keepInventory`',
'- [x] `DeathScreen`：死亡原因/损失摘要、显式“重生”和“返回标题画面”；死亡状态下普通输入和本地世界帧被阻断\n- [x] 死亡结算与重生分离：`beginPlayerDeath()` 先在原位置清算并保存，`completeRespawn()` 仅由显式重生动作调用\n- [x] Chromium 虚空死亡 E2E：死亡界面必须持续存在，Escape 不得打开暂停菜单，点击“重生”后才恢复 hp=20；背包/装备/XP 仍保持清空\n- [ ] 普通死亡浏览器 E2E、死亡统计、床/重生点、`keepInventory`')
])

patch('docs/TESTING.md',[
('death browser steps',
'12. 恢复→给予原木→传送虚空→死亡/重生。\n13. 新鲜死亡后快照：Inventory=0、Equipment=0、XP=0、位置可恢复。\n14. 全程无 pageerror / console error。',
'12. 恢复→给予原木→传送虚空；`#death-menu` 必须进入 active，原因包含“虚空”，损失摘要包含“无法回收”。\n13. 等待约 450 ms 后死亡界面必须仍然 active；发送 Escape 后也必须继续停在死亡界面，`#pause-menu` 不得 active，证明没有自动重生或暂停菜单绕过。\n14. 点击“重生”后死亡界面关闭；随后 Escape 才能打开暂停菜单。\n15. 读取重生后的新鲜 IndexedDB：Inventory=0、Equipment=0、XP=0、Player hp=20，位置回到可恢复出生点。\n16. 全程无 pageerror / console error。'),
('testing limitation',
'- 普通可恢复死亡的掉落/经验/护甲重新拾取。',
'- 普通可恢复死亡的掉落/经验/护甲重新拾取。\n- 死亡界面“返回标题画面”按钮的专门 browser E2E；运行时会 force-save 已结算的 hp=0 状态，重新进入世界时由现有 startup fallback 自动回出生点。')
])

patch('docs/FILE_MANIFEST.md',[
('index responsibility',
'| `index.html` | 菜单、HUD、背包、工作台、聊天、护甲槽和 Oxygen HUD DOM 壳层 | 不承载游戏逻辑 |',
'| `index.html` | 菜单、HUD、背包、工作台、聊天、护甲槽、Oxygen HUD 与死亡界面 DOM 壳层 | 不承载游戏逻辑 |'),
('death css',
'| `oxygen.css` | 氧气气泡 HUD 样式 | 只负责表现；空气状态来自 oxygen-rules |',
'| `oxygen.css` | 氧气气泡 HUD 样式 | 只负责表现；空气状态来自 oxygen-rules |\n| `death.css` | 死亡覆盖层、死亡原因/摘要和重生按钮样式 | 只负责表现，不参与死亡损失/重生规则 |'),
('main responsibility',
'| `src/main.js` | 应用状态机、Three.js 场景、系统编排、交互、奖励/死亡/护甲/氧气/天气接线与自动保存 | `/weather` 同步 sky + WeatherSystem；不重复积分 Player 位移 |',
'| `src/main.js` | 应用状态机、Three.js 场景、系统编排、交互、奖励/死亡/护甲/氧气/天气接线与自动保存 | 死亡先 `beginPlayerDeath()` 清算并进入 deathState；只有显式动作 `completeRespawn()`；死亡时阻断普通世界帧/输入 |'),
('death screen module',
'| `src/death-rules.js` | 模式死亡损失、死亡经验、虚空/可恢复位置判断 | 纯逻辑；不生成实体/不操作 UI |',
'| `src/death-rules.js` | 模式死亡损失、死亡经验、虚空/可恢复位置判断 | 纯逻辑；不生成实体/不操作 UI |\n| `src/death-screen.js` | 死亡界面 DOM 引用、原因/损失摘要写入和显示状态读取 | 不决定掉落/经验/重生位置；由 main 状态机驱动 |'),
('browser e2e responsibility',
'| `tests/e2e/smoke.spec.mjs` | Chromium 世界启动、水体 oxygen/swimming、WeatherFX 切换、护甲存档、虚空死亡 | `/weather` 断言 rain:446/thunder:720/clear:0；全程捕获 page/console error |',
'| `tests/e2e/smoke.spec.mjs` | Chromium 世界启动、水体 oxygen/swimming、WeatherFX、护甲存档、死亡界面/显式重生 | 虚空死亡必须停在 death screen；Escape 不得绕过；点击重生后断言 hp=20 和损失状态；全程捕获 page/console error |')
])

patch('docs/ARCHITECTURE.md',[
('death section',
'''## Death / Rewards

- survival/adventure 死亡按 death plan drain Crafting/Equipment/Inventory/cursor；creative/spectator 不损失。
- 普通死亡在死亡点生成 drops/orbs；`y < -10` 虚空直接损失。
- 死亡 XP `min(100, currentLevel*7)`。
- DropSystem / ExperienceOrbSystem 当前仍不跨页面持久化。''',
'''## Death / Rewards / Explicit Respawn

- `death-rules.js` 仍只负责策略：survival/adventure 按 death plan drain Crafting/Equipment/Inventory/cursor；creative/spectator 不执行这套损失。
- `beginPlayerDeath()` 捕获原死亡坐标和旧 totalXp，在**原坐标**完成掉落/经验或虚空直接损失，然后设置 `deathState`、退出 Pointer Lock、写入死亡原因/损失摘要并显示 `DeathScreen`；它不会调用 `Player.respawn()`。
- 普通死亡在死亡点生成 drops/orbs；`y < -10` 虚空直接损失；死亡 XP 为 `min(100, currentLevel*7)`。
- deathState 激活时 `pointer()/canControl()/pause/inventory/workbench/key handler` 均有显式 guard，主 animate 的普通世界更新块也停止，避免尸体继续被移动、攻击或自动重生。
- `completeRespawn()` 只由“重生”按钮调用：`Player.respawn(0,0)` → reset oxygen → 清 deathState → 返回游戏 → 标记存档 dirty。
- “返回标题画面”会先 force-save 已清算的 hp=0 死亡状态再 dispose world；DeathScreen 本身不持久化。下次载入 hp<=0 的世界时，现有 `startWorld()` fallback 会直接 `player.respawn(0,0)`，因此不会把死亡 UI 跨页面保存。
- `beginPlayerDeath()` 还会 fire-and-forget 启动一次强制 IndexedDB 保存，降低停留在死亡界面后直接关闭页面造成结算丢失的风险。
- DropSystem / ExperienceOrbSystem 当前仍不跨页面持久化。'''),
('death tech debt',
'- 死亡界面、床/重生点、keepInventory、死亡世界实体持久化尚未完成。',
'- 死亡统计、床/重生点、keepInventory、死亡世界实体持久化尚未完成。')
])

patch('CHANGELOG.md',[
('browser smoke line',
'- browser smoke 使用固定 seed + `海` prompt 真实生成水体，验证 Oxygen `data-air`、Space 上游、Shift 下潜；随后实际执行 `/weather rain → thunder → clear` 并要求 `WeatherFX 446 → 720 → 0`，再继续 Equipment/v5 存档和虚空死亡链。',
'- browser smoke 使用固定 seed + `海` prompt 真实生成水体，验证 Oxygen `data-air`、Space 上游、Shift 下潜；随后实际执行 `/weather rain → thunder → clear` 并要求 `WeatherFX 446 → 720 → 0`，再继续 Equipment/v5 存档和虚空死亡界面→显式重生链。'),
('death feature insertion',
'- 普通 survival/adventure 死亡在原点生成物品，并生成 `min(100, 当前等级 × 7)` 经验后清零 totalXp；`y < -10` 虚空死亡直接损失。',
'- 普通 survival/adventure 死亡在原点生成物品，并生成 `min(100, 当前等级 × 7)` 经验后清零 totalXp；`y < -10` 虚空死亡直接损失。\n- 新增独立 `DeathScreen`：死亡结算与重生动作拆开，死亡后停留在原因/损失摘要界面，不再自动传送；只有点击“重生”才调用 `Player.respawn(0,0)`。\n- deathState 会阻断 Pointer Lock、暂停/背包/工作台/普通键盘输入和主世界更新；Escape 不能从死亡界面绕入暂停菜单。\n- “返回标题画面”先强制保存 hp=0 的已结算状态再销毁世界；DeathScreen 不持久化，重新进入时由现有 hp<=0 startup fallback 回出生点。\n- Chromium E2E 现在要求虚空死亡界面至少持续约 450 ms、Escape 仍停在死亡界面；点击“重生”后新鲜存档必须 hp=20、Inventory/Equipment/XP 仍清空。'),
('current limitation death',
'- `v0.4.0` 尚未封版：死亡界面/统计/床重生、完整流体、水下视觉、自动天气/闪电/雪等仍未完成。',
'- `v0.4.0` 尚未封版：死亡统计/床重生/`keepInventory`、完整流体、水下视觉、自动天气/闪电/雪等仍未完成。')
])

print('death documentation patch: PASS')
