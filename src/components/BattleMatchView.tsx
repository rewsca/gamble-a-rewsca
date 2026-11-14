import React, { useEffect, useRef, useState } from 'react';
import {
  BattleSimulationState,
  createBattleSimulation,
} from '../game/battleEngine';
import {
  calculateMatchWinBonus,
  calculatePlayerStars,
  evaluateBallScoreAndStars,
  formatCompactB,
  formatCurrencyB,
  generateBotBetsForRound,
  settleAllBetsForRound,
} from '../game/rules';
import { sound } from '../game/sound';
import {
  BallDefinition,
  BallUpgradeLevels,
  BetCategory,
  FinalScoreChoice,
  ParticipantBets,
  PlayerProfile,
  RoundResultSummary,
  WinnerChoice,
} from '../game/types';
import { BattleArenaCanvas, LiveHudSnapshot } from './BattleArenaCanvas';
import {
  BallStarRow,
  BetChipStack,
  CoinBIcon,
  PlayerStarRow,
  SkillIconBox,
} from './HandDrawnIcons';

interface BattleMatchViewProps {
  profile: PlayerProfile;
  playerBall: BallDefinition;
  playerUpgrades: BallUpgradeLevels;
  botName: string;
  botBall: BallDefinition;
  botUpgrades: BallUpgradeLevels;
  onUpdateBalanceAndStats: (delta: {
    balanceChange: number;
    positiveRewardEarned: number;
    betsPlacedCount: number;
    betsWonCount: number;
  }) => void;
  onFinishMatch: (summary: {
    playerWins: number;
    botWins: number;
    netMatchProfit: number;
    wonMatch: boolean;
  }) => void;
  onAbortMatchToMenu: (lockedAmountToRefund: number) => void;
  onPhaseChange?: (
    phase: 'PREPARATION' | 'BATTLE' | 'ROUND_RESULT' | 'MATCH_RESULT'
  ) => void;
  onPauseChange?: (isPaused: boolean) => void;
}

const FINAL_SCORE_OPTIONS: FinalScoreChoice[] = [
  'PLAYER 3-0 BOT',
  'PLAYER 3-1 BOT',
  'PLAYER 3-2 BOT',
  'BOT 3-0 PLAYER',
  'BOT 3-1 PLAYER',
  'BOT 3-2 PLAYER',
];

