/**
 * 客户端逻辑
 * 只负责：显示状态、发送操作请求、渲染服务器返回的状态。
 * 绝不在客户端计算/判定任何关键游戏结果。
 */

const socket = io();

// ---------- 状态 & 缓存 ----------
let me = { index: null, name: '' };
let opponent = { index: null, name: '' };
let currentState = null;
let myRoomCode = null;

// 防重复：记录近期已发出的操作，防止连点
let lastActionTime = 0;

// ---------- DOM 引用 ----------
const $ = (id) => document.getElementById(id);
const screens = {
  home: $('homeScreen'),
  wait: $('waitScreen'),
  game: $('gameScreen'),
};

// ========== 页面导航 ==========
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  screens[name].classList.remove('hidden');
}

// ========== Toast ==========
let toastTimer = null;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2500);
}

// ========== 首页事件 ==========
$('createBtn').addEventListener('click', () => {
  const name = $('createName').value.trim();
  socket.emit('createRoom', name, (res) => {
    if (res.ok) {
      myRoomCode = res.code;
      $('waitRoomCode').textContent = res.code;
      showScreen('wait');
      $('waitStatus').textContent = '等待另一位玩家加入……';
    } else {
      $('homeMsg').textContent = '创建失败：' + res.error;
    }
  });
});

$('joinBtn').addEventListener('click', () => {
  const code = $('joinCode').value.trim().toUpperCase();
  const name = $('joinName').value.trim();
  if (!code) return $('homeMsg').textContent = '请输入房间码';
  socket.emit('joinRoom', { code, name }, (res) => {
    if (res.ok) {
      myRoomCode = res.code;
    } else {
      $('homeMsg').textContent = '加入失败：' + res.error;
    }
  });
});

$('copyCodeBtn').addEventListener('click', () => {
  const code = $('waitRoomCode').textContent;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(() => toast('房间码已复制')).catch(() => toast(code));
  } else {
    toast(code);
  }
});

$('backHomeBtn').addEventListener('click', () => {
  showScreen('home');
});

// ========== 玩家属性浮窗（右键长按查看） ==========
function showPlayerDetail(player, posFit) {
  const content = $('playerDetailContent');
  const attrLabels = {
    SC:'综合得分', FIN:'篮下终结', MID:'中投', THREE:'三分', DRV:'突破',
    BH:'持球', ISO:'单打', PM:'组织', PASS:'传球', OFF:'无球', GRV:'进攻牵制力',
    PD:'外线防守', ID:'内线防守', RIM:'护框', REB:'篮板', ATH:'运动能力', USG:'球权需求', LEAD:'领导力'
  };
  let html = `
    <div class="pd-head">
      <h2>${player.name}</h2>
      <div class="pmeta">${player.year} · ${player.team}</div>
      <div>位置：${player.positions.join('/')} | 价格：${player.cost}金币</div>
      ${posFit != null ? `<div style="color:#ffd54d">位置适配：${posFit.toFixed(2)}</div>` : ''}
    </div>
  `;
  const attrs = ['SC','FIN','MID','THREE','DRV','BH','ISO','PM','PASS','OFF','GRV','PD','ID','RIM','REB','ATH','USG','LEAD'];
  attrs.forEach(k => {
    const v = player[k] || 0;
    html += `
      <div class="stat-row">
        <div class="stat-name">${attrLabels[k]}</div>
        <div style="color:#fff">${v}</div>
      </div>
      <div class="stat-bar"><div class="fill" style="width:${v}%"></div></div>
    `;
  });
  content.innerHTML = html;
  $('playerDetailPopup').classList.remove('hidden');
}

function hidePlayerDetail() {
  $('playerDetailPopup').classList.add('hidden');
}

$('popupClose').addEventListener('click', hidePlayerDetail);
// 关闭浮窗
$('playerDetailPopup').addEventListener('mousedown', (e) => { if (e.target.id === 'playerDetailPopup') hidePlayerDetail(); });

