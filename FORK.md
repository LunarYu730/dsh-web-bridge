# 修改说明（fork）

本仓库是 **非官方修改版**，基于 SaiSenBox 的 [`@xueray/dsh-web-bridge`](https://github.com/SaiSenBox/dsh-web-bridge) 0.4.5（本仓库的粘贴/拖放改动已由上游 0.4.6 收录）。

- 原作者：SaiSenBox（<https://github.com/SaiSenBox>），上游仓库：<https://github.com/SaiSenBox/dsh-web-bridge>
- 本版本的改动**未经原作者审核**，不代表原作者意见，也不是 DeepSeek 官方产品。
- 仅限**非商业用途**。许可证为 PolyForm Noncommercial 1.0.0（见 [LICENSE](LICENSE)），分发时必须保留许可全文与文件顶部的 Required Notice；商业授权请联系原作者。
- 本仓库保留了上游的测试与 CI 配置；`docs/`、`assets/`、截图等仍来自上游。

## 本版本改了什么

代码改动集中在 `lib/client.js` 的网页对话面板（`WebChatPanel`）与 `lib/index.js` 的导入、偏好路由：

1. **粘贴附件**：输入框新增 `onPaste`。从 `clipboardData.files` / `items` 取出文件交给原有的 `addFiles()`；仅当剪贴板没有文字时接管，复制富文本仍按文本粘贴。
2. **拖放附件**：聊天面板根节点绑定 `dragenter/dragover/dragleave/drop`，用计数器避免子元素抖动；拖入文件时加 `dsweb-drop-active` 类。发送中、历史加载中或回答分支异常时不接收。
3. **样式与版本**：新增 `.dsweb-chat.dsweb-drop-active .dsweb-chat-composer` 虚线高亮；`FALLBACK_VERSION` / `VERSION` / `package.json` 版本改为 `0.4.5-fork.6`。
4. **思考模式 / 联网搜索**：`WebChatPanel` 的两个开关默认开启，并从 `localStorage`（`dsh-deepseek-web.composer-mode`）与 Host 的 `GET/PUT /deepseek-web/preferences` 读取上次选择；Host 侧存到 `$DSH_HOME/dsh-web-bridge-preferences.json`，换端口或重启 DSH 也不会丢。
5. **侧栏入口位置**：槽位从 `sidebar.footer.action` 改为 `sidebar.panellist`（id `deepseek-web`），与「插件」「插件市场」同组；点击在主区域打开 `deepseek-web` 面板，不再在侧栏内联展开、不再压住工作区会话。
6. **会话页左栏可收起**：网页端会话页标题栏加了折叠按钮，收起后预览/导入区域占满宽度；状态写 `localStorage`（`dsh-deepseek-web.library-list`）并同步到 `/deepseek-web/preferences` 的 `listCollapsed`。
7. **图片导入回退**：网页端文件服务不再为图片提供原图（`ty=r` 返回 HTTP 400），`getImage(original: true)` 在 400 时改用 `ty=p` 预览图并标记 `downgraded`；导入结果会提示「N 张图片的原文件不可读，已改用预览图」。
8. **导入会话的 id 形态**：`createImportedSession` 改用 DSH 自己的 `session-<uuid>`，不再加 `deepseek-web-` 前缀——否则「会话管理」等按 `session-*` 校验的工具会报 `"…" is not a Session id`，删不掉这些导入会话。

两者都复用原有上传链路，限制不变：最多 10 个附件，单个 ≤ 20 MiB；输入框文本上限仍为 8000 字符。

## 相对上游的改动痕迹（可逐行核对）

- 上游基线：`SaiSenBox/dsh-web-bridge@b5531f2`（v0.4.5）
- 完整 diff：[`docs/fork-changes.patch`](docs/fork-changes.patch)（文本文件，不含二进制）
- 本地复现：

```sh
git fetch upstream main
git diff upstream/main HEAD -- . ':(exclude)assets/promo'
```

| 文件 | 位置 | 改动 |
| --- | --- | --- |
| `lib/client.js` | `WebChatPanel` 状态 | 新增 `dragActive` / `dragDepthRef` |
| `lib/client.js` | `addFiles()` 之后 | 新增 `dragHasFiles`、`dragCanDrop`、`onChatDragEnter/Over/Leave/Drop` |
| `lib/client.js` | 面板根节点 `.dsweb-chat` | 绑定拖放事件，按状态切换 `dsweb-drop-active` |
| `lib/client.js` | 输入框 `dsweb-chat-input` | 新增 `onPaste` 处理 |
| `lib/client.js` | `WebChatPanel` 的 `thinking` / `search` | 初值来自 `localStorage`（默认开启），随切换写回 |
| `lib/index.js` | 路由 `/deepseek-web/preferences` | 新增 `GET` / `PUT`，把开关状态存到 `$DSH_HOME/dsh-web-bridge-preferences.json` |
| `lib/client.js` | 槽注册 | `sidebar.footer.action` → `sidebar.panellist`（id `deepseek-web`） |
| `lib/client.js` | 会话页 | 左栏折叠开关 + `data-list-collapsed` 样式，状态存入偏好 |
| `lib/index.js` | 偏好路由 | `listCollapsed` 字段（GET 返回，PUT 可单独更新） |
| `lib/deepseek-api.js` | `getImage` | 原图 400 时回退到预览图，返回 `downgraded` |
| `lib/index.js` | 导入附件 | 记录 `imagesDowngraded`，供结果面板提示 |
| `lib/client.js` | 样式表 | 新增拖放高亮规则 |
| `lib/index.js` | `createImportedSession` | 会话 id 由 `deepseek-web-<uuid>` 改为 DSH 的 `session-<uuid>` |
| `lib/client.js`、`lib/index.js`、`package.json` | 版本常量 | `0.4.5` → `0.4.5-fork.6` |
| `README.md`、`README.en.md`、`CHANGELOG.md` | — | 标注 fork、补充功能与变更条目 |
| `assets/promo/` | — | 删除上游宣传视频与封面（约 5.9 MB，与功能无关，且大文件上传易被网络重置） |

提交记录只有两个（`git log --oneline`）：上游基座提交 + 本次功能提交，便于审阅时只看第二个。

## 安装

需要 DSH `>=0.2.1-rc.2 <0.3.0`。

```sh
# 从本仓库安装
dsh plugin --profile desktop add github:hexiangyu0730-web/dsh-web-bridge

# 本地目录安装
dsh plugin --profile desktop add ./dsh-web-bridge
```

安装或更新后**完全退出 DSH（包括托盘进程）**再打开，只刷新页面不会重新加载 Host 接口和前端包。

已经装过上游 `@xueray/dsh-web-bridge` 的话，先移除旧包再装本版本，不要两份同时启用：

```sh
dsh plugin --profile desktop remove @xueray/dsh-web-bridge
```

### 从 0.4.5-fork.5 及更早版本升级

更早的版本把导入会话的 id 写成 `deepseek-web-<uuid>`，Host 能打开，但按 `session-*` 校验的工具（如「会话管理」插件的删除路由）会报 `"…" is not a Session id`，删不掉。0.4.5-fork.6 起改为 Host 自己的 `session-<uuid>`，新导入的会话不再有这个问题。

旧会话可以留着继续用；想清掉的话，**先完全退出 DSH（含托盘）**，再在仓库目录运行：

```sh
node scripts/purge-legacy-web-sessions.mjs --dry-run   # 先看会删哪些
node scripts/purge-legacy-web-sessions.mjs             # 实际删除，先备份 workspace.json
```

## 发布状态

- 已发布：<https://github.com/hexiangyu0730-web/dsh-web-bridge>（public，默认分支 `main`，`origin`）
- 已提交上游：
  - **[PR #1](https://github.com/SaiSenBox/dsh-web-bridge/pull/1)**（粘贴/拖放，`+68 −1`）— **已合并**，上游 0.4.6 已包含；
  - **[PR #2](https://github.com/SaiSenBox/dsh-web-bridge/pull/2)**（开关记忆、侧栏入口、列表收起，3 文件 `+263 −16`）— 开放中，CI 通过；
  - **[PR #3](https://github.com/SaiSenBox/dsh-web-bridge/pull/3)**（导入会话使用 `session-<uuid>`，2 文件 `+11 −4`）— 开放中，CI 通过；
  - 三者正文与状态见 [docs/upstream-pr.md](docs/upstream-pr.md)。
- `upstream` 保留指向原作者仓库，用于取上游基线
- CI：`.github/workflows/check.yml` 已在 GitHub 上通过（`npm run check` / `npm test` / `npm run verify:package`）
- 许可证与署名：保留上游 `LICENSE`（PolyForm Noncommercial 1.0.0）与 Required Notice，`package.json` 的 `author` 仍是 SaiSenBox
- 未发布到 npm：`@xueray` 作用域不属于本仓库，分发使用 GitHub 安装方式

日常提交：

```powershell
git add -A
git commit -m "docs: ..."
git push
```

首次推送时若报 `Recv failure: Connection was reset`，是网络对 `github.com` 解析 IP 的干扰，处理方式见仓库 issue 或本地 hosts 记录（`140.82.112.3 github.com`）。

## 与上游的关系

- 上游更新后，本仓库不会自动同步。合并上游时重点看 `lib/client.js` 的 `WebChatPanel`、`addFiles` 和版本常量三处，容易冲突。
- 想回到上游原版：`dsh plugin --profile desktop remove` 本仓库版本后重新安装 `@xueray/dsh-web-bridge`。

## 风险

上游使用的是 DeepSeek 网页端的非公开接口，没有稳定性承诺，可能被限流或改变；发送、重答、删除等操作会修改网页账号。请自行确认使用方式符合服务条款。
