/**
 * NBA 阵容对决联机游戏 —— 服务器入口
 * 使用 Express 提供静态文件，Socket.IO 处理实时对战。
 * 服务器权威模式：所有游戏逻辑都在这里验证并计算。
 */

const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const gameState = require('./game/gameState');
const draft = require('./game/draft');
const lineup = require('./game/lineup');
const rating = require('./game/rating');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// 静态文件
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 记录每个 socket 所在房间，用于断线重连
const socketRoomMap = new Map(); // socketId -> roomCode

// ========== Socket.IO 连接 ==========
io.on('connection', (socket) => {
  console.log(`[连接] ${socket.id} 已连接`);

  // ---- 创建房间 ----
  socket.on('createRoom', (playerName, cb) => {
    try {
      // 幂等：若该 socket 此前已属于某个「等待中」的房间并占着玩家位，
      // 先清理掉旧占位，避免同一 socket 多次创建/重建残留“假已满”。
      const prevRoomCode = socketRoomMap.get(socket.id);
      if (prevRoomCode) {
        const prevRoom = gameState.rooms.get(prevRoomCode);
        if (prevRoom && prevRoom.phase === gameState.PHASES.WAITING) {
          const idx = findPlayerIndex(prevRoom, socket.id);
          if (idx !== -1 && !prevRoom.players[1-idx]) {
            // 旧房间没有对手加入时，才清理本位的占位
            prevRoom.players[idx] = null;
          }
        }
      }

      const hostPlayer = {
        socketId: socket.id,
        name: playerName || '玩家A',
        remainingCoins: 0,
        lineup: [],
      };
      const room = gameState.createRoom(hostPlayer);
      socket.join(room.code);
      socketRoomMap.set(socket.id, room.code);
      // 进入 WAITING，但先初始化金币 0，等对手加入后再真正开始选人
      room.players[0].remainingCoins = gameState.START_COINS;
      respond(cb, { ok: true, code: room.code });
      emitRoomState(room.code);
    } catch (e) {
      console.error('[createRoom]', e);
      respond(cb, { ok: false, error: '创建房间失败' });
    }
  });

  // ---- 加入房间 ----
  socket.on('joinRoom', ({ code, name }, cb) => {
    try {
      const roomCode = (code || '').toString().trim().toUpperCase();
      const room = gameState.findRoomByCode(roomCode);
      if (!room) {
        return respond(cb, { ok: false, error: '房间不存在' });
      }
      // 检查人数：最多 2 名玩家
      if (room.players[0] && room.players[1]) {
        return respond(cb, { ok: false, error: '房间已满' });
      }
      if (room.phase !== gameState.PHASES.WAITING) {
        return respond(cb, { ok: false, error: '房间游戏已在进行中' });
      }
      if (room.players[0] && room.players[0].socketId === socket.id) {
        return respond(cb, { ok: false, error: '你已经在房间中' });
      }

      // 寻找可用的玩家位：若 players[0]（主机位）为空则优先补上，否则用 players[1]。
      // 这样即使创建者断线离开，房间也能被新加入者正常接管，不会出现“空主机”畸形态。
      const slotIndex = (room.players[0] == null) ? 0 : 1;
      const newPlayer = {
        socketId: socket.id,
        name: name || '玩家B',
        remainingCoins: gameState.START_COINS,
        lineup: [],
      };
      room.players[slotIndex] = newPlayer;
      socket.join(room.code);
      socketRoomMap.set(socket.id, room.code);

      // 两个有效玩家位都就位 -> 开始选人
      if (room.players[0] && room.players[1]) {
        draft.startDraft(room);
      }

      respond(cb, { ok: true, code: room.code });
      emitRoomState(room.code);
    } catch (e) {
      console.error('[joinRoom]', e);
      respond(cb, { ok: false, error: '加入房间失败' });
    }
  });

  // ---- 重新进入房间（断线重连） ----
  socket.on('rejoin', ({ code }, cb) => {
    try {
      const roomCode = (code || '').toString().trim().toUpperCase();
      const room = gameState.findRoomByCode(roomCode);
      if (!room) return respond(cb, { ok: false, error: '房间不存在' });

      // 1) 优先接回：找到该房间中标记为“已断线”的玩家位，把新的 socketId 接回该位置。
      let claimed = false;
      for (let i = 0; i < 2; i++) {
        const p = room.players[i];
        if (p && p.disconnected) {
          p.socketId = socket.id;
          p.disconnected = false;
          claimed = true;
          break;
        }
      }
      // 2) 若没有已断线占位，但房间仍在「等待加入」且有玩家空位，则把新 socket 占一个空位，
      //    使“创建者刷新后重新进入”也能恢复身份。
      if (!claimed && room.phase === gameState.PHASES.WAITING) {
        for (let i = 0; i < 2; i++) {
          if (room.players[i] == null) {
            room.players[i] = {
              socketId: socket.id,
              name: (i === 0 ? '玩家A' : '玩家B'),
              remainingCoins: gameState.START_COINS,
              lineup: [],
            };
            claimed = true;
            break;
          }
        }
      }
      socket.join(room.code);
      socketRoomMap.set(socket.id, room.code);
      respond(cb, { ok: true, code: room.code });
      emitRoomState(room.code);
    } catch (e) {
      console.error('[rejoin]', e);
      respond(cb, { ok: false, error: '重连失败' });
    }
  });

  // ---- 选人 ----
  socket.on('selectPlayer', (playerId, cb) => {
    const room = resolveRoom(socket);
    if (!room) return respond(cb, { ok: false, error: '你不在房间中' });

    const playerIndex = findPlayerIndex(room, socket.id);
    if (playerIndex === -1) return respond(cb, { ok: false, error: '未找到你的角色' });

    // 去重：同一 socket 连续点击，服务器只成功一次（handleSelect 内部会校验）
    const result = draft.handleSelect(room, playerIndex, playerId);
    if (!result.success) {
      respond(cb, { ok: false, error: result.error });
    } else {
      respond(cb, { ok: true });
    }
    emitRoomState(room.code);
  });

  // ---- 阵容摆放 ----
  socket.on('placePlayer', (payload, cb) => {
    const room = resolveRoom(socket);
    if (!room) return respond(cb, { ok: false, error: '你不在房间中' });
    const playerIndex = findPlayerIndex(room, socket.id);
    if (playerIndex === -1) return respond(cb, { ok: false, error: '未找到你的角色' });

    const result = lineup.handlePlace(room, playerIndex, payload);
    if (!result.success) {
      respond(cb, { ok: false, error: result.error });
    } else {
      respond(cb, { ok: true });
    }
    emitRoomState(room.code);
  });

  // ---- 交换位置 ----
  socket.on('swapPlayers', ({ i, j }, cb) => {
    const room = resolveRoom(socket);
    if (!room) return respond(cb, { ok: false, error: '你不在房间中' });
    const playerIndex = findPlayerIndex(room, socket.id);
    if (playerIndex === -1) return respond(cb, { ok: false, error: '未找到你的角色' });

    const result = lineup.handleSwap(room, playerIndex, i, j);
    if (!result.success) {
      respond(cb, { ok: false, error: result.error });
    } else {
      respond(cb, { ok: true });
    }
    emitRoomState(room.code);
  });

  // ---- 确认阵容 & 结算 ----
  socket.on('submitLineup', (cb) => {
    const room = resolveRoom(socket);
    if (!room) return respond(cb, { ok: false, error: '你不在房间中' });
    const playerIndex = findPlayerIndex(room, socket.id);
    if (playerIndex === -1) return respond(cb, { ok: false, error: '未找到你的角色' });
    if (room.phase !== gameState.PHASES.LINEUP) {
      return respond(cb, { ok: false, error: '当前不是阵容调整阶段' });
    }

    const player = room.players[playerIndex];
    if (!lineup.lineupIsValid(player.lineup)) {
      return respond(cb, { ok: false, error: '请先为5名球员安排好5个位置' });
    }

    // 标记该玩家已确认
    player.submitted = true;
    respond(cb, { ok: true });
    emitRoomState(room.code);

    // 双方都确认 -> 结算
    if (room.players[0].submitted && room.players[1].submitted) {
      settleMatch(room);
      emitRoomState(room.code);
    }
  });

  // ---- 重新开局（同一房间再来一局） ----
  socket.on('rematch', () => {
    const room = resolveRoom(socket);
    if (!room) return;
    // 清空并重新开始选人，保持两名玩家
    room.players[0].submitted = false;
    room.players[1].submitted = false;
    room.players[0].lineup = [];
    room.players[1].lineup = [];
    room.players[0].remainingCoins = gameState.START_COINS;
    room.players[1].remainingCoins = gameState.START_COINS;
    room.winner = null;
    room.ratings = {};
    draft.startDraft(room);
    emitRoomState(room.code);
  });

  // ---- 请求当前状态 ----
  socket.on('getState', (cb) => {
    const room = resolveRoom(socket);
    if (!room) return respond(cb, { ok: false, error: '你不在房间中' });
    respond(cb, { ok: true, state: gameState.getPublicState(room, socket.id) });
  });

  // ---- 断线 ----
  socket.on('disconnect', () => {
    console.log(`[断线] ${socket.id}`);
    const roomCode = socketRoomMap.get(socket.id);
    if (!roomCode) return;
    const room = gameState.rooms.get(roomCode);
    if (!room) return;

    // 若仍在「等待加入」阶段：彻底释放该玩家位，避免“假已满”/占位残留。
    // 创建者(A)刷新页面或重连时，其旧占位会被清空，其他人可正常加入。
    if (room.phase === gameState.PHASES.WAITING) {
      const idx = findPlayerIndex(room, socket.id);
      if (idx !== -1) {
        room.players[idx] = null;
      }
    } else {
      // 对局中：标记断线，等待重连
      if (room.players[0] && room.players[0].socketId === socket.id) {
        room.players[0].disconnected = true;
      }
      if (room.players[1] && room.players[1].socketId === socket.id) {
        room.players[1].disconnected = true;
      }
    }
    socketRoomMap.delete(socket.id);
    emitRoomState(room.code);
  });
});