// ========== 通用：创建球员卡片 DOM ==========
function createPlayerCard(player, opts) {
  const { selectable, disabled, unaffordable, onClick, onSelect } = opts;
  const card = document.createElement('div');
  card.className = 'player-card';
  if (disabled) card.classList.add('disabled');
  if (unaffordable) card.classList.add('unaffordable');
  if (selectable) card.classList.add('available');

  card.innerHTML = `
    <div class="avatar">🏀</div>
    <div class="pname">${player.name}</div>
    <div class="pmeta">${player.year} · ${player.team}</div>
    <div>${player.positions.map(p => `<span class="ppos">${p}</span>`).join('')}</div>
    <div class="pcost">${player.cost} 金币</div>
  `;

  if (selectable && onSelect) {
    const btn = document.createElement('button');
    btn.className = 'select-btn';
    btn.textContent = '选择';
    btn.addEventListener('click', () => { if (!disabled) onSelect(); });
    card.appendChild(btn);
  }

  // 右键长按查看属性（桌面）
  if (window.innerWidth > 768) {
    let detailTimer = null;
    card.addEventListener('contextmenu', (e) => { e.preventDefault(); });
    card.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        detailTimer = setTimeout(() => {
          if (opts.posFit != null) showPlayerDetail(player, opts.posFit);
          else showPlayerDetail(player, null);
        }, 500);
      }
    });
    card.addEventListener('mouseup', () => { clearTimeout(detailTimer); });
    card.addEventListener('mouseleave', () => { clearTimeout(detailTimer); });
    card.addEventListener('mouseup', (e) => { if (e.button === 2) { /* 松开右键立即关闭 */ } });
  }

  if (onClick) card.addEventListener('click', onClick);
  return card;
}

// ========== 渲染：迷你阵容 ==========
function renderMiniRoster(container, lineup) {
  container.innerHTML = '';
  (lineup || []).slice(0, 5).forEach(slot => {
    const c = document.createElement('div');
    c.className = 'mini-card';
    const name = slot.player ? slot.player.name : '?';
    const pos = slot.pos || '待定';
    c.innerHTML = `<span>${name}</span> <small>${pos}</small>`;
    container.appendChild(c);
  });
}

// ========== 渲染：选人池 ==========
function renderDraftPool(pool, isMyTurn, myCoins) {
  const container = $('draftPool');
  container.innerHTML = '';
  if (!pool || !pool.length) {
    container.innerHTML = '<p>候选池生成中……</p>';
    return;
  }

  const my = getMe();
  const myLineupCount = my ? my.lineupCount : 0;
  const needMore = 5 - myLineupCount; // 我还能选几个（用于提前判断）

  pool.forEach(player => {
    const unaffordable = player.cost > myCoins;
    const canSelect = isMyTurn && !unaffordable && needMore > 0;
    const card = createPlayerCard(player, {
      selectable: true,
      disabled: !canSelect,
      unaffordable,
      onSelect: () => {
        if (!isMyTurn) return toast('还没轮到你选择');
        if (player.cost > myCoins) return toast('金币不足');
        if (needMore <= 0) return toast('你的阵容已满');
        debounceAction(() => socket.emit('selectPlayer', player.id, (res) => {
          if (!res.ok) toast(res.error);
          else toast(`你选择了 ${player.name}`);
        }));
      },
    });
    container.appendChild(card);
  });

  const note = $('draftNote');
  if (isMyTurn) {
    note.textContent = `轮到你选择！剩余金币：${myCoins}`;
  } else {
    const opp = getOpponent();
    note.textContent = opp && opp.name ? `等待 ${opp.name} 选择……` : '等待对手选择……';
  }
}

// ========== 渲染：阵容调整阶段 ==========
let draggingIndex = null;

function renderLineup() {
  const my = getMe();
  if (!my) return;
  const myLineup = my.lineup; // [{player, pos}]

  // 我的待摆放区（未分配位置的球员）
  const bench = $('myBench');
  bench.innerHTML = '';
  myLineup.forEach((slot, idx) => {
    if (slot.pos) return; // 已分配位置的不在替补区
    const card = createBenchPlayerCard(slot.player, idx);
    bench.appendChild(card);
  });

  // 五个位置
  ['PG','SG','SF','PF','C'].forEach(pos => {
    const dropEl = document.querySelector(`.pos-drop[data-pos="${pos}"]`);
    dropEl.innerHTML = '';
    const slot = myLineup.find(s => s.pos === pos);
    if (slot) {
      const card = createBenchPlayerCard(slot.player, myLineup.indexOf(slot));
      card.classList.add('placed-card');
      dropEl.appendChild(card);
    } else {
      dropEl.innerHTML = '<div style="color:rgba(255,255,255,0.5);font-size:13px;text-align:center;line-height:120px;">拖到这里</div>';
    }
  });
}

