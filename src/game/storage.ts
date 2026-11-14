import { BALL_CATALOG, INITIAL_BALANCE, STARTER_BALL_IDS } from './constants';
import { DEFAULT_UPGRADES } from './rules';
import { BallUpgradeLevels, PlayerProfile } from './types';

const STORAGE_KEY = 'gamble_a_ball_save_v1';

export function createFreshProfile(): PlayerProfile {
  // Chọn ngẫu nhiên 1 trong 6 quả bóng khởi đầu
  const randomIdx = Math.floor(Math.random() * STARTER_BALL_IDS.length);
  const starterBallId = STARTER_BALL_IDS[randomIdx];

  const upgrades: Record<string, BallUpgradeLevels> = {};
  for (const ball of BALL_CATALOG) {
    upgrades[ball.id] = { ...DEFAULT_UPGRADES };
  }

  return {
    initialized: true,
    name: 'PLAYER',
    balance: INITIAL_BALANCE, // 1.000.000.000 B
    totalProfitEarned: 0,
    ownedBallIds: [starterBallId],
    upgrades,
    matchesWon: 0,
    matchesLost: 0,
    totalBetsPlaced: 0,
    totalBetsWon: 0,
    usedBotNames: [],
    history: [],
    soundEnabled: true,
    soundVolume: 0.7,
    musicEnabled: true,
    musicVolume: 0.45,
  };
}

export function loadPlayerProfile(): PlayerProfile {
  if (typeof window === 'undefined') {
    return createFreshProfile();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = createFreshProfile();
      savePlayerProfile(fresh);
      return fresh;
    }
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    if (!parsed || !parsed.initialized || !Array.isArray(parsed.ownedBallIds) || parsed.ownedBallIds.length === 0) {
      const fresh = createFreshProfile();
      savePlayerProfile(fresh);
      return fresh;
    }

    const upgrades: Record<string, BallUpgradeLevels> = {};
    for (const ball of BALL_CATALOG) {
      const savedUpg = parsed.upgrades?.[ball.id];
      upgrades[ball.id] = {
        defense: Math.max(0, Math.min(5, savedUpg?.defense ?? 0)),
        basicDamage: Math.max(0, Math.min(5, savedUpg?.basicDamage ?? 0)),
        cooldown: Math.max(0, Math.min(5, savedUpg?.cooldown ?? 0)),
      };
    }

    return {
      initialized: true,
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : 'PLAYER',
      balance: typeof parsed.balance === 'number' && !Number.isNaN(parsed.balance) ? Math.max(0, Math.round(parsed.balance)) : INITIAL_BALANCE,
      totalProfitEarned: typeof parsed.totalProfitEarned === 'number' ? Math.max(0, Math.round(parsed.totalProfitEarned)) : 0,
      ownedBallIds: parsed.ownedBallIds,
      upgrades,
      matchesWon: parsed.matchesWon ?? 0,
      matchesLost: parsed.matchesLost ?? 0,
      totalBetsPlaced: parsed.totalBetsPlaced ?? 0,
      totalBetsWon: parsed.totalBetsWon ?? 0,
      usedBotNames: Array.isArray(parsed.usedBotNames) ? parsed.usedBotNames : [],
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, 30) : [],
      soundEnabled: parsed.soundEnabled ?? true,
      soundVolume: typeof parsed.soundVolume === 'number' ? parsed.soundVolume : 0.7,
      musicEnabled: parsed.musicEnabled ?? true,
      musicVolume: typeof parsed.musicVolume === 'number' ? parsed.musicVolume : 0.45,
    };
  } catch {
    const fresh = createFreshProfile();
    savePlayerProfile(fresh);
    return fresh;
  }
}

export function savePlayerProfile(profile: PlayerProfile): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage quota errors
  }
}

export function resetPlayerProfile(): PlayerProfile {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  const fresh = createFreshProfile();
  savePlayerProfile(fresh);
  return fresh;
}
