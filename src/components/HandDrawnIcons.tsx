import React from 'react';
import { BallDefinition, SkillDefinition } from '../game/types';

/**
 * Biểu tượng Sao 3 cánh (Dùng cho Sao Người Chơi và Sao Bot - tối đa 5 sao)
 * - Sao chưa đạt: xám tối
 * - Sao đã đạt: đỏ, viền trắng xám
 * - Hỗ trợ hiển thị nửa sao
 */
export const Star3Pointed: React.FC<{
  fillState: 'full' | 'half' | 'empty';
  size?: number;
  glow?: boolean;
}> = ({ fillState, size = 24, glow = false }) => {
  const gradId = React.useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={glow && fillState !== 'empty' ? 'drop-shadow-[0_0_6px_rgba(239,68,68,0.85)]' : ''}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="50%" stopColor="#dc2626" />
          <stop offset="50%" stopColor="#27272a" />
        </linearGradient>
      </defs>
      {/* 3-pointed star path: Top point, Bottom-Right point, Bottom-Left point */}
      <path
        d="M16 2 L20.2 14.5 L30 26 L16 20.5 L2 26 L11.8 14.5 Z"
        fill={
          fillState === 'full'
            ? '#dc2626'
            : fillState === 'half'
            ? `url(#${gradId})`
            : '#27272a'
        }
        stroke={fillState === 'empty' ? '#52525b' : '#e4e4e7'}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {fillState !== 'empty' && (
        <circle cx="16" cy="16.5" r="2.2" fill="#fca5a5" opacity="0.7" />
      )}
    </svg>
  );
};

export const PlayerStarRow: React.FC<{
  stars: number; // 0..5, step 0.5
  size?: number;
  glow?: boolean;
}> = ({ stars, size = 22, glow = false }) => {
  const items: Array<'full' | 'half' | 'empty'> = [];
  for (let i = 1; i <= 5; i++) {
    if (stars >= i) {
      items.push('full');
    } else if (stars >= i - 0.5) {
      items.push('half');
    } else {
      items.push('empty');
    }
  }
  return (
    <div
      className="inline-flex items-center gap-1"
      title={`${stars} / 5 Sao người chơi`}
      aria-label={`${stars} trên 5 sao người chơi`}
    >
      {items.map((st, idx) => (
        <Star3Pointed key={idx} fillState={st} size={size} glow={glow} />
      ))}
    </div>
  );
};

/**
 * Biểu tượng Sao 4 cánh màu đỏ (Dùng cho Sao của Quả Bóng - tối đa 10 sao)
 */
export const Star4Pointed: React.FC<{
  fillState: 'full' | 'half' | 'empty';
  size?: number;
}> = ({ fillState, size = 18 }) => {
  const gradId = React.useId();
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="50%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#27272a" />
        </linearGradient>
      </defs>
      <path
        d="M14 1.5 L17.6 10.4 L26.5 14 L17.6 17.6 L14 26.5 L10.4 17.6 L1.5 14 L10.4 10.4 Z"
        fill={
          fillState === 'full'
            ? '#ef4444'
            : fillState === 'half'
            ? `url(#${gradId})`
            : '#27272a'
        }
        stroke={fillState === 'empty' ? '#52525b' : '#18181b'}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {fillState !== 'empty' && (
        <path
          d="M14 5 L16 12 L23 14 L16 16 L14 23 L12 16 L5 14 L12 12 Z"
          fill="none"
          stroke="#fecaca"
          strokeWidth="0.9"
          opacity="0.65"
        />
      )}
    </svg>
  );
};

export const BallStarRow: React.FC<{
  stars: number; // 0.5..10
  maxStars?: number;
  size?: number;
  compact?: boolean;
}> = ({ stars, maxStars = 10, size = 16, compact = false }) => {
  if (compact) {
    return (
      <div className="inline-flex items-center gap-1">
        <Star4Pointed fillState="full" size={size} />
        <span className="font-mono font-bold text-red-400 tabular-nums text-xs">
          {stars % 1 === 0 ? stars.toFixed(0) : stars.toFixed(1)}★
        </span>
      </div>
    );
  }
  const count = Math.min(maxStars, Math.max(5, Math.ceil(stars)));
  const items: Array<'full' | 'half' | 'empty'> = [];
  for (let i = 1; i <= count; i++) {
    if (stars >= i) items.push('full');
    else if (stars >= i - 0.5) items.push('half');
    else items.push('empty');
  }
  return (
    <div
      className="inline-flex flex-wrap items-center gap-0.5"
      aria-label={`${stars} sao bóng`}
    >
      {items.map((st, idx) => (
        <Star4Pointed key={idx} fillState={st} size={size} />
      ))}
      <span className="ml-1 font-mono text-xs font-bold text-red-400 tabular-nums">
        ({stars % 1 === 0 ? stars.toFixed(0) : stars.toFixed(1)})
      </span>
    </div>
  );
};

/**
 * Biểu tượng đồng tiền B màu vàng viền đen vẽ tay
 */
export const CoinBIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <circle
      cx="16"
      cy="16"
      r="13.5"
      fill="#eab308"
      stroke="#09090b"
      strokeWidth="2.8"
    />
    <circle
      cx="16"
      cy="16"
      r="10.2"
      fill="#facc15"
      stroke="#854d0e"
      strokeWidth="1.4"
      strokeDasharray="4 2"
    />
    <text
      x="16"
      y="21.5"
      textAnchor="middle"
      fill="#09090b"
      fontSize="16"
      fontWeight="900"
      fontFamily="monospace"
    >
      B
    </text>
  </svg>
);

/**
 * Biểu tượng Chip Cược (Đỏ cho Player, Đen cho Bot, chữ B màu trắng)
 */
