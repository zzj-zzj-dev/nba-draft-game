# 🏀 NBA 战术阵容对决 1v1

服务器权威的实时联机对战小游戏：**不在同一局域网也能玩**，部署到公网后任何人通过网址即可对战。

- **模式**：服务器权威判赛（客户端只负责渲染，不计算关键结果）
- **官方推荐部署**：Render / Railway / Fly.io / Cloud Run（免费额度内可用）

---

## 目录
- [本地运行](#本地运行)
- [免费部署到公网（推荐 Render）](#免费部署到公网推荐-render)
- [部署到其他平台](#部署到其他平台)
- [玩法说明](#玩法说明)

---

## 本地运行

```bash
npm install
npm start
# 浏览器打开 http://localhost:3000
```

同一局域网内，另一个人访问你的局域网 IP（如 `http://192.168.1.10:3000`）即可加入。

---

## 免费部署到公网（推荐 Render）

**无需开电脑、无需自己买服务器，部署后得到一个永久公网网址，任何人随时可玩。**

### 方法一：网页直接部署（最快）
1. 前往 [https://render.com](https://render.com) 注册（GitHub 登录即可）。
2. 点 **New → Web Service**，连你的 GitHub 仓库。
3. 选这个仓库；若无仓库，可把整个项目文件夹上传。
4. 关键配置（已通过 `render.yaml` / `Procfile` 预置）：
   - **Runtime**：Node
   - **Build Command**：`npm install`
   - **Start Command**：`node server.js`
   - **Instance Type**：Free
5. 点 **Deploy**。等 1~2 分钟完成部署。
6. 完成后会得到一个公网地址，形如 `https://nba-draft-game.onrender.com`。把 `https://nba-draft-game.onrender.com` 发给朋友就能玩。

> 💡 本项目已包含 `render.yaml`，Render 会自动读取，你只需创建服务即可。

### 方法二：命令行（render.yaml 蓝本）
```bash
# 安装 render CLI 后，在项目根目录执行
render blueprint launch
```

---

## 部署到其他平台

代码是标准 Node 应用，端口自动读取 `process.env.PORT`，可部署到几乎所有 Node 平台：

| 平台 | 免费额度 | 说明 |
|---|---|---|
| **Railway** | 有 | 连仓库 → `npm install` → `npm start` |
| **Fly.io** | 有 | `fly launch`，选 `PORT` 环境变量即可 |
| **Cloud Run** | 有 | 用 `Dockerfile` 或 Google Buildpacks 一键部署 |

> ⚠️ 不建议用 **Vercel / Netlify**：它们不支 Socket.IO 长连接服务器。

---

## 玩法说明

1. **建房**：A 点「创建房间」获得 6 位房间码。
2. **加入**：B 输入房间码加入。
3. **选人**：2 人各 15 金币，每轮从 5 名候选中选 1，轮流抽选（随机先后手），共选 5 名。
4. **布阵**：把 5 名球员拖到 **PG/SG/SF/PF/C** 五个位置（同一位置只能放 1 人）。
5. **结算**：双方确认后，服务器按 17 项评分公式判定胜负，并展示完整计算明细。

---

## 技术栈
- **后端**：Node.js + Express + Socket.IO（服务器权威）
- **前端**：原生 HTML/CSS/JS（Socket.IO-client）
- **数据**：54 名真实 NBA 球员（多年代、各位置、成本 1–5）

## 目录结构
```
server.js              # 入口：HTTP + Socket.IO，判赛逻辑
game/rating.js         # 17 项评分体系（位置适配/球权/协同/完整性…）
game/gameState.js      # 房间状态机 + 候选池随机
game/draft.js          # 选人轮流与合法性 + 防卡死校验
game/lineup.js         # 5 位置摆放/交换/校验
data/players.js        # 球员库
public/                # 前端页面
