import { BALL_CATALOG, BOT_NAMES } from './constants';
import {
  BallDefinition,
  BallUpgradeLevels,
  BetSettlementDetail,
  FinalScoreChoice,
  ParticipantBets,
  WinnerChoice,
} from './types';

export const DEFAULT_UPGRADES: BallUpgradeLevels = {
  defense: 0,
  basicDamage: 0,
  cooldown: 0,
};

/**
 * PHẦN VII. CƠ CHẾ TÍNH SAO CHO BÓNG
 * Trọng số:
 * - Sát thương cơ bản: 25%
 * - Phòng thủ và khả năng sống sót: 20%
 * - Nội tại: 15%
 * - Kỹ năng: 25%
 * - Thời gian hồi chiêu: 15%
 * Công thức:
 * Tổng điểm = Sát thương × 25% + Phòng thủ × 20% + Nội tại × 15% + Kỹ năng × 25% + Hồi chiêu × 15%
 * Số sao = round(Tổng điểm / 5) × 0,5 (Giới hạn 0,5 -> 10 sao)
 */
export function evaluateBallScoreAndStars(
  ball: BallDefinition,
  upgrades: BallUpgradeLevels = DEFAULT_UPGRADES
): {
  damageScore: number;
  defenseScore: number;
  passiveScore: number;
  skillScore: number;
  cooldownScore: number;
  totalScore: number;
  stars: number;
} {
  const defLvl = Math.max(0, Math.min(5, upgrades.defense));
  const dmgLvl = Math.max(0, Math.min(5, upgrades.basicDamage));
  const cdLvl = Math.max(0, Math.min(5, upgrades.cooldown));

  // Mỗi cấp nâng cấp tăng điểm thành phần tương ứng trên thang 0-100:
  const damageScore = Math.min(100, ball.baseRatings.damage + dmgLvl * 4.5);
  const defenseBonus = defLvl * 4.5 + (defLvl >= 5 ? 6 : 0);
  const defenseScore = Math.min(100, ball.baseRatings.defense + defenseBonus);
  const passiveBonus = defLvl >= 5 ? 8 : 0; // Cấp 5 phòng thủ mở thêm nội tại tạo khiên
  const passiveScore = Math.min(100, ball.baseRatings.passive + passiveBonus);
  const skillScore = Math.min(100, ball.baseRatings.skill + (dmgLvl + cdLvl) * 1.5);
  const cooldownScore = Math.min(100, ball.baseRatings.cooldown + cdLvl * 4.5);

  const totalScore =
    damageScore * 0.25 +
    defenseScore * 0.20 +
    passiveScore * 0.15 +
    skillScore * 0.25 +
    cooldownScore * 0.15;

  const rawStars = Math.round(totalScore / 5) * 0.5;
  const stars = Math.min(10, Math.max(0.5, Number(rawStars.toFixed(1))));

  return {
    damageScore: Number(damageScore.toFixed(1)),
    defenseScore: Number(defenseScore.toFixed(1)),
    passiveScore: Number(passiveScore.toFixed(1)),
    skillScore: Number(skillScore.toFixed(1)),
    cooldownScore: Number(cooldownScore.toFixed(1)),
    totalScore: Number(totalScore.toFixed(2)),
    stars,
  };
}

/**
 * Tính các chỉ số thực chiến của quả bóng sau khi áp dụng cấp nâng cấp
 */