export const BetChipStack: React.FC<{
  owner: 'PLAYER' | 'BOT';
  amount: number;
}> = ({ owner, amount }) => {
  if (amount <= 0) return null;
  // Tính số chip vẽ ra (1 đến 5 chip dựa trên số tiền cược)
  const chipCount =
    amount >= 500_000_000
      ? 5
      : amount >= 200_000_000
      ? 4
      : amount >= 80_000_000
      ? 3
      : amount >= 25_000_000
      ? 2
      : 1;

  const bgFill = owner === 'PLAYER' ? '#dc2626' : '#18181b';
  const rimStroke = owner === 'PLAYER' ? '#fecaca' : '#a1a1aa';

  return (
    <div
      className="inline-flex items-center -space-x-2"
      title={`${owner}: ${amount.toLocaleString('vi-VN')} B`}
    >
      {Array.from({ length: chipCount }).map((_, idx) => (
        <svg
          key={idx}
          width={22}
          height={22}
          viewBox="0 0 28 28"
          className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.85)]"
        >
          <circle
            cx="14"
            cy="14"
            r="12"
            fill={bgFill}
            stroke="#09090b"
            strokeWidth="2.4"
          />
          <circle
            cx="14"
            cy="14"
            r="9"
            fill="none"
            stroke={rimStroke}
            strokeWidth="1.4"
            strokeDasharray="3 2"
          />
          <text
            x="14"
            y="18.2"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="12"
            fontWeight="900"
            fontFamily="monospace"
          >
            B
          </text>
        </svg>
      ))}
    </div>
  );
};

/**
 * Hình minh họa Bóng 2D vẽ tay kèm vũ khí đặc trưng
 */
