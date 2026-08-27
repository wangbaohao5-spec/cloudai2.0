# CloudAI Closed Beta Release Definition

Status: FROZEN  
Positioning: AI 电商商品上架内容创作工作台  
Initial cohort: 5-10 invited testers

本文件定义首批 CloudAI Closed Beta 的开放范围、运营边界和暂停条件。除 bug、P0/P1 或明确的 Beta 反馈外，不在本阶段继续结构性重构。

## 1. Beta Goal

首批 Beta 用于验证：

1. 用户能否独立创建第一个商品。
2. 商品分析是否能支持后续创作。
3. 上架文案是否有真实使用价值。
4. 图片生成和原图优化是否有真实使用价值。
5. 商品套图和详情页制作是否有真实使用价值。
6. 素材库和素材包是否能帮助用户整理商品内容。
7. 用户是否愿意持续回来完成商品创作。

首批用户优先选择真正从事电商内容工作、愿意上传真实商品图、能接受 Beta 小问题并愿意持续反馈的人。人数不写入产品逻辑。

## 2. Included

### Workspace

- Dashboard / 概览
- 商品工作台
- 最近商品恢复
- 明确新建商品
- 全部商品与指定商品继续创作

### Product creation

- 商品图片上传与真实图片校验
- 商品分析与商品策划
- 当前商品上架文案
- 当前商品原图优化
- 商品套图规划与逐张生成
- 当前商品详情页制作

当前主工作台没有独立“场景图”一级入口。场景构图作为商品套图的一部分开放；旧场景图 API、组件和历史记录仅保留兼容，不作为首批 Beta 主动推广能力。

### Assets and history

- 商品素材库
- 商品素材包即时复制与下载
- History / 历史记录
- 刷新、重新登录后的历史素材访问

### Quick tools

- 独立上架文案
- 商品图精修
- 创作助手

### Account and operations

- 额度中心
- 个人中心现有只读/外观能力
- `/dashboard/support` 反馈与支持
- 管理员 CLI 账号运营

订阅页面当前仅为信息占位，不代表已开放购买、支付或正式套餐。

## 3. Excluded

- 视频工坊：`NEXT_PUBLIC_BETA_VIDEO_ENABLED=false`，页面与 API 均保持关闭。
- 公开注册和邀请码注册。
- Payment、订阅购买、续费和正式套餐。
- 正式 credits top-up、用户级额度 override 和 goodwill adjustment。
- 用户自助修改密码、找回密码和注销账号。
- Admin Dashboard、运营后台和工单系统。
- Beta tester 数据表或仓库内真实测试者名单。
- Quick Tool 结果关联/保存到商品。
- 内部 QA、Model Lab、旧 image route 等内部或兼容页面。
- 独立场景图入口与完整视频工作流。

## 4. First User Flow

冻结流程：

登录  
→ 创建第一个商品  
→ 上传一张商品图  
→ 商品分析  
→ Product Workspace  
→ 生成上架文案或商品图片  
→ 素材库  
→ 素材包  
→ History / Usage

不为首批 Beta 设计第二套 onboarding，也不加入全站 Tour。

## 5. Account Operations

账号由管理员通过 CLI 创建，不开放自助注册。可登录账号必须同时满足：

- `active=true`
- password configured

标准发放流程：

1. `pnpm beta:user:create`
2. `pnpm beta:user:status -- <email>`
3. 通过可信私聊渠道分别发送 Production URL、登录邮箱和初始密码

日常账号命令：

- `pnpm beta:user:create`
- `pnpm beta:user:status -- <email>`
- `pnpm beta:user:reset-password`
- `pnpm beta:user:disable`
- `pnpm beta:user:enable`

完整 SOP 见 [BETA-OPERATIONS.md](./BETA-OPERATIONS.md)。普通账号运营禁止直接修改数据库或手工修改 passwordHash。

## 6. Usage Rules

生成请求采用：

`pending → succeeded`  
或  
`pending → refunded`

系统或 Provider 失败不应最终消耗额度。超过 1 小时的 stale pending 由管理员使用以下命令核对：

- `pnpm usage:pending:list`
- `pnpm usage:refund -- <usage-id>`

当前 rolling-window 限额来自 `lib/usage-limits.ts`：

| 能力 | 短时限制 | 过去 24 小时 |
| --- | --- | --- |
| 创作助手 | 3 次/10 秒，12 次/分钟 | 120 |
| 上架文案 | 2 次/10 秒，8 次/分钟 | 100 |
| 商品图 | 2 次/30 秒，3 次/分钟 | 30 |
| 商品图精修 | 10 次/分钟 | 100 |
| 商品分析 | 2 次/30 秒，5 次/分钟 | 50 |
| 视频工坊 | 1 次/分钟 | 10（Beta 默认关闭） |