export function getEffectiveBallStats(
  ball: BallDefinition,
  upgrades: BallUpgradeLevels = DEFAULT_UPGRADES
) {
  const defLvl = Math.max(0, Math.min(5, upgrades.defense));
  const dmgLvl = Math.max(0, Math.min(5, upgrades.basicDamage));
  const cdLvl = Math.max(0, Math.min(5, upgrades.cooldown));

  // Chỉ số 1: PHÒNG THỦ (-2% sát thương nhận vào mỗi cấp, tối đa 10%; cấp 5 mở khiên <10% máu)
  const damageReductionPct = ball.baseDefensePct + defLvl * 2;
  const hasEmergencyShieldPassive = defLvl >= 5;

  // Chỉ số 2: SÁT THƯƠNG CƠ BẢN (+1% sát thương từ vũ khí cơ bản mỗi cấp, tối đa 5%)
  const basicDamageMultiplier = 1 + dmgLvl * 0.01;
  const effectiveBaseDamage = Number((ball.baseDamage * basicDamageMultiplier).toFixed(2));

  // Chỉ số 3: THỜI GIAN TUNG CHIÊU (-2% thời gian hồi chiêu mỗi cấp, tối đa 10%, không bao giờ về 0)
  const cooldownReductionPct = cdLvl * 2;
  const cooldownMultiplier = Math.max(0.1, 1 - cdLvl * 0.02);

  const { stars, totalScore } = evaluateBallScoreAndStars(ball, upgrades);

  return {
    maxHp: ball.baseHp,
    effectiveBaseDamage,
    basicDamageMultiplier,
    damageReductionPct,
    hasEmergencyShieldPassive,
    cooldownReductionPct,
    cooldownMultiplier,
    stars,
    totalScore,
  };
}

/**
 * PHẦN V.5. GIÁ NÂNG CẤP
 * Giá cấp tiếp theo = Giá cấp hiện tại × 1,25 (Làm tròn thành số nguyên B)
 */
export function calculateUpgradeCost(baseCost: number, currentLevel: number): number {
  let price = Math.round(baseCost);
  for (let i = 0; i < currentLevel; i++) {
    price = Math.round(price * 1.25);
  }
  return price;
}

/**
 * PHẦN VI.4. GIÁ MUA BÓNG TRONG SHOP
 * Giá mua = 10.000.000 × 1,65^(số sao - 1) (hoặc giá cố định nếu nhân vật có quy định riêng)
 * Làm tròn thành số nguyên B.
 */
export function calculateShopPrice(stars: number, fixedShopPrice?: number): number {
  if (typeof fixedShopPrice === 'number' && fixedShopPrice > 0) {
    return Math.round(fixedShopPrice);
  }
  return Math.round(10_000_000 * Math.pow(1.65, stars - 1));
}

/**
 * PHẦN VIII. CƠ CHẾ SAO NGƯỜI CHƠI
 * Mỗi 1.000.000.000 B tiền thưởng tích lũy: +1 sao
 * Mỗi 500.000.000 B: +0,5 sao
 * Tối đa 5 sao.
 */
export function calculatePlayerStars(totalProfitEarned: number): number {
  if (totalProfitEarned <= 0) return 0;
  const halfStarSteps = Math.floor(totalProfitEarned / 500_000_000);
  return Math.min(5, halfStarSteps * 0.5);
}

/**
 * Định dạng tiền tệ B rõ ràng, dễ đọc
 */
export function formatCurrencyB(amount: number): string {
  const safeInt = Math.round(amount);
  return `${safeInt.toLocaleString('vi-VN')} B`;
}

