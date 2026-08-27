# CloudAI Closed Beta Account Operations

本手册用于 5-30 人规模的封闭内测账号运营。账号由管理员创建，不开放公开注册，也不使用日常 SQL 作为账号管理手段。

## 标准流程

1. 通过可信渠道获取测试者邮箱。
2. 运行 `pnpm beta:user:create`，交互式输入邮箱、可选名称和初始密码。
3. 运行 `pnpm beta:user:status -- <email>`，确认账号为 active 且已配置密码。
4. 向测试者发送 Production URL 和登录邮箱。
5. 通过可信私聊渠道单独提供初始密码。
6. 用户登录后点击“创建第一个商品”，完成首个商品工作流。
7. 用户遇到问题时，通过 `/dashboard/support` 的“反馈与支持”联系。
8. 忘记密码时运行 `pnpm beta:user:reset-password`。
9. 不应继续访问时运行 `pnpm beta:user:disable`。
10. 恢复访问前先确认已有密码，再运行 `pnpm beta:user:enable`。

所有写操作都会显示脱敏数据库目标、操作类型和邮箱，并要求确认。主动取消不会写数据库；输入错误、用户不存在、重复邮箱或校验失败会以非零状态退出。

## 邀请模板

```text
CloudAI Closed Beta

访问地址：
<production-url>

账号：
<email>

初始密码：
<通过安全渠道单独提供>

建议第一次使用：
1. 登录
2. 点击“创建第一个商品”
3. 上传商品主图
4. 完成商品分析
5. 尝试生成上架文案或商品图片

遇到问题：
在 CloudAI 的“反馈与支持”中联系我们。
```

不要把真实测试者名单、密码或长期有效凭据写入仓库。不要在同一条公开消息中长期保存邮箱、密码和管理员信息。当前不要求用户首次登录后强制修改密码；用户自助修改密码留给后续 C1 账号能力。

## 管理员 Checklist

Invite:

- [ ] 收到测试者邮箱
- [ ] 创建账号
- [ ] 使用 status 检查账号状态
- [ ] 发送 Production URL
- [ ] 通过可信渠道单独发送初始密码
- [ ] 提醒用户使用 Feedback & Support

Offboard:

- [ ] 运行 disable
- [ ] 使用 status 确认为 disabled
- [ ] 不删除 History、Asset 或 Usage 数据

首批 Beta 名单在仓库外人工管理，不新增 tester 表或名单文件。

## 账号命令

| 场景 | 命令 | 说明 |
| --- | --- | --- |
| 创建账号 | `pnpm beta:user:create` | 交互输入密码；拒绝覆盖任何同邮箱账号 |
| 检查状态 | `pnpm beta:user:status -- <email>` | 只读显示账号状态、密码是否配置和业务记录计数 |
| 重置密码 | `pnpm beta:user:reset-password` | 不改变 active/disabled 状态 |
| 停用账号 | `pnpm beta:user:disable` | 仅设置 disabled，保留所有业务数据 |
| 恢复账号 | `pnpm beta:user:enable` | 仅允许已有 passwordHash 的账号恢复 |

密码必须在安全交互终端中输入，不作为命令参数，不写入 shell history、日志或文件。CLI 不输出密码或 passwordHash。

## Beta Usage Protection Limits

以下是 `lib/usage-limits.ts` 当前 rolling-window 保护限制，不是正式套餐或付费权益：

| 能力 | 短时限制 | 过去 24 小时 |
| --- | --- | --- |
| 创作助手 | 3 次/10 秒，12 次/分钟 | 120 |
| 上架文案 | 2 次/10 秒，8 次/分钟 | 100 |
| 商品图 | 2 次/30 秒，3 次/分钟 | 30 |
| 商品图精修 | 10 次/分钟 | 100 |
| 商品分析 | 2 次/30 秒，5 次/分钟 | 50 |
| 视频工坊 | 1 次/分钟 | 10（Beta 默认关闭） |

测试额度不足时不要删除 UsageRecord。优先等待 rolling window 自然释放；用户级 adjustment、补额度和正式套餐留给后续 C2。

## Support Configuration

用户反馈入口为 `/dashboard/support`。生产环境可配置：

- `NEXT_PUBLIC_SUPPORT_EMAIL`
- `NEXT_PUBLIC_CONTACT_QQ`
- `NEXT_PUBLIC_CONTACT_WECHAT`

不要在本文档中填写真实凭据或私密联系方式。

## Incident Quick Actions

- 用户忘记密码：`pnpm beta:user:reset-password`
- 用户不应继续访问：`pnpm beta:user:disable`
- 恢复访问：`pnpm beta:user:enable`
- 检查账号：`pnpm beta:user:status -- <email>`
- 查看 stale pending Usage：`pnpm usage:pending:list`
- 确认系统失败并返还 pending：`pnpm usage:refund -- <usage-id>`

普通账号运营禁止直接执行 `UPDATE User`、`DELETE UsageRecord` 或手工修改 passwordHash。管理员应优先使用上述 CLI；migration 与数据库维护不属于日常 Beta 用户运营。
