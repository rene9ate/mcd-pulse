// 麦脉 Pulse · 后端：自然语言问诊 + 麦当劳 MCP 实时联动
// 零依赖 Node.js 服务。
// 环境变量：
//   LLM_API_KEY / LLM_BASE_URL / LLM_MODEL  -> 接入真实大模型（可选）
//   MCP_TOKEN                                 -> 接入真实麦当劳 MCP（可选，用于活动/券/领券）
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4173;
const ROOT = __dirname;
const MCP_BASE = process.env.MCP_BASE_URL || 'https://mcp.mcd.cn';

const MOODS = ['续命','放松','庆祝','轻盈','社交','社恐专属','深夜emo','减肥第一天','钱包在减肥','暴风吸入','假装很健康','周一崩溃'];
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.md':'text/markdown; charset=utf-8', '.json':'application/json; charset=utf-8' };

function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'application/json; charset=utf-8' });
  res.end(body);
}

function serveStatic(req, res) {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT)) return send(res, 403, 'forbidden');
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, 'not found', 'text/plain; charset=utf-8');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

// —— 本地规则解析（兜底） ——
function heuristic(text) {
  const t = text.toLowerCase();
  const has = (...kw) => kw.some(k => t.includes(k));
  let mood = '续命', budget = 50, calorie = 650, reason = '根据你的描述，先给你一个稳妥的续命方案。';
  if (has('社恐','社死','不想说话','自闭')) { mood = '社恐专属'; reason = '你想少点社交、拿了就走，社恐专属最合适。'; }
  else if (has('emo','深夜','失眠','难过','哭','失恋','伤心','丧')) { mood = '深夜emo'; reason = '深夜情绪需要一点甜一点苦，先接住你。'; }
  else if (has('穷','没钱','钱包','省','抠','预算','花呗','吃土')) { mood = '钱包在减肥'; budget = 35; reason = '钱包在减肥，那就用最低成本把馋虫按住。'; }
  else if (has('第一天','开始减肥','立flag','flag')) { mood = '减肥第一天'; calorie = 500; reason = '减肥第一天，希望要保持住。'; }
  else if (has('减肥','轻','健康','热量','胖','健身','控糖')) { mood = '轻盈'; calorie = 500; reason = '想吃得轻一点，热量压到 500 左右。'; }
  else if (has('庆祝','开心','赢','生日','快乐','值得','升职','脱单')) { mood = '庆祝'; budget = 80; reason = '有好事发生，值得加点量。'; }
  else if (has('朋友','聚会','分享','多人','团建','聚餐','闺蜜','兄弟')) { mood = '社交'; budget = 80; reason = '多人场景，把菜单变成一张桌子。'; }
  else if (has('暴风','猛吃','饿死','大吃','狂吃','饿疯')) { mood = '暴风吸入'; budget = 80; calorie = 900; reason = '饥饿暴动，三分钟解决战斗。'; }
  else if (has('周一','老板','上班','工作','加班','赶','累','困','续命','饿','忙')) { mood = '周一崩溃'; reason = '被生活压住，用扎实的一餐扛住。'; }
  else if (has('假装','养生','人设','自律')) { mood = '假装很健康'; reason = '点了“养生组合”，心理先健康起来。'; }
  else if (has('放松','休息','躺','摸鱼','舒服','慢')) { mood = '放松'; reason = '今天不需要效率，给自己一个缓冲区。'; }
  return { mood, budget, calorie, reason, source: 'heuristic' };
}

// —— 真实大模型解析（配置 LLM_* 后启用） ——
async function llmPrescribe(text) {
  const key = process.env.LLM_API_KEY;
  const base = (process.env.LLM_BASE_URL || '').replace(/\/$/, '');
  const model = process.env.LLM_MODEL;
  if (!key || !base || !model) return null;
  const sys = `你是“麦脉 Pulse”情绪点餐助手。用户用一句话描述状态，请输出 JSON：{"mood":str,"budget":int,"calorie":int,"reason":str}。
mood 必须是以下之一：${MOODS.join('、')}。
budget 只能是 35、50、80（单位元）。
calorie 只能是 500、650、900（kcal 档位）。
reason 用中文，30 字内解释你为什么这样判断。只输出 JSON，不要其他内容。`;
  const r = await fetch(base + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify({ model, temperature: 0.3, response_format: { type: 'json_object' }, messages: [
      { role: 'system', content: sys },
      { role: 'user', content: text }
    ] })
  });
  if (!r.ok) throw new Error('LLM HTTP ' + r.status);
  const j = await r.json();
  const content = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
  if (!content) throw new Error('empty LLM response');
  const parsed = JSON.parse(content);
  if (!MOODS.includes(parsed.mood)) parsed.mood = '续命';
  if (![35,50,80].includes(parsed.budget)) parsed.budget = 50;
  if (![500,650,900].includes(parsed.calorie)) parsed.calorie = 650;
  parsed.source = 'model';
  return parsed;
}