function createBenchPlayerCard(player, idx) {
  const card = document.createElement('div');
  card.className = 'bench-card';
  card.draggable = true;
  card.innerHTML = `
    <div class="avatar" style="width:44px;height:44px;font-size:20px;border-radius:50%;background:linear-gradient(135deg,#0d9488,#ffd54d);margin:0 auto 6px;display:flex;align-items:center;justify-content:center;">🏀</div>
    <div style="font-weight:700">${player.name}</div>
    <div style="font-size:12px;color:#9fb3c8">${player.positions.join('/')} · ${player.cost}金币</div>
  `;
  // 拖拽起点
  card.addEventListener('dragstart', (e) => {
    draggingIndex = idx;
    card.classList.add('dragging');
    e.dataTransfer.setData('text/plain', String(idx));
  });
  card.addEventListener('dragend', () => { card.classList.remove('dragging'); });

  // 右键长按看属性
  card.addEventListener('contextmenu', (e) => e.preventDefault());
  let t = null;
  card.addEventListener('mousedown', (e) => {
    if (e.button === 2) t = setTimeout(() => showPlayerDetail(player, null), 500);
  });
  card.addEventListener('mouseup', () => clearTimeout(t));
  card.addEventListener('mouseleave', () => clearTimeout(t));

  // 点击移除位置（回替补）
  card.addEventListener('click', (e) => {
    if (e.button === 0 && !card.draggable) {
      // placeholder
    }
  });

  return card;
}

// 监听放置区 drop
function setupDrops() {
  ['PG','SG','SF','PF','C'].forEach(pos => {
    const dropEl = document.querySelector(`.pos-drop[data-pos="${pos}"]`);
    dropEl.addEventListener('dragover', (e) => { e.preventDefault(); dropEl.classList.add('over'); });
    dropEl.addEventListener('dragleave', () => dropEl.classList.remove('over'));
    dropEl.addEventListener('drop', (e) => {
      e.preventDefault();
      dropEl.classList.remove('over');
      const idxStr = e.dataTransfer.getData('text/plain');
      const idx = parseInt(idxStr, 10);
      if (isNaN(idx)) return;
      // 发送摆放请求
      debounceAction(() => socket.emit('placePlayer', { slotIndex: idx, pos }, (res) => {
        if (!res.ok) toast(res.error);
      }));
    });
  });
}
setupDrops();

// ========== 确认阵容 ==========
$('submitLineupBtn').addEventListener('click', () => {
  const my = getMe();
  if (!my) return;
  const anyUnassigned = my.lineup.some(s => !s.pos);
  if (anyUnassigned) {
    return toast('还有球员未安排位置');
  }
  debounceAction(() => {
    socket.emit('submitLineup', (res) => {
      if (!res.ok) toast(res.error);
      else toast('阵容已确认，等待对手……');
    });
  });
});

