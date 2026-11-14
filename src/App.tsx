import React, { useEffect, useMemo, useState } from 'react';
import { BALL_CATALOG } from './game/constants';
import {
  calculatePlayerStars,
  evaluateBallScoreAndStars,
  formatCurrencyB,
  pickNextBotName,
  selectBotBallAndUpgrades,
} from './game/rules';
import { sound } from './game/sound';
import {
  loadPlayerProfile,
  resetPlayerProfile,
  savePlayerProfile,
} from './game/storage';
import {
  BallDefinition,
  BallUpgradeLevels,
  GameScreenState,
  PlayerProfile,
} from './game/types';
import {
  BallSelectionView,
  CollectionView,
  ShopView,
} from './components/CollectionAndShopModal';
import { BattleMatchView } from './components/BattleMatchView';
import { BackgroundMusicPlayer } from './components/BackgroundMusicPlayer';
import {
  computeEffectiveMusicVolume,
  resolveMusicTrackForState,
} from './game/music';
import {
  CoinBIcon,
  HandDrawnBallIllustration,
  PlayerStarRow,
  Star4Pointed,
} from './components/HandDrawnIcons';
import { TacticalAiModal } from './components/TacticalAiModal';
import {
  Volume2,
  VolumeX,
  Settings,
  Edit3,
  Check,
  Sparkles,
  History,
  Trash2,
} from 'lucide-react';

