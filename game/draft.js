/**
 * 选人阶段逻辑 —— 服务器权威
 */

const { generateDraftPool, PHASES, START_COINS, isPlayerTaken, ROSTER_SIZE } = require('./gameState');
const playersDB = require('../data/players');

// ROSTER_SIZE：每名玩家需选满的人数（=5），与 gameState 保持一致，避免硬编码漂移。

/**
 * 开始选人阶段：由 createRoom 在第二位玩家加入且房间人数达到 2 时调用。
 * 随机决定先手，生成第一轮候选池。
 */
function startDraft(room) {
  room.phase = PHASES.DRAFT;
  // 随机决定先手（0=A主机，1=B访客）
  const rand = cryptoRandom01();
  room.firstPlayerIndex = rand; // 0 或 1
  room.currentTurnIndex = room.firstPlayerIndex;
  room.roundNumber = 0;
  room.draftedIds = new Set();
  // 重新开始选人
  room.players[0].remainingCoins = START_COINS;
  room.players[1].remainingCoins = START_COINS;
  room.players[0].lineup = [];
  room.players[1].lineup = [];

  // 生成第一轮候选池
  regeneratePool(room);
}

// 导入 crypto.randomInt
const crypto = require('crypto');
function cryptoRandom01() {
  return crypto.randomInt(0, 2);
}

/**
 * 重新生成当前候选池（不改变轮次）。
 */
function regeneratePool(room) {
  room.currentPool = generateDraftPool(room);
}

/**
 * 玩家选人。
 * 返回 { success, error? }。成功时更新房间状态并推进回合。
 */
function handleSelect(room, playerIndex, playerId) {
  // 校验1：是否轮到该玩家
  if (room.currentTurnIndex !== playerIndex) {
    return { success: false, error: '还没轮到你选择' };
  }

  const player = room.players[playerIndex];
  if (!player) return { success: false, error: '玩家不存在' };

  // 校验2：球员数据是否存在 & 是否在当前候选池
  const target = room.currentPool.find(p => p.id === playerId);
  if (!target) {
    return { success: false, error: '球员不在当前候选池中' };
  }

  // 校验3：球员是否已被选择
  if (isPlayerTaken(room, playerId)) {
    return { success: false, error: '该球员已被选择' };
  }

  // 校验4：玩家金币是否足够
  if (target.cost > player.remainingCoins) {
    return { success: false, error: '金币不足' };
  }

  // 校验5：玩家阵容是否已满
  if (player.lineup.length >= ROSTER_SIZE) {
    return { success: false, error: '阵容已满' };
  }

  // 校验6（关键防卡死）：选完后剩余金币必须仍能补齐全员。
  // 选这一人后，还剩 needAfter = 5 - (lineup.length+1) 名球员要选，
  // 每名球员至少要 1 金币，因此剩余金币必须 >= needAfter，
  // 否则玩家将无法凑齐 5 人，绝对不允许发生。
  const newRemaining = player.remainingCoins - target.cost;
  const needAfter = Math.max(0, ROSTER_SIZE - (player.lineup.length + 1));
  if (newRemaining < needAfter) {
    return {
      success: false,
      error: `选下该球员后你只剩 ${newRemaining} 金币，将不足以补齐剩余 ${needAfter} 个位置（请保留至少 ${needAfter} 金币）`
    };
  }

  // 正式执行选择
  player.lineup.push({ player: target, pos: null });
  player.remainingCoins -= target.cost;
  room.draftedIds.add(playerId);

  // 从候选池移除该球员（实现“已被选择不能再进池”）
  room.currentPool = room.currentPool.filter(p => p.id !== playerId);

  room.roundNumber++;

  // 推进回合：跳过已完成阵容的玩家
  advanceTurn(room);

  return { success: true };
}

/**
 * 推进回合（自动跳过已完成阵容的玩家）。
 * 如果双方都完成 5 人，则进入 LINEUP 阶段。
 */
function advanceTurn(room) {
  const p0 = room.players[0];
  const p1 = room.players[1];
  const done0 = p0.lineup.length >= ROSTER_SIZE;
  const done1 = p1.lineup.length >= ROSTER_SIZE;

  // 双方都完成 -> 进入阵容调整阶段
  if (done0 && done1) {
    room.phase = PHASES.LINEUP;
    room.currentTurnIndex = null;
    return;
  }

  // 只轮流未完成的玩家
  if (done0) {
    room.currentTurnIndex = 1; // 只允许 1 选
  } else if (done1) {
    room.currentTurnIndex = 0;
  } else {
    // 正常轮流：下一个
    room.currentTurnIndex = room.currentTurnIndex === 0 ? 1 : 0;
  }

  // 25人一次性候选池固定不变，已经选择的球员在 handleSelect 中已从池中移除，
  // 因此这里不再重新生成候选池。
}

// 供调试/重建使用
function resetDraft(room) {
  startDraft(room);
}

module.exports = {
  startDraft,
  regeneratePool,
  handleSelect,
  advanceTurn,
};
