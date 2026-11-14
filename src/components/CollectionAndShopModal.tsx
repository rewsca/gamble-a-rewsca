import React, { useState } from 'react';
import { BALL_CATALOG } from '../game/constants';
import {
  calculateShopPrice,
  calculateUpgradeCost,
  evaluateBallScoreAndStars,
  formatCurrencyB,
  getEffectiveBallStats,
} from '../game/rules';
import { sound } from '../game/sound';
import {
  BallDefinition,
  BallUpgradeLevels,
  PlayerProfile,
} from '../game/types';
import {
  BallStarRow,
  CoinBIcon,
  HandDrawnBallIllustration,
  SkillIconBox,
} from './HandDrawnIcons';
import { ArrowLeft, ChevronLeft, ChevronRight, Shield, Swords, Zap } from 'lucide-react';

interface CollectionViewProps {
  profile: PlayerProfile;
  onClose: () => void;
  onUpgradeStat: (ballId: string, statKey: keyof BallUpgradeLevels, cost: number) => void;
}

export const CollectionView: React.FC<CollectionViewProps> = ({
  profile,
  onClose,
  onUpgradeStat,
}) => {
  const ownedBalls = BALL_CATALOG.filter((b) => profile.ownedBallIds.includes(b.id));
  const [selectedBallId, setSelectedBallId] = useState<string>(
    ownedBalls[0]?.id ?? BALL_CATALOG[0].id
  );
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const selectedBall =
    BALL_CATALOG.find((b) => b.id === selectedBallId) ?? ownedBalls[0];
  const selectedUpgrades = profile.upgrades[selectedBall.id] ?? {
    defense: 0,
    basicDamage: 0,
    cooldown: 0,
  };
  const effStats = getEffectiveBallStats(selectedBall, selectedUpgrades);

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0c0c10] text-zinc-100 p-5 select-none overflow-hidden">
      {/* Thanh tiêu đề trên cùng */}
      <div className="flex items-center justify-between border-b-4 border-black bg-zinc-900 px-5 py-3 shadow-[4px_4px_0px_#000] shrink-0">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-1.5 bg-zinc-800 hover:bg-red-600 text-zinc-100 font-bold text-sm border-2 border-black shadow-[2px_2px_0px_#000] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            QUAY LẠI SẢNH
          </button>
          <h1 className="text-2xl font-extrabold tracking-wider text-white">
            BỘ SƯU TẬP BÓNG ({ownedBalls.length}/{BALL_CATALOG.length})
          </h1>
        </div>
        <div className="flex items-center gap-2.5 bg-zinc-950 px-4 py-1.5 border-2 border-black">
          <CoinBIcon size={22} />
          <span className="font-mono font-bold text-yellow-400 tabular-nums text-base">
            {formatCurrencyB(profile.balance)}
          </span>
        </div>
      </div>

      {/* Nội dung chính: Trái (Danh sách 5 bóng/dòng) - Phải (Thông tin chi tiết) */}
      <div className="flex-1 grid grid-cols-12 gap-5 min-h-0 pt-4">
        {/* Khu vực bên trái: Danh sách bóng sở hữu + Nút nâng cấp ở góc dưới bên trái */}
        <div className="col-span-7 flex flex-col justify-between bg-zinc-900/90 border-4 border-black p-4 shadow-[6px_6px_0px_#000] min-h-0">
          <div className="overflow-y-auto pr-1">
            <div className="text-xs font-bold text-zinc-400 mb-3 tracking-wider">
              DANH SÁCH BÓNG ĐANG SỞ HỮU (TỐI ĐA 5 BÓNG / DÒNG)
            </div>
            <div className="grid grid-cols-5 gap-3">
              {ownedBalls.map((ball) => {
                const upg = profile.upgrades[ball.id];
                const { stars } = evaluateBallScoreAndStars(ball, upg);
                const isSelected = ball.id === selectedBall.id;
                return (
                  <button
                    key={ball.id}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setSelectedBallId(ball.id);
                    }}
                    className={`aspect-square flex flex-col items-center justify-between p-2 border-4 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-red-500 bg-red-950/35 shadow-[0_0_16px_rgba(239,68,68,0.55)] scale-[1.02]'
                        : 'border-black bg-zinc-950 hover:border-zinc-500'
                    }`}
                  >
                    <HandDrawnBallIllustration ball={ball} size={64} />
                    <div className="w-full text-center truncate text-[11px] font-bold text-zinc-200">
                      {ball.vietnameseTitle}
                    </div>
                    <BallStarRow stars={stars} compact size={13} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nút NÂNG CẤP BÓNG ở góc dưới bên trái giao diện (chỉ hiện khi đã chọn bóng) */}
          {selectedBall && (
            <div className="pt-3 border-t-2 border-zinc-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setShowUpgradeModal(true);
                }}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-sm tracking-wider border-3 border-black shadow-[4px_4px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer"
              >
                NÂNG CẤP BÓNG
              </button>
              <div className="text-xs text-zinc-400 font-mono">
                Cấp nâng cấp: PT {selectedUpgrades.defense}/5 · ST {selectedUpgrades.basicDamage}/5 · HC {selectedUpgrades.cooldown}/5
              </div>
            </div>
          )}
        </div>

        {/* Khu vực bên phải: Bảng thông tin chi tiết của bóng được chọn */}
        <div className="col-span-5 flex flex-col justify-between bg-zinc-900 border-4 border-black p-5 shadow-[6px_6px_0px_#000] overflow-y-auto">
          {/* Phần trên cùng: Hình ảnh lớn, Tên bóng, Số sao */}
          <div className="flex items-center gap-4 border-b-2 border-zinc-800 pb-3">
            <div className="w-24 h-24 flex items-center justify-center bg-zinc-950 border-3 border-black shrink-0">
              <HandDrawnBallIllustration ball={selectedBall} size={86} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-extrabold text-white tracking-wide truncate">
                {selectedBall.name}
              </h2>
              <div className="text-xs text-zinc-400 mb-1.5">
                Vũ khí: <span className="text-zinc-200 font-semibold">{selectedBall.weaponName}</span>
              </div>
              <BallStarRow stars={effStats.stars} size={17} />
            </div>
          </div>

          {/* Bên dưới: Sát thương cơ bản, Máu cơ bản, Phòng thủ, Thời gian hồi kỹ năng */}
          <div className="grid grid-cols-2 gap-2.5 my-3">
            <div className="bg-zinc-950 border-2 border-black p-2.5">
              <div className="text-[11px] text-zinc-400">SÁT THƯƠNG CƠ BẢN</div>
              <div className="font-mono text-base font-bold text-red-400 tabular-nums">
                {effStats.effectiveBaseDamage} ST
                {selectedUpgrades.basicDamage > 0 && (
                  <span className="text-xs text-emerald-400 ml-1">
                    (+{selectedUpgrades.basicDamage}%)
                  </span>
                )}
              </div>
            </div>
            <div className="bg-zinc-950 border-2 border-black p-2.5">
              <div className="text-[11px] text-zinc-400">MÁU CƠ BẢN (HP)</div>
              <div className="font-mono text-base font-bold text-emerald-400 tabular-nums">
                {effStats.maxHp} HP
              </div>
            </div>
            <div className="bg-zinc-950 border-2 border-black p-2.5">
              <div className="text-[11px] text-zinc-400">PHÒNG THỦ (GIẢM ST)</div>
              <div className="font-mono text-base font-bold text-sky-400 tabular-nums">
                {effStats.damageReductionPct}%
                {effStats.hasEmergencyShieldPassive && (
                  <span className="text-[11px] text-yellow-400 ml-1.5">[+Khiên &lt;10% HP]</span>
                )}
              </div>
            </div>
            <div className="bg-zinc-950 border-2 border-black p-2.5">
              <div className="text-[11px] text-zinc-400">THỜI GIAN HỒI KỸ NĂNG</div>
              <div className="font-mono text-base font-bold text-purple-400 tabular-nums">
                {selectedBall.skills
                  .map((s) => (s.cooldown * effStats.cooldownMultiplier).toFixed(1).replace(/\.0$/, '') + 's')
                  .join(' / ')}
              </div>
            </div>
          </div>

          {/* Nội tại: trình bày thành từng dòng riêng (4-6 dòng) */}
          <div className="bg-zinc-950 border-2 border-black p-3 mb-3">
            <div className="text-xs font-extrabold text-yellow-400 mb-1">
              NỘI TẠI: {selectedBall.passive.name}
            </div>
            <div className="space-y-1 text-xs text-zinc-300 leading-snug">
              {selectedBall.passive.lines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
              {effStats.hasEmergencyShieldPassive && (
                <p className="text-yellow-300 font-semibold">
                  • [Cấp 5 Phòng Thủ] Tự động tạo khiên chặn 1 lần sát thương khi máu xuống dưới 10%.
                </p>
              )}
            </div>
          </div>

          {/* Phần dưới cùng: Kỹ năng (ô vuông nhỏ, biểu tượng minh họa và tên bên dưới, chữ nhỏ hơn tên bóng) */}
          <div>
            <div className="text-xs font-bold text-zinc-400 mb-2">
              KỸ NĂNG CHIẾN ĐẤU ({selectedBall.skills.length} KỸ NĂNG)
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {selectedBall.skills.map((skill) => {
                const effCd = (skill.cooldown * effStats.cooldownMultiplier)
                  .toFixed(1)
                  .replace(/\.0$/, '');
                return (
                  <div
                    key={skill.id}
                    className="flex flex-col items-center bg-zinc-950 border-2 border-black p-2 text-center"
                    title={skill.description}
                  >
                    <SkillIconBox skill={skill} size={42} />
                    <div className="mt-1.5 text-[11px] font-bold text-zinc-100 leading-tight">
                      {skill.name}
                    </div>
                    <div className="text-[10px] font-mono text-red-400">
                      Hồi: {effCd}s
                    </div>
                    <div className="mt-1 text-[10px] text-zinc-400 line-clamp-2 leading-tight">
                      {skill.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* BẢNG NÂNG CẤP (PHẦN V) - Mở chính giữa màn hình */}
      {showUpgradeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Nâng cấp bóng"
        >
          <div className="w-full max-w-3xl bg-zinc-900 border-4 border-black shadow-[10px_10px_0px_#000] p-6 relative">
            {/* Bố cục chuẩn Phần V.1:
                - Góc trên bên trái: Tên bóng, bên dưới tên: Hình ảnh bóng
                - Chính giữa phía trên: Số sao hiện tại
                - Khu vực chính giữa và bên phải: Các thanh chỉ số + nút nâng cấp */}
            <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-3 mb-4">
              <div className="text-xs font-bold text-zinc-400 tracking-wider">
                BẢNG NÂNG CẤP SỨC MẠNH BÓNG
              </div>

              <div className="flex flex-col items-center">
                <div className="text-[11px] font-bold text-zinc-400 mb-0.5">
                  SỐ SAO HIỆN TẠI
                </div>
                <BallStarRow stars={effStats.stars} size={20} />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-zinc-950 px-3 py-1.5 border-2 border-black">
                  <CoinBIcon size={18} />
                  <span className="font-mono text-sm font-bold text-yellow-400 tabular-nums">
                    {formatCurrencyB(profile.balance)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setShowUpgradeModal(false);
                  }}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-red-600 text-white font-bold text-xs border-2 border-black cursor-pointer"
                >
                  ĐÓNG
                </button>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-6 items-stretch">
              <div className="col-span-4 flex flex-col items-center justify-between bg-zinc-950 border-3 border-black p-4">
                <div className="w-full text-left border-b border-zinc-800 pb-2">
                  <div className="text-[10px] font-bold text-zinc-400">TÊN BÓNG</div>
                  <h2 className="text-lg font-extrabold text-white tracking-wide">
                    {selectedBall.name}
                  </h2>
                </div>
                <div className="my-2">
                  <HandDrawnBallIllustration ball={selectedBall} size={132} />
                </div>
                <div className="w-full text-center border-t border-zinc-800 pt-2">
                  <div className="text-xs text-zinc-400">Tổng điểm đánh giá</div>
                  <div className="font-mono text-lg font-extrabold text-red-400 tabular-nums">
                    {effStats.totalScore} / 100
                  </div>
                </div>
              </div>

              <div className="col-span-8 space-y-4">
                {/* Chỉ số 1: PHÒNG THỦ */}
                {(() => {
                  const lvl = selectedUpgrades.defense;
                  const cost = calculateUpgradeCost(
                    selectedBall.upgradeBaseCosts.defense,
                    lvl
                  );
                  const canAfford = profile.balance >= cost && lvl < 5;
                  return (
                    <div className="bg-zinc-950 border-2 border-black p-3.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 font-bold text-sm text-sky-400">
                          <Shield className="w-4 h-4" />
                          <span>1. PHÒNG THỦ (Giảm {lvl * 2}% sát thương nhận vào)</span>
                        </div>
                        <span className="font-mono text-xs font-bold text-zinc-300">
                          CẤP {lvl} / 5
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mb-2">
                        Mỗi cấp -2% ST nhận vào (Tối đa 10%). Cấp 5 mở nội tại Tạo Khiên chặn 1 đòn khi máu &lt; 10%.
                      </div>
                      <div className="grid grid-cols-5 gap-1.5 mb-2.5">
                        {[1, 2, 3, 4, 5].map((step) => (
                          <div
                            key={step}
                            className={`h-3 border border-black ${
                              lvl >= step ? 'bg-sky-500' : 'bg-zinc-800'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-yellow-400 font-bold tabular-nums">
                          {lvl >= 5 ? 'ĐÃ ĐẠT CẤP TỐI ĐA' : `Giá nâng cấp: ${formatCurrencyB(cost)}`}
                        </span>
                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => {
                            sound.playCoin();
                            onUpgradeStat(selectedBall.id, 'defense', cost);
                          }}
                          className={`px-4 py-1.5 text-xs font-extrabold border-2 border-black transition-colors ${
                            canAfford
                              ? 'bg-sky-600 hover:bg-sky-500 text-white cursor-pointer shadow-[2px_2px_0px_#000]'
                              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          }`}
                        >
                          {lvl >= 5 ? 'TỐI ĐA' : 'NÂNG CẤP PHÒNG THỦ'}
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Chỉ số 2: SÁT THƯƠNG CƠ BẢN */}
                {(() => {
                  const lvl = selectedUpgrades.basicDamage;
                  const cost = calculateUpgradeCost(
                    selectedBall.upgradeBaseCosts.basicDamage,
                    lvl
                  );
                  const canAfford = profile.balance >= cost && lvl < 5;
                  return (
                    <div className="bg-zinc-950 border-2 border-black p-3.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 font-bold text-sm text-red-400">
                          <Swords className="w-4 h-4" />
                          <span>2. SÁT THƯƠNG CƠ BẢN (+{lvl}% sát thương vũ khí)</span>
                        </div>
                        <span className="font-mono text-xs font-bold text-zinc-300">
                          CẤP {lvl} / 5
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mb-2">
                        Mỗi cấp +1% sát thương từ vũ khí cơ bản (Tối đa +5%). Hiện tại: {effStats.effectiveBaseDamage} ST.
                      </div>
                      <div className="grid grid-cols-5 gap-1.5 mb-2.5">
                        {[1, 2, 3, 4, 5].map((step) => (
                          <div
                            key={step}
                            className={`h-3 border border-black ${
                              lvl >= step ? 'bg-red-500' : 'bg-zinc-800'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-yellow-400 font-bold tabular-nums">
                          {lvl >= 5 ? 'ĐÃ ĐẠT CẤP TỐI ĐA' : `Giá nâng cấp: ${formatCurrencyB(cost)}`}
                        </span>
                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => {
                            sound.playCoin();
                            onUpgradeStat(selectedBall.id, 'basicDamage', cost);
                          }}
                          className={`px-4 py-1.5 text-xs font-extrabold border-2 border-black transition-colors ${
                            canAfford
                              ? 'bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow-[2px_2px_0px_#000]'
                              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          }`}
                        >
                          {lvl >= 5 ? 'TỐI ĐA' : 'NÂNG CẤP SÁT THƯƠNG'}
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Chỉ số 3: THỜI GIAN TUNG CHIÊU */}
                {(() => {
                  const lvl = selectedUpgrades.cooldown;
                  const cost = calculateUpgradeCost(
                    selectedBall.upgradeBaseCosts.cooldown,
                    lvl
                  );
                  const canAfford = profile.balance >= cost && lvl < 5;
                  return (
                    <div className="bg-zinc-950 border-2 border-black p-3.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 font-bold text-sm text-purple-400">
                          <Zap className="w-4 h-4" />
                          <span>3. THỜI GIAN TUNG CHIÊU (Giảm {lvl * 2}% hồi chiêu)</span>
                        </div>
                        <span className="font-mono text-xs font-bold text-zinc-300">
                          CẤP {lvl} / 5
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mb-2">
                        Mỗi cấp giảm 2% thời gian hồi chiêu của các kỹ năng (Tối đa giảm 10%).
                      </div>
                      <div className="grid grid-cols-5 gap-1.5 mb-2.5">
                        {[1, 2, 3, 4, 5].map((step) => (
                          <div
                            key={step}
                            className={`h-3 border border-black ${
                              lvl >= step ? 'bg-purple-500' : 'bg-zinc-800'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-yellow-400 font-bold tabular-nums">
                          {lvl >= 5 ? 'ĐÃ ĐẠT CẤP TỐI ĐA' : `Giá nâng cấp: ${formatCurrencyB(cost)}`}
                        </span>
                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => {
                            sound.playCoin();
                            onUpgradeStat(selectedBall.id, 'cooldown', cost);
                          }}
                          className={`px-4 py-1.5 text-xs font-extrabold border-2 border-black transition-colors ${
                            canAfford
                              ? 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer shadow-[2px_2px_0px_#000]'
                              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          }`}
                        >
                          {lvl >= 5 ? 'TỐI ĐA' : 'NÂNG CẤP HỒI CHIÊU'}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * PHẦN VI. CỬA HÀNG — SHOP
 */
interface ShopViewProps {
  profile: PlayerProfile;
  onClose: () => void;
  onBuyBall: (ballId: string, price: number) => void;
}

export const ShopView: React.FC<ShopViewProps> = ({
  profile,
  onClose,
  onBuyBall,
}) => {
  // Mặc định lọc mức 6 sao (hoặc cho phép lọc từ 1 đến 10 sao theo đúng yêu cầu)
  const [starFilter, setStarFilter] = useState<number>(6);
  const [showAllToggle, setShowAllToggle] = useState<boolean>(false);

  const ballsWithStars = BALL_CATALOG.map((ball) => {
    const upg = profile.upgrades[ball.id];
    const evalRes = evaluateBallScoreAndStars(ball, upg);
    const price = calculateShopPrice(evalRes.stars, ball.fixedShopPrice);
    return {
      ball,
      stars: evalRes.stars,
      filterBucket: Math.round(evalRes.stars),
      price,
    };
  });

  const filteredList = showAllToggle
    ? ballsWithStars
    : ballsWithStars.filter(
        (item) =>
          Math.floor(item.stars) === starFilter ||
          Math.ceil(item.stars) === starFilter
      );

  const [selectedBallId, setSelectedBallId] = useState<string>(
    BALL_CATALOG[0].id
  );

  const currentItem =
    ballsWithStars.find((b) => b.ball.id === selectedBallId) ??
    filteredList[0] ??
    ballsWithStars[0];

  const isOwned = profile.ownedBallIds.includes(currentItem.ball.id);
  const canAfford = profile.balance >= currentItem.price && !isOwned;

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0c0c10] text-zinc-100 p-5 select-none overflow-hidden">
      {/* Thanh trên: Góc trên bên trái Tiền B, Góc trên bên phải Bộ chọn số sao (1-10 sao) */}
      <div className="flex items-center justify-between border-b-4 border-black bg-zinc-900 px-5 py-3 shadow-[4px_4px_0px_#000] shrink-0">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-1.5 bg-zinc-800 hover:bg-red-600 text-zinc-100 font-bold text-sm border-2 border-black shadow-[2px_2px_0px_#000] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            QUAY LẠI SẢNH
          </button>

          {/* Góc trên bên trái hiển thị số tiền B đang sở hữu */}
          <div className="flex items-center gap-2 bg-zinc-950 px-4 py-1.5 border-2 border-black">
            <CoinBIcon size={22} />
            <span className="font-mono font-bold text-yellow-400 tabular-nums text-base">
              {formatCurrencyB(profile.balance)}
            </span>
          </div>
        </div>

        <h1 className="text-xl font-extrabold tracking-wider text-white hidden lg:block">
          CỬA HÀNG BÓNG CHIẾN ĐẤU (SHOP)
        </h1>

        {/* Góc trên bên phải: Bộ chọn số sao (1 -> 10 sao) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setShowAllToggle(!showAllToggle);
            }}
            className={`px-3 py-1.5 text-xs font-bold border-2 border-black cursor-pointer ${
              showAllToggle
                ? 'bg-red-600 text-white'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {showAllToggle ? 'ĐANG HIỆN: TẤT CẢ' : 'HIỆN TẤT CẢ'}
          </button>

          <div className="flex items-center bg-zinc-950 border-2 border-black px-2 py-1 gap-2">
            <span className="text-xs text-zinc-400 font-bold">LỌC SAO:</span>
            <button
              type="button"
              aria-label="Giảm sao lọc"
              onClick={() => {
                sound.playClick();
                setShowAllToggle(false);
                setStarFilter((prev) => (prev <= 1 ? 10 : prev - 1));
              }}
              className="p-1 bg-zinc-800 hover:bg-zinc-700 border border-black cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono font-extrabold text-sm text-red-400 min-w-[64px] text-center tabular-nums">
              {starFilter} SAO ★
            </span>
            <button
              type="button"
              aria-label="Tăng sao lọc"
              onClick={() => {
                sound.playClick();
                setShowAllToggle(false);
                setStarFilter((prev) => (prev >= 10 ? 1 : prev + 1));
              }}
              className="p-1 bg-zinc-800 hover:bg-zinc-700 border border-black cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Nội dung Shop: Trái danh sách bóng (5 quả/dòng), Phải thông tin chi tiết & nút MUA */}
      <div className="flex-1 grid grid-cols-12 gap-5 min-h-0 pt-4">
        <div className="col-span-7 flex flex-col bg-zinc-900 border-4 border-black p-4 shadow-[6px_6px_0px_#000] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-zinc-400">
              {showAllToggle
                ? 'TẤT CẢ BÓNG TRONG CỬA HÀNG'
                : `DANH SÁCH BÓNG CẤP ${starFilter} SAO`}
            </span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setShowAllToggle(false);
                    setStarFilter(s);
                  }}
                  className={`w-6 h-6 text-[11px] font-mono font-bold border border-black cursor-pointer ${
                    !showAllToggle && starFilter === s
                      ? 'bg-red-600 text-white'
                      : 'bg-zinc-950 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {filteredList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 p-8 text-center">
              <p className="text-lg font-extrabold text-red-400 tracking-wider">
                KHÔNG CÓ BÓNG Ở CẤP SAO NÀY
              </p>
              <p className="text-xs text-zinc-400 mt-2">
                Hãy nhấn nút tăng/giảm sao hoặc chọn các mức 3★, 4★, 5★, 6★, 7★, 8★ để xem bóng.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-3">
              {filteredList.map(({ ball, stars }) => {
                const owned = profile.ownedBallIds.includes(ball.id);
                const selected = ball.id === currentItem.ball.id;
                return (
                  <button
                    key={ball.id}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setSelectedBallId(ball.id);
                    }}
                    className={`relative aspect-square flex flex-col items-center justify-between p-2 border-4 transition-all cursor-pointer ${
                      selected
                        ? 'border-red-500 bg-red-950/35 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                        : 'border-black bg-zinc-950 hover:border-zinc-500'
                    }`}
                  >
                    {owned && (
                      <span className="absolute top-1 right-1 bg-emerald-700 text-white text-[9px] font-bold px-1 border border-black">
                        ĐÃ CÓ
                      </span>
                    )}
                    <HandDrawnBallIllustration ball={ball} size={62} />
                    <div className="w-full text-center truncate text-[11px] font-bold text-zinc-200">
                      {ball.vietnameseTitle}
                    </div>
                    <BallStarRow stars={stars} compact size={13} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bên phải: Thông tin chi tiết bóng & Nút MUA ở dưới cùng chính giữa */}
        <div className="col-span-5 flex flex-col justify-between bg-zinc-900 border-4 border-black p-5 shadow-[6px_6px_0px_#000] overflow-y-auto">
          <div>
            <div className="flex items-center gap-4 border-b-2 border-zinc-800 pb-3">
              <div className="w-24 h-24 flex items-center justify-center bg-zinc-950 border-3 border-black shrink-0">
                <HandDrawnBallIllustration ball={currentItem.ball} size={84} />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-extrabold text-white truncate">
                  {currentItem.ball.name}
                </h2>
                <div className="my-1">
                  <BallStarRow stars={currentItem.stars} size={16} />
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="text-red-400 font-bold">
                    ST cơ bản: {currentItem.ball.baseDamage}
                  </span>
                  <span className="text-emerald-400 font-bold">
                    Máu: {currentItem.ball.baseHp} HP
                  </span>
                </div>
              </div>
            </div>

            {/* Nội tại */}
            <div className="bg-zinc-950 border-2 border-black p-3 my-3">
              <div className="text-xs font-extrabold text-yellow-400 mb-1">
                NỘI TẠI: {currentItem.ball.passive.name}
              </div>
              <div className="space-y-1 text-xs text-zinc-300">
                {currentItem.ball.passive.lines.map((l, idx) => (
                  <p key={idx}>{l}</p>
                ))}
              </div>
            </div>

            {/* Kỹ năng */}
            <div className="grid grid-cols-3 gap-2">
              {currentItem.ball.skills.map((skill) => (
                <div
                  key={skill.id}
                  className="flex flex-col items-center bg-zinc-950 border-2 border-black p-2 text-center"
                >
                  <SkillIconBox skill={skill} size={38} />
                  <div className="mt-1 text-[11px] font-bold text-white">
                    {skill.name}
                  </div>
                  <div className="text-[10px] font-mono text-red-400">
                    CD: {skill.cooldown}s
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Phần dưới cùng, chính giữa: Giá tiền và nút MUA */}
          <div className="pt-4 mt-3 border-t-2 border-zinc-800 flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-bold">GIÁ MUA:</span>
              <CoinBIcon size={20} />
              <span className="font-mono text-lg font-extrabold text-yellow-400 tabular-nums">
                {formatCurrencyB(currentItem.price)}
              </span>
            </div>

            <button
              type="button"
              disabled={isOwned || !canAfford}
              onClick={() => {
                sound.playCoin();
                onBuyBall(currentItem.ball.id, currentItem.price);
              }}
              className={`w-64 py-2.5 font-extrabold text-sm tracking-wider border-3 border-black shadow-[4px_4px_0px_#000] transition-all ${
                isOwned
                  ? 'bg-zinc-700 text-zinc-300 cursor-not-allowed'
                  : canAfford
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black cursor-pointer active:translate-y-0.5'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              {isOwned
                ? 'ĐÃ SỞ HỮU'
                : canAfford
                ? 'MUA NGAY'
                : 'KHÔNG ĐỦ TIỀN B'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * PHẦN XII. GIAO DIỆN CHỌN BÓNG TRƯỚC TRẬN
 */
interface BallSelectionViewProps {
  profile: PlayerProfile;
  onBack: () => void;
  onStartMatchWithSelection: (
    playerBall: BallDefinition,
    botBall: BallDefinition,
    botUpgrades: BallUpgradeLevels
  ) => void;
}

export const BallSelectionView: React.FC<BallSelectionViewProps> = ({
  profile,
  onBack,
  onStartMatchWithSelection,
}) => {
  const ownedBalls = BALL_CATALOG.filter((b) =>
    profile.ownedBallIds.includes(b.id)
  );
  const [selectedBallId, setSelectedBallId] = useState<string>(
    ownedBalls[0]?.id ?? BALL_CATALOG[0].id
  );
  const [lockedConfirm, setLockedConfirm] = useState<boolean>(false);
  const [botSelection, setBotSelection] = useState<{
    ball: BallDefinition;
    upgrades: BallUpgradeLevels;
    stars: number;
  } | null>(null);

  const selectedBall =
    BALL_CATALOG.find((b) => b.id === selectedBallId) ?? ownedBalls[0];
  const playerUpgrades = profile.upgrades[selectedBall.id];
  const effStats = getEffectiveBallStats(selectedBall, playerUpgrades);

  const handleConfirmSelection = async () => {
    sound.playClick();
    const { selectBotBallAndUpgrades } = await import('../game/rules');
    const chosenBot = selectBotBallAndUpgrades(selectedBall, playerUpgrades);
    setBotSelection(chosenBot);
    setLockedConfirm(true);
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0c0c10] text-zinc-100 p-5 select-none overflow-hidden">
      <div className="flex items-center justify-between border-b-4 border-black bg-zinc-900 px-5 py-3 shadow-[4px_4px_0px_#000] shrink-0">
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            onBack();
          }}
          className="flex items-center gap-2 px-4 py-1.5 bg-zinc-800 hover:bg-red-600 text-zinc-100 font-bold text-sm border-2 border-black cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          HỦY & VỀ SẢNH
        </button>
        <h1 className="text-2xl font-extrabold tracking-wider text-white">
          CHỌN BÓNG THAM CHIẾN
        </h1>
        <div className="flex items-center gap-2 bg-zinc-950 px-4 py-1.5 border-2 border-black">
          <CoinBIcon size={20} />
          <span className="font-mono font-bold text-yellow-400 tabular-nums text-sm">
            {formatCurrencyB(profile.balance)}
          </span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-5 min-h-0 pt-4">
        {/* Bên trái: Danh sách bóng sở hữu (5 quả trên một dòng) */}
        <div className="col-span-7 flex flex-col justify-between bg-zinc-900 border-4 border-black p-4 shadow-[6px_6px_0px_#000] overflow-y-auto">
          <div>
            <div className="text-xs font-bold text-zinc-400 mb-3">
              CHỌN QUẢ BÓNG CỦA BẠN (5 QUẢ / DÒNG)
            </div>
            <div className="grid grid-cols-5 gap-3">
              {ownedBalls.map((ball) => {
                const upg = profile.upgrades[ball.id];
                const { stars } = evaluateBallScoreAndStars(ball, upg);
                const isSelected = ball.id === selectedBall.id;
                return (
                  <button
                    key={ball.id}
                    type="button"
                    disabled={lockedConfirm}
                    onClick={() => {
                      sound.playClick();
                      setSelectedBallId(ball.id);
                    }}
                    className={`aspect-square flex flex-col items-center justify-between p-2 border-4 transition-all ${
                      isSelected
                        ? 'border-red-500 bg-red-950/40 shadow-[0_0_16px_rgba(239,68,68,0.6)]'
                        : 'border-black bg-zinc-950 hover:border-zinc-600'
                    } ${lockedConfirm ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <HandDrawnBallIllustration ball={ball} size={62} />
                    <div className="w-full text-center truncate text-[11px] font-bold text-zinc-200">
                      {ball.vietnameseTitle}
                    </div>
                    <BallStarRow stars={stars} compact size={13} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hiển thị đối thủ Bot đã chọn sau khi nhấn XÁC NHẬN */}
          {lockedConfirm && botSelection && (
            <div className="mt-4 p-3.5 bg-zinc-950 border-3 border-red-600 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HandDrawnBallIllustration ball={botSelection.ball} size={64} />
                <div>
                  <div className="text-xs font-bold text-red-400">
                    ĐỐI THỦ BOT ĐÃ CHỌN BÓNG TƯƠNG ĐƯƠNG (±0,5 SAO):
                  </div>
                  <div className="text-lg font-extrabold text-white">
                    {botSelection.ball.name}
                  </div>
                  <BallStarRow stars={botSelection.stars} size={15} />
                </div>
              </div>
              <span className="px-3 py-1 bg-red-600/20 border border-red-500 text-red-300 text-xs font-bold">
                ĐÃ KHÓA LỰA CHỌN
              </span>
            </div>
          )}
        </div>

        {/* Bên phải: Bảng thông tin bóng */}
        <div className="col-span-5 flex flex-col justify-between bg-zinc-900 border-4 border-black p-5 shadow-[6px_6px_0px_#000] overflow-y-auto">
          <div>
            <div className="flex items-center gap-4 border-b-2 border-zinc-800 pb-3">
              <div className="w-24 h-24 flex items-center justify-center bg-zinc-950 border-3 border-black shrink-0">
                <HandDrawnBallIllustration ball={selectedBall} size={84} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white">
                  {selectedBall.name}
                </h2>
                <div className="my-1">
                  <BallStarRow stars={effStats.stars} size={16} />
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="text-red-400 font-bold">
                    ST cơ bản: {effStats.effectiveBaseDamage}
                  </span>
                  <span className="text-emerald-400 font-bold">
                    Máu: {effStats.maxHp} HP
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-zinc-950 border-2 border-black p-3 my-3">
              <div className="text-xs font-extrabold text-yellow-400 mb-1">
                NỘI TẠI: {selectedBall.passive.name}
              </div>
              <div className="space-y-1 text-xs text-zinc-300">
                {selectedBall.passive.lines.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {selectedBall.skills.map((skill) => (
                <div
                  key={skill.id}
                  className="flex flex-col items-center bg-zinc-950 border-2 border-black p-2 text-center"
                >
                  <SkillIconBox skill={skill} size={38} />
                  <div className="mt-1 text-[11px] font-bold text-white">
                    {skill.name}
                  </div>
                  <div className="text-[10px] font-mono text-red-400">
                    CD: {(skill.cooldown * effStats.cooldownMultiplier).toFixed(1).replace(/\.0$/, '')}s
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chính giữa phía dưới: Nút XÁC NHẬN -> đổi thành BẮT ĐẦU sau khi khóa */}
      <div className="pt-4 flex justify-center shrink-0">
        {!lockedConfirm ? (
          <button
            type="button"
            onClick={handleConfirmSelection}
            className="px-14 py-3 bg-zinc-200 hover:bg-white text-black font-extrabold text-lg tracking-wider border-4 border-black shadow-[6px_6px_0px_#dc2626] cursor-pointer transition-transform active:translate-y-0.5"
          >
            XÁC NHẬN
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (!botSelection) return;
              sound.playClick();
              onStartMatchWithSelection(
                selectedBall,
                botSelection.ball,
                botSelection.upgrades
              );
            }}
            className="px-16 py-3 bg-red-600 hover:bg-red-500 text-white font-extrabold text-lg tracking-wider border-4 border-black shadow-[6px_6px_0px_#000] cursor-pointer animate-pulse"
          >
            BẮT ĐẦU
          </button>
        )}
      </div>
    </div>
  );
};