export default function App() {
  const [profile, setProfile] = useState<PlayerProfile>(() => loadPlayerProfile());
  const [screen, setScreen] = useState<GameScreenState>('MAIN_MENU');

  // Chỉnh sửa tên trực tiếp ngay tại sảnh chính
  const [isEditingNameInline, setIsEditingNameInline] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.name);

  // Modal cài đặt, lịch sử và AI chiến thuật
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  // Thông tin trận đấu đang diễn ra
  const [activeMatch, setActiveMatch] = useState<{
    playerBall: BallDefinition;
    botName: string;
    botBall: BallDefinition;
    botUpgrades: BallUpgradeLevels;
  } | null>(null);

  // Trạng thái nhạc nền trận đấu (chuyển sang nhạc trận từ lúc bắt đầu giao chiến)
  const [matchBattleActive, setMatchBattleActive] = useState(false);
  const [matchPaused, setMatchPaused] = useState(false);

  // Đồng bộ âm thanh và lưu LocalStorage mỗi khi profile thay đổi
  useEffect(() => {
    sound.enabled = profile.soundEnabled;
    sound.volume = profile.soundVolume;
    sound.setMusicVolume(
      computeEffectiveMusicVolume(
        profile.soundEnabled,
        profile.musicEnabled,
        profile.musicVolume
      )
    );
    savePlayerProfile(profile);
  }, [profile]);

  const activeMusicTrack = resolveMusicTrackForState(screen, matchBattleActive);
  const effectiveMusicVolume = computeEffectiveMusicVolume(
    profile.soundEnabled,
    profile.musicEnabled,
    profile.musicVolume
  );

  // Đồng bộ document.body.dataset.state phục vụ kiểm thử tự động
  useEffect(() => {
    if (screen === 'MAIN_MENU') {
      document.body.dataset.state = 'title';
    } else if (screen === 'PREPARATION' || screen === 'BATTLE') {
      document.body.dataset.state = 'playing';
    } else if (screen === 'ROUND_RESULT' || screen === 'MATCH_RESULT') {
      document.body.dataset.state = 'gameover';
    } else {
      document.body.dataset.state = 'playing';
    }
  }, [screen]);

  // Tính toán danh sách bóng sở hữu và quả bóng mạnh nhất (hiển thị dưới nút XEM BÓNG)
  const ownedBallsWithStars = useMemo(() => {
    const owned = BALL_CATALOG.filter((b) => profile.ownedBallIds.includes(b.id));
    const list = (owned.length > 0 ? owned : [BALL_CATALOG[0]]).map((ball) => {
      const upg = profile.upgrades[ball.id];
      const evalRes = evaluateBallScoreAndStars(ball, upg);
      return {
        ball,
        upgrades: upg,
        stars: evalRes.stars,
        totalScore: evalRes.totalScore,
      };
    });
    list.sort((a, b) => b.totalScore - a.totalScore);
    return list;
  }, [profile.ownedBallIds, profile.upgrades]);

  const strongestOwned = ownedBallsWithStars[0];
  const playerStars = calculatePlayerStars(profile.totalProfitEarned);

  // Hỗ trợ ?autostart=1 và phím Enter / Space tại sảnh chính
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1' && screen === 'MAIN_MENU') {
      const pBall = strongestOwned.ball;
      const pUpg = profile.upgrades[pBall.id];
      const botPicked = selectBotBallAndUpgrades(pBall, pUpg);
      const { botName, updatedUsedNames } = pickNextBotName(profile.usedBotNames);
      setProfile((prev) => ({ ...prev, usedBotNames: updatedUsedNames }));
      setActiveMatch({
        playerBall: pBall,
        botName,
        botBall: botPicked.ball,
        botUpgrades: botPicked.upgrades,
      });
      setScreen('PREPARATION');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        screen === 'MAIN_MENU' &&
        !isEditingNameInline &&
        !showSettingsModal &&
        !showAiModal &&
        (e.key === 'Enter' || e.key === ' ')
      ) {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'button') {
          return;
        }
        e.preventDefault();
        sound.playClick();
        setScreen('BALL_SELECTION');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, isEditingNameInline, showSettingsModal, showAiModal]);

  const handleSavePlayerName = () => {
    sound.playClick();
    const trimmed = nameDraft.trim().slice(0, 20) || 'PLAYER';
    setProfile((prev) => ({ ...prev, name: trimmed }));
    setNameDraft(trimmed);
    setIsEditingNameInline(false);
  };

  const handleUpgradeStat = (
    ballId: string,
    statKey: keyof BallUpgradeLevels,
    cost: number
  ) => {
    setProfile((prev) => {
      const curUpg = prev.upgrades[ballId] ?? {
        defense: 0,
        basicDamage: 0,
        cooldown: 0,
      };
      if (curUpg[statKey] >= 5 || prev.balance < cost) return prev;
      return {
        ...prev,
        balance: prev.balance - cost,
        upgrades: {
          ...prev.upgrades,
          [ballId]: {
            ...curUpg,
            [statKey]: curUpg[statKey] + 1,
          },
        },
      };
    });
  };

  const handleBuyBall = (ballId: string, price: number) => {
    setProfile((prev) => {
      if (prev.ownedBallIds.includes(ballId) || prev.balance < price) return prev;
      return {
        ...prev,
        balance: prev.balance - price,
        ownedBallIds: [...prev.ownedBallIds, ballId],
      };
    });
  };

  const handleStartMatchWithSelection = (
    playerBall: BallDefinition,
    botBall: BallDefinition,
    botUpgrades: BallUpgradeLevels
  ) => {
    const { botName, updatedUsedNames } = pickNextBotName(profile.usedBotNames);
    setProfile((prev) => ({
      ...prev,
      usedBotNames: updatedUsedNames,
    }));
    setActiveMatch({
      playerBall,
      botName,
      botBall,
      botUpgrades,
    });
    setMatchBattleActive(false);
    setMatchPaused(false);
    setScreen('PREPARATION');
  };

  return (
    <div className="w-screen h-screen bg-[#050507] flex items-center justify-center overflow-hidden">
      {/* Khung tỷ lệ chuẩn 16:9 co giãn tự động theo màn hình */}
      <main
        className="relative w-full h-full max-w-[177.78vh] max-h-[56.25vw] aspect-video bg-[#09090c] border-2 border-zinc-900 shadow-2xl overflow-hidden flex flex-col"
        data-testid="game-16-9-viewport"
      >
        {/* ==================== 1. SẢNH CHÍNH — MAIN MENU ==================== */}
        {screen === 'MAIN_MENU' && (
          <div className="relative w-full h-full overflow-hidden select-none">
            {/* Background: Căn phòng tối nhìn chéo từ trên cao xuống, đèn duy nhất chiếu xuống chiếc bàn cược lớn ở chính giữa */}
            <svg
              viewBox="0 0 1920 1080"
              preserveAspectRatio="xMidYMid slice"
              className="absolute inset-0 w-full h-full pointer-events-none"
              aria-hidden="true"
            >
              <defs>
                {/* Ánh đèn chao duy nhất chiếu từ trên xuống khu vực bàn chiến đấu */}
                <radialGradient id="roomSpotlight" cx="50%" cy="54%" r="48%">
                  <stop offset="0%" stopColor="rgba(220, 38, 38, 0.25)" />
                  <stop offset="42%" stopColor="rgba(30, 41, 59, 0.35)" />
                  <stop offset="100%" stopColor="rgba(5, 5, 8, 0.98)" />
                </radialGradient>
                <linearGradient id="lightCone" x1="50%" y1="0%" x2="50%" y2="100%">
                  <stop offset="0%" stopColor="rgba(254, 240, 138, 0.36)" />
                  <stop offset="55%" stopColor="rgba(239, 68, 68, 0.12)" />
                  <stop offset="100%" stopColor="rgba(9, 9, 12, 0)" />
                </linearGradient>
              </defs>

              {/* Tường và nền căn phòng tối */}
              <rect width="1920" height="1080" fill="#07070a" />
              <rect width="1920" height="1080" fill="url(#roomSpotlight)" />

              {/* Các đường phối cảnh căn phòng vẽ tay */}
              <g stroke="#18181b" strokeWidth="4">
                <line x1="0" y1="220" x2="520" y2="480" />
                <line x1="1920" y1="220" x2="1400" y2="480" />
                <line x1="520" y1="480" x2="1400" y2="480" />
                <line x1="0" y1="920" x2="520" y2="480" />
                <line x1="1920" y1="920" x2="1400" y2="480" />
              </g>

              {/* Luồng sáng hình nón từ chiếc đèn treo duy nhất */}
              <polygon
                points="915,215 1005,215 1520,860 400,860"
                fill="url(#lightCone)"
              />

              {/* Dây đèn và chụp đèn treo phía trên bàn */}
              <line x1="960" y1="138" x2="960" y2="185" stroke="#27272a" strokeWidth="6" />
              <path
                d="M885 220 L925 182 L995 182 L1035 220 Z"
                fill="#27272a"
                stroke="#09090b"
                strokeWidth="6"
              />
              <ellipse
                cx="960"
                cy="220"
                rx="72"
                ry="12"
                fill="#fef08a"
                stroke="#09090b"
                strokeWidth="4"
              />

              {/* Bóng đổ của chiếc bàn cược lớn */}
              <ellipse cx="960" cy="790" rx="510" ry="120" fill="rgba(0,0,0,0.85)" />

              {/* Chiếc bàn cược lớn góc nhìn chéo từ trên cao xuống */}
              <g>
                {/* Thân bàn dày */}
                <polygon
                  points="470,600 1450,600 1560,750 360,750"
                  fill="#271215"
                  stroke="#09090b"
                  strokeWidth="8"
                  strokeLinejoin="round"
                />
                {/* Mặt bàn cược hình thang góc nhìn chéo */}
                <polygon
                  points="520,490 1400,490 1510,695 410,695"
                  fill="#0c192c"
                  stroke="#09090b"
                  strokeWidth="8"
                  strokeLinejoin="round"
                />
                {/* Viền đỏ bên trong mặt bàn */}
                <polygon
                  points="555,515 1365,515 1455,670 465,670"
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="4"
                />
                {/* Đường chia đôi bàn và vòng tròn tâm bàn */}
                <line
                  x1="960"
                  y1="515"
                  x2="960"
                  y2="670"
                  stroke="rgba(248,250,252,0.25)"
                  strokeWidth="4"
                />
                <ellipse
                  cx="960"
                  cy="592"
                  rx="115"
                  ry="46"
                  fill="none"
                  stroke="rgba(239,68,68,0.45)"
                  strokeWidth="4"
                />

                {/* Vị trí ngồi / đặt bóng của BOT (Bên trái bàn) */}
                <ellipse
                  cx="670"
                  cy="592"
                  rx="62"
                  ry="26"
                  fill="rgba(0,0,0,0.55)"
                  stroke="#71717a"
                  strokeWidth="3"
                />
                {/* Vị trí ngồi / đặt bóng của PLAYER (Bên phải bàn) */}
                <ellipse
                  cx="1250"
                  cy="592"
                  rx="62"
                  ry="26"
                  fill="rgba(220,38,38,0.28)"
                  stroke="#ef4444"
                  strokeWidth="3"
                />
              </g>
            </svg>

            {/* Hai quả bóng đối diện nhau trên bàn cược dưới ánh đèn */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-[640px] h-[240px] translate-y-[42px] flex items-center justify-between px-12">
                {/* Bóng Bot bên trái */}
                <div className="flex flex-col items-center opacity-85">
                  <span className="text-[11px] font-mono font-bold text-zinc-400 bg-black/80 px-2 py-0.5 border border-zinc-700 mb-1">
                    ĐỐI THỦ BOT
                  </span>
                  <HandDrawnBallIllustration
                    ball={BALL_CATALOG[2]}
                    size={90}
                  />
                </div>

                {/* Bóng của Người chơi bên phải */}
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-mono font-bold text-red-400 bg-black/80 px-2 py-0.5 border border-red-700 mb-1">
                    {profile.name} ({strongestOwned.ball.vietnameseTitle})
                  </span>
                  <HandDrawnBallIllustration
                    ball={strongestOwned.ball}
                    size={96}
                  />
                </div>
              </div>
            </div>

            {/* Tiêu đề SVG vẽ tay đặt ở vùng không gian âm phía trên chính giữa */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
              <svg width="460" height="92" viewBox="0 0 460 92" aria-label="GAMBLE A BALL">
                <path
                  d="M18 14 L442 10 L434 80 L12 84 Z"
                  fill="#09090b"
                  stroke="#dc2626"
                  strokeWidth="4"
                />
                <text
                  x="230"
                  y="60"
                  textAnchor="middle"
                  fill="#f8fafc"
                  stroke="#09090b"
                  strokeWidth="3"
                  fontSize="44"
                  fontWeight="900"
                  letterSpacing="5"
                >
                  GAMBLE A BALL
                </text>
              </svg>
              <div className="text-xs font-mono text-zinc-400 tracking-widest mt-1">
                ĐẤU TRƯỜNG BÓNG TỰ ĐỘNG & DỰ ĐOÁN TIỀN ẢO B
              </div>
            </div>

            {/* Góc trên bên trái: Cài đặt âm thanh & Bàn Phân Tích AI */}
            <div className="absolute top-6 left-6 flex items-center gap-2.5 z-20">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setProfile((prev) => ({
                    ...prev,
                    soundEnabled: !prev.soundEnabled,
                  }));
                }}
                aria-label={profile.soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
                className="p-2.5 bg-zinc-900/90 hover:bg-zinc-800 border-2 border-zinc-400 text-zinc-200 cursor-pointer"
              >
                {profile.soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-red-400" />
                ) : (
                  <VolumeX className="w-5 h-5 text-zinc-500" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setShowSettingsModal(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 bg-zinc-900/90 hover:bg-zinc-800 border-2 border-zinc-400 text-zinc-200 text-xs font-bold cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>CÀI ĐẶT & LỊCH SỬ</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setShowAiModal(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 bg-red-950/80 hover:bg-red-900 border-2 border-red-400 text-red-100 text-xs font-bold cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span>PHÂN TÍCH CHIẾN THUẬT</span>
              </button>
            </div>

            {/* GÓC TRÊN BÊN PHẢI: 2. Thông tin người chơi (Có thể sửa tên trực tiếp tại sảnh) + 5. Nút XEM BÓNG */}
            <div className="absolute top-6 right-6 flex flex-col items-end gap-3 z-20 w-72">
              {/* Khung Thông tin người chơi */}
              <div className="w-full bg-zinc-900/95 border-3 border-zinc-300 p-3 shadow-[5px_5px_0px_#000]">
                <div className="flex items-center justify-between gap-2 mb-2">
                  {isEditingNameInline ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        type="text"
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSavePlayerName();
                        }}
                        maxLength={20}
                        aria-label="Sửa tên người chơi"
                        className="flex-1 bg-zinc-950 border-2 border-red-500 px-2 py-1 text-sm font-extrabold text-white focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSavePlayerName}
                        aria-label="Lưu tên người chơi"
                        className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white border border-black cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-zinc-400">
                          TÊN NGƯỜI CHƠI
                        </div>
                        <div
                          className="text-lg font-black text-white tracking-wide truncate"
                          data-testid="player-name-display"
                        >
                          {profile.name}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setNameDraft(profile.name);
                          setIsEditingNameInline(true);
                        }}
                        title="Sửa tên tại sảnh"
                        aria-label="Sửa tên tại sảnh"
                        className="flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-red-600 text-zinc-200 text-[11px] font-bold border border-zinc-500 cursor-pointer shrink-0"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>SỬA TÊN</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Số tiền B đang sở hữu + Biểu tượng đồng tiền B màu vàng */}
                <div className="flex items-center justify-between bg-zinc-950 border-2 border-black px-3 py-2">
                  <CoinBIcon size={24} />
                  <span
                    className="font-mono text-base font-extrabold text-yellow-400 tabular-nums"
                    data-testid="player-balance-display"
                  >
                    {formatCurrencyB(profile.balance)}
                  </span>
                </div>
              </div>

              {/* 5. Nút XEM BÓNG + Thông tin tổng số bóng và số sao bóng mạnh nhất bên dưới */}
              <div className="w-full flex flex-col items-end">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setScreen('COLLECTION');
                  }}
                  className="w-full py-3 px-5 bg-zinc-300/10 hover:bg-zinc-200/25 active:translate-y-0.5 border-2 border-zinc-300 text-zinc-100 font-extrabold text-base tracking-widest transition-all cursor-pointer shadow-[4px_4px_0px_#000]"
                >
                  XEM BÓNG
                </button>
                {/* Bên dưới nút XEM BÓNG hiển thị: Tổng số bóng đang sở hữu + Số sao của bóng mạnh nhất + Sao 4 cánh màu đỏ */}
                <div className="w-full mt-1.5 bg-zinc-950/90 border-2 border-zinc-700 px-3 py-2 flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-semibold">
                    Sở hữu: <strong className="text-white font-mono">{profile.ownedBallIds.length}</strong> bóng
                  </span>
                  <div className="flex items-center gap-1" title="Số sao của quả bóng mạnh nhất">
                    <span className="text-zinc-400">Mạnh nhất:</span>
                    <span className="font-mono font-extrabold text-red-400 tabular-nums">
                      {strongestOwned.stars}
                    </span>
                    <Star4Pointed fillState="full" size={16} />
                  </div>
                </div>
              </div>
            </div>

            {/* GÓC DƯỚI BÊN TRÁI: 4. Sao người chơi (sao 3 cánh) + 3. Nút VÀO BÀN + 6. Nút SHOP (không chồng lấn) */}
            <div className="absolute bottom-7 left-7 flex flex-col items-start gap-3 z-20">
              {/* Phía trên nút VÀO BÀN: 5 biểu tượng sao 3 cánh */}
              <div className="bg-zinc-950/90 border-2 border-zinc-400 px-3.5 py-2 shadow-[4px_4px_0px_#000]">
                <div className="text-[10px] font-bold text-zinc-400 mb-1 tracking-wider">
                  SAO NGƯỜI CHƠI ({playerStars} / 5 SAO · THƯỞNG TÍCH LŨY: {formatCurrencyB(profile.totalProfitEarned)})
                </div>
                <PlayerStarRow stars={playerStars} size={26} glow />
              </div>

              {/* Hàng nút VÀO BÀN và SHOP nằm cạnh nhau không chồng lấn */}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  data-start="true"
                  onClick={() => {
                    sound.playClick();
                    setScreen('BALL_SELECTION');
                  }}
                  className="px-10 py-3.5 bg-zinc-300/15 hover:bg-red-600/80 hover:border-white active:translate-y-0.5 border-2 border-zinc-300 text-zinc-100 font-black text-lg tracking-widest transition-all cursor-pointer shadow-[5px_5px_0px_#000]"
                >
                  VÀO BÀN
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setScreen('SHOP');
                  }}
                  className="px-9 py-3.5 bg-zinc-300/15 hover:bg-zinc-200/30 active:translate-y-0.5 border-2 border-zinc-300 text-zinc-100 font-black text-lg tracking-widest transition-all cursor-pointer shadow-[5px_5px_0px_#000]"
                >
                  SHOP
                </button>
              </div>
            </div>

            {/* Dòng hướng dẫn phím tắt phẳng ở mép dưới theo chuẩn Game Shell */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] font-mono text-zinc-400 pointer-events-none whitespace-nowrap">
              Enter / Space Vào Bàn · Chuột Trái Chọn Bóng & Đặt Cược · Esc Tạm Dừng
            </div>
          </div>
        )}

        {/* ==================== 2. XEM BÓNG & NÂNG CẤP ==================== */}
        {screen === 'COLLECTION' && (
          <CollectionView
            profile={profile}
            onClose={() => setScreen('MAIN_MENU')}
            onUpgradeStat={handleUpgradeStat}
          />
        )}

        {/* ==================== 3. CỬA HÀNG — SHOP ==================== */}
        {screen === 'SHOP' && (
          <ShopView
            profile={profile}
            onClose={() => setScreen('MAIN_MENU')}
            onBuyBall={handleBuyBall}
          />
        )}

        {/* ==================== 4. CHỌN BÓNG TRƯỚC TRẬN ==================== */}
        {screen === 'BALL_SELECTION' && (
          <BallSelectionView
            profile={profile}
            onBack={() => setScreen('MAIN_MENU')}
            onStartMatchWithSelection={handleStartMatchWithSelection}
          />
        )}

        {/* ==================== 5. TRẬN ĐẤU & DỰ ĐOÁN CƯỢC ==================== */}
        {(screen === 'PREPARATION' ||
          screen === 'BATTLE' ||
          screen === 'ROUND_RESULT' ||
          screen === 'MATCH_RESULT') &&
          activeMatch && (
            <BattleMatchView
              profile={profile}
              playerBall={activeMatch.playerBall}
              playerUpgrades={profile.upgrades[activeMatch.playerBall.id]}
              botName={activeMatch.botName}
              botBall={activeMatch.botBall}
              botUpgrades={activeMatch.botUpgrades}
              onUpdateBalanceAndStats={({
                balanceChange,
                positiveRewardEarned,
                betsPlacedCount,
                betsWonCount,
              }) => {
                setProfile((prev) => ({
                  ...prev,
                  balance: Math.max(0, Math.round(prev.balance + balanceChange)),
                  totalProfitEarned: Math.max(
                    0,
                    Math.round(prev.totalProfitEarned + positiveRewardEarned)
                  ),
                  totalBetsPlaced: prev.totalBetsPlaced + betsPlacedCount,
                  totalBetsWon: prev.totalBetsWon + betsWonCount,
                }));
              }}
              onFinishMatch={({ playerWins, botWins, netMatchProfit, wonMatch }) => {
                setProfile((prev) => ({
                  ...prev,
                  matchesWon: prev.matchesWon + (wonMatch ? 1 : 0),
                  matchesLost: prev.matchesLost + (wonMatch ? 0 : 1),
                  history: [
                    {
                      id: `${Date.now()}`,
                      timestamp: Date.now(),
                      botName: activeMatch.botName,
                      playerBallId: activeMatch.playerBall.id,
                      botBallId: activeMatch.botBall.id,
                      playerWins,
                      botWins,
                      netProfit: netMatchProfit,
                      wonMatch,
                    },
                    ...prev.history.slice(0, 24),
                  ],
                }));
                setActiveMatch(null);
                setMatchBattleActive(false);
                setMatchPaused(false);
                setScreen('MAIN_MENU');
              }}
              onPhaseChange={(phase) => {
                if (phase === 'BATTLE') {
                  setMatchBattleActive(true);
                } else if (phase === 'MATCH_RESULT') {
                  setMatchBattleActive(false);
                }
              }}
              onPauseChange={setMatchPaused}
              onAbortMatchToMenu={(lockedRefund) => {
                if (lockedRefund > 0) {
                  setProfile((prev) => ({
                    ...prev,
                    balance: prev.balance + lockedRefund,
                  }));
                }
                setActiveMatch(null);
                setMatchBattleActive(false);
                setMatchPaused(false);
                setScreen('MAIN_MENU');
              }}
            />
          )}

        {/* ==================== MODAL CÀI ĐẶT, LỊCH SỬ & XÓA DỮ LIỆU ==================== */}
        {showSettingsModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Cài đặt và Thống kê"
          >
            <div className="w-full max-w-xl bg-zinc-900 border-4 border-black shadow-[8px_8px_0px_#000] p-6 space-y-4 max-h-[88vh] flex flex-col">
              <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-3">
                <h2 className="text-xl font-extrabold text-white">
                  CÀI ĐẶT HỒ SƠ & THỐNG KÊ THI ĐẤU
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setShowSettingsModal(false);
                    setShowResetConfirm(false);
                  }}
                  className="px-3 py-1 bg-zinc-800 hover:bg-red-600 text-xs font-bold border border-black cursor-pointer"
                >
                  ĐÓNG
                </button>
              </div>

              {/* Đổi tên người chơi */}
              <div className="bg-zinc-950 border-2 border-black p-3 space-y-2">
                <label className="block text-xs font-bold text-zinc-400">
                  TÊN NGƯỜI CHƠI:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    maxLength={20}
                    className="flex-1 bg-zinc-900 border-2 border-zinc-700 px-3 py-1.5 text-sm font-bold text-white"
                  />
                  <button
                    type="button"
                    onClick={handleSavePlayerName}
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold border-2 border-black cursor-pointer"
                  >
                    CẬP NHẬT TÊN
                  </button>
                </div>
              </div>

              {/* Âm lượng hiệu ứng & Nhạc nền */}
              <div className="bg-zinc-950 border-2 border-black p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-bold text-zinc-300">
                    ÂM LƯỢNG HIỆU ỨNG ({Math.round(profile.soundVolume * 100)}%):
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    aria-label="Âm lượng hiệu ứng"
                    value={profile.soundVolume}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        soundVolume: Number(e.target.value),
                      }))
                    }
                    className="w-48 accent-red-600"
                  />
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-zinc-800 pt-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-300">
                      ÂM LƯỢNG NHẠC NỀN ({Math.round(profile.musicVolume * 100)}%):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setProfile((prev) => ({
                          ...prev,
                          musicEnabled: !prev.musicEnabled,
                        }));
                      }}
                      className={`px-2 py-0.5 text-[10px] font-extrabold border border-black cursor-pointer ${
                        profile.musicEnabled
                          ? 'bg-emerald-600 text-white'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {profile.musicEnabled ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                    </button>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    aria-label="Âm lượng nhạc nền"
                    value={profile.musicVolume}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        musicVolume: Number(e.target.value),
                      }))
                    }
                    className="w-48 accent-red-600"
                  />
                </div>
              </div>

              {/* Thống kê tổng quan */}
              <div className="grid grid-cols-4 gap-2 text-center font-mono">
                <div className="bg-zinc-950 border-2 border-black p-2">
                  <div className="text-[10px] text-zinc-400">TRẬN THẮNG</div>
                  <div className="text-base font-bold text-emerald-400">
                    {profile.matchesWon}
                  </div>
                </div>
                <div className="bg-zinc-950 border-2 border-black p-2">
                  <div className="text-[10px] text-zinc-400">TRẬN THUA</div>
                  <div className="text-base font-bold text-red-400">
                    {profile.matchesLost}
                  </div>
                </div>
                <div className="bg-zinc-950 border-2 border-black p-2">
                  <div className="text-[10px] text-zinc-400">LƯỢT CƯỢC</div>
                  <div className="text-base font-bold text-white">
                    {profile.totalBetsPlaced}
                  </div>
                </div>
                <div className="bg-zinc-950 border-2 border-black p-2">
                  <div className="text-[10px] text-zinc-400">CƯỢC THẮNG</div>
                  <div className="text-base font-bold text-yellow-400">
                    {profile.totalBetsWon}
                  </div>
                </div>
              </div>

              {/* Lịch sử thi đấu */}
              <div className="flex-1 bg-zinc-950 border-2 border-black p-3 overflow-y-auto min-h-[120px]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 mb-2">
                  <History className="w-3.5 h-3.5" />
                  <span>LỊCH SỬ THI ĐẤU GẦN ĐÂY</span>
                </div>
                {profile.history.length === 0 ? (
                  <p className="text-xs text-zinc-500">Chưa có lịch sử trận đấu nào.</p>
                ) : (
                  <div className="space-y-1.5 text-xs font-mono">
                    {profile.history.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between border-b border-zinc-800 pb-1"
                      >
                        <span>
                          vs <strong>{h.botName}</strong> ({h.playerWins}-{h.botWins})
                        </span>
                        <span
                          className={
                            h.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }
                        >
                          {h.netProfit >= 0 ? '+' : ''}
                          {formatCurrencyB(h.netProfit)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Xóa dữ liệu (yêu cầu xác nhận) */}
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                {!showResetConfirm ? (
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setShowResetConfirm(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-red-700 text-zinc-300 text-xs font-bold border border-black cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>XÓA DỮ LIỆU & CHƠI LẠI TỪ ĐẦU</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-400 font-bold">
                      Xác nhận xóa toàn bộ hồ sơ?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        const fresh = resetPlayerProfile();
                        setProfile(fresh);
                        setNameDraft(fresh.name);
                        setShowResetConfirm(false);
                        setShowSettingsModal(false);
                      }}
                      className="px-3 py-1 bg-red-600 text-white text-xs font-extrabold border border-black cursor-pointer"
                    >
                      XÁC NHẬN XÓA
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      className="px-3 py-1 bg-zinc-800 text-zinc-300 text-xs font-bold border border-black cursor-pointer"
                    >
                      HỦY
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== MODAL PHÂN TÍCH CHIẾN THUẬT AI ==================== */}
        <TacticalAiModal
          isOpen={showAiModal}
          onClose={() => setShowAiModal(false)}
          contextInfo={`Người chơi ${profile.name} đang sở hữu ${formatCurrencyB(
            profile.balance
          )}, bóng mạnh nhất: ${strongestOwned.ball.name} (${strongestOwned.stars} sao).`}
        />
        <BackgroundMusicPlayer
          track={activeMusicTrack}
          volume={effectiveMusicVolume}
          paused={matchPaused}
        />
      </main>
    </div>
  );
}
