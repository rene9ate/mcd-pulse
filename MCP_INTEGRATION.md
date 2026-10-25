# 麦当劳 MCP 集成说明

## 1. 项目使用的 MCP Server

- 服务：麦当劳中国 MCP Server
- 接入地址：`https://mcp.mcd.cn`
- 协议：Streamable HTTP
- 认证：请求头 `Authorization: Bearer <MCP_TOKEN>`
- 客户端：WorkBuddy 自定义连接器 `mcd-mcp`

真实 Token 仅应保存在 WorkBuddy 连接器配置中，本仓库不保存 Token。

## 2. 实际使用的 Tools

| Tool | 作用 | 在麦脉中的位置 |
|---|---|---|
| `query-nearby-stores` | 查询用户地址附近可用门店 | 确定可用菜单和履约门店 |
| `query-meals` | 查询当前门店可售餐品 | 生成候选餐品集合 |
| `query-meal-detail` | 查询套餐组成和可替换项 | 展开套餐并做组合优化 |
| `list-nutrition-foods` | 查询能量、蛋白质、脂肪、碳水、钠等 | 热量和营养约束 |
| `query-store-coupons` | 查询当前门店可用优惠券 | 计算真实优惠 |
| `available-coupons` | 查询可领取的麦麦省优惠券 | 发现更省方案 |
| `calculate-price` | 计算商品金额、配送费、优惠和应付总价 | 对候选方案排序 |
| `create-order` | 用户确认后的订单创建 | 最终执行动作，必须二次确认 |

## 3. 调用流程

```text
用户选择状态 / 预算 / 热量偏好
        ↓
query-nearby-stores
        ↓
query-meals + query-meal-detail
        ↓
list-nutrition-foods
        ↓
query-store-coupons + available-coupons
        ↓
calculate-price（对多个组合进行比较）
        ↓
AI 解释：为什么适合、热量、价格、节省金额
        ↓
用户确认 / 修改
        ↓
create-order（仅在明确确认后）
```

## 4. AI 推荐逻辑

麦脉将用户输入转成四类约束：

1. **情绪/场景**：续命、放松、庆祝、轻盈、社交。
2. **预算**：例如 ¥35 以内。
3. **热量**：例如 500 kcal 以内或 650 kcal 左右。
4. **可用性与优惠**：只推荐当前门店可售且能通过 `calculate-price` 验证价格的组合。

排序优先级：

- 首先满足用户明确的热量和预算硬约束；
- 其次最大化场景匹配度和口味多样性；
- 最后比较优惠后应付价格；
- 如果无完全满足的组合，要明确说明偏离项，不伪装成精确满足。

## 5. 安全和用户确认

- 不在前端、仓库、README、截图中暴露 Token。
- 不在用户没有明确确认时调用 `create-order`。
- 推荐结果展示“预计/实时返回”边界，价格、库存、优惠以官方实时结果为准。
- 页面演示数据仅用于无 Token 时的界面体验；接入 MCP 后应替换为实时返回。
- 任何营养信息仅供参考，不构成医疗或专业营养建议。

## 6. 错误处理

- `401`：提示重新检查 Token 和连接器启用状态。
- `429`：降低请求频率，优先复用当前会话的菜单、营养和优惠结果。
- 门店无货或工具返回空结果：给出“换门店/换方案”选项，不自行猜测商品状态。