export const HandDrawnBallIllustration: React.FC<{
  ball: BallDefinition;
  size?: number;
  animateWeapon?: boolean;
}> = ({ ball, size = 84, animateWeapon = false }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={animateWeapon ? 'transition-transform duration-300' : ''}
      aria-label={ball.name}
    >
      {/* Đổ bóng dưới chân */}
      <ellipse cx="60" cy="104" rx="30" ry="7" fill="rgba(0,0,0,0.55)" />

      {/* Vũ khí vẽ phía sau hoặc xung quanh bóng */}
      {ball.weaponType === 'greatsword' && (
        <g transform="rotate(-32 60 60)">
          {/* Lưỡi đại kiếm Dragon Slayer bản rộng (hai mép vát bạc sáng + lõi sắt đen chính giữa như Hình 210112) */}
          <path
            d="M60 1 L70 11 L69 39 L51 39 L50 11 Z"
            fill="#e2e8f0"
            stroke="#09090b"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          <path
            d="M60 5 L65 12 L64.5 39 L55.5 39 L55 12 Z"
            fill="#09090b"
          />
          {/* Khuyên tròn kim loại ở gốc lưỡi kiếm */}
          <circle cx="60" cy="36" r="2.8" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
          {/* Cán quấn băng trắng & dải vải bay */}
          <rect
            x="57.2"
            y="39"
            width="5.6"
            height="10"
            fill="#cbd5e1"
            stroke="#09090b"
            strokeWidth="2"
          />
          <path
            d="M62 45 Q72 42 75 49 Q67 48 62 47 Z"
            fill="#f8fafc"
            stroke="#09090b"
            strokeWidth="1.5"
          />
        </g>
      )}

      {ball.weaponType === 'katana' && (
        <g transform="rotate(36 60 60)">
          {/* Thanh kiếm Katana cong sắc bén (sống thép sẫm + lưỡi bạc sáng + cổ đồng vàng Habaki + chắn tay đen như Hình 211256) */}
          <path
            d="M59 1 C64 11, 65 25, 62.5 36 L57.5 36 C58.5 25, 57.5 11, 59 1 Z"
            fill="#f8fafc"
            stroke="#09090b"
            strokeWidth="2.4"
          />
          <path
            d="M59 2 C61.5 12, 62 25, 60.5 36"
            stroke="#475569"
            strokeWidth="1.8"
            fill="none"
          />
          {/* Cổ kiếm đồng vàng Habaki */}
          <rect
            x="57.2"
            y="35.5"
            width="5.6"
            height="3.5"
            fill="#eab308"
            stroke="#09090b"
            strokeWidth="1.4"
          />
          {/* Chắn tay tròn đen Tsuba */}
          <ellipse
            cx="60"
            cy="39.5"
            rx="6.5"
            ry="2"
            fill="#18181b"
            stroke="#52525b"
            strokeWidth="1.5"
          />
          {/* Cán kiếm đen quấn dây hình thoi */}
          <rect
            x="57.5"
            y="41"
            width="5"
            height="11"
            fill="#18181b"
            stroke="#09090b"
            strokeWidth="1.8"
          />
        </g>
      )}

      {ball.weaponType === 'fire_staff' && (
        <g transform="rotate(34 60 60)">
          {/* Trượng Phép Hỏa (hình 111731) - cán đen đỏ viền vàng, thanh ngang bùa lửa, sừng cong, hoa sen lửa + ngọc cam nổi */}
          {/* Thân trượng dài */}
          <line x1="60" y1="30" x2="60" y2="108" stroke="#09090b" strokeWidth="6" strokeLinecap="round" />
          <line x1="60" y1="30" x2="60" y2="108" stroke="#991b1b" strokeWidth="3.2" strokeLinecap="round" />
          <line x1="60" y1="44" x2="60" y2="90" stroke="#18181b" strokeWidth="3.2" />
          {/* Vòng vàng điểm xuyết */}
          <rect x="57" y="42" width="6" height="2.4" fill="#facc15" stroke="#09090b" strokeWidth="0.8" />
          <rect x="57" y="88" width="6" height="2.4" fill="#facc15" stroke="#09090b" strokeWidth="0.8" />
          {/* Chuôi lửa dưới */}
          <path d="M55 103 Q60 112 65 103 Q60 107 55 103 Z" fill="#f97316" stroke="#09090b" strokeWidth="1.2" />
          {/* Thanh ngang & 2 bùa lửa treo */}
          <path d="M47 32 Q60 36 73 32" fill="none" stroke="#18181b" strokeWidth="3.6" strokeLinecap="round" />
          <line x1="50" y1="33" x2="50" y2="41" stroke="#facc15" strokeWidth="1.2" />
          <circle cx="50" cy="42" r="2.2" fill="#f97316" stroke="#09090b" strokeWidth="1" />
          <line x1="70" y1="33" x2="70" y2="41" stroke="#facc15" strokeWidth="1.2" />
          <circle cx="70" cy="42" r="2.2" fill="#f97316" stroke="#09090b" strokeWidth="1" />
          {/* Cặp sừng đen viền lửa uốn cong */}
          <path d="M54 30 C44 26 42 15 47 7 C48 16 51 22 57 25 Z" fill="#18181b" stroke="#ea580c" strokeWidth="1.5" />
          <path d="M66 30 C76 26 78 15 73 7 C72 16 69 22 63 25 Z" fill="#18181b" stroke="#ea580c" strokeWidth="1.5" />
          {/* Đài sen lửa & viên ngọc hổ phách */}
          <path d="M53 26 Q60 11 67 26 Q60 31 53 26 Z" fill="#f97316" stroke="#7f1d1d" strokeWidth="1.4" />
          <ellipse cx="60" cy="21" rx="4.2" ry="5.5" fill="#fb923c" stroke="#fef08a" strokeWidth="1.4" />
          <circle cx="60" cy="19.5" r="2" fill="#fef08a" />
          {/* Quả cầu lửa nhỏ bay lơ lửng trên đỉnh */}
          <circle cx="60" cy="9" r="3" fill="#fb923c" stroke="#fef08a" strokeWidth="1.2" />
        </g>
      )}

      {ball.weaponType === 'ice_staff' && (
        <g transform="rotate(34 60 60)">
          {/* Trượng Phép Băng (hình 193722) - cán gỗ nâu vàng quấn dải băng xanh, cổ rồng xanh đậm, đầu tinh thể băng phát sáng */}
          {/* Thân trượng nâu vàng hơi uốn */}
          <path d="M60 32 Q57 70 60 106" fill="none" stroke="#09090b" strokeWidth="6" strokeLinecap="round" />
          <path d="M60 32 Q57 70 60 106" fill="none" stroke="#b45309" strokeWidth="3.4" strokeLinecap="round" />
          {/* Dải băng xanh quấn xoắn quanh cán trượng */}
          <path d="M57 42 L62 47 M57 52 L62 57 M56 62 L61 67 M56 72 L61 77 M57 82 L62 87 M57 92 L62 97" stroke="#bae6fd" strokeWidth="1.7" strokeLinecap="round" />
          {/* Đuôi trượng vàng + ngọc băng */}
          <polygon points="56,102 64,102 60,111" fill="#d97706" stroke="#09090b" strokeWidth="1.2" />
          <circle cx="60" cy="105" r="2.2" fill="#7dd3fc" />
          {/* Cổ rồng xanh dương đậm & vòng vàng */}
          <rect x="56.5" y="34" width="7" height="2.6" fill="#facc15" stroke="#09090b" strokeWidth="0.9" />
          <path d="M53 34 C50 26 53 22 60 22 C67 22 70 26 67 34 Z" fill="#1e3a8a" stroke="#09090b" strokeWidth="1.5" />
          {/* Khối tinh thể băng phát sáng trên đỉnh trượng */}
          <polygon points="60,4 69,13 73,21 67,29 53,29 48,20 53,11" fill="#38bdf8" stroke="#0369a1" strokeWidth="1.5" />
          <polygon points="60,6 66,15 62,26 56,22 55,14" fill="#e0f2fe" opacity="0.85" />
          <circle cx="52" cy="10" r="1.5" fill="#bae6fd" />
          <circle cx="69" cy="9" r="1.3" fill="#ffffff" />
        </g>
      )}
      {ball.weaponType === 'earth_staff' && (
        <g transform="rotate(34 60 60)">
          {/* Trượng Phép Thổ (như Hình 093908) - cán gỗ quấn rễ cây nâu sẫm ôm viên đá tinh thể nâu */}
          <path d="M60 32 L60 108" stroke="#09090b" strokeWidth="6" strokeLinecap="round" />
          <path d="M60 32 L60 108" stroke="#a16207" strokeWidth="3.6" strokeLinecap="round" />
          {/* Rễ cây xoắn dọc cán trượng */}
          <path
            d="M57 102 C64 90, 55 78, 63 66 C56 54, 65 44, 60 34"
            fill="none"
            stroke="#3f2312"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          {/* Bốn nhánh rễ cây vươn ôm tinh thể đá */}
          <path d="M56 35 Q46 24 49 11" fill="none" stroke="#3f2312" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M64 35 Q74 24 71 11" fill="none" stroke="#3f2312" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M56 36 Q48 28 46 21" fill="none" stroke="#573620" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M64 36 Q72 28 74 21" fill="none" stroke="#573620" strokeWidth="2.4" strokeLinecap="round" />
          {/* Viên đá tinh thể nâu khắc rãnh chữ V */}
          <polygon points="60,5 68,18 60,30 52,18" fill="#78350f" stroke="#1c1008" strokeWidth="1.6" />
          <polyline points="55,19 60,12 65,19" fill="none" stroke="#d97706" strokeWidth="1.5" />
        </g>
      )}
      {ball.weaponType === 'wind_staff' && (
        <g transform="rotate(34 60 60)">
          {/* Trượng Phong Linh (hình image_ddd96204): cán gỗ nâu đen viền vòng vàng, hai dải ruy-băng xanh, đầu trượng cánh gió vàng-lục ôm viên ngọc lục bảo hình thoi */}
          {/* Thân trượng */}
          <line x1="60" y1="30" x2="60" y2="108" stroke="#09090b" strokeWidth="6" strokeLinecap="round" />
          <line x1="60" y1="30" x2="60" y2="108" stroke="#14532d" strokeWidth="3.4" strokeLinecap="round" />
          {/* Vòng kim loại vàng điểm xuyết */}
          <rect x="56.5" y="34" width="7" height="3" fill="#eab308" stroke="#09090b" strokeWidth="0.9" />
          <rect x="57" y="88" width="6" height="2.6" fill="#eab308" stroke="#09090b" strokeWidth="0.9" />
          <polygon points="56.5,103 63.5,103 60,111" fill="#ca8a04" stroke="#09090b" strokeWidth="1.1" />
          {/* Hai dải ruy-băng xanh lá bay phấp phới dưới đầu trượng */}
          <path d="M62 36 Q75 34 79 44 Q71 42 62 39 Z" fill="#4ade80" stroke="#14532d" strokeWidth="1.1" />
          <path d="M62 38 Q72 45 73 55 Q66 50 61 40 Z" fill="#22c55e" stroke="#14532d" strokeWidth="1.1" />
          {/* Hai cánh gió uốn cong ôm viên ngọc lục bảo */}
          <path d="M55 33 C42 29 41 14 50 7 C49 16 51 23 56 26 Z" fill="#eab308" stroke="#09090b" strokeWidth="1.4" />
          <path d="M55 31 C45 27 44 16 50 9 C50 17 52 23 56 26 Z" fill="#86efac" opacity="0.8" />
          <path d="M65 33 C78 29 79 14 70 7 C71 16 69 23 64 26 Z" fill="#eab308" stroke="#09090b" strokeWidth="1.4" />
          <path d="M65 31 C75 27 76 16 70 9 C70 17 68 23 64 26 Z" fill="#86efac" opacity="0.8" />
          {/* Viên ngọc lục bảo hình thoi phát sáng */}
          <polygon points="60,10 66.5,19.5 60,29 53.5,19.5" fill="#4ade80" stroke="#14532d" strokeWidth="1.5" />
          <polygon points="60,12 63.5,19.5 60,26 56.5,19.5" fill="#bbf7d0" />
          {/* Vòng gió xoáy nhẹ quanh đầu trượng */}
          <ellipse cx="60" cy="19.5" rx="14" ry="6" fill="none" stroke="#86efac" strokeWidth="1.2" strokeDasharray="8 5" opacity="0.8" />
        </g>
      )}

      {/* Thân quả bóng tròn với viền đen dày nét vẽ tay */}
      <circle
        cx="60"
        cy="60"
        r="31"
        fill={ball.primaryColor}
        stroke="#09090b"
        strokeWidth="4.5"
      />
      {/* Mảng màu phụ tạo khối hoạt hình 2D */}
      <path
        d="M35 45 A29 29 0 0 0 85 75 A26 26 0 0 1 35 45 Z"
        fill={ball.secondaryColor}
        opacity="0.55"
      />
      {/* Điểm sáng vẽ tay */}
      <ellipse
        cx="47"
        cy="44"
        rx="8"
        ry="4.5"
        transform="rotate(-25 47 44)"
        fill="#ffffff"
        opacity="0.45"
      />

      {/* Biểu cảm chiến đấu 2D trên thân bóng */}
      <path
        d="M44 52 L55 57 M76 52 L65 57"
        stroke="#09090b"
        strokeWidth="3.8"
        strokeLinecap="round"
      />
      <circle cx="50" cy="60" r="3.8" fill="#09090b" />
      <circle cx="70" cy="60" r="3.8" fill="#09090b" />
      <circle cx="51" cy="59" r="1.3" fill="#ffffff" />
      <circle cx="71" cy="59" r="1.3" fill="#ffffff" />

      {/* Hào quang gió xoáy & lá xanh bay quanh Pháp Sư Gió */}
      {ball.weaponType === 'wind_staff' && (
        <g pointerEvents="none">
          <path
            d="M22 66 C18 40, 42 20, 74 26 C52 24, 29 41, 28 65 Z"
            fill="#86efac"
            opacity="0.6"
          />
          <path
            d="M96 54 C99 78, 72 98, 42 91 C67 93, 89 76, 90 55 Z"
            fill="#4ade80"
            opacity="0.55"
          />
          <path d="M24 44 Q28 38 33 41 Q29 47 24 44 Z" fill="#86efac" stroke="#14532d" strokeWidth="0.9" />
          <path d="M88 82 Q93 76 97 80 Q93 86 88 82 Z" fill="#4ade80" stroke="#14532d" strokeWidth="0.9" />
        </g>
      )}

      {/* Vũ khí vẽ phía trước */}
      {ball.weaponType === 'bow' && (
        <g>
          {/* Cây cung bên phải */}
          <path
            d="M84 30 C106 45, 106 75, 84 90"
            fill="none"
            stroke="#eab308"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <path
            d="M84 30 C106 45, 106 75, 84 90"
            fill="none"
            stroke="#09090b"
            strokeWidth="1.8"
          />
          <line
            x1="84"
            y1="32"
            x2="84"
            y2="88"
            stroke="#f8fafc"
            strokeWidth="2"
          />
          {/* Mũi tên */}
          <line
            x1="76"
            y1="60"
            x2="112"
            y2="60"
            stroke="#f97316"
            strokeWidth="3.5"
          />
          <polygon
            points="115,60 105,54 105,66"
            fill="#eab308"
            stroke="#09090b"
            strokeWidth="2"
          />
        </g>
      )}

      {ball.weaponType === 'boxing_gloves' && (
        <g>
          {ball.id === 'speed' && (
            <>
              <circle
                cx="46"
                cy="60"
                r="29"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeDasharray="6 4"
                opacity="0.65"
              />
              <circle
                cx="36"
                cy="60"
                r="26"
                fill="none"
                stroke="#7dd3fc"
                strokeWidth="2"
                strokeDasharray="4 4"
                opacity="0.4"
              />
            </>
          )}
          {/* Găng trái */}
          <circle
            cx="24"
            cy="64"
            r="12"
            fill={ball.id === 'speed' ? '#0284c7' : '#dc2626'}
            stroke="#09090b"
            strokeWidth="3.5"
          />
          <circle
            cx="28"
            cy="58"
            r="5"
            fill={ball.id === 'speed' ? '#38bdf8' : '#ef4444'}
            stroke="#09090b"
            strokeWidth="2"
          />
          {/* Găng phải */}
          <circle
            cx="96"
            cy="64"
            r="12"
            fill={ball.id === 'speed' ? '#0284c7' : '#dc2626'}
            stroke="#09090b"
            strokeWidth="3.5"
          />
          <circle
            cx="92"
            cy="58"
            r="5"
            fill={ball.id === 'speed' ? '#38bdf8' : '#ef4444'}
            stroke="#09090b"
            strokeWidth="2"
          />
        </g>
      )}

      {ball.weaponType === 'shield' && (
        <g>
          {/* Khiên Hiệp Sĩ Chữ Thập Đinh Tán (như hình 231006) */}
          <path
            d="M89 34 Q98 37 107 38 L107 62 Q107 78 89 90 Q71 78 71 62 L71 38 Q80 37 89 34 Z"
            fill="#cbd5e1"
            stroke="#334155"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M89 38 Q96 40 103 41 L103 61 Q103 74 89 84 Q75 74 75 61 L75 41 Q82 40 89 38 Z"
            fill="#e2e8f0"
            stroke="#64748b"
            strokeWidth="1.5"
          />
          {/* Thanh chữ thập gia cố */}
          <rect x="74" y="55" width="30" height="5" fill="#94a3b8" stroke="#475569" strokeWidth="1.2" />
          <rect x="86.5" y="37" width="5" height="48" fill="#94a3b8" stroke="#475569" strokeWidth="1.2" />
          {/* Đinh tán */}
          <circle cx="89" cy="43" r="1.4" fill="#334155" />
          <circle cx="89" cy="57.5" r="1.6" fill="#f8fafc" stroke="#334155" strokeWidth="0.8" />
          <circle cx="89" cy="72" r="1.4" fill="#334155" />
          <circle cx="79" cy="57.5" r="1.4" fill="#334155" />
          <circle cx="99" cy="57.5" r="1.4" fill="#334155" />
        </g>
      )}

      {ball.weaponType === 'dual_daggers' && (
        <g>
          {/* Đao Săn Damascus Đầu Sói Trái (như hình 231249) */}
          <g transform="translate(22, 62) rotate(-135)">
            {/* Đốc cán đầu sói bạc */}
            <circle cx="-12" cy="0" r="4" fill="#cbd5e1" stroke="#09090b" strokeWidth="1.5" />
            {/* Cán gỗ mun đen */}
            <rect x="-9" y="-3" width="10" height="6" rx="2" fill="#18181b" stroke="#09090b" strokeWidth="1.5" />
            {/* Cổ đao bạc khắc tam giác */}
            <polygon points="1,-4.5 5,-3.5 5,3.5 1,4.5" fill="#e2e8f0" stroke="#09090b" strokeWidth="1.2" />
            {/* Lưỡi đao cong Damascus + sống đao vân đá */}
            <path
              d="M5 -3.5 L18 -4.5 L30 0 L20 5.5 Q12 6 5 3.5 Z"
              fill="#cbd5e1"
              stroke="#09090b"
              strokeWidth="1.8"
            />
            <path d="M5 -3.5 L18 -4.5 L26 -1 L5 -0.5 Z" fill="#27272a" />
            <path d="M7 2 Q14 4 25 1" fill="none" stroke="#f8fafc" strokeWidth="1.1" />
          </g>
          {/* Đao Săn Damascus Đầu Sói Phải (như hình 231249) */}
          <g transform="translate(98, 62) rotate(-45)">
            <circle cx="-12" cy="0" r="4" fill="#cbd5e1" stroke="#09090b" strokeWidth="1.5" />
            <rect x="-9" y="-3" width="10" height="6" rx="2" fill="#18181b" stroke="#09090b" strokeWidth="1.5" />
            <polygon points="1,-4.5 5,-3.5 5,3.5 1,4.5" fill="#e2e8f0" stroke="#09090b" strokeWidth="1.2" />
            <path
              d="M5 -3.5 L18 -4.5 L30 0 L20 5.5 Q12 6 5 3.5 Z"
              fill="#cbd5e1"
              stroke="#09090b"
              strokeWidth="1.8"
            />
            <path d="M5 -3.5 L18 -4.5 L26 -1 L5 -0.5 Z" fill="#27272a" />
            <path d="M7 2 Q14 4 25 1" fill="none" stroke="#f8fafc" strokeWidth="1.1" />
          </g>
        </g>
      )}
    </svg>
  );
};