// —— 轻量麦当劳 MCP 客户端（Streamable HTTP） ——
function extractJson(text) {
  try { return JSON.parse(text); } catch (e) {}
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.startsWith('data:')) {
      try { return JSON.parse(line.slice(5).trim()); } catch (e) {}
    }
  }
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (e) {} }
  return null;
}

let mcpHeaders = null;
async function ensureMcpSession() {
  if (mcpHeaders) return mcpHeaders;
  const token = process.env.MCP_TOKEN;
  if (!token) throw new Error('未配置 MCP_TOKEN，无法调用真实麦当劳 MCP');
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    Authorization: 'Bearer ' + token
  };
  const initRes = await fetch(MCP_BASE, {
    method: 'POST', headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'maipulse', version: '1.0.0' } } })
  });
  const sid = initRes.headers.get('mcp-session-id');
  if (sid) headers['mcp-session-id'] = sid;
  extractJson(await initRes.text());
  await fetch(MCP_BASE, { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) });
  mcpHeaders = headers;
  return headers;
}

async function callMcp(tool, args) {
  const headers = await ensureMcpSession();
  const res = await fetch(MCP_BASE, {
    method: 'POST', headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: tool, arguments: args || {} } })
  });
  const text = await res.text();
  const json = extractJson(text);
  let content = json;
  if (json && json.result && Array.isArray(json.result.content)) {
    content = json.result.content.map(c => (c.text || (c.resource && c.resource.text) || '')).join('\n');
  }
  return { content, raw: json };
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/prescribe') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const { text } = JSON.parse(body || '{}');
        if (!text || !text.trim()) return send(res, 400, JSON.stringify({ error: 'text required' }));
        let data = await llmPrescribe(text).catch(() => null);
        let source = 'model';
        if (!data) { data = heuristic(text); source = 'heuristic'; }
        send(res, 200, JSON.stringify({ ...data, source }));
      } catch (e) {
        const fb = heuristic((JSON.parse(body || '{}').text) || '');
        send(res, 200, JSON.stringify({ ...fb, source: 'heuristic', note: String(e) }));
      }
    });
    return;
  }

  // 更深 MCP 联动（读活动 / 查券 / 一键领券）
  const mcpRoute = (path, tool, method) =>
    req.url === path && (method === undefined || req.method === method);

  if (mcpRoute('/api/mcp/campaigns')) {
    callMcp('campaign-calendar', {}).then(r => send(res, 200, JSON.stringify({ tool: 'campaign-calendar', ...r })))
      .catch(e => send(res, 200, JSON.stringify({ error: String(e) })));
    return;
  }
  if (mcpRoute('/api/mcp/coupons')) {
    callMcp('available-coupons', {}).then(r => send(res, 200, JSON.stringify({ tool: 'available-coupons', ...r })))
      .catch(e => send(res, 200, JSON.stringify({ error: String(e) })));
    return;
  }
  if (mcpRoute('/api/mcp/bind', 'POST')) {
    callMcp('auto-bind-coupons', {}).then(r => send(res, 200, JSON.stringify({ tool: 'auto-bind-coupons', ...r })))
      .catch(e => send(res, 200, JSON.stringify({ error: String(e) })));
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  const llm = !!(process.env.LLM_API_KEY && process.env.LLM_BASE_URL && process.env.LLM_MODEL);
  const mcp = !!process.env.MCP_TOKEN;
  console.log('麦脉 Pulse → http://localhost:' + PORT + (llm ? '（已接入大模型）' : '（本地规则兜底）') + (mcp ? '（已接入麦当劳 MCP）' : '（未配置 MCP_TOKEN）'));
});