// ========== 渲染：结果 ==========
function renderResult(state) {
  const ratings = state.ratings || {};
  const winner = state.winner;

  const title = $('resultTitle');
  title.classList.remove('win','lose','draw');
  const self = getMe();
  const opp = getOpponent();

  let selfWon = false, oppWon = false;
  if (winner === 'draw') {
    title.textContent = '平局！';
    title.classList.add('draw');
  } else if (winner === 'A') {
    const isSelfA = self.index === 0;
    if (isSelfA) { title.textContent = '🎉 你赢了！'; title.classList.add('win'); selfWon = true; }
    else { title.textContent = '你输了'; title.classList.add('lose'); oppWon = true; }
  } else if (winner === 'B') {
    const isSelfB = self.index === 1;
    if (isSelfB) { title.textContent = '🎉 你赢了！'; title.classList.add('win'); selfWon = true; }
    else { title.textContent = '你输了'; title.classList.add('lose'); oppWon = true; }
  }

  // 玩家结果面板
  const renderPlayerResult = (el, player, otherPlayer, rating, label, won, oppRating) => {
    el.innerHTML = '';
    const h = document.createElement('h3');
    h.textContent = `${label}：${player ? player.name : '玩家'}`;
    el.appendChild(h);
    const score = document.createElement('div');
    score.className = 'final-score';
    score.textContent = (rating && rating.final != null) ? rating.final.toFixed(2) : '-';
    el.appendChild(score);
    // 阵容
    const roster = document.createElement('div');
    roster.style.marginTop = '10px';
    (player.lineup || []).forEach(slot => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;background:#111;border-radius:6px;padding:6px 10px;margin:4px 0;';
      row.innerHTML = `<span><strong>${slot.pos}</strong> ${slot.player.name}</span><span style="color:#ffd54d">${slot.player.cost}金币</span>`;
      roster.appendChild(row);
    });
    el.appendChild(roster);
  };

  const selfPanel = $('resultSelf');
  const oppPanel = $('resultOpp');
  renderPlayerResult(selfPanel, self, opp, ratings.A, '你', selfWon, ratings.B);
  renderPlayerResult(oppPanel, opp, self, ratings.B, '对手', oppWon, ratings.A);

  // 胜者横幅
  const banner = $('resultBanner');
  if (winner === 'draw') banner.textContent = '平局';
  else if (selfWon) banner.textContent = '胜者：你';
  else if (oppWon) banner.textContent = '胜者：对手';
  else banner.textContent = '';

  // 详细计算明细
  renderRatingDetail(ratings);
}

