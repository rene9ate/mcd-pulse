# WorkBuddy 开发记录

## 项目目标

开发一个可以参加麦当劳程序员创意开发大赛、同时适合 WorkBuddy 联动奖励的 AI 作品。作品要有可运行的界面、清晰的麦当劳 MCP 集成说明，并且不能泄露真实 Token。

## 关键决策

### 作品方向：麦脉 Pulse

选择“情绪处方型点餐助手”，区别于普通套餐推荐：用户先选择当下状态，再由 AI 综合场景、预算、热量和优惠，生成一餐并解释原因。

### 交付形态：网页原型 + MCP 集成说明

采用单文件静态网页，降低运行门槛，便于评委直接打开和录屏。网页内置演示数据确保没有 Token 时也能展示完整交互；实际 MCP 调用流程写入 `MCP_INTEGRATION.md`，并在 WorkBuddy 连接器中配置 `mcd-mcp` 后接入实时结果。

### 订单安全边界

推荐阶段只查询菜单、营养、优惠并计算价格；只有用户明确确认后才允许进入 `create-order`。前端不保存 Token，不在仓库中放任何凭证。

## 执行记录

1. 阅读麦当劳官方比赛仓库，确认必须文件：`README.md`、官方原样 `CONTEST_DECLARATION.md`、`MCP_INTEGRATION.md`、源代码；使用 WorkBuddy 参赛专项还需 `workbuddy.md`。
2. 阅读麦当劳 MCP Server 官方指南，确认接入地址为 `https://mcp.mcd.cn`，协议为 Streamable HTTP，认证为 Bearer Token。
3. 核对可用工具，选择 `query-nearby-stores`、`query-meals`、`query-meal-detail`、`list-nutrition-foods`、`query-store-coupons`、`available-coupons`、`calculate-price` 和用户确认后的 `create-order` 作为主要调用链。
4. 创建 `index.html`：实现状态选择、预算和热量偏好、推荐卡片、营养/价格/优惠展示、“换一个方案”和“复制点单提示”交互。
5. 创建参赛说明和合规文件。
6. 在 WorkBuddy 连接器中配置 `mcd-mcp`，真实调用 MCP 拉取深圳同方信息港餐厅（storeCode 1420762）的实时数据：附近门店、可售菜单、营养表、门店券（当前为空）、麦辣鸡腿汉堡三件套价格与套餐详情，并将快照写入网页与 README，替换原先的演示数据。
7. 扩展情绪入口至 12 种（新增社恐专属/深夜 emo/减肥第一天/钱包在减肥/暴风吸入/假装很健康/周一崩溃），并为每一种撰写贴合场景的推荐文案与营养/价格/优惠结构。
8. 接入大模型自然语言问诊：新增 `server.js` 的 `/api/prescribe`，支持 OpenAI 兼容 `/chat/completions`（response_format=json_object），并用本地规则解析兜底；前端加输入框，将一句话解析为情绪/预算/热量并自动切方案。
9. 新增「处方笺海报」：前端 `renderRx()` 用 SVG 渲染处方笺，并支持一键导出 PNG（canvas 截图下载）。
10. 新增「麦脉深联动」：在 `server.js` 内实现轻量 Streamable HTTP MCP 客户端（ensureMcpSession/callMcp/extractJson），新增三个路由 `/api/mcp/campaigns`、`/api/mcp/coupons`、`/api/mcp/bind`（POST）；前端三枚按钮分别调用 `campaign-calendar`、`available-coupons`、`auto-bind-coupons`。本地以真实 MCP_TOKEN 验证：活动返回今日麦麦省炸鸡优惠、G-DRAGON 龙焰鸡腿堡三件套 26.9 元起等；可领券返回 11.9 元麦辣鸡腿堡、19.9 元王牌炸鸡任选 2、免费脆薯饼（均“可领取”）；一键领券成功写入 3 张券到账户。`auto-bind-coupons` 为真实账户动作，前端已加 confirm 二次确认。

## 复现提示

- 直接打开 `index.html` 即可体验演示。
- 在 WorkBuddy 中启用 `mcd-mcp` 后，让 AI 按 `MCP_INTEGRATION.md` 的调用链请求实时菜单、营养、优惠和价格。
- 录制演示时，建议展示“续命”和“轻盈”两种对比，再强调推荐不是直接下单，而是先解释、后确认。

## 后续可增强

- 增加地址/门店选择和多候选方案横向对比（当前深联动用默认门店/账户上下文）。
- 增加“聚餐模式”的人数、忌口和人均预算约束（已单列「社交」情绪，但还没有人数约束）。
- 将 `/api/mcp/*` 的返回进一步结构化为 `menuItems`、`nutrition`、`coupons`、`price`，让前端自动套用实时数据而非快照。
- 录制一段从自然语言问诊 → 处方笺海报 → 麦脉深联动领券的完整演示视频，作为参赛补充材料。
