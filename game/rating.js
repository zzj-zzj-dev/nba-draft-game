/**
 * 评分系统 —— 服务器权威
 * 所有公式严格遵循需求说明。
 * 本模块只负责计算，不持有游戏状态。
 */

// ========== 位置适配系数表（按普通位置） ==========
// 键：球员普通位置 -> 对应球员实际被放置的位置
const POSITION_FIT = {
  PG: { PG: 1.00, SG: 0.97, SF: 0.85, PF: 0.65, C: 0.35 },
  SG: { PG: 0.97, SG: 1.00, SF: 0.93, PF: 0.72, C: 0.45 },
  SF: { PG: 0.80, SG: 0.93, SF: 1.00, PF: 0.92, C: 0.65 },
  PF: { PG: 0.55, SG: 0.72, SF: 0.92, PF: 1.00, C: 0.88 },
  C:  { PG: 0.35, SG: 0.45, SF: 0.65, PF: 0.88, C: 1.00 }
};

// 位置能力取最接近的第二位置（用于 positionSkill 收益）
const POSITION_SKILL = {
  PG: (p) =>
    0.30 * p.BH + 0.25 * p.PM + 0.15 * p.PASS + 0.15 * p.DRV + 0.10 * p.SC + 0.05 * p.ATH,
  SG: (p) =>
    0.25 * p.THREE + 0.20 * p.OFF + 0.15 * p.SC + 0.15 * p.BH + 0.15 * p.PD + 0.10 * p.DRV,
  SF: (p) =>
    0.20 * p.SC + 0.15 * p.THREE + 0.15 * p.DRV + 0.15 * p.PD + 0.15 * p.ATH + 0.10 * p.REB + 0.10 * p.OFF,
  PF: (p) =>
    0.20 * p.FIN + 0.20 * p.REB + 0.15 * p.ID + 0.15 * p.RIM + 0.10 * p.THREE + 0.10 * p.SC + 0.10 * p.ATH,
  C:  (p) =>
    0.25 * p.FIN + 0.20 * p.RIM + 0.20 * p.ID + 0.20 * p.REB + 0.10 * p.SC + 0.05 * p.ATH
};

// 功能指标
function functional(p) {
  return {
    OFFENSE:  0.25 * p.SC + 0.15 * p.FIN + 0.15 * p.MID + 0.20 * p.THREE + 0.15 * p.DRV + 0.10 * p.ISO,
    CREATION: 0.30 * p.BH + 0.25 * p.DRV + 0.25 * p.ISO + 0.20 * p.PM,
    PLAY:     0.60 * p.PM + 0.40 * p.PASS,
    SPACE:    0.40 * p.THREE + 0.30 * p.OFF + 0.30 * p.GRV,
    DEF:      0.35 * p.PD + 0.25 * p.ID + 0.25 * p.RIM + 0.15 * p.ATH,
    FINISH:   0.45 * p.FIN + 0.25 * p.DRV + 0.15 * p.MID + 0.15 * p.SC,
    INSIDE:   0.50 * p.FIN + 0.30 * p.ID + 0.20 * p.RIM,
  };
}

// BaseSkill 综合篮球能力
function baseSkill(p) {
  const f = functional(p);
  return (
    0.30 * f.OFFENSE + 0.20 * f.CREATION + 0.15 * f.PLAY +
    0.15 * f.SPACE + 0.10 * f.DEF + 0.10 * f.FINISH
  );
}

/**
 * 计算单个球员放置在某个位置（pos: PG/SG/SF/PF/C）上的有效能力。
 * 返回对象：{ fit, effective, positionSkill, baseSkill }
 */
function effectivePlayer(p, pos) {
  const fit = POSITION_FIT[p.positions[0]][pos]; // 使用第一位置查询适配系数
  const positionSkill = POSITION_SKILL[pos](p);
  const bs = baseSkill(p);
  const positionPerformance = 0.55 * bs + 0.45 * positionSkill;
  const effective = positionPerformance * (0.65 + 0.35 * fit);
  return { fit, effective, positionSkill, baseSkill: bs };
}

// 排序辅助：从大到小取指定序位
function ranked(arr, nth) {
  const sorted = arr.slice().sort((a, b) => b - a);
  // nth 从 1 开始
  return sorted[nth - 1];
}

