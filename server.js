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

      const guestPlayer = {
        socketId: socket.id,
        name: name || '玩家B',
        remainingCoins: gameState.START_COINS,
        lineup: [],
      };
      room.players[1] = guestPlayer;
      socket.join(room.code);
      socketRoomMap.set(socket.id, room.code);

      // 房间满 2 人 -> 开始选人
      draft.startDraft(room);

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

    // 标记断线方（保留房间，等待重连）
    if (room.players[0] && room.players[0].socketId === socket.id) {
      room.players[0].disconnected = true;
    }
    if (room.players[1] && room.players[1].socketId === socket.id) {
      room.players[1].disconnected = true;
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
function emitRoomState(roomCode) {
  const room = gameState.rooms.get(roomCode);
  if (!room) return;
  for (let i = 0; i < 2; i++) {
    const player = room.players[i];
    if (!player) continue;
    const view = gameState.getPublicState(room, player.socketId);
    io.to(room.code).emit('stateUpdate', view);
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
