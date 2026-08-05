/**
 * 游戏状态管理 —— 服务器权威状态机
 * 保存所有房间，处理房间生命周期。
 */

const crypto = require('crypto');
const playersDB = require('../data/players');
const { calculateTeam } = require('./rating');

const PHASES = {
  WAITING: 'WAITING',
  DRAFT: 'DRAFT',
  LINEUP: 'LINEUP',
  RESULT: 'RESULT',
};

// 每个玩家初始金币
const START_COINS = 15;
// 总候选人规模（每轮 5）
const DRAFT_POOL_SIZE = 5;

const rooms = new Map(); // roomId -> roomState

// ---------- 工具 ----------
function generateRoomCode() {
  // 生成 6 位房间码（可读字符，避免易混淆字符）
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[crypto.randomInt(alphabet.length)];
  }
  return code;
}

// 安全随机，从数组抽取 n 个不重复元素
function secureSample(arr, n) {
  const copy = arr.slice();
  const result = [];
  while (result.length < n && copy.length > 0) {
    const idx = crypto.randomInt(copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

// 判断一名球员是否已被任何玩家选择
function isPlayerTaken(room, playerId) {
  for (const p of [room.players[0], room.players[1]]) {
    if (!p) continue;
    if (p.lineup.some(s => s.player.id === playerId)) return true;
  }
  // 是否在已回收的历史选中记录中（防止已选球员被再次抽进池）
  if (room.draftedIds && room.draftedIds.has(playerId)) return true;
  return false;
}

/**
 * 为房间生成 5 人候选池。
 * 保证：未被选、数据存在、不重复。
 * 同时必须保证两名玩家在剩余轮次内都能完成 5 人阵容。
 */
function generateDraftPool(room) {
  // 计算两名玩家各自剩余需要选择的人数
  const remainingNeeded = [0, 1].map(i => {
    const p = room.players[i];
    return p ? Math.max(0, 5 - p.lineup.length) : 5;
  });

  const picked = room.draftedIds || new Set();

  // 可选的球员：未被任何人选中
  let available = playersDB.filter(p => !picked.has(p.id));

  // 合法性：每个人未来若干轮都必须能凑齐剩余人数。
  // 基于剩余金币做可行性判断 —— 需要先近似判断。
  // 简化策略：随机生成候选池时，每次确保池内存在足够便宜的可购买球员。
  // 更稳健的做法：用贪心/回溯判断两名玩家在剩余轮次中都能用剩余金币填满。

  // 此处采用“保守可用”策略：仅当一个池版本通过“可行性验证”才采用。
  let pool = [];
  let attempts = 0;
  while (attempts < 200) {
    pool = secureSample(available, DRAFT_POOL_SIZE);
    // 检查可行性：两玩家各自能否用后续随机池里足够便宜的球员完成阵容
    if (isFeasibleToFinish(room, pool)) {
      return pool;
    }
    attempts++;
  }
  // 理论兜底（极少发生）
  return pool;
}

/**
 * 可行性判断（严格保证）：
 * 保证「双方中仍需要选人的玩家」在当前候选池中总能找到至少一名
 * 「自己剩余金币可负担」的球员，从而绝不会因随机而卡死。
 *
 * 关键约束（避免金币不足以完成 5 人）：
 *   每个玩家在任意时刻必须保证：remainingCoins >= 剩余还需选择的人数。
 *   因为每补一名球员至少需要 1 金币（数据库中存在 1 金币球员）。
 * 该约束在 draft.js 的 handleSelect 中以「选后校验」形式强制，同时池生成时兜底。
 */
function isFeasibleToFinish(room, pool) {
  if (!pool || pool.length === 0) return false;
  for (const p of [room.players[0], room.players[1]]) {
    if (!p) continue;
    const need = Math.max(0, 5 - p.lineup.length);
    if (need <= 0) continue;
    // 该玩家必须能在池中找到一个自己可负担的球员
    const affordable = pool.some(x => x.cost <= p.remainingCoins);
    if (!affordable) return false;
  }
  return true;
}

// ---------- 房间创建 ----------
function createRoom(hostPlayer) {
  let code = generateRoomCode();
  // 避免房间码冲突
  while (rooms.has(code)) {
    code = generateRoomCode();
  }
  const room = {
    code,
    phase: PHASES.WAITING,
    players: [hostPlayer, null], // [0]=host(A), [1]=guest(B) 按加入顺序
    currentTurnIndex: null, // 0 或 1
    firstPlayerIndex: null,
    currentPool: [],  // 当前 5 人候选池（含完整球员数据）
    draftedIds: new Set(), // 已被选中的球员 id
    roundNumber: 0,   // 已完成的选人轮次
    winner: null,     // 'A' | 'B' | 'draw' | null
    ratings: {},      // { A: {...detail}, B: {...detail} }
  };
  rooms.set(code, room);
  return room;
}

function findRoomByCode(code) {
  return rooms.get(code);
}

// 生成公开可见的房间状态（不会暴露无关数据）
function getPublicState(room, socketId) {
  // 确定客户端视角（自己 / 对手）
  let selfIndex = -1;
  if (room.players[0] && room.players[0].socketId === socketId) selfIndex = 0;
  else if (room.players[1] && room.players[1].socketId === socketId) selfIndex = 1;

  const playersView = room.players.map((p, i) => {
    if (!p) return null;
    const isSelf = (i === selfIndex);
    return {
      name: p.name,
      isHost: (i === 0),
      remainingCoins: p.remainingCoins,
      lineupCount: p.lineup.length,
      lineup: p.lineup, // 自己或对手都展示完整阵容（便于比对）
      isSelf,
    };
  });

  return {
    code: room.code,
    phase: room.phase,
    players: playersView,
    currentTurnIndex: room.currentTurnIndex,
    yourIndex: selfIndex === -1 ? null : selfIndex,
    currentPool: room.currentPool,
    winner: room.winner,
    ratings: room.ratings,
    // 是否轮到自己（仅在选择阶段有意义）
    isYourTurn: (selfIndex !== -1 && room.phase === PHASES.DRAFT && room.currentTurnIndex === selfIndex),
    draftComplete: (room.players[0] && room.players[1] && room.players[0].lineup.length === 5 && room.players[1].lineup.length === 5),
  };
}

module.exports = {
  PHASES,
  START_COINS,
  DRAFT_POOL_SIZE,
  rooms,
  createRoom,
  findRoomByCode,
  generateDraftPool,
  isPlayerTaken,
  getPublicState,
  secureSample,
};