/**
 * 完整计算一个阵容（5名球员）在特定位置安排下的评分。
 * lineup: [{ player, pos } ...]，长度必须为 5
 * 返回详细的计算明细，供前端展示“为什么赢/输”。
 */
function calculateTeam(lineup) {
  if (!Array.isArray(lineup) || lineup.length !== 5) {
    throw new Error('阵容必须为 5 名球员');
  }

  // 1) 对每个球员计算有效能力及位置适配
  //    位置效率因子 effFactor = 有效能力 / 基础综合能力，
  //    表示球员在当前位置能发挥出多少真实水平（错位会拉低）。
  //    该因子用于缩放该球员对球队各项能力的贡献，从而让错位真正影响球队整体。
  const entries = lineup.map((slot) => {
    const p = slot.player;
    const pos = slot.pos;
    const f = functional(p);
    const eff = effectivePlayer(p, pos);
    const effFactor = eff.baseSkill > 0 ? eff.effective / eff.baseSkill : 0;
    const scale = { factor: effFactor };
    return {
      player: p, pos, fit: eff.fit,
      effective: eff.effective,
      positionSkill: eff.positionSkill,
      baseSkill: eff.baseSkill,
      f, scale,
      // 缩放后的团队能力（错位将降低贡献）
      inside: f.INSIDE * effFactor,
      finish: f.FINISH * effFactor,
      space: f.SPACE * effFactor,
      play: f.PLAY * effFactor,
      def: f.DEF * effFactor,
      reim: p.RIM * effFactor, // 护框
      reb: p.REB * effFactor,
      off: f.OFFENSE * effFactor,
      eusg: p.USG * (1 - 0.50 * p.OFF / 100), // 有效球权需求（球权冲突独立计算，不缩放）
      // 用于功能重叠 & 领导力（使用原始核心能力，重叠惩罚已乘 fit）
      core: 0.45 * p.LEAD + 0.35 * p.PM + 0.20 * f.CREATION,
    };
  });

  // 2) 团队基础能力（基于球员在当前位置的有效贡献）
  const ef = entries.map(e => e.effective);
  const teamOff = 0.30 * ranked(entries.map(e=>e.off),1) + 0.24 * ranked(entries.map(e=>e.off),2)
    + 0.20 * ranked(entries.map(e=>e.off),3) + 0.15 * ranked(entries.map(e=>e.off),4)
    + 0.11 * ranked(entries.map(e=>e.off),5);

  const teamDef = 0.24 * ranked(entries.map(e=>e.def),1) + 0.22 * ranked(entries.map(e=>e.def),2)
    + 0.20 * ranked(entries.map(e=>e.def),3) + 0.18 * ranked(entries.map(e=>e.def),4)
    + 0.16 * ranked(entries.map(e=>e.def),5);

  const playVals = entries.map(e=>e.play);
  const teamPlay = 0.32 * ranked(playVals,1) + 0.25 * ranked(playVals,2)
    + 0.19 * ranked(playVals,3) + 0.14 * ranked(playVals,4) + 0.10 * ranked(playVals,5);

  const rebVals = entries.map(e=>e.reb);
  const teamReb = 0.25 * ranked(rebVals,1) + 0.22 * ranked(rebVals,2)
    + 0.20 * ranked(rebVals,3) + 0.18 * ranked(rebVals,4) + 0.15 * ranked(rebVals,5);

  const rimVals = entries.map(e=>e.reim);
  const teamRim = 0.30 * ranked(rimVals,1) + 0.25 * ranked(rimVals,2)
    + 0.20 * ranked(rimVals,3) + 0.15 * ranked(rimVals,4) + 0.10 * ranked(rimVals,5);

  const finishVals = entries.map(e=>e.finish);
  const teamFinish = 0.30 * ranked(finishVals,1) + 0.25 * ranked(finishVals,2)
    + 0.20 * ranked(finishVals,3) + 0.15 * ranked(finishVals,4) + 0.10 * ranked(finishVals,5);

  // 3) 空间（同样以位置有效贡献为基准）
  const spaceVals = entries.map(e=>e.space).sort((a,b)=>b-a); // 降序
  const spaceAvg = spaceVals.reduce((s,x)=>s+x,0)/5;
  const spaceLow = spaceVals[4];
  const SPACE = 0.70 * spaceAvg + 0.30 * spaceLow;

  // 4) 球权冲突
  const totalEusg = entries.reduce((s,e)=>s+e.eusg,0);
  const ballPenalty = Math.max(0, totalEusg - 100) * 0.15;

  // 5) 功能重叠
  let overlapSum = 0;
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i].player, b = entries[j].player;
      const overlap =
        (a.BH * b.BH + a.ISO * b.ISO + a.PM * b.PM + a.DRV * b.DRV) / 40000;
      const finalOverlap = overlap * entries[i].fit * entries[j].fit;
      overlapSum += finalOverlap;
    }
  }
  const overlapPenalty = overlapSum * 0.015;

  // 6) 阵容互补（空间与内线 / 组织与终结）
  let ssSum = 0, pfSum = 0;
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      ssSum += (entries[i].space * entries[j].inside + entries[j].space * entries[i].inside) / 200;
      pfSum += (entries[i].play * entries[j].finish + entries[j].play * entries[i].finish) / 200;
    }
  }
  const synergy = 0.005 * ssSum + 0.003 * pfSum;

  // 7) 领导力
  const cores = entries.map(e=>e.core).sort((a,b)=>b-a);
  const core1 = cores[0], core2 = cores[1];
  const leadership = 0.65 * core1 + 0.35 * core2;
  const leadershipBonus = 0.08 * leadership;

  // 8) 阵容完整性（8 项）
  // 需要的 8 项：Ball(控球), Play(组织), Shoot(投篮), Offball(无球), Perimeter(外线), Interior(内线), Rim(护框), Rebound(篮板)
  const averageStat = (fn) => entries.reduce((s,e)=>s+fn(e),0)/5;
  const ball8    = averageStat(e => e.player.BH);
  const play8    = teamPlay; // 组织
  const shoot8   = averageStat(e => 0.5*e.player.THREE + 0.3*e.player.MID + 0.2*e.player.SC);
  const offball8 = averageStat(e => e.player.OFF);
  const perim8   = averageStat(e => 0.6*e.player.PD + 0.3*e.player.DRV + 0.1*e.player.OFF);
  const inter8   = averageStat(e => e.inside);
  const rim8     = teamRim;
  const reb8     = teamReb;
  const eight = [ball8, play8, shoot8, offball8, perim8, inter8, rim8, reb8];
  const avg8 = eight.reduce((s,x)=>s+x,0)/8;
  const lowThree = eight.slice().sort((a,b)=>a-b).slice(0,3); // 最低三个
  const completeness = 0.50*avg8 + 0.25*lowThree[0] + 0.15*lowThree[1] + 0.10*lowThree[2];

  // 9) 内线结构惩罚（PF 和 C 的有效能力）
  const frontcourtPlayers = entries.filter(e => e.pos === 'PF' || e.pos === 'C');
  let frontcourt;
  if (frontcourtPlayers.length === 0) {
    frontcourt = Math.min(...ef); // 无内线时取最低
  } else {
    let pfE = 0, cE = 0;
    const pfSlot = frontcourtPlayers.find(e=>e.pos==='PF');
    const cSlot = frontcourtPlayers.find(e=>e.pos==='C');
    pfE = pfSlot ? pfSlot.effective : 0;
    cE = cSlot ? cSlot.effective : 0;
    frontcourt = 0.50 * pfE + 0.50 * cE;
  }
  const sizePenalty = Math.max(0, 60 - frontcourt) * 0.20;

  // 10) 最终评分
  const final =
    0.27 * teamOff + 0.13 * teamDef + 0.13 * teamPlay + 0.10 * SPACE
    + 0.08 * teamFinish + 0.08 * teamReb + 0.06 * teamRim + 0.07 * totalEusg
    + 0.08 * completeness
    + synergy + leadershipBonus - ballPenalty - overlapPenalty - sizePenalty;

  // 注意：0.07*totalEusg 是需求公式中的 TeamBall 占位。
  // 需求“最终公式”里有一项 0.07TeamBall，
  // 但需求并未明确定义 TeamBall 的取值，选用有效球权总和使用，
  // 从而使高球权/高球权冲突既在球权惩罚上体现，也作为球队整体实力的正向参考。

  return {
    final,
    // 明细
    teamOff, teamDef, teamPlay, SPACE, teamFinish, teamReb, teamRim,
    ball: totalEusg,
    completeness, synergy, leadership, leadershipBonus,
    ballPenalty, overlapPenalty, sizePenalty,
    frontcourt,
  };
}

module.exports = { calculateTeam, POSITION_FIT, effectivePlayer };
