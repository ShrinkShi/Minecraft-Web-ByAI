from pathlib import Path

def rep(path, old, new, label):
    p=Path(path); t=p.read_text(encoding='utf-8'); n=t.count(old)
    if n!=1: raise SystemExit(f'{label}: expected 1 match, got {n}')
    p.write_text(t.replace(old,new,1),encoding='utf-8')

rep('CHANGELOG.md',
    '- 新增第 11 套 `scripts/check-controls.mjs`，明确验证 `desktop` / `touch` / `network-peer` 的规范化状态等价，为未来 PC↔手机同服联机建立协议前置约束。',
    '- 新增第 11 套 `scripts/check-controls.mjs`，明确验证 `desktop` / `touch` / `network-peer` 的规范化状态等价，为未来 PC↔手机同服联机建立协议前置约束。\n- 新增 `PlayerControlFrame v1`：只序列化版本、uint32 序号、归一化 move 与 jump/sneak/sprint/primary 位掩码；设备/UA/source 不进入 wire frame，同逻辑 desktop/touch/network 输入必须编码一致。',
    'changelog control frame')

rep('docs/PROGRESS.md',
    '- [x] 联机前置平台约束：同一 World/Player/Inventory/存档/玩法语义，未来 `network-peer` 与本地输入复用相同控制状态，不创建独立 mobile client protocol。',
    '- [x] 联机前置平台约束：同一 World/Player/Inventory/存档/玩法语义，未来 `network-peer` 与本地输入复用相同控制状态，不创建独立 mobile client protocol。\n- [x] `PlayerControlFrame v1`：平台无关连续控制 wire schema；desktop/touch/network-peer 同状态编码一致且不携带设备身份。',
    'progress control frame')

rep('docs/FILE_MANIFEST.md',
    '| `src/control-intents.js` | 平台无关控制意图版本、连续状态归一化、多 source 合并、look/action 分发 | 纯逻辑；未来 gamepad/network-peer 必须复用，不得携带 DOM/设备规则 |',
    '| `src/control-intents.js` | 平台无关控制意图版本、连续状态归一化、多 source 合并、look/action 分发 | 纯逻辑；未来 gamepad/network-peer 必须复用，不得携带 DOM/设备规则 |\n| `src/player-control-frame.js` | `PlayerControlFrame v1` 连续控制 wire 编码/解码与兼容性校验 | 仅含 version/seq/move/button bits；严禁设备/source/UA 进入未来网络控制帧 |',
    'manifest player control frame')
rep('docs/FILE_MANIFEST.md',
    '| `docs/ARCHITECTURE.md` | 架构决策、数据流、技术债 | 架构变化同步更新 |',
    '| `docs/ARCHITECTURE.md` | 架构决策、数据流、技术债 | 架构变化同步更新 |\n| `docs/NETWORKING.md` | PC/手机同客户端、平台无关控制帧与未来 server-authoritative 联机边界 | 网络实现不得按平台复制 World/Player/玩法规则 |',
    'manifest networking docs')