// ========== 辅助函数 ==========

// 统一 callback 响应
function respond(cb, data) {
  if (typeof cb === 'function') {
    try { cb(data); } catch (e) {}
  }
}

// 根据 socketId 找到房间
function resolveRoom(socket) {
  const roomCode = socketRoomMap.get(socket.id);
  if (!roomCode) return null;
  return gameState.rooms.get(roomCode);
}

// 找到玩家在房间 players 数组中的下标
function findPlayerIndex(room, socketId) {
  if (room.players[0] && room.players[0].socketId === socketId) return 0;
  if (room.players[1] && room.players[1].socketId === socketId) return 1;
  return -1;
}

// 广播房间状态给房间内两个玩家
// 注意：每个玩家的状态（视角）必须只发给该玩家自己，绝不能广播给整个房间！
// 若用 io.to(room.code).emit 会把不同视角的状态同时发给所有人，后者覆盖前者，
// 导致两个客户端最终看到同一份视角，两个玩家就变成“同一个人”。
function emitRoomState(roomCode) {
  const room = gameState.rooms.get(roomCode);
  if (!room) return;
  for (let i = 0; i < 2; i++) {
    const player = room.players[i];
    if (!player) continue;
    const view = gameState.getPublicState(room, player.socketId);
    // 只发给该玩家自己的 socket，而不是整个房间
    io.to(player.socketId).emit('stateUpdate', view);
  }
}

// ========== 结算 ==========
function settleMatch(room) {
  const pA = room.players[0];
  const pB = room.players[1];

  // 用当前位置安排计算有效阵容（lineup 中 slot.pos 已确定）
  const lineupA = pA.lineup.map(slot => ({ player: slot.player, pos: slot.pos }));
  const lineupB = pB.lineup.map(slot => ({ player: slot.player, pos: slot.pos }));

  const ratingA = rating.calculateTeam(lineupA);
  const ratingB = rating.calculateTeam(lineupB);

  room.ratings = {
    A: ratingA,
    B: ratingB,
  };

  // 判定胜负
  if (ratingA.final > ratingB.final) room.winner = 'A';
  else if (ratingB.final > ratingA.final) room.winner = 'B';
  else room.winner = 'draw';

  room.phase = gameState.PHASES.RESULT;
}

// ========== 启动 ==========
server.listen(PORT, () => {
  console.log(`NBA阵容对决游戏服务器已启动: http://localhost:${PORT}`);
});