export const BattleMatchView: React.FC<BattleMatchViewProps> = ({
  profile,
  playerBall,
  playerUpgrades,
  botName,
  botBall,
  botUpgrades,
  onUpdateBalanceAndStats,
  onFinishMatch,
  onAbortMatchToMenu,
  onPhaseChange,
  onPauseChange,
}) => {
  // Trạng thái trận đấu (Best of 5 - Chạm 3 thắng)
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [playerWins, setPlayerWins] = useState<number>(0);
  const [botWins, setBotWins] = useState<number>(0);
  const [phase, setPhase] = useState<
    'PREPARATION' | 'BATTLE' | 'ROUND_RESULT' | 'MATCH_RESULT'
  >('PREPARATION');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<1 | 2>(1);

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  useEffect(() => {
    onPauseChange?.(isPaused);
  }, [isPaused, onPauseChange]);

  // Số dư riêng của Bot (Khởi tạo 1.000.000.000 B theo Phần XVII)
  const [botBalance, setBotBalance] = useState<number>(1_000_000_000);
  const [botProfitEarned, setBotProfitEarned] = useState<number>(0);

  // Cược hiện tại của Người chơi và Bot
  const [playerBets, setPlayerBets] = useState<ParticipantBets>({});
  const [botBets, setBotBets] = useState<ParticipantBets>({});
  const [netMatchProfit, setNetMatchProfit] = useState<number>(0);

  // Số tiền cược đang chọn ở cột phải (Dòng 5-9)
  const [stakeInput, setStakeInput] = useState<number>(25_000_000);

  // Bảng nhỏ chọn dự đoán khi nhấn vào 1 trong 5 loại cược ở dải dưới
  const [activeBetModal, setActiveBetModal] = useState<BetCategory | null>(null);
  const [winnerDraft, setWinnerDraft] = useState<WinnerChoice>('PLAYER');
  const [damageDraft, setDamageDraft] = useState<number>(850);
  const [collisionDraft, setCollisionDraft] = useState<number>(12);
  const [remainingHpDraft, setRemainingHpDraft] = useState<number>(35);
  const [finalScoreDraft, setFinalScoreDraft] =
    useState<FinalScoreChoice>('PLAYER 3-1 BOT');

  // Đồng hồ đếm ngược 60s cho giai đoạn chuẩn bị cược
  const [prepCountdown, setPrepCountdown] = useState<number>(60);

  // Kết quả ván vừa xong
  const [lastRoundSummary, setLastRoundSummary] =
    useState<RoundResultSummary | null>(null);

  // Tham chiếu mô phỏng vật lý 2D
  const simRef = useRef<BattleSimulationState | null>(null);
  if (!simRef.current) {
    simRef.current = createBattleSimulation(
      playerBall,
      playerUpgrades,
      botBall,
      botUpgrades
    );
  }

  const [hud, setHud] = useState<LiveHudSnapshot>(() => ({
    remainingTime: 300,
    collisionCount: 0,
    playerDamageDealt: 0,
    botDamageDealt: 0,
    playerHp: playerBall.baseHp,
    playerMaxHp: playerBall.baseHp,
    botHp: botBall.baseHp,
    botMaxHp: botBall.baseHp,
    botNextSkill: null,
    playerNextSkill: null,
  }));

  const playerBallStars = evaluateBallScoreAndStars(
    playerBall,
    playerUpgrades
  ).stars;
  const botBallStars = evaluateBallScoreAndStars(botBall, botUpgrades).stars;
  const playerStars = calculatePlayerStars(profile.totalProfitEarned);
  const botStars = Math.max(0.5, calculatePlayerStars(botProfitEarned + 500_000_000));

  // Tính tổng tiền đang khóa trong ván hiện tại của Player
  const getLockedRoundStake = (bets: ParticipantBets, includeFinalScore: boolean) => {
    let sum = 0;
    if (bets.winner) sum += bets.winner.amount;
    if (bets.damage) sum += bets.damage.amount;
    if (bets.collisions) sum += bets.collisions.amount;
    if (bets.remainingHp) sum += bets.remainingHp.amount;
    if (includeFinalScore && bets.finalScore) sum += bets.finalScore.amount;
    return sum;
  };

  // Khởi tạo cược của Bot mỗi khi bước vào giai đoạn PREPARATION
  useEffect(() => {
    if (phase !== 'PREPARATION') return;
    setPrepCountdown(60);

    const botGenerated = generateBotBetsForRound({
      botBalance,
      playerBall,
      playerUpgrades,
      botBall,
      botUpgrades,
      roundNumber,
      existingFinalScoreBet: botBets.finalScore,
    });

    // Trừ tiền khóa cược của Bot trong ván này (không trừ lại cược tỉ số chung cuộc đã khóa từ ván 1)
    const newlyLockedBot =
      (botGenerated.bets.winner?.amount ?? 0) +
      (botGenerated.bets.damage?.amount ?? 0) +
      (botGenerated.bets.collisions?.amount ?? 0) +
      (botGenerated.bets.remainingHp?.amount ?? 0) +
      (roundNumber === 1 ? botGenerated.bets.finalScore?.amount ?? 0 : 0);

    setBotBalance((prev) => Math.max(0, prev - newlyLockedBot));
    setBotBets(botGenerated.bets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, roundNumber]);

  // Đếm ngược 60 giây chuẩn bị -> hết giờ tự động BẮT ĐẦU chiến đấu
  useEffect(() => {
    if (phase !== 'PREPARATION') return;
    const timer = window.setInterval(() => {
      setPrepCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleStartBattleRound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Lắng nghe phím Escape / P để tạm dừng khi đang chiến đấu
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phase === 'BATTLE' && (e.key === 'Escape' || e.key === 'p' || e.key === 'P')) {
        setIsPaused((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase]);

  // Chọn mức tiền cược theo phần trăm số dư khả dụng (25%, 50%, 75%, ALL IN)
  const handleSelectPercentageStake = (pct: number) => {
    sound.playClick();
    const amount = Math.floor(profile.balance * pct);
    setStakeInput(amount);
  };

  // Đặt hoặc cập nhật một loại cược trong giai đoạn PREPARATION
  const handleConfirmSingleBet = (category: BetCategory) => {
    if (phase !== 'PREPARATION') return;
    if (category === 'finalScore' && roundNumber > 1) return;

    const existingBet = playerBets[category];
    const previousAmount = existingBet?.amount ?? 0;
    const maxAllowed = profile.balance + previousAmount;
    const desiredAmount = Math.max(0, Math.min(maxAllowed, Math.round(stakeInput)));

    if (desiredAmount <= 0) {
      // Nếu đặt 0 -> hủy khoản cược đó và hoàn lại tiền đã giữ
      if (previousAmount > 0) {
        onUpdateBalanceAndStats({
          balanceChange: previousAmount,
          positiveRewardEarned: 0,
          betsPlacedCount: 0,
          betsWonCount: 0,
        });
        const nextBets = { ...playerBets };
        delete nextBets[category];
        setPlayerBets(nextBets);
      }
      setActiveBetModal(null);
      return;
    }

    const deltaBalance = previousAmount - desiredAmount;
    onUpdateBalanceAndStats({
      balanceChange: deltaBalance,
      positiveRewardEarned: 0,
      betsPlacedCount: 0,
      betsWonCount: 0,
    });

    sound.playCoin();
    const nextBets: ParticipantBets = { ...playerBets };
    if (category === 'winner') {
      nextBets.winner = {
        amount: desiredAmount,
        prediction: winnerDraft,
        locked: false,
      };
    } else if (category === 'damage') {
      nextBets.damage = {
        amount: desiredAmount,
        prediction: Math.max(0, Math.round(damageDraft)),
        locked: false,
      };
    } else if (category === 'collisions') {
      nextBets.collisions = {
        amount: desiredAmount,
        prediction: Math.max(0, Math.round(collisionDraft)),
        locked: false,
      };
    } else if (category === 'remainingHp') {
      nextBets.remainingHp = {
        amount: desiredAmount,
        prediction: Math.max(1, Math.min(100, Number(remainingHpDraft))),
        locked: false,
      };
    } else if (category === 'finalScore') {
      nextBets.finalScore = {
        amount: desiredAmount,
        prediction: finalScoreDraft,
        locked: false,
      };
    }

    setPlayerBets(nextBets);
    // Cập nhật lại stakeInput nếu lớn hơn số dư mới
    const newAvailable = profile.balance + deltaBalance;
    if (stakeInput > newAvailable) {
      setStakeInput(newAvailable);
    }
    setActiveBetModal(null);
  };

  // Bắt đầu ván đấu: Khóa tất cả các khoản cược và khởi chạy vật lý
  const handleStartBattleRound = () => {
    sound.playClick();
    setActiveBetModal(null);
    setIsPaused(false);
    simRef.current = createBattleSimulation(
      playerBall,
      playerUpgrades,
      botBall,
      botUpgrades
    );
    setPhase('BATTLE');
  };

  // Xử lý khi 1 ván đấu kết thúc
  const handleRoundFinished = (res: {
    winner: WinnerChoice;
    playerDamageDealt: number;
    botDamageDealt: number;
    collisionCount: number;
    winnerRemainingHp: number;
    winnerRemainingHpPct: number;
    durationSeconds: number;
  }) => {
    const nextPlayerWins = playerWins + (res.winner === 'PLAYER' ? 1 : 0);
    const nextBotWins = botWins + (res.winner === 'BOT' ? 1 : 0);
    const matchFinished = nextPlayerWins >= 3 || nextBotWins >= 3;

    let finalMatchScore: FinalScoreChoice | undefined;
    if (matchFinished) {
      if (nextPlayerWins === 3) {
        finalMatchScore = `PLAYER 3-${nextBotWins as 0 | 1 | 2} BOT`;
      } else {
        finalMatchScore = `BOT 3-${nextPlayerWins as 0 | 1 | 2} PLAYER`;
      }
    }

    const settlement = settleAllBetsForRound({
      playerBets,
      botBets,
      winner: res.winner,
      playerDamageDealt: res.playerDamageDealt,
      botDamageDealt: res.botDamageDealt,
      playerMaxHp: playerBall.baseHp,
      botMaxHp: botBall.baseHp,
      collisionCount: res.collisionCount,
      winnerRemainingHpPct: res.winnerRemainingHpPct,
      matchFinished,
      finalMatchScore,
    });

    // Cộng tiền thanh toán (payout) và tiền thưởng thắng trận theo cách biệt điểm số
    const betsCount = settlement.playerSettlements.length;
    const wonCount = settlement.playerSettlements.filter((s) => s.won).length;
    const matchWinBonus = matchFinished
      ? calculateMatchWinBonus(nextPlayerWins, nextBotWins)
      : 0;
    const botMatchWinBonus = matchFinished
      ? calculateMatchWinBonus(nextBotWins, nextPlayerWins)
      : 0;

    onUpdateBalanceAndStats({
      balanceChange: settlement.playerTotalPayout + matchWinBonus,
      positiveRewardEarned: settlement.playerPositiveRewardOnly + matchWinBonus,
      betsPlacedCount: betsCount,
      betsWonCount: wonCount,
    });

    // Cập nhật tiền của Bot
    setBotBalance((prev) =>
      Math.max(0, prev + settlement.botTotalPayout + botMatchWinBonus)
    );
    if (settlement.botNetProfit + botMatchWinBonus > 0) {
      setBotProfitEarned((prev) => prev + settlement.botNetProfit + botMatchWinBonus);
    }

    setPlayerWins(nextPlayerWins);
    setBotWins(nextBotWins);
    setNetMatchProfit((prev) => prev + settlement.playerNetProfit + matchWinBonus);

    setLastRoundSummary({
      roundNumber,
      winner: res.winner,
      playerDamageDealt: res.playerDamageDealt,
      botDamageDealt: res.botDamageDealt,
      collisionCount: res.collisionCount,
      winnerRemainingHp: res.winnerRemainingHp,
      winnerRemainingHpPct: res.winnerRemainingHpPct,
      durationSeconds: res.durationSeconds,
      playerSettlements: settlement.playerSettlements,
      botSettlements: settlement.botSettlements,
      playerNetRoundProfit: settlement.playerNetProfit + matchWinBonus,
      botNetRoundProfit: settlement.botNetProfit + botMatchWinBonus,
      matchWinBonus,
    });

    if (matchFinished) {
      setPhase('MATCH_RESULT');
    } else {
      setPhase('ROUND_RESULT');
    }
  };

  // Chuyển sang ván tiếp theo (giữ lại cược Tỉ số chung cuộc đã khóa từ ván 1)
  const handleProceedNextRound = () => {
    sound.playClick();
    const preservedFinalScore = playerBets.finalScore;
    setPlayerBets(preservedFinalScore ? { finalScore: preservedFinalScore } : {});
    setRoundNumber((r) => r + 1);
    simRef.current = createBattleSimulation(
      playerBall,
      playerUpgrades,
      botBall,
      botUpgrades
    );
    setPhase('PREPARATION');
  };

  const formatTimer = (sec: number) => {
    const s = Math.max(0, Math.ceil(sec));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const betCardsConfig: Array<{
    category: BetCategory;
    title: string;
    subtitle: string;
  }> = [
    {
      category: 'winner',
      title: '1. AI THẮNG?',
      subtitle: 'Dự đoán bên thắng ván',
    },
    {
      category: 'damage',
      title: '2. LƯỢNG SÁT THƯƠNG',
      subtitle: 'Ngưỡng chuẩn ±5% HP đối thủ',
    },
    {
      category: 'collisions',
      title: '3. SỐ LẦN VA CHẠM',
      subtitle: 'Ngưỡng chuẩn ±10% va chạm',
    },
    {
      category: 'remainingHp',
      title: '4. MÁU CÒN LẠI',
      subtitle: 'Ngưỡng ±5% máu người thắng',
    },
    {
      category: 'finalScore',
      title: '5. TỈ SỐ CHUNG CUỘC',
      subtitle: 'Cược cả trận · Thưởng 500%',
    },
  ];

  return (
    <div className="relative w-full h-full flex flex-col justify-between bg-[#09090d] text-zinc-100 p-3 select-none overflow-hidden">
      {/* PHẦN TRÊN & CHÍNH GIỮA: Chia 3 cột (Trái: Bot | Giữa: Đồng hồ, Tỉ số, Đấu trường, Kỹ năng | Phải: Người chơi & Mức cược) */}
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        {/* CỘT TRÁI (3 cột): THÔNG TIN BOT — Sắp xếp từ phải sang trái đối xứng với người chơi */}
        <div className="col-span-3 flex flex-col justify-between bg-zinc-900/95 border-4 border-black p-3.5 shadow-[5px_5px_0px_#000] text-right">
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-2">
              <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-600 text-[10px] font-mono text-zinc-300">
                AI BOT
              </span>
              <div>
                <div className="text-[10px] text-zinc-400 font-bold">ĐỐI THỦ</div>
                <div
                  className="text-base font-extrabold text-white truncate max-w-[175px]"
                  data-testid="bot-name"
                >
                  {botName}
                </div>
              </div>
            </div>

            {/* Tiền B Bot đang sở hữu */}
            <div className="bg-zinc-950 border-2 border-black p-2 flex items-center justify-between">
              <CoinBIcon size={18} />
              <div className="text-right">
                <div className="text-[10px] text-zinc-400">SỐ DƯ BOT</div>
                <div className="font-mono text-xs font-extrabold text-yellow-400 tabular-nums">
                  {formatCurrencyB(botBalance)}
                </div>
              </div>
            </div>

            {/* Sao người chơi của Bot: Sao 3 cánh */}
            <div className="bg-zinc-950 border-2 border-black p-2 flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-bold">SAO BOT</span>
              <PlayerStarRow stars={botStars} size={17} />
            </div>

            {/* Sao quả bóng Bot đang sử dụng: Sao 4 cánh */}
            <div className="bg-zinc-950 border-2 border-black p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-zinc-400 font-bold">BÓNG BOT</span>
                <span className="text-xs font-extrabold text-sky-400 truncate">
                  {botBall.vietnameseTitle}
                </span>
              </div>
              <div className="flex justify-end">
                <BallStarRow stars={botBallStars} size={14} />
              </div>
            </div>
          </div>

          {/* Các thông tin đặt cược của Bot */}
          <div className="bg-zinc-950 border-2 border-black p-2.5 space-y-1.5">
            <div className="text-[11px] font-extrabold text-zinc-300 border-b border-zinc-800 pb-1">
              DỰ ĐOÁN CỦA BOT (VÁN {roundNumber})
            </div>
            <div className="text-[11px] flex items-center justify-between">
              <span className="font-mono text-zinc-400">
                {botBets.winner ? `${formatCompactB(botBets.winner.amount)} (${botBets.winner.prediction})` : '—'}
              </span>
              <span className="text-zinc-300 font-semibold">Ai thắng:</span>
            </div>
            <div className="text-[11px] flex items-center justify-between">
              <span className="font-mono text-zinc-400">
                {botBets.damage ? `${formatCompactB(botBets.damage.amount)} (${botBets.damage.prediction} ST)` : '—'}
              </span>
              <span className="text-zinc-300 font-semibold">Sát thương:</span>
            </div>
            <div className="text-[11px] flex items-center justify-between">
              <span className="font-mono text-zinc-400">
                {botBets.collisions ? `${formatCompactB(botBets.collisions.amount)} (${botBets.collisions.prediction} lần)` : '—'}
              </span>
              <span className="text-zinc-300 font-semibold">Va chạm:</span>
            </div>
            <div className="text-[11px] flex items-center justify-between">
              <span className="font-mono text-zinc-400">
                {botBets.remainingHp ? `${formatCompactB(botBets.remainingHp.amount)} (${botBets.remainingHp.prediction}%)` : '—'}
              </span>
              <span className="text-zinc-300 font-semibold">Máu còn:</span>
            </div>
            <div className="text-[11px] flex items-center justify-between">
              <span className="font-mono text-yellow-400">
                {botBets.finalScore ? `${formatCompactB(botBets.finalScore.amount)} (${botBets.finalScore.prediction})` : '—'}
              </span>
              <span className="text-zinc-300 font-semibold">Chung cuộc:</span>
            </div>
          </div>

          {/* Nút điều khiển nhanh góc dưới cột trái */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                const refund = getLockedRoundStake(playerBets, roundNumber === 1);
                onAbortMatchToMenu(refund);
              }}
              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-red-700 text-zinc-200 text-[11px] font-bold border-2 border-black cursor-pointer"
            >
              RỜI BÀN
            </button>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setSimSpeed((s) => (s === 1 ? 2 : 1));
                }}
                className={`px-2.5 py-1.5 text-[11px] font-mono font-bold border-2 border-black cursor-pointer ${
                  simSpeed === 2
                    ? 'bg-yellow-500 text-black'
                    : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                TỐC ĐỘ x{simSpeed}
              </button>
              {phase === 'BATTLE' && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setIsPaused((p) => !p);
                  }}
                  className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] font-bold border-2 border-black cursor-pointer"
                >
                  {isPaused ? 'TIẾP TỤC' : 'TẠM DỪNG'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* KHU VỰC CHÍNH GIỮA (6 cột): Đồng hồ, Tỉ số, Đấu trường hình vuông, và Kỹ năng sắp sử dụng */}
        <div className="col-span-6 flex flex-col items-center justify-between min-h-0">
          {/* Chính giữa phía trên: Đồng hồ đếm ngược & Tỉ số trận */}
          <div className="w-full flex items-center justify-between bg-zinc-900 border-3 border-black px-4 py-1.5 shadow-[4px_4px_0px_#000] shrink-0">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 bg-red-600 text-white font-extrabold text-xs border border-black">
                VÁN {roundNumber} / 5
              </span>
              <span className="text-xs font-mono text-zinc-300 tabular-nums">
                Va chạm: <strong className="text-white">{hud.collisionCount}</strong> · ST Bạn:{' '}
                <strong className="text-red-400">{Math.round(hud.playerDamageDealt)}</strong>
              </span>
            </div>

            {/* Đồng hồ đếm ngược */}
            <div className="flex flex-col items-center">
              <div className="font-mono text-xl font-black tracking-wider text-yellow-400 tabular-nums leading-none">
                {phase === 'PREPARATION'
                  ? `CHUẨN BỊ ${formatTimer(prepCountdown)}`
                  : formatTimer(hud.remainingTime)}
              </div>
              {/* Bên dưới đồng hồ là tỉ số trận: PLAYER X — Y BOT */}
              <div
                className="text-xs font-extrabold tracking-widest text-white mt-0.5 tabular-nums"
                data-testid="match-score-banner"
              >
                {profile.name} <span className="text-red-500 text-sm">{playerWins}</span> —{' '}
                <span className="text-sky-400 text-sm">{botWins}</span> BOT
              </div>
            </div>

            <div className="text-xs font-mono text-zinc-300 tabular-nums">
              ST Bot: <strong className="text-sky-400">{Math.round(hud.botDamageDealt)}</strong>
            </div>
          </div>

          {/* Bàn đấu hình vuông đặt chính giữa, hơi dịch lên trên */}
          <div className="relative flex-1 flex items-center justify-center min-h-0 py-1.5 aspect-square max-h-full">
            <BattleArenaCanvas
              simRef={simRef}
              isBattleActive={phase === 'BATTLE'}
              isPaused={isPaused}
              speedMultiplier={simSpeed}
              onHudUpdate={setHud}
              onRoundFinished={handleRoundFinished}
            />

            {/* Nút BẮT ĐẦU đặt chính giữa bàn đấu trong giai đoạn chuẩn bị cược */}
            {phase === 'PREPARATION' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 p-4 text-center">
                <div className="bg-zinc-900/95 border-4 border-black p-5 shadow-[8px_8px_0px_#000] max-w-sm">
                  <div className="text-xs font-bold text-yellow-400 tracking-wider mb-1">
                    GIAI ĐOẠN CHUẨN BỊ & ĐẶT CƯỢC (CÒN {prepCountdown}S)
                  </div>
                  <p className="text-xs text-zinc-300 mb-4">
                    Chọn mức tiền ở cột phải và nhấn vào 5 ô cược phía dưới để đặt cược. Nhấn BẮT ĐẦU để khóa cược và giao chiến!
                  </p>
                  <button
                    type="button"
                    data-testid="start-battle-btn"
                    onClick={handleStartBattleRound}
                    className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xl tracking-widest border-4 border-black shadow-[5px_5px_0px_#000] cursor-pointer active:translate-y-0.5 transition-all"
                  >
                    BẮT ĐẦU
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bên dưới đấu trường: Kỹ năng sắp sử dụng (Trái: Bot | Phải: Người chơi) */}
          <div className="w-full grid grid-cols-2 gap-3 shrink-0">
            {/* Phía trái: Kỹ năng tiếp theo của Bot */}
            <div className="bg-zinc-900 border-2 border-black px-3 py-1.5 flex items-center justify-between min-h-[52px]">
              {hud.botNextSkill ? (
                <>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <SkillIconBox skill={hud.botNextSkill.skill} size={34} />
                    <div className="min-w-0">
                      <div className="text-[10px] text-sky-400 font-bold">
                        CHIÊU TIẾP THEO (BOT)
                      </div>
                      <div className="text-xs font-extrabold text-white truncate">
                        {hud.botNextSkill.skill.name}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-extrabold text-yellow-400 tabular-nums shrink-0">
                    {hud.botNextSkill.remainingSeconds.toFixed(1)}s
                  </span>
                </>
              ) : (
                <span className="text-xs text-zinc-500">Không có kỹ năng chờ</span>
              )}
            </div>

            {/* Phía phải: Kỹ năng tiếp theo của Người chơi */}
            <div className="bg-zinc-900 border-2 border-black px-3 py-1.5 flex items-center justify-between min-h-[52px]">
              {hud.playerNextSkill ? (
                <>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <SkillIconBox skill={hud.playerNextSkill.skill} size={34} />
                    <div className="min-w-0">
                      <div className="text-[10px] text-red-400 font-bold">
                        CHIÊU TIẾP THEO ({profile.name})
                      </div>
                      <div className="text-xs font-extrabold text-white truncate">
                        {hud.playerNextSkill.skill.name}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-extrabold text-yellow-400 tabular-nums shrink-0">
                    {hud.playerNextSkill.remainingSeconds.toFixed(1)}s
                  </span>
                </>
              ) : (
                <span className="text-xs text-zinc-500">Không có kỹ năng chờ</span>
              )}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (3 cột): THÔNG TIN NGƯỜI CHƠI (Dòng 1 -> Dòng 9) */}
        <div className="col-span-3 flex flex-col justify-between bg-zinc-900/95 border-4 border-black p-3.5 shadow-[5px_5px_0px_#000] text-left">
          <div className="space-y-1.5">
            {/* Dòng 1: Tên người chơi */}
            <div className="bg-zinc-950 border-2 border-black px-3 py-1.5 flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-bold">NGƯỜI CHƠI</span>
              <span className="text-base font-extrabold text-red-400 truncate max-w-[160px]">
                {profile.name}
              </span>
            </div>

            {/* Dòng 2: Tiền B đang sở hữu */}
            <div className="bg-zinc-950 border-2 border-black px-3 py-1.5 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-[10px] text-zinc-400">TIỀN KHẢ DỤNG</div>
                <div className="font-mono text-xs font-extrabold text-yellow-400 tabular-nums truncate">
                  {formatCurrencyB(profile.balance)}
                </div>
              </div>
              <CoinBIcon size={20} />
            </div>

            {/* Dòng 3: Sao người chơi (sao 3 cánh) */}
            <div className="bg-zinc-950 border-2 border-black px-3 py-1.5 flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-bold">SAO CỦA BẠN</span>
              <PlayerStarRow stars={playerStars} size={17} />
            </div>

            {/* Dòng 4: Sao của quả bóng (sao 4 cánh) */}
            <div className="bg-zinc-950 border-2 border-black px-3 py-1.5">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-zinc-400 font-bold">BÓNG</span>
                <span className="text-xs font-extrabold text-red-400 truncate">
                  {playerBall.vietnameseTitle}
                </span>
              </div>
              <BallStarRow stars={playerBallStars} size={14} />
            </div>
          </div>

          {/* Dòng 5–9: Các mức cược thể hiện bằng những hình chữ nhật riêng biệt */}
          <div className="space-y-1.5 pt-2 border-t-2 border-zinc-800">
            <div className="text-[10px] font-extrabold text-zinc-400 tracking-wider">
              BỘ CHỌN TIỀN CƯỢC (NHẤN ĐỂ ÁP DỤNG)
            </div>

            {/* Dòng 5: Dòng chọn/nhập số tiền cược bằng bàn phím */}
            <div className="bg-zinc-950 border-2 border-black px-2.5 py-1.5">
              <label
                htmlFor="bet-stake-input"
                className="block text-[10px] text-zinc-400 font-bold mb-0.5"
              >
                NHẬP SỐ TIỀN CƯỢC (B):
              </label>
              <input
                id="bet-stake-input"
                type="number"
                min={0}
                max={profile.balance}
                step={1_000_000}
                disabled={phase !== 'PREPARATION'}
                value={stakeInput}
                onChange={(e) => {
                  const val = Math.max(0, Math.round(Number(e.target.value) || 0));
                  setStakeInput(Math.min(profile.balance, val));
                }}
                className="w-full bg-zinc-900 border border-zinc-700 px-2 py-1 font-mono text-xs font-extrabold text-yellow-400 focus:border-red-500 focus:outline-none tabular-nums"
              />
            </div>

            {/* Dòng 6: Cược 25% */}
            <button
              type="button"
              disabled={phase !== 'PREPARATION'}
              onClick={() => handleSelectPercentageStake(0.25)}
              className="w-full py-1.5 px-3 bg-zinc-800 hover:bg-red-600 disabled:opacity-50 text-white font-extrabold text-xs border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-between cursor-pointer transition-colors"
            >
              <span>CƯỢC 25%</span>
              <span className="font-mono text-[11px] text-yellow-300 tabular-nums">
                {formatCompactB(Math.floor(profile.balance * 0.25))}
              </span>
            </button>

            {/* Dòng 7: Cược 50% */}
            <button
              type="button"
              disabled={phase !== 'PREPARATION'}
              onClick={() => handleSelectPercentageStake(0.5)}
              className="w-full py-1.5 px-3 bg-zinc-800 hover:bg-red-600 disabled:opacity-50 text-white font-extrabold text-xs border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-between cursor-pointer transition-colors"
            >
              <span>CƯỢC 50%</span>
              <span className="font-mono text-[11px] text-yellow-300 tabular-nums">
                {formatCompactB(Math.floor(profile.balance * 0.5))}
              </span>
            </button>

            {/* Dòng 8: Cược 75% */}
            <button
              type="button"
              disabled={phase !== 'PREPARATION'}
              onClick={() => handleSelectPercentageStake(0.75)}
              className="w-full py-1.5 px-3 bg-zinc-800 hover:bg-red-600 disabled:opacity-50 text-white font-extrabold text-xs border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-between cursor-pointer transition-colors"
            >
              <span>CƯỢC 75%</span>
              <span className="font-mono text-[11px] text-yellow-300 tabular-nums">
                {formatCompactB(Math.floor(profile.balance * 0.75))}
              </span>
            </button>

            {/* Dòng 9: ALL IN */}
            <button
              type="button"
              disabled={phase !== 'PREPARATION'}
              onClick={() => handleSelectPercentageStake(1.0)}
              className="w-full py-1.5 px-3 bg-red-700 hover:bg-red-500 disabled:opacity-50 text-white font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-between cursor-pointer transition-colors"
            >
              <span>ALL IN (100%)</span>
              <span className="font-mono text-[11px] text-yellow-200 tabular-nums">
                {formatCompactB(profile.balance)}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* DẢI PHÍA DƯỚI: 5 LOẠI CƯỢC CÙNG CHIP ĐỎ (PLAYER) & CHIP ĐEN (BOT) */}
      <div className="pt-2.5 shrink-0">
        <div className="grid grid-cols-5 gap-2.5">
          {betCardsConfig.map(({ category, title, subtitle }) => {
            const pBet = playerBets[category];
            const bBet = botBets[category];
            const isFinalScoreLocked = category === 'finalScore' && roundNumber > 1;
            const canClick = phase === 'PREPARATION' && !isFinalScoreLocked;

            return (
              <button
                key={category}
                type="button"
                disabled={!canClick}
                onClick={() => {
                  sound.playClick();
                  setActiveBetModal(category);
                }}
                className={`relative flex flex-col justify-between p-2.5 text-left border-3 border-black shadow-[4px_4px_0px_#000] transition-all ${
                  pBet && pBet.amount > 0
                    ? 'bg-red-950/45 border-red-500'
                    : 'bg-zinc-900 hover:bg-zinc-800'
                } ${canClick ? 'cursor-pointer' : 'opacity-85 cursor-not-allowed'}`}
              >
                {/* Hàng hiển thị Chip Đỏ (Player) và Chip Đen (Bot) bên trên mỗi khu vực cược */}
                <div className="flex items-center justify-between w-full mb-1 min-h-[24px]">
                  <div className="flex items-center gap-1">
                    {pBet && pBet.amount > 0 ? (
                      <BetChipStack owner="PLAYER" amount={pBet.amount} />
                    ) : (
                      <span className="text-[10px] text-zinc-500">Chưa cược</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {bBet && bBet.amount > 0 && (
                      <BetChipStack owner="BOT" amount={bBet.amount} />
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-extrabold text-white tracking-wide">
                    {title}
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate">{subtitle}</div>
                </div>

                <div className="mt-1.5 pt-1.5 border-t border-zinc-800 w-full space-y-0.5 text-[11px] font-mono tabular-nums">
                  <div className="flex items-center justify-between text-red-300">
                    <span>Bạn:</span>
                    <span className="font-bold">
                      {pBet && pBet.amount > 0
                        ? `${formatCompactB(pBet.amount)} [${pBet.prediction}]`
                        : '0 B'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Bot:</span>
                    <span>
                      {bBet && bBet.amount > 0
                        ? `${formatCompactB(bBet.amount)} [${bBet.prediction}]`
                        : '0 B'}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* BẢNG NHỎ ĐẶT CƯỢC CHI TIẾT KHI NHẤN VÀO MỘT TRONG 5 LOẠI CƯỢC */}
      {activeBetModal && phase === 'PREPARATION' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Thiết lập dự đoán cược"
        >
          <div className="w-full max-w-md bg-zinc-900 border-4 border-black shadow-[8px_8px_0px_#000] p-5 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-2">
              <h3 className="text-lg font-extrabold text-red-400">
                {betCardsConfig.find((c) => c.category === activeBetModal)?.title}
              </h3>
              <button
                type="button"
                onClick={() => setActiveBetModal(null)}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-red-600 text-xs font-bold border border-black cursor-pointer"
              >
                ĐÓNG
              </button>
            </div>

            {/* Lựa chọn dự đoán tùy theo từng loại cược */}
            {activeBetModal === 'winner' && (
              <div className="space-y-2">
                <div className="text-xs text-zinc-300">
                  Chọn quả bóng sẽ chiến thắng ván {roundNumber}:
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(['PLAYER', 'BOT'] as WinnerChoice[]).map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => setWinnerDraft(choice)}
                      className={`py-2.5 font-extrabold text-sm border-3 border-black cursor-pointer ${
                        winnerDraft === choice
                          ? 'bg-red-600 text-white shadow-[3px_3px_0px_#000]'
                          : 'bg-zinc-950 text-zinc-400'
                      }`}
                    >
                      {choice === 'PLAYER' ? `PLAYER (${playerBall.vietnameseTitle})` : `BOT (${botBall.vietnameseTitle})`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeBetModal === 'damage' && (
              <div className="space-y-2">
                <label className="block text-xs text-zinc-300">
                  Dự đoán tổng sát thương bóng của bạn gây ra (Máu tối đa đối thủ: {botBall.baseHp} HP, sai số chuẩn ±5%):
                </label>
                <input
                  type="number"
                  min={0}
                  max={5000}
                  value={damageDraft}
                  onChange={(e) => setDamageDraft(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-zinc-950 border-2 border-black font-mono text-base font-bold text-white"
                />
              </div>
            )}

            {activeBetModal === 'collisions' && (
              <div className="space-y-2">
                <label className="block text-xs text-zinc-300">
                  Dự đoán số lần thân hai quả bóng va chạm trực tiếp (Ngưỡng chuẩn ±10%):
                </label>
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={collisionDraft}
                  onChange={(e) => setCollisionDraft(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-zinc-950 border-2 border-black font-mono text-base font-bold text-white"
                />
              </div>
            )}

            {activeBetModal === 'remainingHp' && (
              <div className="space-y-2">
                <label className="block text-xs text-zinc-300">
                  Dự đoán % máu còn lại của quả bóng chiến thắng (1% – 100%, ngưỡng chuẩn ±5%):
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={remainingHpDraft}
                  onChange={(e) => setRemainingHpDraft(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-zinc-950 border-2 border-black font-mono text-base font-bold text-white"
                />
              </div>
            )}

            {activeBetModal === 'finalScore' && (
              <div className="space-y-2">
                <div className="text-xs text-zinc-300">
                  Dự đoán tỉ số chung cuộc của loạt trận 5 ván (Thắng nhận 500% tiền cược):
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {FINAL_SCORE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFinalScoreDraft(opt)}
                      className={`py-2 px-2 text-xs font-mono font-extrabold border-2 border-black cursor-pointer ${
                        finalScoreDraft === opt
                          ? 'bg-red-600 text-white'
                          : 'bg-zinc-950 text-zinc-400'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chỉnh số tiền cược ngay trong hộp thoại */}
            <div className="pt-2 border-t border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Số tiền đặt cược (B):</span>
                <span className="font-mono text-yellow-400 font-bold">
                  Khả dụng: {formatCurrencyB(profile.balance + (playerBets[activeBetModal]?.amount ?? 0))}
                </span>
              </div>
              <input
                type="number"
                min={0}
                max={profile.balance + (playerBets[activeBetModal]?.amount ?? 0)}
                step={1_000_000}
                value={stakeInput}
                onChange={(e) => setStakeInput(Math.max(0, Math.round(Number(e.target.value) || 0)))}
                className="w-full px-3 py-2 bg-zinc-950 border-2 border-black font-mono text-sm font-bold text-yellow-400"
              />
              <div className="grid grid-cols-4 gap-1.5">
                {[0.25, 0.5, 0.75, 1].map((pct) => {
                  const pool = profile.balance + (playerBets[activeBetModal]?.amount ?? 0);
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setStakeInput(Math.floor(pool * pct))}
                      className="py-1 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold border border-black cursor-pointer"
                    >
                      {pct === 1 ? 'ALL IN' : `${pct * 100}%`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              {playerBets[activeBetModal] && (
                <button
                  type="button"
                  onClick={() => {
                    setStakeInput(0);
                    const prevAmt = playerBets[activeBetModal]?.amount ?? 0;
                    if (prevAmt > 0) {
                      onUpdateBalanceAndStats({
                        balanceChange: prevAmt,
                        positiveRewardEarned: 0,
                        betsPlacedCount: 0,
                        betsWonCount: 0,
                      });
                    }
                    const next = { ...playerBets };
                    delete next[activeBetModal];
                    setPlayerBets(next);
                    setActiveBetModal(null);
                  }}
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold border-2 border-black cursor-pointer"
                >
                  HỦY CƯỢC NÀY
                </button>
              )}
              <button
                type="button"
                onClick={() => handleConfirmSingleBet(activeBetModal)}
                className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-extrabold text-sm border-2 border-black shadow-[3px_3px_0px_#000] cursor-pointer"
              >
                XÁC NHẬN ĐẶT CƯỢC
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BẢNG KẾT QUẢ VÁN ĐẤU (ROUND_RESULT) HOẶC KẾT QUẢ CHUNG CUỘC (MATCH_RESULT) */}
      {(phase === 'ROUND_RESULT' || phase === 'MATCH_RESULT') && lastRoundSummary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Kết quả ván đấu"
        >
          <div className="w-full max-w-2xl bg-zinc-900 border-4 border-black shadow-[10px_10px_0px_#000] p-6 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-3">
              <div>
                <div className="text-xs font-bold text-zinc-400">
                  {phase === 'MATCH_RESULT'
                    ? 'KẾT THÚC TRẬN ĐẤU (CHẠM 3 CHIẾN THẮNG)'
                    : `TỔNG KẾT VÁN ${lastRoundSummary.roundNumber}`}
                </div>
                <h2 className="text-2xl font-black tracking-wide text-white">
                  {lastRoundSummary.winner === 'PLAYER'
                    ? `${profile.name} THẮNG VÁN ${lastRoundSummary.roundNumber}!`
                    : `BOT (${botName}) THẮNG VÁN ${lastRoundSummary.roundNumber}!`}
                </h2>
              </div>
              <div className="text-right font-mono">
                <div className="text-xs text-zinc-400">TỈ SỐ HIỆN TẠI</div>
                <div className="text-xl font-black text-yellow-400 tabular-nums">
                  {playerWins} — {botWins}
                </div>
              </div>
            </div>

            {/* Thông số thực tế của ván đấu */}
            <div className="grid grid-cols-4 gap-2.5 text-center font-mono">
              <div className="bg-zinc-950 border-2 border-black p-2">
                <div className="text-[10px] text-zinc-400">NGƯỜI THẮNG</div>
                <div className="text-sm font-bold text-white">
                  {lastRoundSummary.winner}
                </div>
              </div>
              <div className="bg-zinc-950 border-2 border-black p-2">
                <div className="text-[10px] text-zinc-400">SÁT THƯƠNG BẠN</div>
                <div className="text-sm font-bold text-red-400">
                  {Math.round(lastRoundSummary.playerDamageDealt)} ST
                </div>
              </div>
              <div className="bg-zinc-950 border-2 border-black p-2">
                <div className="text-[10px] text-zinc-400">SỐ VA CHẠM</div>
                <div className="text-sm font-bold text-yellow-400">
                  {lastRoundSummary.collisionCount} lần
                </div>
              </div>
              <div className="bg-zinc-950 border-2 border-black p-2">
                <div className="text-[10px] text-zinc-400">MÁU CÒN LẠI</div>
                <div className="text-sm font-bold text-emerald-400">
                  {lastRoundSummary.winnerRemainingHpPct}% ({lastRoundSummary.winnerRemainingHp} HP)
                </div>
              </div>
            </div>

            {/* Chi tiết thanh toán cược của Người chơi */}
            <div className="bg-zinc-950 border-2 border-black p-3 max-h-52 overflow-y-auto">
              <div className="text-xs font-extrabold text-zinc-300 mb-2">
                KẾT QUẢ THANH TOÁN CƯỢC CỦA BẠN:
              </div>
              {lastRoundSummary.playerSettlements.length === 0 ? (
                <div className="text-xs text-zinc-500 py-2">
                  Bạn không đặt cược ở ván này.
                </div>
              ) : (
                <div className="space-y-1.5 text-xs font-mono tabular-nums">
                  {lastRoundSummary.playerSettlements.map((s, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between border-b border-zinc-800 pb-1"
                    >
                      <div>
                        <span className="font-bold text-white">{s.label}</span>
                        <span className="text-zinc-400 ml-2">
                          (Dự đoán: {s.predictionText} → Thực tế: {s.actualText})
                        </span>
                      </div>
                      <span
                        className={`font-extrabold ${
                          s.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {s.netProfit >= 0 ? '+' : ''}
                        {formatCurrencyB(s.netProfit)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {phase === 'MATCH_RESULT' && (
              <div className="bg-zinc-950 border-2 border-yellow-500/80 p-3 flex items-center justify-between font-mono text-xs">
                <div>
                  <div className="font-extrabold text-yellow-400">
                    THƯỞNG THẮNG TRẬN THEO CÁCH BIỆT ĐIỂM SỐ ({playerWins} — {botWins})
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Cách biệt 1 điểm: +500.000 B • 2 điểm: +1.000.000 B • 3 điểm: +10.000.000 B
                  </div>
                </div>
                <div
                  className={`text-sm font-black tabular-nums ${
                    (lastRoundSummary.matchWinBonus ?? 0) > 0
                      ? 'text-emerald-400'
                      : 'text-zinc-500'
                  }`}
                >
                  {(lastRoundSummary.matchWinBonus ?? 0) > 0
                    ? `+${formatCurrencyB(lastRoundSummary.matchWinBonus ?? 0)}`
                    : '0 B'}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="font-mono text-sm">
                Lợi nhuận ròng ván này:{' '}
                <strong
                  className={
                    lastRoundSummary.playerNetRoundProfit >= 0
                      ? 'text-emerald-400'
                      : 'text-red-400'
                  }
                >
                  {lastRoundSummary.playerNetRoundProfit >= 0 ? '+' : ''}
                  {formatCurrencyB(lastRoundSummary.playerNetRoundProfit)}
                </strong>
              </div>

              {phase === 'ROUND_RESULT' ? (
                <button
                  type="button"
                  onClick={handleProceedNextRound}
                  className="px-8 py-2.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-sm border-3 border-black shadow-[4px_4px_0px_#000] cursor-pointer"
                >
                  CHUẨN BỊ VÁN TIẾP THEO (VÁN {roundNumber + 1})
                </button>
              ) : (
                <button
                  type="button"
                  data-start="true"
                  onClick={() => {
                    sound.playClick();
                    onFinishMatch({
                      playerWins,
                      botWins,
                      netMatchProfit,
                      wonMatch: playerWins > botWins,
                    });
                  }}
                  className="px-8 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm border-3 border-black shadow-[4px_4px_0px_#000] cursor-pointer"
                >
                  HOÀN TẤT TRẬN ĐẤU & VỀ SẢNH
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
