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

## 复现提示

- 直接打开 `index.html` 即可体验演示。
- 在 WorkBuddy 中启用 `mcd-mcp` 后，让 AI 按 `MCP_INTEGRATION.md` 的调用链请求实时菜单、营养、优惠和价格。
- 录制演示时，建议展示“续命”和“轻盈”两种对比，再强调推荐不是直接下单，而是先解释、后确认。

## 后续可增强

- 增加真实 MCP 响应适配层，将工具返回统一为 `menuItems`、`nutrition`、`coupons`、`price` 数据结构。
- 增加地址/门店选择和多候选方案横向对比。
- 增加“聚餐模式”的人数、忌口和人均预算约束。
- 使用真实工具调用录制一段从门店查询到价格计算的演示视频。
