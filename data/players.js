/**
 * 球员数据库
 * 所有能力值为 0~100
 * cost 是金币价格：1/2/3/4/5
 * positions: 球员的正常位置（第一个为第一位置）
 *
 * 分布策略：
 * 1金币 -> 普通球员
 * 2金币 -> 角色球员
 * 3金币 -> 优秀球员
 * 4金币 -> 全明星级
 * 5金币 -> 超级巨星
 */

module.exports = [
  // ==================== 5金币 超级巨星 ====================
  {
    id: 'curry2016', name: '史蒂芬·库里', year: 2016, team: '金州勇士', positions: ['PG', 'SG'], cost: 5,
    SC: 90, FIN: 62, MID: 88, THREE: 99, DRV: 88, BH: 96, ISO: 92, PM: 85, PASS: 83, OFF: 90,
    GRV: 98, PD: 55, ID: 35, RIM: 25, REB: 45, ATH: 75, USG: 90, LEAD: 92
  },
  {
    id: 'lebron2012', name: '勒布朗·詹姆斯', year: 2012, team: '迈阿密热火', positions: ['SF', 'PF'], cost: 5,
    SC: 92, FIN: 95, MID: 78, THREE: 70, DRV: 98, BH: 92, ISO: 90, PM: 90, PASS: 92, OFF: 85,
    GRV: 95, PD: 85, ID: 80, RIM: 78, REB: 82, ATH: 97, USG: 92, LEAD: 96
  },
  {
    id: 'shaq2000', name: '沙奎尔·奥尼尔', year: 2000, team: '洛杉矶湖人', positions: ['C'], cost: 5,
    SC: 94, FIN: 99, MID: 45, THREE: 5, DRV: 40, BH: 55, ISO: 88, PM: 35, PASS: 40, OFF: 55,
    GRV: 90, PD: 75, ID: 92, RIM: 97, REB: 96, ATH: 88, USG: 85, LEAD: 82
  },
  {
    id: 'jordan1996', name: '迈克尔·乔丹', year: 1996, team: '芝加哥公牛', positions: ['SG', 'SF'], cost: 5,
    SC: 96, FIN: 94, MID: 95, THREE: 72, DRV: 95, BH: 93, ISO: 98, PM: 68, PASS: 72, OFF: 90,
    GRV: 94, PD: 96, ID: 78, RIM: 80, REB: 78, ATH: 96, USG: 95, LEAD: 98
  },
  {
    id: 'harden2019', name: '詹姆斯·哈登', year: 2019, team: '休斯顿火箭', positions: ['SG', 'PG'], cost: 5,
    SC: 92, FIN: 88, MID: 78, THREE: 90, DRV: 95, BH: 97, ISO: 97, PM: 90, PASS: 85, OFF: 82,
    GRV: 92, PD: 55, ID: 40, RIM: 38, REB: 62, ATH: 78, USG: 96, LEAD: 85
  },
  {
    id: 'duncan2003', name: '蒂姆·邓肯', year: 2003, team: '圣安东尼奥马刺', positions: ['PF', 'C'], cost: 5,
    SC: 88, FIN: 90, MID: 82, THREE: 20, DRV: 55, BH: 60, ISO: 86, PM: 45, PASS: 55, OFF: 78,
    GRV: 85, PD: 92, ID: 95, RIM: 95, REB: 97, ATH: 78, USG: 75, LEAD: 95
  },
  {
    id: 'durant2017', name: '凯文·杜兰特', year: 2017, team: '金州勇士', positions: ['SF', 'PF'], cost: 5,
    SC: 96, FIN: 90, MID: 93, THREE: 92, DRV: 90, BH: 90, ISO: 96, PM: 70, PASS: 72, OFF: 94,
    GRV: 96, PD: 82, ID: 82, RIM: 84, REB: 82, ATH: 88, USG: 86, LEAD: 85
  },

  // ==================== 4金币 全明星级 ====================
  {
    id: 'kobe2006', name: '科比·布莱恩特', year: 2006, team: '洛杉矶湖人', positions: ['SG', 'SF'], cost: 4,
    SC: 93, FIN: 89, MID: 94, THREE: 82, DRV: 92, BH: 94, ISO: 97, PM: 58, PASS: 60, OFF: 88,
    GRV: 92, PD: 88, ID: 72, RIM: 70, REB: 72, ATH: 90, USG: 95, LEAD: 94
  },
  {
    id: 'garnett2004', name: '凯文·加内特', year: 2004, team: '明尼苏达森林狼', positions: ['PF', 'C'], cost: 4,
    SC: 84, FIN: 84, MID: 78, THREE: 35, DRV: 66, BH: 60, ISO: 76, PM: 65, PASS: 72, OFF: 80,
    GRV: 82, PD: 92, ID: 94, RIM: 93, REB: 96, ATH: 88, USG: 78, LEAD: 90
  },
  {
    id: 'giannis2020', name: '扬尼斯·阿德托昆博', year: 2020, team: '密尔沃基雄鹿', positions: ['PF', 'SF'], cost: 4,
    SC: 90, FIN: 96, MID: 60, THREE: 48, DRV: 94, BH: 88, ISO: 88, PM: 75, PASS: 72, OFF: 82,
    GRV: 90, PD: 88, ID: 88, RIM: 94, REB: 92, ATH: 98, USG: 92, LEAD: 85
  },
  {
    id: 'jokic2022', name: '尼古拉·约基奇', year: 2022, team: '丹佛掘金', positions: ['C'], cost: 4,
    SC: 90, FIN: 92, MID: 80, THREE: 68, DRV: 60, BH: 88, ISO: 84, PM: 92, PASS: 95, OFF: 80,
    GRV: 90, PD: 62, ID: 70, RIM: 72, REB: 93, ATH: 62, USG: 88, LEAD: 88
  },
  {
    id: 'kawhi2019', name: '科怀·伦纳德', year: 2019, team: '多伦多猛龙', positions: ['SF', 'SG'], cost: 4,
    SC: 90, FIN: 86, MID: 90, THREE: 84, DRV: 85, BH: 85, ISO: 92, PM: 65, PASS: 66, OFF: 88,
    GRV: 90, PD: 93, ID: 85, RIM: 82, REB: 80, ATH: 84, USG: 84, LEAD: 84
  },
  {
    id: 'doncic2023', name: '卢卡·东契奇', year: 2023, team: '达拉斯独行侠', positions: ['PG', 'SG'], cost: 4,
    SC: 92, FIN: 85, MID: 86, THREE: 80, DRV: 86, BH: 96, ISO: 94, PM: 92, PASS: 90, OFF: 82,
    GRV: 92, PD: 55, ID: 45, RIM: 40, REB: 75, ATH: 72, USG: 94, LEAD: 88
  },
  {
    id: 'westbrook2017', name: '拉塞尔·威斯布鲁克', year: 2017, team: '俄克拉荷马城雷霆', positions: ['PG'], cost: 4,
    SC: 88, FIN: 88, MID: 62, THREE: 55, DRV: 96, BH: 90, ISO: 84, PM: 88, PASS: 82, OFF: 78,
    GRV: 88, PD: 72, ID: 50, RIM: 55, REB: 85, ATH: 96, USG: 97, LEAD: 88
  },
  {
    id: 'embiid2023', name: '乔尔·恩比德', year: 2023, team: '费城76人', positions: ['C'], cost: 4,
    SC: 92, FIN: 94, MID: 78, THREE: 60, DRV: 50, BH: 80, ISO: 90, PM: 55, PASS: 55, OFF: 72,
    GRV: 88, PD: 82, ID: 88, RIM: 92, REB: 90, ATH: 80, USG: 92, LEAD: 84
  },

  // ==================== 3金币 优秀球员 ====================
  {
    id: 'kyrie2016', name: '凯里·欧文', year: 2016, team: '克里夫兰骑士', positions: ['PG', 'SG'], cost: 3,
    SC: 87, FIN: 82, MID: 88, THREE: 84, DRV: 94, BH: 97, ISO: 94, PM: 72, PASS: 70, OFF: 78,
    GRV: 82, PD: 55, ID: 35, RIM: 30, REB: 48, ATH: 82, USG: 90, LEAD: 72
  },
  {
    id: 'paul2009', name: '克里斯·保罗', year: 2009, team: '新奥尔良黄蜂', positions: ['PG'], cost: 3,
    SC: 82, FIN: 72, MID: 84, THREE: 80, DRV: 88, BH: 92, ISO: 86, PM: 96, PASS: 96, OFF: 82,
    GRV: 84, PD: 90, ID: 55, RIM: 40, REB: 62, ATH: 78, USG: 85, LEAD: 90
  },
  {
    id: 'booker2021', name: '德文·布克', year: 2021, team: '菲尼克斯太阳', positions: ['SG', 'PG'], cost: 3,
    SC: 88, FIN: 78, MID: 85, THREE: 86, DRV: 82, BH: 86, ISO: 88, PM: 72, PASS: 72, OFF: 84,
    GRV: 82, PD: 62, ID: 45, RIM: 38, REB: 58, ATH: 76, USG: 88, LEAD: 78
  },
  {
    id: 'emoni2010', name: '卡梅隆·安东尼', year: 2010, team: '丹佛掘金', positions: ['SF', 'PF'], cost: 3,
    SC: 88, FIN: 80, MID: 86, THREE: 78, DRV: 84, BH: 84, ISO: 92, PM: 50, PASS: 55, OFF: 84,
    GRV: 82, PD: 58, ID: 52, RIM: 45, REB: 62, ATH: 82, USG: 92, LEAD: 78
  },
  {
    id: 'towns2020', name: '卡尔-安东尼·唐斯', year: 2020, team: '明尼苏达森林狼', positions: ['C', 'PF'], cost: 3,
    SC: 84, FIN: 82, MID: 82, THREE: 78, DRV: 55, BH: 68, ISO: 76, PM: 52, PASS: 55, OFF: 80,
    GRV: 76, PD: 62, ID: 70, RIM: 78, REB: 88, ATH: 78, USG: 80, LEAD: 72
  },

  // ==================== 2金币 角色球员 ====================
  {
    id: 'gasol2010', name: '保罗·加索尔', year: 2010, team: '洛杉矶湖人', positions: ['PF', 'C'], cost: 2,
    SC: 78, FIN: 80, MID: 78, THREE: 30, DRV: 55, BH: 60, ISO: 76, PM: 62, PASS: 70, OFF: 72,
    GRV: 72, PD: 76, ID: 80, RIM: 80, REB: 88, ATH: 68, USG: 72, LEAD: 82
  },
  {
    id: 'lillard2019', name: '达米安·利拉德', year: 2019, team: '波特兰开拓者', positions: ['PG'], cost: 2,
    SC: 84, FIN: 72, MID: 80, THREE: 88, DRV: 86, BH: 88, ISO: 88, PM: 74, PASS: 72, OFF: 78,
    GRV: 80, PD: 50, ID: 35, RIM: 30, REB: 52, ATH: 78, USG: 88, LEAD: 82
  },
  {
    id: 'mccaw2015', name: '德玛尔·德罗赞', year: 2015, team: '多伦多猛龙', positions: ['SG', 'SF'], cost: 2,
    SC: 80, FIN: 78, MID: 82, THREE: 52, DRV: 84, BH: 82, ISO: 84, PM: 58, PASS: 60, OFF: 76,
    GRV: 72, PD: 58, ID: 45, RIM: 40, REB: 60, ATH: 76, USG: 84, LEAD: 78
  },
  {
    id: 'love2017', name: '凯文·乐福', year: 2017, team: '克里夫兰骑士', positions: ['PF', 'C'], cost: 2,
    SC: 74, FIN: 70, MID: 76, THREE: 76, DRV: 55, BH: 62, ISO: 68, PM: 55, PASS: 58, OFF: 80,
    GRV: 72, PD: 58, ID: 65, RIM: 68, REB: 90, ATH: 65, USG: 72, LEAD: 78
  },
  {
    id: 'gobert2021', name: '鲁迪·戈贝尔', year: 2021, team: '犹他爵士', positions: ['C'], cost: 2,
    SC: 55, FIN: 72, MID: 20, THREE: 5, DRV: 25, BH: 30, ISO: 40, PM: 20, PASS: 28, OFF: 45,
    GRV: 55, PD: 78, ID: 95, RIM: 98, REB: 97, ATH: 75, USG: 55, LEAD: 70
  },

  // ==================== 1金币 普通球员 ====================
  {
    id: 'mills2021', name: '帕特里克·米尔斯', year: 2021, team: '圣安东尼奥马刺', positions: ['PG', 'SG'], cost: 1,
    SC: 55, FIN: 42, MID: 60, THREE: 76, DRV: 60, BH: 64, ISO: 52, PM: 55, PASS: 55, OFF: 62,
    GRV: 50, PD: 48, ID: 30, RIM: 25, REB: 40, ATH: 62, USG: 58, LEAD: 62
  },
  {
    id: 'marks2019', name: '卡里斯·勒维尔', year: 2019, team: '布鲁克林篮网', positions: ['SG', 'SF'], cost: 1,
    SC: 55, FIN: 52, MID: 52, THREE: 55, DRV: 65, BH: 66, ISO: 58, PM: 50, PASS: 52, OFF: 58,
    GRV: 50, PD: 55, ID: 45, RIM: 40, REB: 52, ATH: 66, USG: 62, LEAD: 55
  },
  {
    id: 'tuck2019', name: 'PJ·塔克', year: 2019, team: '休斯顿火箭', positions: ['PF', 'SF'], cost: 1,
    SC: 42, FIN: 45, MID: 40, THREE: 58, DRV: 42, BH: 45, ISO: 38, PM: 35, PASS: 40, OFF: 62,
    GRV: 50, PD: 75, ID: 72, RIM: 65, REB: 72, ATH: 62, USG: 45, LEAD: 68
  },
  {
    id: 'robin2012', name: '内特·罗宾逊', year: 2012, team: '芝加哥公牛', positions: ['PG'], cost: 1,
    SC: 52, FIN: 55, MID: 48, THREE: 58, DRV: 72, BH: 70, ISO: 60, PM: 52, PASS: 54, OFF: 55,
    GRV: 45, PD: 52, ID: 25, RIM: 20, REB: 42, ATH: 85, USG: 62, LEAD: 55
  },
  {
    id: 'jack2016', name: '杰里德·贝勒斯', year: 2016, team: '密尔沃基雄鹿', positions: ['PG', 'SG'], cost: 1,
    SC: 50, FIN: 46, MID: 52, THREE: 58, DRV: 60, BH: 62, ISO: 52, PM: 55, PASS: 55, OFF: 55,
    GRV: 44, PD: 50, ID: 30, RIM: 25, REB: 38, ATH: 62, USG: 56, LEAD: 50
  },
  {
    id: 'mcgee2020', name: '贾维尔·麦基', year: 2020, team: '洛杉矶湖人', positions: ['C'], cost: 1,
    SC: 45, FIN: 62, MID: 15, THREE: 5, DRV: 25, BH: 28, ISO: 35, PM: 15, PASS: 20, OFF: 40,
    GRV: 42, PD: 62, ID: 72, RIM: 82, REB: 78, ATH: 68, USG: 45, LEAD: 55
  },
  {
    id: 'bradley2021', name: '艾弗里·布拉德利', year: 2021, team: '洛杉矶湖人', positions: ['SG', 'PG'], cost: 1,
    SC: 48, FIN: 44, MID: 50, THREE: 62, DRV: 55, BH: 58, ISO: 48, PM: 45, PASS: 48, OFF: 58,
    GRV: 44, PD: 78, ID: 45, RIM: 35, REB: 48, ATH: 64, USG: 50, LEAD: 60
  },
  {
    id: 'green2019', name: '丹尼·格林', year: 2019, team: '多伦多猛龙', positions: ['SG', 'SF'], cost: 1,
    SC: 48, FIN: 44, MID: 48, THREE: 72, DRV: 52, BH: 54, ISO: 46, PM: 42, PASS: 46, OFF: 66,
    GRV: 48, PD: 75, ID: 55, RIM: 50, REB: 55, ATH: 64, USG: 42, LEAD: 68
  }
];

// 合并补充的球员数据，确保总数量 >= 50
module.exports = module.exports.concat(require('./extra_players.js'));
