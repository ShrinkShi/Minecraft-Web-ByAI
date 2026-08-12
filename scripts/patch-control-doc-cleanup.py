from pathlib import Path


def rep(path, old, new, label):
    p=Path(path); t=p.read_text(encoding='utf-8'); n=t.count(old)
    if n!=1: raise SystemExit(f'{label}: expected 1 match, got {n}')
    p.write_text(t.replace(old,new,1),encoding='utf-8')

rep('docs/ARCHITECTURE.md',
'10. **输入设备适配与玩法逻辑分离**：桌面键鼠和手机手势只产生统一 Player/交互输入，不允许移动端控制层直接修改 World/Inventory/IndexedDB。\n',
'11. **输入适配器无玩法写权限**：键鼠、触摸以及未来手柄/网络 source 只产生统一控制意图，不允许输入适配层直接修改 World、Inventory、Storage 或伤害/碰撞规则。\n',
'principle numbering')

old='''## Device profile / Mobile browser input\n\n- `device-profile.js` 是纯环境判定层：优先使用 Mobile UA / `navigator.userAgentData.mobile`，并用 `maxTouchPoints + (pointer:coarse) + (hover:none) + compact viewport` 覆盖 iPadOS 桌面 UA；带触摸屏但仍有 fine pointer/hover 的桌面设备不自动切到手机布局。\n- 判定结果写入 `body[data-device]` / `body[data-orientation]`，并监听 resize/orientation/media-query 变化。portrait 手机只显示旋转提示；landscape 才允许触控游戏控件。\n- `mobile-controls.js` 只把 pointer 手势转换为 `onMove/onLook/onHold/onToggle/onAction`；它不读取或写入 World、Inventory、Storage。\n- `PlayerController.virtualInput` 与键盘 `keys` 分离，在唯一的 `PlayerController.update()` 中合成；触控摇杆保留模拟量，键盘语义不变。\n- 主编排层将桌面鼠标和手机按钮统一收口到 `primaryActionStart/End()` 与 `secondaryAction()`，因此攻击、持续挖掘、raycast、放置、工作台和床交互只有一条 gameplay 路径。\n- 手机 gameplay 的 `canControl()` 不要求 Pointer Lock；桌面仍要求 Pointer Lock。暂停、死亡、背包、工作台或聊天打开时会清除 virtual input，避免松手事件丢失造成持续移动/攻击。\n- `mobile.css` 使用 `env(safe-area-inset-*)` 避开刘海/圆角，并压缩横屏 HUD/背包；不设置 `user-scalable=no`，也不依赖浏览器通常受手势权限限制的强制 orientation lock。\n\n'''
new='''## Device profile / Responsive presentation\n\n- `device-profile.js` 是纯环境判定层：优先使用 Mobile UA / `navigator.userAgentData.mobile`，并用 `maxTouchPoints + (pointer:coarse) + (hover:none) + compact viewport` 覆盖 iPadOS 桌面 UA；带触摸屏但仍有 fine pointer/hover 的桌面设备不自动切到手机布局。\n- 判定结果只写入 `body[data-device]` / `body[data-orientation]` 并选择输入适配器/响应式布局；它不进入 Player、World、Inventory、world record 或未来服务端玩法状态。\n- portrait 手机显示旋转提示，landscape 显示触控控件；桌面通过 Pointer Lock 获得鼠标视角。两者只是表现和输入捕获方式不同。\n- `mobile.css` 使用 `env(safe-area-inset-*)` 避开刘海/圆角并压缩横屏 HUD/背包；不设置 `user-scalable=no`，也不依赖浏览器通常受手势权限限制的强制 orientation lock。\n- 实际 gameplay 输入统一规则见下方 `Platform / Control Intent`；本节不得再描述 mobile-only Player 状态。\n\n'''
rep('docs/ARCHITECTURE.md',old,new,'responsive section')

rep('docs/FILE_MANIFEST.md',
'| `src/main.js` | 应用状态机、Three.js 场景、系统编排、桌面/移动共享交互、奖励/死亡/护甲/氧气/天气接线与自动保存 | 主/副交互只有一条 gameplay 路径；手机不要求 Pointer Lock，桌面仍要求；暂停/面板/死亡清虚拟输入 |\n',
'| `src/main.js` | 应用状态机、Three.js 场景、系统编排、平台无关控制意图分发、奖励/死亡/护甲/氧气/天气接线与自动保存 | 主/副交互只有一条 gameplay 路径；设备差异只影响输入捕获；暂停/面板/死亡统一 reset ControlIntentBus |\n',
'main manifest')