这些是 Beta protection limits，不是正式套餐、credits 或付费权益。额度不足时不删除 UsageRecord，优先等待 rolling window 自然释放。

## 7. Asset and Storage Rules

- Asset object path 是长期 persistent identity。
- Signed URL 是临时访问地址，只在读取时生成。
- Creation Center、History 和 Product Workspace 必须动态刷新图片访问地址。
- 新 History 不持久化 signed URL 或 Provider temporary URL。
- 私有 bucket 当前为 `cloudai-assets`。
- 用户上传限制为单张不超过 4 MB。
- 正式支持 JPEG/JPG、PNG、WebP，并校验真实图片字节。
- 素材包中的图片链接用于当前即时访问，不作为永久公开地址。

## 8. Provider and Timeout Rules

首批 Beta 的 Provider 角色：

- Text：创作助手、独立/商品文案、商品套图规划、详情页规划。
- Vision：商品图片识别与商品分析。
- Image：商品图精修、原图优化、商品套图和详情页图片。

具体供应商和模型由生产环境按任务配置，本文件不记录 key、secret、采购价格或内部成本。

当前请求 timeout：

- Text：60 秒
- Vision：90 秒
- Image：120 秒

超时必须返回安全错误，并通过 Usage 生命周期进入 refund；不在首批 Beta 增加复杂自动重试。

## 9. Support

用户支持入口：`/dashboard/support`

生产环境可配置：

- `NEXT_PUBLIC_SUPPORT_EMAIL`
- `NEXT_PUBLIC_CONTACT_QQ`
- `NEXT_PUBLIC_CONTACT_WECHAT`

用户遇到生成失败、识别不准、图片效果问题、页面异常或流程疑问时，通过该入口反馈。反馈内容不得包含密码、API key、cookie、signed URL token 或数据库信息。

## 10. Known P2

以下事项已知但不阻塞首批 Closed Beta：

- `Asset.url` 实际保存 object path 的命名技术债。
- Legacy data URL 与旧历史图片字段兼容清理。
- Storage object / Asset / History orphan 的自动巡检和清理。
- stale pending 自动 reconciliation；当前为管理员 CLI 人工处理。
- goodwill adjustment、补额度、正式 credits 与 pricing。
- 用户自助修改/找回密码及完整账号安全中心。
- 完整 Admin UI、tester 管理和工单系统。
- 正式 Playwright/Cypress E2E 自动化；当前依赖单元测试与人工 Production Smoke。
- Upload、History、Asset URL 等读取接口的更广泛 rate limiting。
- 大文件直传 Storage；当前仍采用 4 MB 应用上传边界。
- 完整视频工作流和视频与商品上下文深度绑定。
- Planning draft 的服务端持久化与跨设备恢复。
- History pagination、异常记录提示和筛选体验抛光。
- Provider 健康状态、排队和更丰富错误状态 UX。
- README 仍描述旧静态官网，后续应整体重写，不能作为当前应用运行说明。

## 11. Pre-release Checklist

- [ ] main branch clean
- [ ] latest commit pushed
- [ ] Vercel deployment green
- [ ] Production env validation pass
- [ ] `NEXT_PUBLIC_BETA_VIDEO_ENABLED=false`
- [ ] Beta account status pass
- [ ] support contact configured
- [ ] Production smoke pass
- [ ] stale pending Usage checked
- [ ] database migrations up to date

当前迁移集合：baseline、user credentials、auth login attempt、usage reservations。发布时只检查状态，不在 build 中自动执行 migration。

## 12. Daily Operations

Closed Beta 初期每天人工检查一次：

- Vercel runtime errors 和异常 4xx/5xx。
- stale pending Usage 与 refund 需求。
- Provider timeout、失败率和异常成本。
- `/dashboard/support` 收到的反馈。
- 明显的图片缺失、Asset/History 不一致或 orphan 迹象。
- active tester 数量和实际使用情况。

首批阶段不为这些检查安装新的 monitoring SaaS。

## 13. Pause Conditions

以下任一情况出现时暂停新增账号发放：

- authentication 大面积失效或账号状态无法可靠执行。
- cross-user data exposure。
- Usage 持续误扣且无法安全返还。
- 大面积 Storage/Asset 图片丢失或历史素材无法恢复。
- Production Provider 全面不可用或成本异常失控。
- 数据库 migration/integrity 异常。
- secret、密码、token 或 signed URL credential 泄露。

暂停后的人工动作：

1. 停止发放新账号。
2. 必要时使用 `beta:user:disable` 停用受影响账号，保留业务数据。
3. 确认 Auth、Usage、Asset、数据库或 Provider 根因并完成最小修复。
4. 重新执行低成本 Production Smoke。
5. Smoke 通过后再恢复账号发放。

其它 P2 进入 backlog，继续 Beta，不作为暂停条件。本阶段不实现自动 kill switch。