// ========== 渲染：计算明细表 ==========
function renderRatingDetail(ratings) {
  const container = $('ratingDetail');
  const metrics = [
    ['FINAL', '最终能力', (r) => r.final],
    ['teamOff', '团队进攻', (r) => r.teamOff],
    ['teamDef', '团队防守', (r) => r.teamDef],
    ['teamPlay', '团队组织', (r) => r.teamPlay],
    ['SPACE', '空间', (r) => r.SPACE],
    ['teamFinish', '团队终结', (r) => r.teamFinish],
    ['teamReb', '团队篮板', (r) => r.teamReb],
    ['teamRim', '团队护框', (r) => r.teamRim],
    ['ball', '球权(TeamBall)', (r) => r.ball],
    ['Completeness', '阵容完整性', (r) => r.completeness],
    ['Synergy', '阵容协同', (r) => r.synergy],
    ['LeadershipBonus', '领导力加成', (r) => r.leadershipBonus],
    ['Leadership', '领导力', (r) => r.leadership],
    ['BallPenalty', '球权冲突惩罚(-)', (r) => -r.ballPenalty],
    ['OverlapPenalty', '功能重叠惩罚(-)', (r) => -r.overlapPenalty],
    ['SizePenalty', '内线位置惩罚(-)', (r) => -r.sizePenalty],
  ];

  let html = `<h3 style="margin-bottom:10px">📊 阵容能力计算明细</h3>`;
  html += `<table><thead><tr><th class="metric-name">计算项</th><th>你</th><th>对手</th><th>对比</th></tr></thead><tbody>`;
  metrics.forEach(([key, label, fn]) => {
    const a = ratings.A ? fn(ratings.A) : 0;
    const b = ratings.B ? fn(ratings.B) : 0;
    let compareClass = '';
    let compareText = '';
    if (Math.abs(a - b) > 0.001) {
      compareText = a > b ? '领先' : '落后';
      compareClass = a > b ? 'better' : 'worse';
    } else {
      compareText = '持平';
    }
    html += `<tr>
      <td class="metric-name">${label}</td>
      <td>${fmt(a)}</td>
      <td>${fmt(b)}</td>
      <td class="${compareClass}">${compareText}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

function fmt(v) {
  if (typeof v !== 'number' || isNaN(v)) return '-';
  return v.toFixed(2);
}

// ========== 结束操作 ==========
$('rematchBtn').addEventListener('click', () => {
  socket.emit('rematch');
});
$('exitBtn').addEventListener('click', () => {
  window.location.reload();
});

// ========== 主状态渲染分发 ==========
function render(state) {
  currentState = state;
  me.index = state.yourIndex;
  me.name = state.players[me.index] ? state.players[me.index].name : (me.index === 0 ? '玩家A' : '玩家B');
  opponent.index = state.yourIndex === 0 ? 1 : 0;
  opponent.name = state.players[opponent.index] ? state.players[opponent.index].name : (opponent.index === 0 ? '玩家A' : '玩家B');

  // 顶栏
  $('topRoomCode').textContent = state.code || '-';
  const badge = $('phaseBadge');
  badge.textContent = phaseText(state.phase);
  badge.className = 'phase-badge ' + state.phase;

  // 玩家面板
  const my = state.players[me.index];
  const opp = state.players[opponent.index];
  if (my) {
    $('selfTitle').textContent = '我：' + my.name;
    $('selfCoins').textContent = my.remainingCoins;
    renderMiniRoster($('selfMini'), my.lineup);
  }
  if (opp) {
    $('oppTitle').textContent = '对手：' + opp.name;
    $('oppCoins').textContent = opp.remainingCoins;
    renderMiniRoster($('oppMini'), opp.lineup);
  }

  // 是否轮到我
  const isMyTurn = state.isYourTurn;

  // 阶段渲染
  showGameContent(state);

  // 回合指示
  const turnText = $('turnIndicator');
  if (state.phase === 'WAITING') {
    turnText.textContent = '等待玩家加入……';
  } else if (state.phase === 'DRAFT') {
    turnText.textContent = isMyTurn ? '轮到你选人' : `等待 ${opp.name} 选人`;
  } else if (state.phase === 'LINEUP') {
    const meSubmitted = my && my.lineup && my.lineup.length === 5;
    turnText.textContent = '阵容调整中 · 等待双方确认';
  } else if (state.phase === 'RESULT') {
    turnText.textContent = '比赛结束';
  }

  // 玩家面板高亮当前回合
  const panelSelf = $('panelSelf');
  const panelOpp = $('panelOpp');
  panelSelf.classList.toggle('active', isMyTurn);
  // 对手是否在回合（通过非我的回合且在 DRAFT 推断）
  panelOpp.classList.toggle('active', !isMyTurn && state.phase === 'DRAFT');
}

function phaseText(phase) {
  return { WAITING:'等待中', DRAFT:'选人阶段', LINEUP:'阵容调整', RESULT:'已结束' }[phase] || phase;
}

function getMe() { return currentState && currentState.players ? currentState.players[me.index] : null; }
function getOpponent() { return currentState && currentState.players ? currentState.players[opponent.index] : null; }

function showGameContent(state) {
  // 选人区
  const draftSection = $('draftSection');
  const lineupSection = $('lineupSection');
  const resultSection = $('resultSection');

  draftSection.classList.toggle('hidden', state.phase !== 'DRAFT');
  lineupSection.classList.toggle('hidden', state.phase !== 'LINEUP');
  resultSection.classList.toggle('hidden', state.phase !== 'RESULT');

  if (state.phase === 'DRAFT') {
    const my = getMe();
    const coins = my ? my.remainingCoins : 0;
    renderDraftPool(state.currentPool, state.isYourTurn, coins);
  } else if (state.phase === 'LINEUP') {
    renderLineup();
    const my = getMe();
    const anyUnassigned = my && my.lineup.some(s => !s.pos);
    $('submitLineupBtn').disabled = !!(anyUnassigned);
  } else if (state.phase === 'RESULT') {
    renderResult(state);
  }
}

// ========== 防重复（连点） ==========
function debounceAction(fn, gap = 250) {
  const now = Date.now();
  if (now - lastActionTime < gap) return;
  lastActionTime = now;
  fn();
}

// ========== Socket 监听 ==========
socket.on('connect', () => {
  console.log('已连接到服务器');
  // 尝试断线重连
  const saved = sessionStorage.getItem('nbaRoomCode');
  if (saved && myRoomCode !== saved) {
    myRoomCode = saved;
    // rejoin 尝试恢复
  }
});

socket.on('disconnect', () => {
  toast('连接已断开，尝试重连……');
});

socket.on('stateUpdate', (state) => {
  // 如果 state 中有我方玩家已断线标记，显示提示
  render(state);
});

// 重连：服务器端断开后，客户端 JS 可能已中断。此处提供手动恢复。
window.addEventListener('beforeunload', () => {
  if (myRoomCode) sessionStorage.setItem('nbaRoomCode', myRoomCode);
});

console.log('客户端已加载');
