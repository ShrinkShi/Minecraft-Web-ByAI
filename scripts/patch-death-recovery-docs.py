from pathlib import Path


def replace_once(path, old, new, label):
    p=Path(path)
    text=p.read_text(encoding='utf-8')
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    p.write_text(text.replace(old,new,1),encoding='utf-8')

replace_once(
    'CHANGELOG.md',
    '- `static-checks` 同时检查 `src/*.js`、`scripts/*.mjs`；`npm run test:logic` 现在顺序执行基础、Equipment/Armor、Water Mesh、Oxygen/Drowning、Swimming/Buoyancy、Weather/Precipitation 六套回归。',
    '- `static-checks` 同时检查 `src/*.js`、`scripts/*.mjs`；`npm run test:logic` 现在顺序执行基础、Equipment/Armor、Water Mesh、Oxygen/Drowning、Swimming/Buoyancy、Weather/Precipitation、Death Integration 七套回归。\n- 新增 `scripts/check-death.mjs`：锁定死亡 DOM/样式引用、`DeathScreen`/`deathState`/显式重生接线，禁止旧 `respawnPlayer()` 和一次性 death patch 工具重新进入交付树。\n- 主线 `7e2a4920...` 验收发现 PR #16 的死亡界面曾半落库：`death.css`/`death-screen.js` 存在，但 `index.html` 缺 DOM/样式引用，`main.js` 仍走立即重生且遗留 patch workflow/script；PR #19 将运行时、DOM 与质量门统一恢复，并以两条 Chromium 死亡链重新验收。',
    'changelog quality recovery',
)

replace_once(
    'docs/TESTING.md',
    'scripts/check-weather.mjs\n```',
    'scripts/check-weather.mjs\nscripts/check-death.mjs\n```',
    'testing suite list',
)
replace_once(
    'docs/TESTING.md',
    'Node 层只验证 profile，不导入 Three.js WeatherSystem；后者由 Chromium 实际创建/更新，避免在 Node 中伪造 WebGL 对象。\n\n## Chromium browser smoke',
    "Node 层只验证 profile，不导入 Three.js WeatherSystem；后者由 Chromium 实际创建/更新，避免在 Node 中伪造 WebGL 对象。\n\n### Death integration contract\n\n`scripts/check-death.mjs` 验证 `index.html` 必须加载 `death.css` 并包含 `#death-menu/#death-reason/#death-detail` 与显式重生/返回标题动作；`main.js` 必须构造 `DeathScreen`、持有 `deathState`、提供 `beginPlayerDeath()`/`completeRespawn()`、在死亡时阻断键盘与世界更新，并禁止旧 `respawnPlayer()` 立即重生路径。该检查同时拒绝历史一次性 death patch workflow/script 出现在交付树。\n\n该 contract 是针对主线 `7e2a4920...` 的真实回归新增：当时 static-checks 仍为绿色，但 Chromium 因 `#death-menu` 不存在而两条死亡用例同时失败。此后死亡 UI 的 DOM、状态机和工具清理不再只依赖浏览器阶段发现。\n\n## Chromium browser smoke",
    'testing death contract section',
)

replace_once(
    'docs/FILE_MANIFEST.md',
    '| `scripts/check-weather.mjs` | clear/rain/thunder profile、精确池预算、参数强弱和非法输入回归 | 不导入 Three.js；渲染实例由 Chromium 覆盖 |\n| `scripts/serve.mjs`',
    '| `scripts/check-weather.mjs` | clear/rain/thunder profile、精确池预算、参数强弱和非法输入回归 | 不导入 Three.js；渲染实例由 Chromium 覆盖 |\n| `scripts/check-death.mjs` | 死亡 DOM/样式、DeathScreen/deathState、显式重生和旧立即重生路径的集成契约 | Node 静态契约；同时拒绝历史一次性 death patch 工具进入交付树 |\n| `scripts/serve.mjs`',
    'manifest death test row',
)
replace_once(
    'docs/FILE_MANIFEST.md',
    '| `package.json` | Node 22+ 测试脚本与固定 Playwright | `test:logic` 顺序跑基础/armor/water/oxygen/swim/weather 六套测试 |',
    '| `package.json` | Node 22+ 测试脚本与固定 Playwright | `test:logic` 顺序跑基础/armor/water/oxygen/swim/weather/death 七套测试 |',
    'manifest package count',
)

print('death recovery docs patch: PASS')
