export type GameScreenState =
  | 'MAIN_MENU'
  | 'COLLECTION'
  | 'SHOP'
  | 'BALL_SELECTION'
  | 'PREPARATION'
  | 'BATTLE'
  | 'ROUND_RESULT'
  | 'MATCH_RESULT';

export type WeaponType =
  | 'bow'
  | 'boxing_gloves'
  | 'greatsword'
  | 'katana'
  | 'shield'
  | 'dual_daggers'
  | 'fire_staff'
  | 'ice_staff'
  | 'earth_staff'
  | 'wind_staff';

export type AIArchetype =
  | 'kiter'      // Archer: keeps distance, aims shots
  | 'brawler'    // Boxer: aggressive gap-closer
  | 'zoner'      // Swordsman: mid-close range area control
  | 'skirmisher' // Samurai: dash & ranged wave hybrid
  | 'warden'     // Defender: survival, reflect & counter
  | 'stalker'    // Assassin: stealth, flank & burst
  | 'pyromancer' // Fire Mage: ranged fireballs, burn & zone control
  | 'cryomancer' // Ice Mage: chill, freeze & ice projectiles
  | 'geomancer'  // Earth Mage: earth blocks, counter walls, mace & earth spikes
  | 'aeromancer'; // Wind Mage: wind bolts, tailwind, tornado, wind burst & maelstrom

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  cooldown: number; // seconds
  iconType:
    | 'rapid_arrow'
    | 'charge_arrow'
    | 'dead_zone'
    | 'flurry_punch'
    | 'rage_fist'
    | 'blink_strike'
    | 'blade_vortex'
    | 'sword_plunge'
    | 'greatsword_buff'
    | 'blade_wave'
    | 'dash_slash'
    | 'mist_zone'
    | 'five_shields'
    | 'invulnerable'
    | 'shield_throw'
    | 'assassinate'
    | 'stealth'
    | 'twin_daggers'
    | 'self_boost'
    | 'speed_chevron'
    | 'fireball_cast'
    | 'fire_rain'
    | 'fire_god'
    | 'ice_clasp'
    | 'ice_swords'
    | 'ice_zone'
    | 'earth_mace'
    | 'earth_wall'
    | 'earth_spikes'
    | 'wind_tornado'
    | 'wind_burst'
    | 'wind_maelstrom';
}

export interface PassiveDefinition {
  name: string;
  lines: string[];
}

export interface BallUpgradeLevels {
  defense: number;     // 0..5 (-2% dmg taken per lvl, lvl 5 unlocks <10% HP shield)
  basicDamage: number; // 0..5 (+1% basic weapon damage per lvl)
  cooldown: number;    // 0..5 (-2% skill cooldown per lvl)
}

export interface BallBaseRatings {
  damage: number;   // 0..100
  defense: number;  // 0..100
  passive: number;  // 0..100
  skill: number;    // 0..100
  cooldown: number; // 0..100
}

export interface BallDefinition {
  id: string;
  name: string;
  vietnameseTitle: string;
  isStarterPool: boolean;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  baseHp: number;
  baseDamage: number;
  baseDefensePct: number;
  weaponType: WeaponType;
  weaponName: string;
  aiArchetype: AIArchetype;
  baseRatings: BallBaseRatings;
  upgradeBaseCosts: {
    defense: number;
    basicDamage: number;
    cooldown: number;
  };
  passive: PassiveDefinition;
  skills: SkillDefinition[];
  fixedShopPrice?: number;
}

export type BetCategory =
  | 'winner'
  | 'damage'
  | 'collisions'
  | 'remainingHp'
  | 'finalScore';

export type WinnerChoice = 'PLAYER' | 'BOT';

export type FinalScoreChoice =
  | 'PLAYER 3-0 BOT'
  | 'PLAYER 3-1 BOT'
  | 'PLAYER 3-2 BOT'
  | 'BOT 3-0 PLAYER'
  | 'BOT 3-1 PLAYER'
  | 'BOT 3-2 PLAYER';

export interface SingleBet<T = string | number> {
  amount: number; // integer B
  prediction: T;
  locked: boolean;
}

export interface ParticipantBets {
  winner?: SingleBet<WinnerChoice>;
  damage?: SingleBet<number>;        // predicted total damage dealt by Player's ball (for Player) or Bot's ball (for Bot)
  collisions?: SingleBet<number>;    // predicted ball-to-ball collision count
  remainingHp?: SingleBet<number>;   // predicted remaining HP % (0..100) of winning ball
  finalScore?: SingleBet<FinalScoreChoice>; // whole match score prediction
}

export interface BetSettlementDetail {
  category: BetCategory;
  label: string;
  betAmount: number;
  predictionText: string;
  actualText: string;
  payout: number;    // total returned (including stake if kept)
  netProfit: number; // payout - betAmount
  won: boolean;
}

export interface RoundResultSummary {
  roundNumber: number;
  winner: WinnerChoice;
  playerDamageDealt: number;
  botDamageDealt: number;
  collisionCount: number;
  winnerRemainingHp: number;
  winnerRemainingHpPct: number;
  durationSeconds: number;
  playerSettlements: BetSettlementDetail[];
  botSettlements: BetSettlementDetail[];
  playerNetRoundProfit: number;
  botNetRoundProfit: number;
  matchWinBonus?: number;
}

export interface MatchHistoryItem {
  id: string;
  timestamp: number;
  botName: string;
  playerBallId: string;
  botBallId: string;
  playerWins: number;
  botWins: number;
  netProfit: number;
  wonMatch: boolean;
}

export interface PlayerProfile {
  initialized: boolean;
  name: string;
  balance: number;           // integer B
  totalProfitEarned: number; // cumulative positive profit earned from bets
  ownedBallIds: string[];
  upgrades: Record<string, BallUpgradeLevels>;
  matchesWon: number;
  matchesLost: number;
  totalBetsPlaced: number;
  totalBetsWon: number;
  usedBotNames: string[];
  history: MatchHistoryItem[];
  soundEnabled: boolean;
  soundVolume: number; // 0..1
  musicEnabled: boolean;
  musicVolume: number; // 0..1
}
