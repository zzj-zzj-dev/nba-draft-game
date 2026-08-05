/**
 * 阵容调整阶段逻辑 —— 服务器权威
 * 允许玩家把 5 名球员拖到 PG/SG/SF/PF/C 五个位置。
 */

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];

/**
 * 校验并更新玩家某一位置。
 * Action 类型：
 *  - 'place': 把 index 的球员放到 position（需该位置为空）
 *  - 'remove': 把某球员从位置上移除回待摆放
 *  - 'swap': 交换两个位置上的球员
 *
 * 客户端通过指定球员在阵容中的下标 + 目标位置来操作。
 * 这里设计为每个操作由服务器统一处理，避免非法拖拽。
 *
 * 参数：
 *  room, playerIndex, payload = {
 *    slotIndex: 球员在 lineup 中的下标（实际就是 player 的引用），
 *    pos: 目标位置 PG..C  或 null（表示移除）
 *  }
 */
function handlePlace(room, playerIndex, payload) {
  const player = room.players[playerIndex];
  if (!player) return { success: false, error: '玩家不存在' };
  if (room.phase !== 'LINEUP') return { success: false, error: '当前不是阵容调整阶段' };
  if (!payload || typeof payload.slotIndex !== 'number') {
    return { success: false, error: '非法操作' };
  }

  const slot = player.lineup[payload.slotIndex];
  if (!slot) return { success: false, error: '球员不存在' };

  const pos = payload.pos;
  if (pos === null || pos === undefined) {
    // 移除：清空该球员的位置
    slot.pos = null;
    return { success: true };
  }
  if (!POSITIONS.includes(pos)) {
    return { success: false, error: '非法位置' };
  }

  // 检查该位置是否被其他球员占据（且不是自己）
  const collidingIndex = player.lineup.findIndex(
    (s, i) => i !== payload.slotIndex && s.pos === pos
  );
  if (collidingIndex !== -1) {
    return { success: false, error: '该位置已被占用' };
  }

  // 放置
  slot.pos = pos;
  return { success: true };
}

/**
 * 交换两个位置的球员。
 */
function handleSwap(room, playerIndex, i, j) {
  const player = room.players[playerIndex];
  if (!player) return { success: false, error: '玩家不存在' };
  if (room.phase !== 'LINEUP') return { success: false, error: '当前不是阵容调整阶段' };

  const a = player.lineup[i], b = player.lineup[j];
  if (!a || !b) return { success: false, error: '球员不存在' };

  // 交换 pos
  const tmp = a.pos;
  a.pos = b.pos;
  b.pos = tmp;
  return { success: true };
}

/**
 * 确认阵容：所有 5 名球员都必须有明确位置。
 */
function lineupIsValid(lineup) {
  if (lineup.length !== 5) return false;
  const used = new Set();
  for (const slot of lineup) {
    if (!slot.pos || used.has(slot.pos)) return false;
    used.add(slot.pos);
  }
  // 五个位置必须齐全
  return used.size === 5;
}

/**
 * 当确认后会触发评分结算（在 server 层调用 rating）。
 */
module.exports = {
  POSITIONS,
  handlePlace,
  handleSwap,
  lineupIsValid,
};
