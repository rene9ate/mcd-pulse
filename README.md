# 麦脉 Pulse：一餐的情绪处方

> McDonald's MCP × AI 创意开发大赛参赛作品

麦脉 Pulse 是一个“情绪处方型”麦当劳 AI 点餐助手：用户先告诉它今天的状态，再由 AI 结合实时菜单、餐品营养、门店可售、优惠券与价格计算，生成一份适合当下的麦当劳方案。

它不只回答“吃什么”，而是回答：**今天的我，需要怎样的一餐？**

## 核心体验

- **状态先行**：续命、放松、庆祝、轻盈、社交五种入口。
- **多目标平衡**：同时考虑口味场景、预算、热量和优惠。
- **实时可信**：设计上调用麦当劳 MCP 的菜单、详情、营养、优惠和价格工具，不使用过期菜单印象。
- **人类确认**：推荐只负责解释和计算，下单前保留用户确认、修改和拒绝权。
- **轻量可用**：当前仓库内含可直接打开的 `index.html` 展示原型；MCP 配置通过 WorkBuddy 连接器完成，不把 Token 写进代码。

## 快速体验

直接用浏览器打开 `index.html`，选择状态并点击“生成我的今日一餐”。当前网页已内置一次真实麦当劳 MCP 调用快照：门店为深圳同方信息港餐厅，套餐为麦辣鸡腿汉堡三件套，价格、营养与套餐组成均来自实时工具返回；门店券查询返回为空，已如实呈现。

真实 MCP 调用链：

1. `query-nearby-stores`：深圳南山区科技园，到店自取，返回门店 `1420762` 等。
2. `query-meals`：门店 `1420762` 可售菜单，拿到麦辣鸡腿汉堡三件套 `9900005456`。
3. `list-nutrition-foods`：麦辣鸡腿堡 485 kcal、中薯条 289 kcal、可乐中杯 147 kcal。
4. `query-store-coupons`：门店 `1420762` 当前无可用券（返回空）。
5. `calculate-price`：麦辣鸡腿汉堡三件套 ¥33.5，原价 ¥46.0，取餐方式含堂食/外带。
6. `query-meal-detail`：展开三件套默认搭配（麦辣鸡腿堡 + 中薯条 + 可乐中杯）。

## 本地运行（含自然语言问诊）

```bash
cd mcd-pulse
node server.js
# 打开 http://localhost:4173
```

- 在首页顶部“一句话描述你现在的状态”输入框，用大白话描述，例如“刚被老板骂了，又穷又饿”，麦脉会用 AI 解析成情绪/预算/热量并切到对应方案。
- 未配置大模型时，自动使用**本地规则解析**兜底，保证打开即可演示。
- 接入真实大模型：设置环境变量后重启即可，无需改代码：

```bash
export LLM_API_KEY=你的密钥
export LLM_BASE_URL=https://你的兼容OpenAI的接口地址
export LLM_MODEL=模型名
node server.js
```

后端 `/api/prescribe` 会返回 `{ mood, budget, calorie, reason, source }`，`source` 为 `model` 表示真实大模型、`heuristic` 表示本地规则。

## 在 WorkBuddy 中接入 MCP

1. 在 [open.mcd.cn/mcp](https://open.mcd.cn/mcp) 使用手机号登录并申请 MCP Token。
2. 在 WorkBuddy 的“连接器”中配置自定义 MCP：

```json
{
  "mcpServers": {
    "mcd-mcp": {
      "type": "streamablehttp",
      "url": "https://mcp.mcd.cn",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_TOKEN"
      }
    }
  }
}
```

3. 启用 `mcd-mcp`，使用本仓库中的 `workbuddy.md` 作为开发提示词和调试记录参考。

## 推荐调用链

1. `query-nearby-stores`：根据用户位置确定可用门店。
2. `query-meals`：获取该门店的实时可售菜单。
3. `list-nutrition-foods`：获取热量和营养信息。
4. `query-store-coupons` / `available-coupons`：获取可用优惠。
5. `calculate-price`：比较不同组合的总价、优惠和配送费。
6. 用户确认后，再由 `create-order` 创建订单；本作品不在未确认时下单。

## 项目结构

```text
index.html                 可直接运行的网页原型
MCP_INTEGRATION.md         麦当劳 MCP 工具、调用流程与安全边界
CONTEST_DECLARATION.md     官方参赛声明（内容不可修改）
workbuddy.md               WorkBuddy 开发对话记录与复现提示
```

## 录屏建议

1. 打开页面，展示“麦脉 / PULSE”首页。
2. 依次切换“需要续命”“想吃得轻盈”“和朋友分享”。
3. 点击“生成我的今日一餐”，展示推荐解释、热量、预计到手价和省下金额。
4. 点击“换一个方案”和“复制点单提示”，展示用户始终可以调整和确认。
5. 在 WorkBuddy 中展示 `mcd-mcp` 已启用，以及实际调用菜单/营养/优惠/价格工具的过程。

## 合规提示

本项目是参赛者独立开发的非官方作品。餐品、价格、优惠和供应状态必须以麦当劳官方渠道实时结果为准。请勿将真实 MCP Token 写入仓库、截图或录屏。