/**
 * Biểu tượng Kỹ năng nằm trong ô vuông viền đen vẽ tay
 */
export const SkillIconBox: React.FC<{
  skill: SkillDefinition;
  size?: number;
}> = ({ skill, size = 44 }) => {
  return (
    <div
      className="relative flex items-center justify-center bg-zinc-900 border-2 border-black shadow-[2px_2px_0px_#000] shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.72} height={size * 0.72} viewBox="0 0 32 32" aria-hidden="true">
        {skill.iconType === 'rapid_arrow' && (
          <g stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round">
            <line x1="4" y1="10" x2="26" y2="10" />
            <polyline points="20,6 27,10 20,14" fill="none" />
            <line x1="2" y1="18" x2="24" y2="18" stroke="#eab308" />
            <polyline points="18,14 25,18 18,22" fill="none" stroke="#eab308" />
            <line x1="6" y1="25" x2="28" y2="25" />
          </g>
        )}
        {skill.iconType === 'charge_arrow' && (
          <g>
            <circle cx="16" cy="16" r="11" fill="rgba(249,115,22,0.25)" stroke="#f97316" strokeWidth="2" />
            <line x1="5" y1="27" x2="26" y2="6" stroke="#fb923c" strokeWidth="3.5" />
            <polygon points="28,4 19,6 26,13" fill="#fde047" />
          </g>
        )}
        {skill.iconType === 'dead_zone' && (
          <g>
            <ellipse cx="16" cy="23" rx="12" ry="5" fill="rgba(239,68,68,0.3)" stroke="#ef4444" strokeWidth="2" />
            <line x1="11" y1="4" x2="11" y2="21" stroke="#facc15" strokeWidth="2.5" />
            <line x1="16" y1="2" x2="16" y2="23" stroke="#ef4444" strokeWidth="2.5" />
            <line x1="21" y1="5" x2="21" y2="21" stroke="#facc15" strokeWidth="2.5" />
          </g>
        )}
        {skill.iconType === 'flurry_punch' && (
          <g>
            <circle cx="11" cy="12" r="6" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
            <circle cx="21" cy="19" r="7" fill="#dc2626" stroke="#fff" strokeWidth="1.5" />
            <path d="M3 12 L7 12 M4 20 L12 20" stroke="#fca5a5" strokeWidth="2.5" />
          </g>
        )}
        {skill.iconType === 'rage_fist' && (
          <g>
            <path d="M8 26 L12 10 L20 10 L24 26 Z" fill="#ef4444" stroke="#fde047" strokeWidth="2" />
            <path d="M16 3 L19 9 L13 9 Z" fill="#fde047" />
          </g>
        )}
        {skill.iconType === 'blink_strike' && (
          <g stroke="#f87171" strokeWidth="2.5" fill="none">
            <path d="M6 24 L18 16 L12 12 L26 6" />
            <circle cx="25" cy="7" r="3" fill="#ef4444" />
          </g>
        )}
        {skill.iconType === 'blade_vortex' && (
          <g fill="none" stroke="#facc15" strokeWidth="2.6">
            <circle cx="16" cy="16" r="10" strokeDasharray="8 4" />
            <circle cx="16" cy="16" r="5" stroke="#fef08a" />
          </g>
        )}
        {skill.iconType === 'sword_plunge' && (
          <g>
            <polygon points="16,28 10,10 22,10" fill="#fde047" stroke="#09090b" strokeWidth="1.5" />
            <polygon points="16,24 13,10 19,10" fill="#09090b" />
            <rect x="13" y="4" width="6" height="6" fill="#e2e8f0" stroke="#09090b" strokeWidth="1.2" />
          </g>
        )}
        {skill.iconType === 'greatsword_buff' && (
          <g>
            <path d="M8 24 L24 8" stroke="#fde047" strokeWidth="4.5" />
            <circle cx="16" cy="16" r="11" fill="none" stroke="#eab308" strokeWidth="2.2" strokeDasharray="4 3" />
          </g>
        )}
        {skill.iconType === 'blade_wave' && (
          <g>
            <path
              d="M6 6 C22 10, 22 22, 6 26 C16 20, 16 12, 6 6 Z"
              fill="#ffffff"
              stroke="#2563eb"
              strokeWidth="2.4"
            />
            <circle cx="23" cy="10" r="1.5" fill="#7dd3fc" />
            <circle cx="24" cy="21" r="1.3" fill="#ffffff" />
          </g>
        )}
        {skill.iconType === 'dash_slash' && (
          <g stroke="#0ea5e9" strokeWidth="3" strokeLinecap="round">
            <line x1="4" y1="24" x2="27" y2="7" />
            <line x1="4" y1="16" x2="18" y2="6" stroke="#bae6fd" strokeWidth="2.2" />
          </g>
        )}
        {skill.iconType === 'mist_zone' && (
          <g>
            <circle cx="16" cy="16" r="11" fill="rgba(30,27,75,0.85)" stroke="#6366f1" strokeWidth="1.8" />
            <line x1="11" y1="8" x2="11" y2="14" stroke="#e2e8f0" strokeWidth="1.6" />
            <line x1="16" y1="11" x2="16" y2="18" stroke="#e2e8f0" strokeWidth="1.6" />
            <line x1="21" y1="9" x2="21" y2="15" stroke="#e2e8f0" strokeWidth="1.6" />
          </g>
        )}
        {skill.iconType === 'five_shields' && (
          <g fill="#e2e8f0" stroke="#38bdf8" strokeWidth="1.5">
            <circle cx="16" cy="16" r="10" fill="none" stroke="rgba(186,230,253,0.45)" strokeDasharray="4 3" />
            <circle cx="16" cy="5.5" r="3.2" />
            <circle cx="26" cy="12.5" r="3.2" />
            <circle cx="22" cy="24.5" r="3.2" />
            <circle cx="10" cy="24.5" r="3.2" />
            <circle cx="6" cy="12.5" r="3.2" />
          </g>
        )}
        {skill.iconType === 'invulnerable' && (
          <g>
            <circle cx="16" cy="16" r="13" fill="rgba(248,250,252,0.22)" stroke="#f8fafc" strokeWidth="1.4" strokeDasharray="3 2" />
            <path
              d="M16 4 L25 7.5 L25 16 C25 22.5, 20.5 26.5, 16 28.5 C11.5 26.5, 7 22.5, 7 16 L7 7.5 Z"
              fill="#e2e8f0"
              stroke="#ffffff"
              strokeWidth="2"
            />
          </g>
        )}
        {skill.iconType === 'shield_throw' && (
          <g>
            <path d="M2 11 L9 11 M1 16 L7 16 M2 21 L9 21" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" />
            <path
              d="M11 8 L20 8 Q26 8 29 16 Q26 24 20 24 L11 24 Q13 16 11 8 Z"
              fill="#e2e8f0"
              stroke="#475569"
              strokeWidth="2"
            />
            <line x1="12" y1="16" x2="27" y2="16" stroke="#64748b" strokeWidth="2" />
            <line x1="19" y1="9" x2="19" y2="23" stroke="#64748b" strokeWidth="2" />
          </g>
        )}
        {skill.iconType === 'assassinate' && (
          <g stroke="#a855f7" strokeWidth="3" strokeLinecap="round">
            <line x1="4" y1="25" x2="27" y2="6" />
            <line x1="4" y1="17" x2="18" y2="5" stroke="#e9d5ff" strokeWidth="2.2" />
            <circle cx="25" cy="7" r="3" fill="#f3e8ff" stroke="none" />
          </g>
        )}
        {skill.iconType === 'stealth' && (
          <g>
            <circle cx="11" cy="19" r="5" fill="rgba(161,161,170,0.45)" />
            <circle cx="20" cy="18" r="6" fill="rgba(212,212,216,0.45)" />
            <circle cx="15" cy="13" r="6" fill="rgba(228,228,231,0.5)" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="3 2" />
          </g>
        )}
        {skill.iconType === 'twin_daggers' && (
          <g>
            <path d="M4 12 L24 6 M6 22 L26 16" stroke="rgba(192,132,252,0.55)" strokeWidth="4" strokeLinecap="round" />
            <polygon points="27,5 13,9 16,13" fill="#e2e8f0" stroke="#18181b" strokeWidth="1.3" />
            <polygon points="29,15 15,19 18,23" fill="#e2e8f0" stroke="#18181b" strokeWidth="1.3" />
          </g>
        )}
        {skill.iconType === 'self_boost' && (
          <g>
            <circle cx="16" cy="16" r="12" fill="rgba(125,211,252,0.28)" stroke="#e0f2fe" strokeWidth="1.4" strokeDasharray="3 2" />
            <polygon
              points="18,3 8,17 15,17 13,29 24,14 17,14"
              fill="#e0f2fe"
              stroke="#0284c7"
              strokeWidth="1.8"
            />
          </g>
        )}
        {skill.iconType === 'speed_chevron' && (
          <g>
            {/* Mũi tên kép >> bán trong suốt phát sáng như hình 145009 */}
            <circle cx="16" cy="16" r="13" fill="rgba(56,189,248,0.18)" />
            <polygon
              points="5,8 11,8 17,16 11,24 5,24 11,16"
              fill="rgba(125,211,252,0.75)"
              stroke="#e0f2fe"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <polygon
              points="15,8 21,8 27,16 21,24 15,24 21,16"
              fill="rgba(224,242,254,0.9)"
              stroke="#38bdf8"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </g>
        )}
        {skill.iconType === 'fireball_cast' && (
          <g>
            <circle cx="16" cy="16" r="11" fill="#991b1b" stroke="#fb923c" strokeWidth="2" />
            <circle cx="16" cy="16" r="7.5" fill="#ea580c" />
            <circle cx="15" cy="15" r="4.5" fill="#fde047" />
            <circle cx="24" cy="8" r="2" fill="#fb923c" />
            <circle cx="8" cy="24" r="1.8" fill="#fde047" />
          </g>
        )}
        {skill.iconType === 'fire_rain' && (
          <g>
            <ellipse cx="16" cy="25" rx="12" ry="4" fill="rgba(234,88,12,0.45)" stroke="#fb923c" strokeWidth="1.6" />
            <path d="M9 6 C9 12, 12 13, 12 15 A2.5 2.5 0 1 1 7 15 C7 13, 9 11, 9 6 Z" fill="#fb923c" stroke="#fde047" strokeWidth="1" />
            <path d="M16 3 C16 10, 19.5 11.5, 19.5 14 A3 3 0 1 1 13.5 14 C13.5 11.5, 16 9, 16 3 Z" fill="#ef4444" stroke="#fde047" strokeWidth="1" />
            <path d="M23 7 C23 13, 25.5 14, 25.5 16 A2.2 2.2 0 1 1 21 16 C21 14, 23 12, 23 7 Z" fill="#fb923c" stroke="#fde047" strokeWidth="1" />
          </g>
        )}
        {skill.iconType === 'fire_god' && (
          <g>
            <path d="M4 25 L26 7" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" opacity="0.6" />
            <path d="M4 25 L26 7" stroke="#fde047" strokeWidth="2" strokeLinecap="round" />
            <path d="M10 9 Q18 6 26 9 Q21 14 27 21 Q18 16 12 22 Q15 15 10 9 Z" fill="#f97316" stroke="#fef08a" strokeWidth="1.4" />
          </g>
        )}
        {skill.iconType === 'ice_clasp' && (
          <g>
            {/* Hai khối nhũ băng đối nhau mũi nhọn quay vào tâm */}
            <polygon points="3,8 14,11 3,14" fill="#7dd3fc" stroke="#0369a1" strokeWidth="1.2" />
            <polygon points="3,15 15,17 3,20" fill="#bae6fd" stroke="#0369a1" strokeWidth="1.2" />
            <polygon points="3,21 12,23 3,25" fill="#38bdf8" stroke="#0369a1" strokeWidth="1.2" />
            <polygon points="29,8 18,11 29,14" fill="#7dd3fc" stroke="#0369a1" strokeWidth="1.2" />
            <polygon points="29,15 17,17 29,20" fill="#bae6fd" stroke="#0369a1" strokeWidth="1.2" />
            <polygon points="29,21 20,23 29,25" fill="#38bdf8" stroke="#0369a1" strokeWidth="1.2" />
          </g>
        )}
        {skill.iconType === 'ice_swords' && (
          <g>
            <polygon points="10,4 13,17 10,20 7,17" fill="#bae6fd" stroke="#0369a1" strokeWidth="1.2" />
            <line x1="10" y1="20" x2="10" y2="27" stroke="#0c4a6e" strokeWidth="2.5" />
            <polygon points="22,4 25,17 22,20 19,17" fill="#38bdf8" stroke="#e0f2fe" strokeWidth="1.2" />
            <line x1="22" y1="20" x2="22" y2="27" stroke="#0c4a6e" strokeWidth="2.5" />
          </g>
        )}
        {skill.iconType === 'ice_zone' && (
          <g>
            <circle cx="16" cy="16" r="11.5" fill="rgba(125,211,252,0.28)" stroke="#7dd3fc" strokeWidth="1.8" />
            <circle cx="11" cy="11" r="1.7" fill="#ffffff" />
            <circle cx="21" cy="13" r="1.5" fill="#e0f2fe" />
            <circle cx="16" cy="20" r="1.8" fill="#ffffff" />
            <circle cx="12" cy="18" r="1.3" fill="#bae6fd" />
            <circle cx="20" cy="21" r="1.4" fill="#ffffff" />
          </g>
        )}
        {skill.iconType === 'earth_mace' && (
          <g>
            {/* Trùy Đất đầu đá xám xanh, đinh tán đồng & lõi hổ phách */}
            <line x1="8" y1="26" x2="17" y2="17" stroke="#92400e" strokeWidth="3.2" strokeLinecap="round" />
            <g transform="translate(19, 13) rotate(-45)">
              <rect x="-8" y="-6" width="16" height="12" rx="2" fill="#475569" stroke="#f59e0b" strokeWidth="1.4" />
              <polygon points="0,-4 3,0 0,4 -3,0" fill="#fbbf24" />
              <circle cx="-5.5" cy="-3.5" r="1.2" fill="#c2410c" />
              <circle cx="5.5" cy="-3.5" r="1.2" fill="#c2410c" />
              <circle cx="-5.5" cy="3.5" r="1.2" fill="#c2410c" />
              <circle cx="5.5" cy="3.5" r="1.2" fill="#c2410c" />
            </g>
          </g>
        )}
        {skill.iconType === 'earth_wall' && (
          <g>
            {/* Tường Đất nứt sáng vàng hổ phách */}
            <polygon points="6,26 8,8 14,5 21,7 26,11 25,26" fill="#92400e" stroke="#f59e0b" strokeWidth="1.6" />
            <polyline points="14,6 12,15 17,19 14,26" fill="none" stroke="#fef08a" strokeWidth="1.8" />
            <polyline points="21,10 18,16 22,22" fill="none" stroke="#fde047" strokeWidth="1.4" />
          </g>
        )}
        {skill.iconType === 'earth_spikes' && (
          <g>
            {/* Gai Đất trồi nhọn từ mặt đất vàng cam */}
            <polygon points="4,25 9,10 15,25" fill="#78350f" stroke="#f59e0b" strokeWidth="1.3" />
            <polygon points="11,25 17,4 23,25" fill="#b45309" stroke="#fef08a" strokeWidth="1.5" />
            <polygon points="19,25 25,11 29,25" fill="#78350f" stroke="#f59e0b" strokeWidth="1.3" />
            <ellipse cx="16" cy="26" rx="12" ry="2.2" fill="rgba(251,191,36,0.55)" />
          </g>
        )}
        {skill.iconType === 'wind_tornado' && (
          <g>
            {/* Lốc Xoáy hình phễu nằm ngang lao thẳng */}
            <path d="M4 11 L15 11 M3 16 L12 16 M5 21 L14 21" stroke="#86efac" strokeWidth="2" strokeLinecap="round" />
            <ellipse cx="22" cy="16" rx="5.5" ry="9.5" fill="rgba(74,222,128,0.4)" stroke="#bbf7d0" strokeWidth="2" />
            <ellipse cx="16.5" cy="16" rx="4" ry="7" fill="rgba(22,163,74,0.45)" stroke="#86efac" strokeWidth="1.8" />
            <ellipse cx="12" cy="16" rx="2.5" ry="4.5" fill="rgba(22,163,74,0.55)" stroke="#dcfce7" strokeWidth="1.5" />
            <path d="M26 7 Q29 6 28 9 Q25 10 26 7 Z" fill="#86efac" />
          </g>
        )}
        {skill.iconType === 'wind_burst' && (
          <g>
            {/* Phong Bạo: Vòng xoáy bão xanh ngọc bao quanh tâm */}
            <circle cx="16" cy="16" r="12" fill="rgba(22,163,74,0.22)" stroke="#4ade80" strokeWidth="1.8" strokeDasharray="7 4" />
            <path d="M7 14 A9 9 0 0 1 24 10" fill="none" stroke="#bbf7d0" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M25 18 A9 9 0 0 1 8 22" fill="none" stroke="#86efac" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="16" cy="16" r="4" fill="#22c55e" stroke="#dcfce7" strokeWidth="1.4" />
          </g>
        )}
        {skill.iconType === 'wind_maelstrom' && (
          <g>
            {/* Thiên Long Quyển: Cột cuồng phong thẳng đứng xoáy tầng */}
            <ellipse cx="16" cy="26.5" rx="11" ry="2.8" fill="rgba(74,222,128,0.35)" stroke="#86efac" strokeWidth="1.4" />
            <ellipse cx="16" cy="22" rx="4.5" ry="2" fill="none" stroke="#4ade80" strokeWidth="2" />
            <ellipse cx="16" cy="17" rx="7" ry="2.6" fill="none" stroke="#bbf7d0" strokeWidth="2.2" />
            <ellipse cx="16" cy="11.5" rx="9.5" ry="3.2" fill="none" stroke="#4ade80" strokeWidth="2.3" />
            <ellipse cx="16" cy="6.5" rx="11.5" ry="3.5" fill="rgba(134,239,172,0.25)" stroke="#dcfce7" strokeWidth="2" />
            <path d="M6 12 Q8 10 9 13 Q7 14 6 12 Z" fill="#86efac" />
            <path d="M25 18 Q28 16 28 19 Q26 20 25 18 Z" fill="#bbf7d0" />
          </g>
        )}
      </svg>
    </div>
  );
};