export function formatCompactB(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(2).replace(/\.00$/, '')} Tỷ B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1).replace(/\.0$/, '')} Tr B`;
  }
  return `${sign}${Math.round(abs).toLocaleString('vi-VN')} B`;
}

/**
 * PHẦN XI.1. Chọn tên Bot ngẫu nhiên không lặp lại trước khi hết danh sách
 */
export function pickNextBotName(usedNames: string[]): {
  botName: string;
  updatedUsedNames: string[];
} {
  let pool = BOT_NAMES.filter((n) => !usedNames.includes(n));
  let nextUsed = [...usedNames];
  if (pool.length === 0) {
    pool = [...BOT_NAMES];
    nextUsed = [];
  }
  const idx = Math.floor(Math.random() * pool.length);
  const botName = pool[idx];
  nextUsed.push(botName);
  return { botName, updatedUsedNames: nextUsed };
}

/**
 * PHẦN XI.2. AI LỰA CHỌN BÓNG
 * Bot được phép lựa chọn tất cả bóng đang có trong cửa hàng, kể cả bóng người chơi chưa sở hữu.
 * Số sao của bóng bot chọn phải tương đương bóng người chơi (chênh lệch tối đa ±0.5 sao).
 */
export function selectBotBallAndUpgrades(
  playerBall: BallDefinition,
  playerUpgrades: BallUpgradeLevels
): {
  ball: BallDefinition;
  upgrades: BallUpgradeLevels;
  stars: number;
  totalScore: number;
} {
  const playerEval = evaluateBallScoreAndStars(playerBall, playerUpgrades);
  const candidates: Array<{
    ball: BallDefinition;
    upgrades: BallUpgradeLevels;
    stars: number;
    totalScore: number;
    scoreDiff: number;
  }> = [];

  for (const candidateBall of BALL_CATALOG) {
    for (let lvl = 0; lvl <= 5; lvl++) {
      const testUpgrades: BallUpgradeLevels = {
        defense: lvl,
        basicDamage: lvl,
        cooldown: lvl,
      };
      const evalRes = evaluateBallScoreAndStars(candidateBall, testUpgrades);
      const starDiff = Math.abs(evalRes.stars - playerEval.stars);
      if (starDiff <= 0.5) {
        candidates.push({
          ball: candidateBall,
          upgrades: testUpgrades,
          stars: evalRes.stars,
          totalScore: evalRes.totalScore,
          scoreDiff: Math.abs(evalRes.totalScore - playerEval.totalScore),
        });
      }
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => a.scoreDiff - b.scoreDiff);
    const topPool = candidates.slice(0, Math.min(6, candidates.length));
    const chosen = topPool[Math.floor(Math.random() * topPool.length)];
    return {
      ball: chosen.ball,
      upgrades: chosen.upgrades,
      stars: chosen.stars,
      totalScore: chosen.totalScore,
    };
  }

  // Fallback: lấy bóng có điểm gần nhất
  let best = {
    ball: playerBall,
    upgrades: { ...playerUpgrades },
    stars: playerEval.stars,
    totalScore: playerEval.totalScore,
  };
  let minDiff = Infinity;
  for (const candidateBall of BALL_CATALOG) {
    const evalRes = evaluateBallScoreAndStars(candidateBall, playerUpgrades);
    const diff = Math.abs(evalRes.totalScore - playerEval.totalScore);
    if (diff < minDiff) {
      minDiff = diff;
      best = {
        ball: candidateBall,
        upgrades: { ...playerUpgrades },
        stars: evalRes.stars,
        totalScore: evalRes.totalScore,
      };
    }
  }
  return best;
}

/**
 * PHẦN XI.4. AI LỰA CHỌN CƯỢC
 * Bot tham gia đầy đủ 5 loại cược, tính toán dựa trên chỉ số 2 quả bóng và khả năng tài chính.
 */
export function generateBotBetsForRound(params: {
  botBalance: number;
  playerBall: BallDefinition;
  playerUpgrades: BallUpgradeLevels;
  botBall: BallDefinition;
  botUpgrades: BallUpgradeLevels;
  roundNumber: number;
  existingFinalScoreBet?: ParticipantBets['finalScore'];
}): {
  bets: ParticipantBets;
  totalLocked: number;
} {
  const {
    botBalance,
    playerBall,
    playerUpgrades,
    botBall,
    botUpgrades,
    roundNumber,
    existingFinalScoreBet,
  } = params;

  const bets: ParticipantBets = {};
  if (existingFinalScoreBet) {
    bets.finalScore = existingFinalScoreBet;
  }

  if (botBalance <= 0) {
    return { bets, totalLocked: 0 };
  }

  const pStats = getEffectiveBallStats(playerBall, playerUpgrades);
  const bStats = getEffectiveBallStats(botBall, botUpgrades);

  // Đánh giá lợi thế của Bot (tỷ lệ sức mạnh)
  const powerRatio = bStats.totalScore / Math.max(1, pStats.totalScore);
  const botAdvantage = powerRatio - 1; // > 0 nếu bot mạnh hơn

  // Tổng ngân sách bot dùng trong ván này: 20% - 45% số dư hiện tại
  const confidenceFactor = Math.min(0.45, Math.max(0.18, 0.26 + Math.abs(botAdvantage) * 0.8));
  let availableToBet = Math.floor(botBalance * confidenceFactor);
  let totalLocked = 0;

  const allocate = (fraction: number): number => {
    const raw = Math.floor((availableToBet - totalLocked) * fraction);
    const rounded = Math.max(0, Math.floor(raw / 1_000_000) * 1_000_000 || raw);
    if (totalLocked + rounded > botBalance) {
      return Math.max(0, botBalance - totalLocked);
    }
    return rounded;
  };

  // 1. Cược Tỉ Số Chung Cuộc (chỉ đặt ở ván 1)
  if (roundNumber === 1 && !bets.finalScore && botBalance >= 10_000_000) {
    const scoreAmt = allocate(0.18);
    if (scoreAmt > 0) {
      const botFavored = botAdvantage >= -0.02;
      const choices: FinalScoreChoice[] = botFavored
        ? ['BOT 3-1 PLAYER', 'BOT 3-2 PLAYER', 'BOT 3-0 PLAYER']
        : ['PLAYER 3-2 BOT', 'PLAYER 3-1 BOT', 'BOT 3-2 PLAYER'];
      const prediction = choices[Math.floor(Math.random() * choices.length)];
      bets.finalScore = {
        amount: scoreAmt,
        prediction,
        locked: true,
      };
      totalLocked += scoreAmt;
    }
  }

  // 2. Cược AI THẮNG?
  const winnerAmt = allocate(0.38);
  if (winnerAmt > 0) {
    const winProbBot = 0.52 + botAdvantage * 1.5;
    const predictBotWins = Math.random() < winProbBot;
    bets.winner = {
      amount: winnerAmt,
      prediction: predictBotWins ? 'BOT' : 'PLAYER',
      locked: true,
    };
    totalLocked += winnerAmt;
  }

  // 3. Cược LƯỢNG SÁT THƯƠNG (dự đoán dựa trên HP đối phương và tốc độ giao tranh)
  const dmgAmt = allocate(0.35);
  if (dmgAmt > 0) {
    const expectedDamage = Math.round(
      playerBall.baseHp * (0.82 + (Math.random() * 0.22 - 0.06))
    );
    bets.damage = {
      amount: dmgAmt,
      prediction: expectedDamage,
      locked: true,
    };
    totalLocked += dmgAmt;
  }

  // 4. Cược SỐ LẦN VA CHẠM (dự đoán dựa trên archetype hai bóng)
  const colAmt = allocate(0.45);
  if (colAmt > 0) {
    const meleeCount =
      (playerBall.aiArchetype === 'brawler' || playerBall.aiArchetype === 'zoner' ? 1 : 0) +
      (botBall.aiArchetype === 'brawler' || botBall.aiArchetype === 'zoner' ? 1 : 0);
    const baseCollisions = meleeCount === 2 ? 16 : meleeCount === 1 ? 11 : 7;
    const predictedCollisions = Math.max(
      2,
      baseCollisions + Math.floor(Math.random() * 5) - 2
    );
    bets.collisions = {
      amount: colAmt,
      prediction: predictedCollisions,
      locked: true,
    };
    totalLocked += colAmt;
  }

  // 5. Cược MÁU CÒN LẠI (% HP của bóng chiến thắng)
  const hpAmt = allocate(0.85);
  if (hpAmt > 0) {
    const baseRemainingPct = Math.min(
      65,
      Math.max(12, Math.round(22 + Math.abs(botAdvantage) * 120 + (Math.random() * 14 - 7)))
    );
    bets.remainingHp = {
      amount: hpAmt,
      prediction: baseRemainingPct,
      locked: true,
    };
    totalLocked += hpAmt;
  }

  return { bets, totalLocked };
}

/**
 * PHẦN XIV. CƯỢC 1: AI THẮNG?
 * Khi dự đoán đúng:
 * - Hoàn lại tiền cược.
 * - Nhận thêm phần tiền từ tổng tiền cược của những người dự đoán sai.
 * Nếu dự đoán sai, mất toàn bộ tiền cược của loại cược này.
 */
export function settleWinnerBetPair(params: {
  playerBet?: { amount: number; prediction: WinnerChoice };
  botBet?: { amount: number; prediction: WinnerChoice };
  actualWinner: WinnerChoice;
}): {
  playerPayout: number;
  playerNetProfit: number;
  botPayout: number;
  botNetProfit: number;
} {
  const { playerBet, botBet, actualWinner } = params;
  const pAmt = playerBet?.amount ?? 0;
  const bAmt = botBet?.amount ?? 0;
  const pRight = playerBet ? playerBet.prediction === actualWinner : false;
  const bRight = botBet ? botBet.prediction === actualWinner : false;

  const winningPool = (pRight ? pAmt : 0) + (bRight ? bAmt : 0);
  const losingPool = (!pRight ? pAmt : 0) + (!bRight ? bAmt : 0);

  let playerPayout = 0;
  let botPayout = 0;

  if (pRight && winningPool > 0) {
    const shareFromLoser =
      losingPool > 0
        ? Math.round((losingPool * pAmt) / winningPool)
        : pAmt; // Nếu đối phương không đặt cửa ngược lại, nhà cái trả thưởng 1:1
    playerPayout = pAmt + shareFromLoser;
  }

  if (bRight && winningPool > 0) {
    const shareFromLoser =
      losingPool > 0
        ? Math.round((losingPool * bAmt) / winningPool)
        : bAmt;
    botPayout = bAmt + shareFromLoser;
  }

  return {
    playerPayout,
    playerNetProfit: playerPayout - pAmt,
    botPayout,
    botNetProfit: botPayout - bAmt,
  };
}

/**
 * PHẦN XIV. CƯỢC 2: LƯỢNG SÁT THƯƠNG
 * Sai số (%) = |Dự đoán - Thực tế| / Máu tối đa đối thủ × 100
 * Ngưỡng chính xác: ±5 điểm phần trăm.
 * Trong ngưỡng <= 5%: Tỷ lệ thưởng = 25% + 75% × (1 - Sai số / 5)
 * Vượt quá 5%: Mỗi 1 điểm phần trăm vượt quá mất 25% tiền cược (tối đa 100%).
 */
export function settleDamageBet(
  betAmount: number,
  predictedDamage: number,
  actualDamage: number,
  opponentMaxHp: number
): {
  errorPct: number;
  payout: number;
  netProfit: number;
  won: boolean;
} {
  if (betAmount <= 0) {
    return { errorPct: 0, payout: 0, netProfit: 0, won: false };
  }
  const safeMaxHp = Math.max(1, opponentMaxHp);
  const errorPct = (Math.abs(predictedDamage - actualDamage) / safeMaxHp) * 100;

  if (errorPct <= 5) {
    const rewardRatio = 0.25 + 0.75 * (1 - errorPct / 5);
    const netProfit = Math.round(betAmount * rewardRatio);
    return {
      errorPct: Number(errorPct.toFixed(2)),
      payout: betAmount + netProfit,
      netProfit,
      won: true,
    };
  }

  const overPct = errorPct - 5;
  const lossRatio = Math.min(1, overPct * 0.25);
  const loss = Math.round(betAmount * lossRatio);
  return {
    errorPct: Number(errorPct.toFixed(2)),
    payout: Math.max(0, betAmount - loss),
    netProfit: -loss,
    won: false,
  };
}

/**
 * PHẦN XIV. CƯỢC 3: SỐ LẦN VA CHẠM
 * Sai số (%) = |Số dự đoán - Số thực tế| / max(Số thực tế, 1) × 100
 * Ngưỡng chính xác: ±10%.
 * Trong ngưỡng <= 10%: Tỷ lệ thưởng = 25% + 75% × (1 - Sai số / 10)
 * Vượt quá 10%: Mỗi 2 điểm phần trăm sai số vượt ngưỡng mất 25% tiền cược (tối đa 100%).
 */
export function settleCollisionBet(
  betAmount: number,
  predictedCollisions: number,
  actualCollisions: number
): {
  errorPct: number;
  payout: number;
  netProfit: number;
  won: boolean;
} {
  if (betAmount <= 0) {
    return { errorPct: 0, payout: 0, netProfit: 0, won: false };
  }
  const denom = Math.max(actualCollisions, 1);
  const errorPct = (Math.abs(predictedCollisions - actualCollisions) / denom) * 100;

  if (errorPct <= 10) {
    const rewardRatio = 0.25 + 0.75 * (1 - errorPct / 10);
    const netProfit = Math.round(betAmount * rewardRatio);
    return {
      errorPct: Number(errorPct.toFixed(2)),
      payout: betAmount + netProfit,
      netProfit,
      won: true,
    };
  }

  const overPct = errorPct - 10;
  const lossRatio = Math.min(1, (overPct / 2) * 0.25);
  const loss = Math.round(betAmount * lossRatio);
  return {
    errorPct: Number(errorPct.toFixed(2)),
    payout: Math.max(0, betAmount - loss),
    netProfit: -loss,
    won: false,
  };
}

/**
 * PHẦN XIV. CƯỢC 4: MÁU CÒN LẠI
 * So sánh theo tỷ lệ phần trăm máu tối đa của quả bóng chiến thắng.
 * Ngưỡng chính xác: ±5 điểm phần trăm.
 * Trong ngưỡng <= 5%: Tỷ lệ thưởng = 25% + 75% × (1 - Sai số / 5)
 * Vượt quá 5%: Mỗi 1 điểm phần trăm vượt ngưỡng mất 25% tiền cược (tối đa 100%).
 */
export function settleRemainingHpBet(
  betAmount: number,
  predictedHpPct: number,
  actualWinnerHpPct: number
): {
  errorPct: number;
  payout: number;
  netProfit: number;
  won: boolean;
} {
  if (betAmount <= 0) {
    return { errorPct: 0, payout: 0, netProfit: 0, won: false };
  }
  const errorPct = Math.abs(predictedHpPct - actualWinnerHpPct);

  if (errorPct <= 5) {
    const rewardRatio = 0.25 + 0.75 * (1 - errorPct / 5);
    const netProfit = Math.round(betAmount * rewardRatio);
    return {
      errorPct: Number(errorPct.toFixed(2)),
      payout: betAmount + netProfit,
      netProfit,
      won: true,
    };
  }

  const overPct = errorPct - 5;
  const lossRatio = Math.min(1, overPct * 0.25);
  const loss = Math.round(betAmount * lossRatio);
  return {
    errorPct: Number(errorPct.toFixed(2)),
    payout: Math.max(0, betAmount - loss),
    netProfit: -loss,
    won: false,
  };
}

/**
 * PHẦN XIV. CƯỢC 5: TỈ SỐ CHUNG CUỘC
 * Dự đoán đúng: Tổng tiền nhận được = 500% số tiền cược (gốc + 400% thưởng).
 * Dự đoán sai: Mất toàn bộ số tiền đã cược.
 */
export function settleFinalScoreBet(
  betAmount: number,
  predictedScore: FinalScoreChoice,
  actualScore: FinalScoreChoice
): {
  payout: number;
  netProfit: number;
  won: boolean;
} {
  if (betAmount <= 0) {
    return { payout: 0, netProfit: 0, won: false };
  }
  if (predictedScore === actualScore) {
    const payout = betAmount * 5;
    return {
      payout,
      netProfit: payout - betAmount,
      won: true,
    };
  }
  return {
    payout: 0,
    netProfit: -betAmount,
    won: false,
  };
}

/**
 * Xử lý toàn bộ các khoản cược của 1 ván (4 loại cược ván + cược tỉ số chung cuộc nếu trận đấu kết thúc)
 */
export function settleAllBetsForRound(params: {
  playerBets: ParticipantBets;
  botBets: ParticipantBets;
  winner: WinnerChoice;
  playerDamageDealt: number;
  botDamageDealt: number;
  playerMaxHp: number;
  botMaxHp: number;
  collisionCount: number;
  winnerRemainingHpPct: number;
  matchFinished: boolean;
  finalMatchScore?: FinalScoreChoice;
}): {
  playerSettlements: BetSettlementDetail[];
  botSettlements: BetSettlementDetail[];
  playerTotalPayout: number;
  playerNetProfit: number;
  playerPositiveRewardOnly: number;
  botTotalPayout: number;
  botNetProfit: number;
} {
  const {
    playerBets,
    botBets,
    winner,
    playerDamageDealt,
    botDamageDealt,
    playerMaxHp,
    botMaxHp,
    collisionCount,
    winnerRemainingHpPct,
    matchFinished,
    finalMatchScore,
  } = params;

  const playerSettlements: BetSettlementDetail[] = [];
  const botSettlements: BetSettlementDetail[] = [];

  // 1. Cược AI THẮNG?
  if (playerBets.winner || botBets.winner) {
    const res = settleWinnerBetPair({
      playerBet: playerBets.winner,
      botBet: botBets.winner,
      actualWinner: winner,
    });
    if (playerBets.winner && playerBets.winner.amount > 0) {
      playerSettlements.push({
        category: 'winner',
        label: 'AI THẮNG?',
        betAmount: playerBets.winner.amount,
        predictionText: playerBets.winner.prediction,
        actualText: winner,
        payout: res.playerPayout,
        netProfit: res.playerNetProfit,
        won: res.playerNetProfit >= 0 && playerBets.winner.prediction === winner,
      });
    }
    if (botBets.winner && botBets.winner.amount > 0) {
      botSettlements.push({
        category: 'winner',
        label: 'AI THẮNG?',
        betAmount: botBets.winner.amount,
        predictionText: botBets.winner.prediction,
        actualText: winner,
        payout: res.botPayout,
        netProfit: res.botNetProfit,
        won: res.botNetProfit >= 0 && botBets.winner.prediction === winner,
      });
    }
  }

  // 2. Cược LƯỢNG SÁT THƯƠNG
  if (playerBets.damage && playerBets.damage.amount > 0) {
    const res = settleDamageBet(
      playerBets.damage.amount,
      playerBets.damage.prediction,
      playerDamageDealt,
      botMaxHp
    );
    playerSettlements.push({
      category: 'damage',
      label: 'LƯỢNG SÁT THƯƠNG',
      betAmount: playerBets.damage.amount,
      predictionText: `${Math.round(playerBets.damage.prediction)} ST`,
      actualText: `${Math.round(playerDamageDealt)} ST (Lệch ${res.errorPct}%)`,
      payout: res.payout,
      netProfit: res.netProfit,
      won: res.won,
    });
  }
  if (botBets.damage && botBets.damage.amount > 0) {
    const res = settleDamageBet(
      botBets.damage.amount,
      botBets.damage.prediction,
      botDamageDealt,
      playerMaxHp
    );
    botSettlements.push({
      category: 'damage',
      label: 'LƯỢNG SÁT THƯƠNG',
      betAmount: botBets.damage.amount,
      predictionText: `${Math.round(botBets.damage.prediction)} ST`,
      actualText: `${Math.round(botDamageDealt)} ST (Lệch ${res.errorPct}%)`,
      payout: res.payout,
      netProfit: res.netProfit,
      won: res.won,
    });
  }

  // 3. Cược SỐ LẦN VA CHẠM
  if (playerBets.collisions && playerBets.collisions.amount > 0) {
    const res = settleCollisionBet(
      playerBets.collisions.amount,
      playerBets.collisions.prediction,
      collisionCount
    );
    playerSettlements.push({
      category: 'collisions',
      label: 'SỐ LẦN VA CHẠM',
      betAmount: playerBets.collisions.amount,
      predictionText: `${playerBets.collisions.prediction} lần`,
      actualText: `${collisionCount} lần (Lệch ${res.errorPct}%)`,
      payout: res.payout,
      netProfit: res.netProfit,
      won: res.won,
    });
  }
  if (botBets.collisions && botBets.collisions.amount > 0) {
    const res = settleCollisionBet(
      botBets.collisions.amount,
      botBets.collisions.prediction,
      collisionCount
    );
    botSettlements.push({
      category: 'collisions',
      label: 'SỐ LẦN VA CHẠM',
      betAmount: botBets.collisions.amount,
      predictionText: `${botBets.collisions.prediction} lần`,
      actualText: `${collisionCount} lần (Lệch ${res.errorPct}%)`,
      payout: res.payout,
      netProfit: res.netProfit,
      won: res.won,
    });
  }

  // 4. Cược MÁU CÒN LẠI
  if (playerBets.remainingHp && playerBets.remainingHp.amount > 0) {
    const res = settleRemainingHpBet(
      playerBets.remainingHp.amount,
      playerBets.remainingHp.prediction,
      winnerRemainingHpPct
    );
    playerSettlements.push({
      category: 'remainingHp',
      label: 'MÁU CÒN LẠI',
      betAmount: playerBets.remainingHp.amount,
      predictionText: `${playerBets.remainingHp.prediction.toFixed(1)}%`,
      actualText: `${winnerRemainingHpPct.toFixed(1)}% (Lệch ${res.errorPct}%)`,
      payout: res.payout,
      netProfit: res.netProfit,
      won: res.won,
    });
  }
  if (botBets.remainingHp && botBets.remainingHp.amount > 0) {
    const res = settleRemainingHpBet(
      botBets.remainingHp.amount,
      botBets.remainingHp.prediction,
      winnerRemainingHpPct
    );
    botSettlements.push({
      category: 'remainingHp',
      label: 'MÁU CÒN LẠI',
      betAmount: botBets.remainingHp.amount,
      predictionText: `${botBets.remainingHp.prediction.toFixed(1)}%`,
      actualText: `${winnerRemainingHpPct.toFixed(1)}% (Lệch ${res.errorPct}%)`,
      payout: res.payout,
      netProfit: res.netProfit,
      won: res.won,
    });
  }

  // 5. Cược TỈ SỐ CHUNG CUỘC (Chỉ tất toán khi trận đấu kết thúc)
  if (matchFinished && finalMatchScore) {
    if (playerBets.finalScore && playerBets.finalScore.amount > 0) {
      const res = settleFinalScoreBet(
        playerBets.finalScore.amount,
        playerBets.finalScore.prediction,
        finalMatchScore
      );
      playerSettlements.push({
        category: 'finalScore',
        label: 'TỈ SỐ CHUNG CUỘC',
        betAmount: playerBets.finalScore.amount,
        predictionText: playerBets.finalScore.prediction,
        actualText: finalMatchScore,
        payout: res.payout,
        netProfit: res.netProfit,
        won: res.won,
      });
    }
    if (botBets.finalScore && botBets.finalScore.amount > 0) {
      const res = settleFinalScoreBet(
        botBets.finalScore.amount,
        botBets.finalScore.prediction,
        finalMatchScore
      );
      botSettlements.push({
        category: 'finalScore',
        label: 'TỈ SỐ CHUNG CUỘC',
        betAmount: botBets.finalScore.amount,
        predictionText: botBets.finalScore.prediction,
        actualText: finalMatchScore,
        payout: res.payout,
        netProfit: res.netProfit,
        won: res.won,
      });
    }
  }

  const playerTotalPayout = playerSettlements.reduce((sum, s) => sum + s.payout, 0);
  const playerNetProfit = playerSettlements.reduce((sum, s) => sum + s.netProfit, 0);
  const playerPositiveRewardOnly = playerSettlements.reduce(
    (sum, s) => sum + (s.netProfit > 0 ? s.netProfit : 0),
    0
  );

  const botTotalPayout = botSettlements.reduce((sum, s) => sum + s.payout, 0);
  const botNetProfit = botSettlements.reduce((sum, s) => sum + s.netProfit, 0);

  return {
    playerSettlements,
    botSettlements,
    playerTotalPayout,
    playerNetProfit,
    playerPositiveRewardOnly,
    botTotalPayout,
    botNetProfit,
  };
}

/**
 * Cơ chế thưởng tiền khi thắng trận đấu theo cách biệt điểm số:
 * - Thắng cách biệt 1 điểm (3-2): tặng 500,000 B
 * - Thắng cách biệt 2 điểm (3-1): tặng 1,000,000 B
 * - Thắng cách biệt 3 điểm (3-0): thưởng 10,000,000 B
 */
export function calculateMatchWinBonus(winnerWins: number, loserWins: number): number {
  const diff = winnerWins - loserWins;
  if (diff <= 0) return 0;
  if (diff === 1) return 500_000;
  if (diff === 2) return 1_000_000;
  return 10_000_000;
}

