# Clash Verge Rev — Shooker2012 fork

这是 [Clash Verge Rev](https://github.com/clash-verge-rev/clash-verge-rev) 的个人 fork，基于上游 `v2.5.10` 开发。项目仍然使用 Clash Meta（mihomo）内核和 Tauri 框架，配置文件格式与上游保持兼容。

本 fork 适合希望在选择节点时同时比较延迟和下载速度的用户。它不是官方发行版，问题反馈和发布文件请以本仓库为准。

## 下载

请从本仓库的 [Releases](https://github.com/shooker2012/clash-verge-rev/releases) 页面下载对应平台的安装包。

- Windows：优先使用 x64 安装包或便携版。
- Linux 和 macOS：请确认系统架构与发布文件名称一致。
- `Latest` 指向本 fork 的最新发布版本，不会跳转到上游仓库。

如果只需要在已经安装的官方 `v2.5.10` 上启用本 fork 的改动，可以使用发布页提供的补丁包。补丁只适用于发布说明中注明的版本和架构；跨版本使用前请先备份原文件。

## 本 fork 的改动

### 节点下载测速

- 在延迟测试按钮旁新增下载测速按钮。
- 测试前会检查延迟结果。延迟不存在或超过两分钟时，会先重新测试延迟，再进行下载测速。
- 对节点组测速时，会逐个测试组内节点，并显示待测试、测试中、已跳过、失败和已完成状态。
- 测试过程中显示总体进度，并提供停止按钮。
- 可以按下载速度排序，也可以在节点右键菜单中单独测试延迟或下载速度。
- 测速参数位于「设置 → 常规 → 下载测速」，可以配置测速地址、测试时长和最大下载字节数。默认测试大小为 10 MB，可按需要调小。

测速地址应当返回可下载的数据，并且要能通过当前代理节点访问。不同测速地址的 CDN、网络位置和限速策略会影响结果，因此建议在同一批节点之间使用同一个地址比较。

## 从上游同步

本 fork 的功能提交建立在上游稳定 release tag 之上。仓库内的 [`scripts/Sync-UpstreamRelease.ps1`](./scripts/Sync-UpstreamRelease.ps1) 可以自动获取上游最新 release tag，创建同步分支，并把本 fork 的功能提交重新应用到新的上游版本。

在 PowerShell 中运行：

```powershell
.\scripts\Sync-UpstreamRelease.ps1
```

脚本默认只做准备和检查，不会自动推送到 GitHub。确认变更和测试通过后，再将同步分支合并到自己的开发分支并推送到 fork。具体参数和流程见脚本帮助：

```powershell
Get-Help .\scripts\Sync-UpstreamRelease.ps1 -Full
```

## 开发

项目开发环境和完整构建说明请参考上游文档：

- [上游开发指南](https://github.com/clash-verge-rev/clash-verge-rev/blob/main/CONTRIBUTING.md)
- [上游英文 README](./docs/README_en.md)
- [项目文档](https://clash-verge-rev.github.io/)

常用命令：

```powershell
pnpm install
pnpm run prebuild
pnpm dev
```

构建 Windows 未打包程序：

```powershell
pnpm tauri build --no-bundle
```

## 上游项目与许可

本项目是上游 [clash-verge-rev/clash-verge-rev](https://github.com/clash-verge-rev/clash-verge-rev) 的 fork，相关版权和许可声明保持不变。项目使用 GPL-3.0 许可证，详见 [`LICENSE`](./LICENSE)。

上游项目还使用了 [Tauri](https://github.com/tauri-apps/tauri)、[mihomo](https://github.com/MetaCubeX/mihomo) 等开源项目，请遵守各自许可证。

## 隐私

Clash Verge Rev 不收集用户数据，配置和日志保存在本地设备。详见 [`PRIVACY.md`](./PRIVACY.md)。
