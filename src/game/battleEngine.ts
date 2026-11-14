import { getEffectiveBallStats } from './rules';
import { sound } from './sound';
import {
  BallDefinition,
  BallUpgradeLevels,
  SkillDefinition,
  WinnerChoice,
} from './types';

export const ARENA_SIZE = 560; // Kích thước logic của đấu trường hình vuông (560x560)
export const BALL_RADIUS = 26;

export interface UpcomingSkillCue {
  skill: SkillDefinition;
  remainingSeconds: number;
}

export interface ProjectileEntity {
  id: number;
  ownerSide: WinnerChoice;
  kind:
    | 'arrow'
    | 'charged_arrow'
    | 'blade_wave'
    | 'kunai'
    | 'thrown_shield'
    | 'dagger'
    | 'fire_bolt'
    | 'charged_fireball'
    | 'phoenix'
    | 'ice_bolt'
    | 'mini_ice_bolt'
    | 'ice_sword'
    | 'earth_bolt'
    | 'wind_bolt'
    | 'wind_tornado';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  bouncesLeft: number;
  bounceDamageDelta: number; // -10 cho mũi tên thường, +30 cho mũi tên tụ lực
  returning?: boolean;
  homingTargetSide?: WinnerChoice;
  castId?: number;
  onHitTeleportAndCrit?: boolean;
  trailPoints?: Array<{ x: number; y: number }>;
  hitTargets: Set<WinnerChoice>;
  color: string;
}

export interface HazardZoneEntity {
  id: number;
  ownerSide: WinnerChoice;
  kind: 'dead_zone' | 'blade_vortex' | 'mist_zone' | 'fire_rain' | 'ice_zone' | 'wind_burst';
  x: number;
  y: number;
  radius: number;
  maxRadius?: number;
  followOwner: boolean;
  remainingDuration: number;
  maxDuration?: number;
  tickInterval: number;
  tickTimer: number;
  tickCount?: number;
  ownerHealTickTimer?: number;
  damagePerTick: number;
  color: string;
}

export interface FloatingTextEntity {
  id: number;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  isCrit: boolean;
  isSkill: boolean;
  life: number;
  maxLife: number;
}

export interface ParticleEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface WallFlashEntity {
  side: 'top' | 'bottom' | 'left' | 'right';
  pos: number;
  intensity: number;
  color?: string;
  maxRadius?: number;
}

export interface BloodSplatterEntity {
  x: number;
  y: number;
  angle: number;
  droplets: Array<{ dx: number; dy: number; r: number }>;
  life: number;
  maxLife: number;
  isHeavy: boolean;
}

export interface CombatantState {
  side: WinnerChoice;
  ball: BallDefinition;
  upgrades: BallUpgradeLevels;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  baseDamage: number;
  damageReductionPct: number;
  cooldownMultiplier: number;
  hasEmergencyShieldPassive: boolean;
  emergencyShieldTriggered: boolean;
  emergencyShieldActive: boolean;

  // Vũ khí và góc nhìn
  aimAngle: number;
  weaponAngle: number;
  weaponSpinDir: 1 | -1;
  weaponHitCooldown: number;

  // Cung thủ
  bowDrawTimer: number;
  rapidFireRemaining: number;
  rapidFireTickTimer: number;
  chargeShotWindupRemaining: number;
  chargeShotAuraRemaining: number;

  // Boxing
  ragePassiveRemaining: number;
  rageSkillRemaining: number;
  blinkSkillRemaining: number;
  blinkTickTimer: number;
  flurryDashRemaining: number;
  flurryDashTrailRemaining: number;
  flurryBarrageRemaining: number;
  stunnedRemaining: number;

  // Kiếm sĩ
  greatswordBuffRemaining: number;
  plungeDashRemaining: number;
  plungeOriginX: number;
  plungeOriginY: number;

  // Samurai
  kunaiPassiveCooldown: number;
  dashSlashRemaining: number;
  dashSlashTrailRemaining: number;
  samuraiCollisionStacks: number;

  // Đấu sĩ
  fiveShieldsRemaining: number;
  invulnerableRemaining: number;
  silverFlashRemaining: number;
  regenPassiveTimer: number;
  defenderArmorStacks: number;
  defenderArmorTimer: number;

  // Sát thủ
  stealthRemaining: number;
  assassinateDashRemaining: number;
  assassinateDashTrailRemaining: number;
  assassinPurpleFlashRemaining: number;
  assassinCritTimer: number;
  bonusCritChancePct: number;
  assassinRecallX: number;
  assassinRecallY: number;
  assassinRecallRemaining: number;
  lastTwinDaggerTeleportCastId: number;

  // Tốc độ (Speed)
  speedCollisionMultiplier: number;
  speedSelfBoostRemaining: number;
  speedBoostGlowRemaining: number;
  speedAfterimageCount: number;
  speedArrowPassStacks: number;
  positionTrail: Array<{ x: number; y: number; aimAngle: number; weaponAngle: number }>;
  passiveDisabledRemaining: number;

  // Pháp Sư Lửa (Fire Mage)
  staffCastTiltTimer: number;
  fireBoltTimer: number;
  fireballChargeRemaining: number;
  phoenixChargeRemaining: number;
  burnStacks: Array<{
    attackerSide: WinnerChoice;
    remainingDuration: number;
    tickTimer: number;
    damagePerSecond: number;
  }>;

  // Pháp Sư Băng (Ice Mage) & Trạng thái lạnh giá / đóng băng
  iceBoltTimer: number;
  orbitingIceCount: number;
  iceSwordSummonRemaining: number;
  iceSwordQueueCount: number;
  iceSwordFireTick: number;
  chillRemaining: number;
  frozenRemaining: number;

  // Pháp Sư Thổ (Earth Mage) & Trạng thái làm chậm đất
  earthBoltTimer: number;
  earthMaceRemaining: number;
  earthStompRemaining: number;
  recentDamageTimestamps: number[];
  earthHitCounter: number;
  earthSlow50Remaining: number;
  earthSlow80Remaining: number;

  // Pháp Sư Gió (Wind Mage) & Hệ thống đẩy lùi
  windBoltTimer: number;
  tailwindRemaining: number;
  tailwindCooldownRemaining: number;
  windCastChargeRemaining: number;
  windMaelstromTargetX: number;
  windMaelstromTargetY: number;
  knockbackVx: number;
  knockbackVy: number;
  knockbackRemaining: number;

  // Thời gian hồi kỹ năng (hỗ trợ 1..3 kỹ năng)
  skillCooldowns: number[];

  // Thống kê
  totalDamageDealt: number;
  hitFlashTimer: number;
}

export interface AfterimageEntity {
  x: number;
  y: number;
  aimAngle: number;
  weaponAngle: number;
  color: string;
  accentColor: string;
  life: number;
  maxLife: number;
  isBoxerClone?: boolean;
}

export interface PlungedSwordEntity {
  id: number;
  ownerSide: WinnerChoice;
  x: number;
  y: number;
  radius: number;
  remainingDuration: number;
  maxDuration: number;
  touchCooldown: number;
}

export interface DustCloudEntity {
  id: number;
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  puffs: Array<{ angle: number; dist: number; r: number }>;
}

export interface FireExplosionEntity {
  id: number;
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
}

export interface FireBeamPathEntity {
  id: number;
  ownerSide: WinnerChoice;
  points: Array<{ x: number; y: number }>;
  remainingDuration: number;
  maxDuration: number;
  tickInterval: number;
  tickTimer: number;
  damagePerTick: number;
}

export interface EmberParticleEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface IceClaspPairEntity {
  id: number;
  ownerSide: WinnerChoice;
  centerX: number;
  centerY: number;
  angle: number;
  distFromCenter: number;
  waitTimer: number;
  caughtTargetSide: WinnerChoice | null;
  collided: boolean;
}

export interface IceShatterParticleEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  vAngle: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface SpeedArrowEntity {
  id: number;
  ownerSide: WinnerChoice;
  x: number;
  y: number;
  angle: number;
  radius: number;
  remainingDuration: number;
  maxDuration: number;
  ownerInside: boolean;
  enemyInside: boolean;
  slowedEnemySide: WinnerChoice | null;
}

export interface EarthWallEntity {
  id: number;
  ownerSide: WinnerChoice;
  x: number;
  y: number;
  angle: number;
  halfLength: number;
  halfThickness: number;
  remainingDuration: number;
  maxDuration: number;
  isPassiveWall: boolean;
  impactGlowTimer: number;
  bounceDamage: number;
  hitCooldownBySide: Partial<Record<WinnerChoice, number>>;
  isChargingWall?: boolean;
  chargeDirX?: number;
  chargeDirY?: number;
  chargeTargetSide?: WinnerChoice;
  chargeDragging?: boolean;
  chargeElapsed?: number;
}

export interface EarthCraterEntity {
  id: number;
  x: number;
  y: number;
  radius: number;
  remainingDuration: number;
  maxDuration: number;
}

export interface EarthSpikeWaveEntity {
  id: number;
  ownerSide: WinnerChoice;
  startX: number;
  startY: number;
  curX: number;
  curY: number;
  dirX: number;
  dirY: number;
  angle: number;
  speed: number;
  stopped: boolean;
  remainingDuration: number;
  maxDuration: number;
  hitTargets: Set<WinnerChoice>;
  pillars: Array<{ x: number; y: number; size: number; tilt: number; age: number }>;
}

export interface EarthShatterParticleEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  vAngle: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface WindVortexEntity {
  id: number;
  ownerSide: WinnerChoice;
  x: number;
  y: number;
  radius: number;
  remainingDuration: number;
  maxDuration: number;
  tickInterval: number;
  tickTimer: number;
  ticksFired: number;
  damagePerTick: number;
}

export interface WindShockwaveEntity {
  id: number;
  x: number;
  y: number;
  maxRadius: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface WindLeafParticleEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  vAngle: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface BattleSimulationState {
  elapsedTime: number;
  remainingTime: number; // Tối đa 300s (5 phút)
  hitstopTimer: number;
  shakeTrauma: number;
  collisionCount: number;
  ballsCurrentlyTouching: boolean;
  bot: CombatantState;
  player: CombatantState;
  projectiles: ProjectileEntity[];
  zones: HazardZoneEntity[];
  plantedSwords: PlungedSwordEntity[];
  dustClouds: DustCloudEntity[];
  explosions: FireExplosionEntity[];
  fireBeams: FireBeamPathEntity[];
  embers: EmberParticleEntity[];
  iceClasps: IceClaspPairEntity[];
  iceShatters: IceShatterParticleEntity[];
  earthWalls: EarthWallEntity[];
  earthCraters: EarthCraterEntity[];
  earthSpikes: EarthSpikeWaveEntity[];
  earthShatters: EarthShatterParticleEntity[];
  windVortexes: WindVortexEntity[];
  windShockwaves: WindShockwaveEntity[];
  windLeaves: WindLeafParticleEntity[];
  speedArrows: SpeedArrowEntity[];
  floatingTexts: FloatingTextEntity[];
  particles: ParticleEntity[];
  afterimages: AfterimageEntity[];
  bloodSplatters: BloodSplatterEntity[];
  wallFlashes: WallFlashEntity[];
  finisher: FinisherAnimationState | null;
  finished: boolean;
  winner: WinnerChoice | null;
  nextEntityId: number;
}

export interface FinisherOrb {
  startX: number;
  startY: number;
  scatterX: number;
  scatterY: number;
  x: number;
  y: number;
  angle: number;
}

export interface FinisherAnimationState {
  winnerSide: WinnerChoice;
  loserX: number;
  loserY: number;
  coinX: number;
  coinY: number;
  targetX: number;
  targetY: number;
  coinColor: string;
  coinBorderColor: string;
  elapsed: number;
  totalDuration: number;
  orbs: FinisherOrb[];
  coinFormedSoundPlayed: boolean;
  coinFlySoundPlayed: boolean;
  completed: boolean;
}

function createCombatant(
  side: WinnerChoice,
  ball: BallDefinition,
  upgrades: BallUpgradeLevels
): CombatantState {
  const eff = getEffectiveBallStats(ball, upgrades);
  const startX = side === 'BOT' ? 130 : ARENA_SIZE - 130;
  const startY = ARENA_SIZE / 2;
  const initialAngle = side === 'BOT' ? 0 : Math.PI;
  const speed = 168;
  // Góc xuất phát chéo rõ ràng để bóng đi thẳng và bật tường tự nhiên khắp sân đấu
  const spreadOffset = (Math.random() > 0.5 ? 1 : -1) * (0.45 + Math.random() * 0.42);
  const spreadAngle = initialAngle + spreadOffset;

  return {
    side,
    ball,
    upgrades,
    x: startX,
    y: startY,
    vx: Math.cos(spreadAngle) * speed,
    vy: Math.sin(spreadAngle) * speed,
    hp: eff.maxHp,
    maxHp: eff.maxHp,
    baseDamage: eff.effectiveBaseDamage,
    damageReductionPct: eff.damageReductionPct,
    cooldownMultiplier: eff.cooldownMultiplier,
    hasEmergencyShieldPassive: eff.hasEmergencyShieldPassive,
    emergencyShieldTriggered: false,
    emergencyShieldActive: false,
    aimAngle: initialAngle,
    weaponAngle: initialAngle,
    weaponSpinDir: 1,
    weaponHitCooldown: 0,
    bowDrawTimer: 0,
    rapidFireRemaining: 0,
    rapidFireTickTimer: 0,
    chargeShotWindupRemaining: 0,
    chargeShotAuraRemaining: 0,
    ragePassiveRemaining: 0,
    rageSkillRemaining: 0,
    blinkSkillRemaining: 0,
    blinkTickTimer: 0,
    flurryDashRemaining: 0,
    flurryDashTrailRemaining: 0,
    flurryBarrageRemaining: 0,
    stunnedRemaining: 0,
    greatswordBuffRemaining: 0,
    plungeDashRemaining: 0,
    plungeOriginX: startX,
    plungeOriginY: startY,
    kunaiPassiveCooldown: 0,
    dashSlashRemaining: 0,
    dashSlashTrailRemaining: 0,
    samuraiCollisionStacks: 0,
    fiveShieldsRemaining: 0,
    invulnerableRemaining: 0,
    silverFlashRemaining: 0,
    regenPassiveTimer: 0,
    defenderArmorStacks: 0,
    defenderArmorTimer: 0,
    stealthRemaining: 0,
    assassinateDashRemaining: 0,
    assassinateDashTrailRemaining: 0,
    assassinPurpleFlashRemaining: 0,
    assassinCritTimer: 0,
    bonusCritChancePct: 0,
    assassinRecallX: startX,
    assassinRecallY: startY,
    assassinRecallRemaining: 0,
    lastTwinDaggerTeleportCastId: 0,
    speedCollisionMultiplier: 1.0,
    speedSelfBoostRemaining: 0,
    speedBoostGlowRemaining: 0,
    speedAfterimageCount: 0,
    speedArrowPassStacks: 0,
    positionTrail: [],
    passiveDisabledRemaining: 0,
    staffCastTiltTimer: 0,
    fireBoltTimer: 0,
    fireballChargeRemaining: 0,
    phoenixChargeRemaining: 0,
    burnStacks: [],
    iceBoltTimer: 0,
    orbitingIceCount: 0,
    iceSwordSummonRemaining: 0,
    iceSwordQueueCount: 0,
    iceSwordFireTick: 0,
    chillRemaining: 0,
    frozenRemaining: 0,
    earthBoltTimer: 0,
    earthMaceRemaining: 0,
    earthStompRemaining: 0,
    recentDamageTimestamps: [],
    earthHitCounter: 0,
    earthSlow50Remaining: 0,
    earthSlow80Remaining: 0,
    windBoltTimer: 0,
    tailwindRemaining: 0,
    tailwindCooldownRemaining: 0,
    windCastChargeRemaining: 0,
    windMaelstromTargetX: startX,
    windMaelstromTargetY: startY,
    knockbackVx: 0,
    knockbackVy: 0,
    knockbackRemaining: 0,
    // Khởi đầu trận cho phép kỹ năng vào nhịp sớm (35%-55% CD đầu) để giao tranh kịch tính ngay từ những giây đầu
    skillCooldowns: ball.skills.map(
      (s, idx) => s.cooldown * eff.cooldownMultiplier * (0.35 + idx * 0.1)
    ),
    totalDamageDealt: 0,
    hitFlashTimer: 0,
  };
}

export function createBattleSimulation(
  playerBall: BallDefinition,
  playerUpgrades: BallUpgradeLevels,
  botBall: BallDefinition,
  botUpgrades: BallUpgradeLevels
): BattleSimulationState {
  return {
    elapsedTime: 0,
    remainingTime: 300, // 5 phút
    hitstopTimer: 0,
    shakeTrauma: 0,
    collisionCount: 0,
    ballsCurrentlyTouching: false,
    bot: createCombatant('BOT', botBall, botUpgrades),
    player: createCombatant('PLAYER', playerBall, playerUpgrades),
    projectiles: [],
    zones: [],
    plantedSwords: [],
    dustClouds: [],
    explosions: [],
    fireBeams: [],
    embers: [],
    iceClasps: [],
    iceShatters: [],
    earthWalls: [],
    earthCraters: [],
    earthSpikes: [],
    earthShatters: [],
    windVortexes: [],
    windShockwaves: [],
    windLeaves: [],
    speedArrows: [],
    floatingTexts: [],
    particles: [],
    afterimages: [],
    bloodSplatters: [],
    wallFlashes: [],
    finisher: null,
    finished: false,
    winner: null,
    nextEntityId: 1,
  };
}

function spawnParticles(
  state: BattleSimulationState,
  x: number,
  y: number,
  color: string,
  count: number,
  speedScale: number = 1
) {
  for (let i = 0; i < count; i++) {
    if (state.particles.length >= 140) {
      state.particles.shift();
    }
    const ang = Math.random() * Math.PI * 2;
    const spd = (40 + Math.random() * 140) * speedScale;
    state.particles.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      size: 2.5 + Math.random() * 3.5,
      color,
      life: 0.25 + Math.random() * 0.3,
      maxLife: 0.55,
    });
  }
}

/**
 * Hiệu ứng tóe máu (Blood Splatter & Directional Crimson Spray) khi trúng chiêu hoặc trúng đòn đánh
 */
function spawnBloodSplatter(
  state: BattleSimulationState,
  attacker: CombatantState,
  defender: CombatantState,
  isSkill: boolean,
  isCrit: boolean
) {
  const hitAngle = Math.atan2(defender.y - attacker.y, defender.x - attacker.x);
  const isHeavy = isSkill || isCrit;
  const sprayCount = isCrit ? 18 : isSkill ? 14 : 10;
  const bloodColors = ['#dc2626', '#ef4444', '#991b1b', '#b91c1c'];

  // Các giọt máu văng theo hướng lực đánh
  for (let i = 0; i < sprayCount; i++) {
    if (state.particles.length >= 160) {
      state.particles.shift();
    }
    const spread = (Math.random() - 0.5) * 1.35;
    const ang = hitAngle + spread;
    const spd = (65 + Math.random() * 175) * (isHeavy ? 1.25 : 1.0);
    const col = bloodColors[i % bloodColors.length];
    state.particles.push({
      x: defender.x + Math.cos(ang) * 8,
      y: defender.y + Math.sin(ang) * 8,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      size: (isHeavy ? 3.5 : 2.8) + Math.random() * 3.8,
      color: col,
      life: 0.32 + Math.random() * 0.32,
      maxLife: 0.64,
    });
  }

  // Vệt máu tóe trên sàn đấu trường tại vị trí trúng đòn
  if (state.bloodSplatters.length >= 22) {
    state.bloodSplatters.shift();
  }
  const blobCount = isHeavy ? 8 : 5;
  const droplets: Array<{ dx: number; dy: number; r: number }> = [];
  for (let i = 0; i < blobCount; i++) {
    const spread = (Math.random() - 0.5) * 1.5;
    const dist = 6 + Math.random() * (isHeavy ? 28 : 20);
    droplets.push({
      dx: Math.cos(hitAngle + spread) * dist,
      dy: Math.sin(hitAngle + spread) * dist,
      r: (isHeavy ? 4.5 : 3.2) + Math.random() * 4.5,
    });
  }
  state.bloodSplatters.push({
    x: defender.x,
    y: defender.y,
    angle: hitAngle,
    droplets,
    life: 1.15,
    maxLife: 1.15,
    isHeavy,
  });
}

function addFloatingText(
  state: BattleSimulationState,
  x: number,
  y: number,
  text: string,
  color: string,
  isCrit: boolean = false,
  isSkill: boolean = false
) {
  state.floatingTexts.push({
    id: state.nextEntityId++,
    x: x + (Math.random() * 18 - 9),
    y: y - 22,
    vy: -55,
    text,
    color,
    isCrit,
    isSkill,
    life: 0.85,
    maxLife: 0.85,
  });
}

/**
 * Tính toán và áp dụng sát thương chuẩn xác theo:
 * - Nội tại / Buff của người tấn công (Xạ thủ cuồng nộ, Cuồng nộ, Chí mạng...)
 * - Phòng thủ / Khiên / Giảm sát thương của mục tiêu
 * - Không vượt quá lượng máu còn lại của mục tiêu
 */
function spawnEmbers(
  state: BattleSimulationState,
  x: number,
  y: number,
  count: number = 10
) {
  const palette = ['#fef08a', '#f97316', '#ef4444', '#fb923c'];
  for (let i = 0; i < count; i++) {
    if (state.embers.length >= 120) {
      state.embers.shift();
    }
    const ang = (Math.random() * Math.PI * 2);
    const spd = 25 + Math.random() * 85;
    const maxLife = 0.55 + Math.random() * 0.45;
    state.embers.push({
      x: x + (Math.random() * 12 - 6),
      y: y + (Math.random() * 12 - 6),
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd * 0.5 - 20,
      size: 2 + Math.random() * 2.5,
      color: palette[i % palette.length],
      life: maxLife,
      maxLife,
    });
  }
}

function spawnIceShatter(
  state: BattleSimulationState,
  x: number,
  y: number,
  count: number = 14
) {
  const palette = ['#e0f2fe', '#7dd3fc', '#38bdf8', '#ffffff', '#0284c7'];
  for (let i = 0; i < count; i++) {
    if (state.iceShatters.length >= 140) {
      state.iceShatters.shift();
    }
    const ang = Math.random() * Math.PI * 2;
    const spd = 55 + Math.random() * 145;
    const maxLife = 0.42 + Math.random() * 0.35;
    state.iceShatters.push({
      x: x + (Math.random() * 10 - 5),
      y: y + (Math.random() * 10 - 5),
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      size: 4 + Math.random() * 6,
      angle: Math.random() * Math.PI * 2,
      vAngle: (Math.random() * 2 - 1) * 9,
      color: palette[i % palette.length],
      life: maxLife,
      maxLife,
    });
  }
}

function spawnEarthShatter(
  state: BattleSimulationState,
  x: number,
  y: number,
  count: number = 14,
  fallingDropOnly: boolean = false
) {
  const palette = ['#92400e', '#78350f', '#b45309', '#d97706', '#451a03'];
  for (let i = 0; i < count; i++) {
    if (state.earthShatters.length >= 160) {
      state.earthShatters.shift();
    }
    const ang = Math.random() * Math.PI * 2;
    const spd = fallingDropOnly ? 10 + Math.random() * 28 : 55 + Math.random() * 145;
    const maxLife = fallingDropOnly ? 0.35 + Math.random() * 0.25 : 0.44 + Math.random() * 0.36;
    state.earthShatters.push({
      x: x + (Math.random() * 10 - 5),
      y: y + (Math.random() * 10 - 5),
      vx: fallingDropOnly ? (Math.random() - 0.5) * 28 : Math.cos(ang) * spd,
      vy: fallingDropOnly ? 45 + Math.random() * 55 : Math.sin(ang) * spd,
      size: fallingDropOnly ? 2.2 + Math.random() * 2.4 : 4 + Math.random() * 5.5,
      angle: Math.random() * Math.PI * 2,
      vAngle: (Math.random() * 2 - 1) * 9,
      color: palette[i % palette.length],
      life: maxLife,
      maxLife,
    });
  }
}

function clearAllPositiveBuffsAndPassives(target: CombatantState) {
  // Xóa bỏ toàn bộ hiệu ứng có lợi & nội tại cộng dồn của đối thủ
  target.rapidFireRemaining = 0;
  target.chargeShotWindupRemaining = 0;
  target.chargeShotAuraRemaining = 0;
  target.ragePassiveRemaining = 0;
  target.rageSkillRemaining = 0;
  target.blinkSkillRemaining = 0;
  target.greatswordBuffRemaining = 0;
  target.samuraiCollisionStacks = 0;
  target.fiveShieldsRemaining = 0;
  target.invulnerableRemaining = 0;
  target.silverFlashRemaining = 0;
  target.defenderArmorStacks = 0;
  target.defenderArmorTimer = 0;
  target.emergencyShieldActive = false;
  target.stealthRemaining = 0;
  target.assassinCritTimer = 0;
  target.bonusCritChancePct = 0;
  target.assassinRecallRemaining = 0;
  target.speedCollisionMultiplier = 1.0;
  target.speedSelfBoostRemaining = 0;
  target.speedBoostGlowRemaining = 0;
  target.speedAfterimageCount = 0;
  target.speedArrowPassStacks = 0;
  target.orbitingIceCount = 0;
  target.fireballChargeRemaining = 0;
  target.phoenixChargeRemaining = 0;
  target.iceSwordSummonRemaining = 0;
  target.iceSwordQueueCount = 0;
  target.earthMaceRemaining = 0;
  target.tailwindRemaining = 0;
  target.windCastChargeRemaining = 0;
  target.regenPassiveTimer = 0;
  target.recentDamageTimestamps = [];
  target.earthHitCounter = 0;
}

function spawnWindLeaves(
  state: BattleSimulationState,
  x: number,
  y: number,
  count: number = 8,
  speedScale: number = 1
) {
  const palette = ['#86efac', '#4ade80', '#22c55e', '#bbf7d0'];
  for (let i = 0; i < count; i++) {
    if (state.windLeaves.length >= 140) {
      state.windLeaves.shift();
    }
    const ang = Math.random() * Math.PI * 2;
    const spd = (45 + Math.random() * 125) * speedScale;
    const maxLife = 0.48 + Math.random() * 0.42;
    state.windLeaves.push({
      x: x + (Math.random() * 14 - 7),
      y: y + (Math.random() * 14 - 7),
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      size: 3.8 + Math.random() * 3.4,
      angle: Math.random() * Math.PI * 2,
      vAngle: (Math.random() * 2 - 1) * 10,
      color: palette[i % palette.length],
      life: maxLife,
      maxLife,
    });
  }
}

function spawnWindShockwave(
  state: BattleSimulationState,
  x: number,
  y: number,
  maxRadius: number = 68,
  color: string = '#86efac',
  life: number = 0.42
) {
  if (state.windShockwaves.length >= 24) {
    state.windShockwaves.shift();
  }
  state.windShockwaves.push({
    id: state.nextEntityId++,
    x,
    y,
    maxRadius,
    color,
    life,
    maxLife: life,
  });
}

/**
 * Đẩy lùi mục tiêu ra xa khỏi vị trí nguồn theo quãng đường ổn định (tổng khoảng cách = distancePx)
 * và kích hoạt Nội tại 2 Thuận Phong cho Pháp Sư Gió (khi đủ hồi chiêu 5s).
 */
function applyKnockback(
  state: BattleSimulationState,
  attacker: CombatantState,
  target: CombatantState,
  fromX: number,
  fromY: number,
  distancePx: number
) {
  if (state.finished || target.hp <= 0 || target.stealthRemaining > 0 || distancePx <= 0) return;
  if (
    state.earthWalls.some(
      (w) => w.isChargingWall && w.chargeDragging && w.chargeTargetSide === target.side
    )
  ) {
    return;
  }

  const dx = target.x - fromX;
  const dy = target.y - fromY;
  const rawDist = Math.hypot(dx, dy);
  const nx = rawDist > 0.001 ? dx / rawDist : Math.cos(attacker.aimAngle);
  const ny = rawDist > 0.001 ? dy / rawDist : Math.sin(attacker.aimAngle);

  const duration = Math.max(0.14, Math.min(0.24, distancePx / 750));
  const kbSpeed = distancePx / duration;
  target.knockbackVx = nx * kbSpeed;
  target.knockbackVy = ny * kbSpeed;
  target.knockbackRemaining = duration;

  if (
    attacker.ball.id === 'wind_mage' &&
    attacker.hp > 0 &&
    attacker.passiveDisabledRemaining <= 0 &&
    attacker.tailwindCooldownRemaining <= 0
  ) {
    attacker.tailwindRemaining = 2.0;
    attacker.tailwindCooldownRemaining = 5.0;
    spawnWindLeaves(state, attacker.x, attacker.y, 7, 0.85);
    spawnParticles(state, attacker.x, attacker.y, '#86efac', 10, 1.0);
    addFloatingText(
      state,
      attacker.x,
      attacker.y - 16,
      'THUẬN PHONG (+12% TỐC · -8% ST)',
      '#86efac',
      false,
      true
    );
  }
}

function pointToSegmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 0.0001) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.hypot(px - projX, py - projY);
}

function applyDamage(
  state: BattleSimulationState,
  attacker: CombatantState,
  defender: CombatantState,
  rawDamage: number,
  isSkill: boolean,
  canCrit: boolean = true,
  isBurnTick: boolean = false,
  isEarthCounter: boolean = false
): number {
  if (state.finished || defender.hp <= 0 || rawDamage <= 0) return 0;

  // Chiêu 2 Sát Thủ (TÀNG HÌNH): Khi tàng hình không thể bị chọn làm mục tiêu và không nhận bất kỳ sát thương nào
  if (defender.stealthRemaining > 0) {
    if (!isBurnTick) {
      addFloatingText(state, defender.x, defender.y - 12, 'MIỄN NHIỄM!', '#c084fc', false, false);
    }
    return 0;
  }

  // Kiểm tra Khiên Phản Đòn Toàn Diện (Kỹ năng 1 của Đấu Sĩ)
  if (!isBurnTick && defender.fiveShieldsRemaining > 0) {
    sound.playShieldClang();
    addFloatingText(state, defender.x, defender.y, 'PHẢN KHIÊN!', '#38bdf8', false, true);
    spawnParticles(state, defender.x, defender.y, '#38bdf8', 10, 1.1);
    // Phản lại 40% sát thương cho đối phương (nếu đối phương không trong trạng thái Tàng Hình miễn thương)
    if (attacker.stealthRemaining <= 0) {
      const reflected = Math.max(1, Math.min(attacker.hp, Math.round(rawDamage * 0.4)));
      attacker.hp = Math.max(0, attacker.hp - reflected);
      defender.totalDamageDealt += reflected;
      addFloatingText(state, attacker.x, attacker.y, `-${reflected}`, '#38bdf8', false, true);
      checkDeath(state);
    }
    return 0;
  }

  // Kiểm tra Khiên Khẩn Cấp (Cấp 5 nâng cấp Phòng Thủ khi máu < 10%)
  if (!isBurnTick && defender.emergencyShieldActive) {
    defender.emergencyShieldActive = false;
    sound.playShieldClang();
    addFloatingText(state, defender.x, defender.y, 'KHIÊN CHẶN!', '#fde047', false, true);
    spawnParticles(state, defender.x, defender.y, '#fde047', 14, 1.2);
    return 0;
  }

  let dmg = rawDamage;

  // Nội tại Cung Thủ: XẠ THỦ CUỒNG NỘ (+1% ST mỗi 20% máu đã mất)
  if (attacker.ball.weaponType === 'bow' && attacker.passiveDisabledRemaining <= 0) {
    const lostPct = ((attacker.maxHp - attacker.hp) / attacker.maxHp) * 100;
    const stacks = Math.floor(lostPct / 20);
    if (stacks > 0) {
      dmg *= 1 + stacks * 0.01;
    }
  }

  // Nội tại & Kỹ năng Boxing: CUỒNG NỘ (+20% ST) & CUỒNG QUYỀN (+50% ST)
  if (attacker.ragePassiveRemaining > 0) {
    dmg *= 1.2;
  }
  if (attacker.rageSkillRemaining > 0) {
    dmg *= 1.5;
  }

  // Kỹ năng 1 Tốc Độ (Speed): CƯỜNG HÓA BẢN THÂN (+10% sát thương trong 5s)
  if (attacker.speedSelfBoostRemaining > 0) {
    dmg *= 1.1;
  }

  // Nội tại Tốc Độ (Speed): +0,15% sát thương mỗi lần va chạm
  if (
    attacker.ball.id === 'speed' &&
    attacker.speedAfterimageCount > 0 &&
    attacker.passiveDisabledRemaining <= 0
  ) {
    dmg *= 1 + (attacker.speedAfterimageCount * 0.15) / 100;
  }

  // Nội tại Sát Thủ: CHÍ MẠNG (Sát Thủ nhận +1% crit mỗi 1s và tăng 150% ST khi chí mạng -> x2.5; Tử Thần có 30% crit cơ bản và x2.0)
  let isCrit = false;
  if (
    canCrit &&
    attacker.ball.weaponType === 'dual_daggers' &&
    attacker.passiveDisabledRemaining <= 0
  ) {
    const baseCritPct = attacker.ball.id === 'phantom_reaper' ? 30 : 0;
    const totalCritPct = Math.min(100, baseCritPct + attacker.bonusCritChancePct);
    if (Math.random() * 100 < totalCritPct) {
      isCrit = true;
      dmg *= attacker.ball.id === 'assassin' ? 2.5 : 2.0;
    }
  }

  // Phòng thủ của mục tiêu
  let totalReductionPct = defender.damageReductionPct;

  // Nội tại Tốc Độ (Speed): Cứ mỗi lần va chạm nhận được 0,3% giảm sát thương
  if (
    defender.ball.id === 'speed' &&
    defender.speedAfterimageCount > 0 &&
    defender.passiveDisabledRemaining <= 0
  ) {
    totalReductionPct += defender.speedAfterimageCount * 0.3;
  }

  // Chiêu 2 Tốc Độ (Speed): Mỗi lần đi qua mũi tên nhận +5% miễn thương
  if (defender.speedArrowPassStacks > 0) {
    totalReductionPct += defender.speedArrowPassStacks * 5;
  }

  // Chiêu 3 Pháp Sư Băng (VÙNG LẠNH): Đứng trong vòng của bản thân nhận 10% miễn thương
  const inOwnIceZone = state.zones.some(
    (z) =>
      z.kind === 'ice_zone' &&
      z.ownerSide === defender.side &&
      Math.hypot(defender.x - z.x, defender.y - z.y) <= z.radius + BALL_RADIUS * 0.6
  );
  if (inOwnIceZone) {
    totalReductionPct += 10;
  }

  // Nội tại Đấu Sĩ: Cứ mỗi sát thương nhận vào nhận +2% giảm sát thương trong 3s (làm mới về 3s nếu tiếp tục nhận ST)
  if (
    defender.ball.weaponType === 'shield' &&
    defender.passiveDisabledRemaining <= 0 &&
    defender.defenderArmorTimer > 0 &&
    defender.defenderArmorStacks > 0
  ) {
    totalReductionPct += defender.defenderArmorStacks * 2;
  }

  // Nội tại 2 Pháp Sư Gió (THUẬN PHONG): Giảm 8% sát thương gánh chịu trong 2 giây
  if (defender.tailwindRemaining > 0) {
    totalReductionPct += 8;
  }

  // Nội tại Kiếm Sĩ: PHÒNG THỦ CUỐI CÙNG (Khi máu < 20% giảm thêm 10% ST)
  if (
    defender.ball.weaponType === 'greatsword' &&
    defender.passiveDisabledRemaining <= 0 &&
    defender.hp / defender.maxHp < 0.2
  ) {
    totalReductionPct += 10;
  }

  // Kỹ năng 2 Đấu Sĩ: BẤT KHẢ XÂM PHẠM (Giảm 80% ST trong 3 giây)
  if (defender.invulnerableRemaining > 0) {
    totalReductionPct = Math.min(92, totalReductionPct + 80);
  } else {
    totalReductionPct = Math.min(90, totalReductionPct);
  }

  dmg = dmg * Math.max(0.05, 1 - totalReductionPct / 100);
  const roundedDmg = Math.max(1, Math.round(dmg));

  // Không vượt quá lượng máu còn lại của mục tiêu
  const actualDamageRecorded = Math.min(defender.hp, roundedDmg);
  defender.hp = Math.max(0, defender.hp - actualDamageRecorded);
  attacker.totalDamageDealt += actualDamageRecorded;
  defender.hitFlashTimer = 0.12;

  // Chiêu 3 Sát Thủ (SONG ĐAO PHI): Nếu trong 1s tàn ảnh tồn tại bản thân chịu sát thương -> lập tức dịch chuyển trở về vị trí tàn ảnh
  if (actualDamageRecorded > 0 && defender.hp > 0 && defender.assassinRecallRemaining > 0) {
    const fromX = defender.x;
    const fromY = defender.y;
    defender.x = Math.max(
      BALL_RADIUS + 2,
      Math.min(ARENA_SIZE - BALL_RADIUS - 2, defender.assassinRecallX)
    );
    defender.y = Math.max(
      BALL_RADIUS + 2,
      Math.min(ARENA_SIZE - BALL_RADIUS - 2, defender.assassinRecallY)
    );
    defender.assassinRecallRemaining = 0;
    spawnParticles(state, fromX, fromY, '#a855f7', 12, 1.1);
    spawnParticles(state, defender.x, defender.y, '#e9d5ff', 16, 1.25);
    addFloatingText(state, defender.x, defender.y - 18, 'VỀ TÀN ẢNH!', '#e9d5ff', false, true);
  }

  // Kích hoạt / làm mới nội tại Đấu Sĩ khi chịu sát thương (+2% giảm ST mỗi lần nhận ST, duy trì 3s, trả về 3s nếu đang duy trì)
  if (
    defender.ball.weaponType === 'shield' &&
    defender.passiveDisabledRemaining <= 0 &&
    actualDamageRecorded > 0 &&
    defender.hp > 0
  ) {
    defender.defenderArmorStacks += 1;
    defender.defenderArmorTimer = 3.0;
    addFloatingText(
      state,
      defender.x,
      defender.y - 14,
      `GIÁP -${defender.defenderArmorStacks * 2}% (3s)`,
      '#38bdf8',
      false,
      false
    );
  }

  // Nội tại Boxing: 30% cơ hội kích hoạt CUỒNG NỘ khi gây sát thương (không kích hoạt chồng lấn)
  if (
    attacker.ball.id === 'boxer' &&
    attacker.passiveDisabledRemaining <= 0 &&
    attacker.ragePassiveRemaining <= 0 &&
    Math.random() < 0.3
  ) {
    attacker.ragePassiveRemaining = 3.0;
    addFloatingText(state, attacker.x, attacker.y - 12, 'CUỒNG NỘ!', '#fbbf24', false, true);
  }

  // Kiểm tra kích hoạt Khiên Cấp 5 Phòng Thủ nếu máu mục tiêu xuống dưới 10% và còn sống
  if (
    defender.hp > 0 &&
    defender.hasEmergencyShieldPassive &&
    !defender.emergencyShieldTriggered &&
    defender.hp / defender.maxHp < 0.1
  ) {
    defender.emergencyShieldTriggered = true;
    defender.emergencyShieldActive = true;
    addFloatingText(state, defender.x, defender.y - 16, 'KHIÊN KHẨN CẤP!', '#fde047', false, true);
  }

  // Nội tại Pháp Sư Lửa: THIÊU ĐỐT (Khi dính đòn đánh thường hoặc chiêu thức -> trừ 20 HP mỗi s trong 3s, cộng dồn)
  if (
    !isBurnTick &&
    attacker.ball.weaponType === 'fire_staff' &&
    attacker.passiveDisabledRemaining <= 0 &&
    actualDamageRecorded > 0 &&
    defender.hp > 0
  ) {
    defender.burnStacks.push({
      attackerSide: attacker.side,
      remainingDuration: 3.0,
      tickTimer: 1.0,
      damagePerSecond: 20,
    });
    spawnEmbers(state, defender.x, defender.y, 6);
  }

  // Nội tại 1 Pháp Sư Băng: LẠNH BUỐT (Mỗi đòn đánh thường hoặc chiêu trúng gây lạnh buốt 3s, cộng dồn tối đa 5s, làm chậm 10%)
  if (
    !isBurnTick &&
    attacker.ball.weaponType === 'ice_staff' &&
    attacker.passiveDisabledRemaining <= 0 &&
    actualDamageRecorded > 0 &&
    defender.hp > 0
  ) {
    defender.chillRemaining = Math.min(5.0, defender.chillRemaining + 3.0);
    spawnParticles(state, defender.x, defender.y, '#7dd3fc', 6, 0.8);
  }

  // Nội tại 1 & 2 Pháp Sư Thổ (Earth Mage) khi chịu sát thương
  if (
    !isBurnTick &&
    !isEarthCounter &&
    defender.ball.weaponType === 'earth_staff' &&
    defender.passiveDisabledRemaining <= 0 &&
    actualDamageRecorded > 0 &&
    defender.hp > 0
  ) {
    // Nội tại 1: Chịu 3 lần sát thương liên tục trong 1 giây -> Dựng Tường Đất phát sáng trước mắt đối thủ, sau đó bức tường lao về phía đối thủ kéo về tường rìa map và phát nổ (80 ST + xóa sạch nội tại đối thủ trong 5s)
    defender.recentDamageTimestamps = defender.recentDamageTimestamps.filter(
      (ts) => state.elapsedTime - ts <= 1.0
    );
    defender.recentDamageTimestamps.push(state.elapsedTime);

    if (defender.recentDamageTimestamps.length >= 3) {
      defender.recentDamageTimestamps = [];
      const toAttDx = attacker.x - defender.x;
      const toAttDy = attacker.y - defender.y;
      const rawDist = Math.hypot(toAttDx, toAttDy);
      const pushAng = rawDist > 1 ? Math.atan2(toAttDy, toAttDx) : defender.aimAngle;
      const cosP = Math.cos(pushAng);
      const sinP = Math.sin(pushAng);

      // Tạo bức tường đất phát sáng ngay trước mắt đối thủ (phía giữa Pháp Sư Thổ và đối thủ)
      const wallX = Math.max(36, Math.min(ARENA_SIZE - 36, attacker.x - cosP * (BALL_RADIUS + 20)));
      const wallY = Math.max(36, Math.min(ARENA_SIZE - 36, attacker.y - sinP * (BALL_RADIUS + 20)));

      const wallEntity: EarthWallEntity = {
        id: state.nextEntityId++,
        ownerSide: defender.side,
        x: wallX,
        y: wallY,
        angle: pushAng + Math.PI / 2,
        halfLength: 62,
        halfThickness: 12,
        remainingDuration: 2.0,
        maxDuration: 2.0,
        isPassiveWall: true,
        impactGlowTimer: 2.0,
        bounceDamage: 0,
        hitCooldownBySide: {},
        isChargingWall: true,
        chargeDirX: cosP,
        chargeDirY: sinP,
        chargeTargetSide: attacker.side,
        chargeDragging: false,
        chargeElapsed: 0,
      };
      state.earthWalls.push(wallEntity);

      sound.playEarthWallSlam();
      state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.45);
      spawnEarthShatter(state, wallX, wallY, 12);
      spawnParticles(state, wallX, wallY, '#fde047', 16, 1.35);
      addFloatingText(state, wallX, wallY - 18, 'TƯỜNG PHẢN CHẤN!', '#facc15', false, true);
    }

    // Nội tại 2: Cứ mỗi 5 lần nhận sát thương -> Dậm đất tạo rung chấn + hố sụt, làm chậm đối thủ 50% trong 1s
    defender.earthHitCounter += 1;
    if (defender.earthHitCounter >= 5) {
      defender.earthHitCounter = 0;
      defender.earthStompRemaining = 0.45;
      defender.vx = 0;
      defender.vy = 0;
      sound.playEarthStomp();
      state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.75);
      state.earthCraters.push({
        id: state.nextEntityId++,
        x: defender.x,
        y: defender.y,
        radius: 68,
        remainingDuration: 2.8,
        maxDuration: 2.8,
      });
      spawnEarthShatter(state, defender.x, defender.y, 18);
      spawnParticles(state, defender.x, defender.y, '#f59e0b', 14, 1.3);
      if (attacker.hp > 0) {
        attacker.earthSlow50Remaining = Math.max(attacker.earthSlow50Remaining, 1.0);
        addFloatingText(state, attacker.x, attacker.y - 16, 'RUNG CHẤN -50% TỐC!', '#f59e0b', false, true);
      }
    }
  }

  // Hiệu ứng âm thanh, rung màn hình và số sát thương nổi
  if (!isBurnTick) {
    sound.playHit(isCrit);
    if (isCrit || actualDamageRecorded >= 80) {
      state.hitstopTimer = 0.045;
      state.shakeTrauma = Math.min(1, state.shakeTrauma + (isCrit ? 0.55 : 0.35));
    } else {
      state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.16);
    }
  }

  const textColor = isBurnTick
    ? '#fb923c'
    : isCrit
    ? '#fde047'
    : isSkill
    ? '#38bdf8'
    : '#f8fafc';
  addFloatingText(
    state,
    defender.x,
    defender.y,
    isBurnTick
      ? `THIÊU ĐỐT -${actualDamageRecorded}`
      : isCrit
      ? `CHÍ MẠNG -${actualDamageRecorded}!`
      : `-${actualDamageRecorded}`,
    textColor,
    isCrit,
    isSkill
  );
  if (!isBurnTick) {
    spawnParticles(
      state,
      defender.x,
      defender.y,
      isCrit ? '#fde047' : defender.ball.primaryColor,
      isCrit ? 14 : 7,
      isCrit ? 1.35 : 0.9
    );
    spawnBloodSplatter(state, attacker, defender, isSkill, isCrit);
  }

  checkDeath(state);
  return actualDamageRecorded;
}

function triggerFinisher(state: BattleSimulationState) {
  if (!state.winner || state.finisher) return;
  const winActor = state.winner === 'PLAYER' ? state.player : state.bot;
  const loseActor = state.winner === 'PLAYER' ? state.bot : state.player;

  // Quả bóng thắng đứng lại, quả bóng thua dừng và phân rã thành 8 viên vàng sáng nhỏ (20% kích thước)
  winActor.vx = 0;
  winActor.vy = 0;
  loseActor.vx = 0;
  loseActor.vy = 0;
  state.hitstopTimer = 0;

  const scatterDist = 48;
  const orbs: FinisherOrb[] = [];
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI * 2) / 8;
    const sx = Math.max(16, Math.min(ARENA_SIZE - 16, loseActor.x + Math.cos(ang) * scatterDist));
    const sy = Math.max(16, Math.min(ARENA_SIZE - 16, loseActor.y + Math.sin(ang) * scatterDist));
    orbs.push({
      startX: loseActor.x,
      startY: loseActor.y,
      scatterX: sx,
      scatterY: sy,
      x: loseActor.x,
      y: loseActor.y,
      angle: ang,
    });
  }

  state.finisher = {
    winnerSide: state.winner,
    loserX: loseActor.x,
    loserY: loseActor.y,
    coinX: loseActor.x,
    coinY: loseActor.y,
    // Bay về phía người sở hữu bóng thắng: BOT ở bên trái (-20), PLAYER ở bên phải (ARENA_SIZE + 20)
    targetX: state.winner === 'BOT' ? -20 : ARENA_SIZE + 20,
    targetY: 110,
    coinColor: state.winner === 'PLAYER' ? '#ef4444' : '#38bdf8',
    coinBorderColor: state.winner === 'PLAYER' ? '#fecaca' : '#bae6fd',
    elapsed: 0,
    totalDuration: 2.25,
    orbs,
    coinFormedSoundPlayed: false,
    coinFlySoundPlayed: false,
    completed: false,
  };
}

function updateFinisherAnimation(state: BattleSimulationState, dt: number) {
  const fin = state.finisher;
  if (!fin || fin.completed) return;

  fin.elapsed = Math.min(fin.totalDuration, fin.elapsed + dt);
  const tTotal = fin.elapsed;

  if (tTotal <= 0.5) {
    // 0s -> 0.5s: Phân rã ra 8 viên vàng sáng nhỏ (20% bóng)
    const burstRatio = Math.min(1, tTotal / 0.28);
    const easeOut = 1 - Math.pow(1 - burstRatio, 3);
    for (const orb of fin.orbs) {
      orb.x = orb.startX + (orb.scatterX - orb.startX) * easeOut;
      orb.y = orb.startY + (orb.scatterY - orb.startY) * easeOut;
    }
  } else if (tTotal <= 1.35) {
    // Sau 0.5s: Dần hội tụ lại thành một đồng tiền mang màu bên thắng
    const convRatio = (tTotal - 0.5) / 0.85;
    const easeInOut =
      convRatio < 0.5
        ? 4 * convRatio * convRatio * convRatio
        : 1 - Math.pow(-2 * convRatio + 2, 3) / 2;
    const swirl = Math.sin(convRatio * Math.PI) * 0.55;
    for (const orb of fin.orbs) {
      const dx = orb.scatterX - fin.loserX;
      const dy = orb.scatterY - fin.loserY;
      const dist = Math.hypot(dx, dy) * (1 - easeInOut);
      const baseAng = Math.atan2(dy, dx) + swirl;
      orb.x = fin.loserX + Math.cos(baseAng) * dist;
      orb.y = fin.loserY + Math.sin(baseAng) * dist;
    }
    if (convRatio >= 0.88 && !fin.coinFormedSoundPlayed) {
      fin.coinFormedSoundPlayed = true;
      sound.playSkillCast();
      spawnParticles(state, fin.loserX, fin.loserY, fin.coinColor, 16, 1.2);
      spawnParticles(state, fin.loserX, fin.loserY, '#fde047', 12, 1.0);
    }
  } else {
    // Sau khi tụ thành đồng tiền: Đồng tiền bay về phía người sở hữu bóng thắng
    for (const orb of fin.orbs) {
      orb.x = fin.loserX;
      orb.y = fin.loserY;
    }
    if (!fin.coinFlySoundPlayed) {
      fin.coinFlySoundPlayed = true;
      sound.playCoin();
    }
    const flyRatio = Math.min(1, (tTotal - 1.35) / 0.9);
    const easeFly = flyRatio * flyRatio * (3 - 2 * flyRatio);
    const arcLift = Math.sin(flyRatio * Math.PI) * 34;
    fin.coinX = fin.loserX + (fin.targetX - fin.loserX) * easeFly;
    fin.coinY = fin.loserY + (fin.targetY - fin.loserY) * easeFly - arcLift;
  }

  if (fin.elapsed >= fin.totalDuration) {
    fin.completed = true;
  }
}

function checkDeath(state: BattleSimulationState) {
  if (state.finished) return;
  if (state.bot.hp <= 0 || state.player.hp <= 0) {
    state.finished = true;
    if (state.player.hp > state.bot.hp) {
      state.winner = 'PLAYER';
      sound.playVictory();
    } else {
      state.winner = 'BOT';
      sound.playDefeat();
    }
    triggerFinisher(state);
  }
}

/**
 * Xử lý tung kỹ năng của từng quả bóng
 */
function tryCastSkills(
  state: BattleSimulationState,
  actor: CombatantState,
  opponent: CombatantState
) {
  if (
    actor.stunnedRemaining > 0 ||
    actor.frozenRemaining > 0 ||
    actor.fireballChargeRemaining > 0 ||
    actor.phoenixChargeRemaining > 0 ||
    actor.iceSwordSummonRemaining > 0 ||
    actor.iceSwordQueueCount > 0 ||
    actor.earthStompRemaining > 0 ||
    actor.windCastChargeRemaining > 0
  ) {
    return;
  }

  const dx = opponent.x - actor.x;
  const dy = opponent.y - actor.y;
  const dist = Math.hypot(dx, dy);
  const opponentVisible = opponent.stealthRemaining <= 0;

  for (let i = 0; i < actor.ball.skills.length; i++) {
    if (actor.skillCooldowns[i] > 0) continue;
    const skill = actor.ball.skills[i];
    if (!skill) continue;

    // Điều kiện thông minh để AI tung chiêu đúng lúc
    let shouldCast = false;
    switch (skill.iconType) {
      case 'rapid_arrow':
      case 'charge_arrow':
      case 'blade_wave':
      case 'shield_throw':
      case 'twin_daggers':
      case 'fireball_cast':
      case 'fire_god':
      case 'ice_swords':
      case 'earth_spikes':
      case 'wind_tornado':
        shouldCast = opponentVisible;
        break;
      case 'wind_burst':
        // Chỉ dùng Phong Bạo khi đối thủ ở đủ gần
        shouldCast = opponentVisible && dist <= 165;
        break;
      case 'wind_maelstrom':
        shouldCast = opponentVisible && dist <= 460;
        break;
      case 'dead_zone':
      case 'mist_zone':
      case 'rage_fist':
      case 'greatsword_buff':
      case 'stealth':
      case 'self_boost':
      case 'speed_chevron':
      case 'fire_rain':
      case 'ice_clasp':
      case 'ice_zone':
      case 'earth_mace':
      case 'earth_wall':
        shouldCast = true;
        break;
      case 'flurry_punch':
      case 'sword_plunge':
      case 'dash_slash':
      case 'assassinate':
      case 'blink_strike':
        shouldCast = opponentVisible && dist < 480;
        break;
      case 'blade_vortex':
        shouldCast = dist < 290;
        break;
      case 'five_shields':
      case 'invulnerable':
        shouldCast = dist < 300 || state.projectiles.some((p) => p.ownerSide !== actor.side);
        break;
      default:
        shouldCast = true;
    }

    if (!shouldCast) continue;

    // Đặt lại hồi chiêu
    actor.skillCooldowns[i] = skill.cooldown * actor.cooldownMultiplier;
    sound.playSkillCast();
    addFloatingText(state, actor.x, actor.y - 16, skill.name, actor.ball.accentColor, false, true);
    if (
      actor.ball.weaponType === 'fire_staff' ||
      actor.ball.weaponType === 'ice_staff' ||
      actor.ball.weaponType === 'earth_staff' ||
      actor.ball.weaponType === 'wind_staff'
    ) {
      actor.staffCastTiltTimer = 0.45;
    }

    // Nội tại Samurai: KUNAI (20% cơ hội phóng Kunai 20 ST, hồi nội tại 5s)
    if (
      actor.ball.weaponType === 'katana' &&
      actor.passiveDisabledRemaining <= 0 &&
      actor.kunaiPassiveCooldown <= 0 &&
      Math.random() < 0.2
    ) {
      actor.kunaiPassiveCooldown = 5.0;
      const ang = actor.aimAngle;
      state.projectiles.push({
        id: state.nextEntityId++,
        ownerSide: actor.side,
        kind: 'kunai',
        x: actor.x + Math.cos(ang) * 30,
        y: actor.y + Math.sin(ang) * 30,
        vx: Math.cos(ang) * 440,
        vy: Math.sin(ang) * 440,
        radius: 6,
        damage: 20,
        bouncesLeft: 0,
        bounceDamageDelta: 0,
        hitTargets: new Set(),
        color: '#facc15',
      });
      addFloatingText(state, actor.x, actor.y + 16, 'NỘI TẠI KUNAI!', '#facc15', false, true);
    }

    // Thực thi hiệu ứng từng kỹ năng
    const aim = opponentVisible ? Math.atan2(dy, dx) : actor.aimAngle;

    switch (skill.iconType) {
      // CUNG THỦ
      case 'rapid_arrow': {
        actor.rapidFireRemaining = 3.0;
        actor.rapidFireTickTimer = 0.05;
        break;
      }
      case 'charge_arrow': {
        // Kích hoạt trạng thái Tụ Lực (0.5s) kèm ấn Thái Dương Hỏa Long trước khi bắn
        actor.chargeShotWindupRemaining = 0.5;
        actor.chargeShotAuraRemaining = 1.35;
        spawnParticles(state, actor.x, actor.y, '#facc15', 14, 1.15);
        break;
      }
      case 'dead_zone': {
        // Tạo vòng tròn ngẫu nhiên (mở rộng phạm vi thêm 50%: 88 -> 132)
        const zx = Math.max(120, Math.min(ARENA_SIZE - 120, opponent.x + (Math.random() * 120 - 60)));
        const zy = Math.max(120, Math.min(ARENA_SIZE - 120, opponent.y + (Math.random() * 120 - 60)));
        state.zones.push({
          id: state.nextEntityId++,
          ownerSide: actor.side,
          kind: 'dead_zone',
          x: zx,
          y: zy,
          radius: 132,
          followOwner: false,
          remainingDuration: 5.0,
          tickInterval: 1.0,
          tickTimer: 0.25,
          damagePerTick: 100,
          color: '#22c55e',
        });
        break;
      }

      // BOXING PLAYER
      case 'flurry_punch': {
        actor.flurryDashRemaining = 0.45;
        actor.flurryDashTrailRemaining = 0.75;
        actor.flurryBarrageRemaining = 0.65;
        actor.vx = Math.cos(aim) * 460;
        actor.vy = Math.sin(aim) * 460;
        spawnParticles(state, actor.x, actor.y, '#ef4444', 12, 1.2);
        break;
      }
      case 'rage_fist': {
        actor.rageSkillRemaining = 3.0;
        spawnParticles(state, actor.x, actor.y, '#ef4444', 18, 1.35);
        break;
      }
      case 'blink_strike': {
        actor.blinkSkillRemaining = 1.0;
        actor.blinkTickTimer = 0.01;
        break;
      }

      // KIẾM SĨ
      case 'blade_vortex': {
        sound.playBladeVortexSpin();
        spawnParticles(state, actor.x, actor.y, '#fde047', 14, 1.25);
        state.zones.push({
          id: state.nextEntityId++,
          ownerSide: actor.side,
          kind: 'blade_vortex',
          x: actor.x,
          y: actor.y,
          radius: 115,
          followOwner: true,
          remainingDuration: 3.0,
          tickInterval: 0.5,
          tickTimer: 0.1,
          damagePerTick: 80,
          color: '#eab308',
        });
        break;
      }
      case 'sword_plunge': {
        actor.plungeOriginX = actor.x;
        actor.plungeOriginY = actor.y;
        actor.plungeDashRemaining = 0.5;
        actor.vx = Math.cos(aim) * 480;
        actor.vy = Math.sin(aim) * 480;
        break;
      }
      case 'greatsword_buff': {
        actor.greatswordBuffRemaining = 5.0;
        spawnParticles(state, actor.x, actor.y, '#fde047', 18, 1.3);
        break;
      }

      // SAMURAI
      case 'blade_wave': {
        sound.playSwordSlash();
        spawnParticles(
          state,
          actor.x + Math.cos(aim) * 28,
          actor.y + Math.sin(aim) * 28,
          '#bae6fd',
          12,
          1.1
        );
        state.projectiles.push({
          id: state.nextEntityId++,
          ownerSide: actor.side,
          kind: 'blade_wave',
          x: actor.x + Math.cos(aim) * 32,
          y: actor.y + Math.sin(aim) * 32,
          vx: Math.cos(aim) * 390,
          vy: Math.sin(aim) * 390,
          radius: 20,
          damage: 80,
          bouncesLeft: 0, // Chạm tường biến mất
          bounceDamageDelta: 0,
          hitTargets: new Set(),
          color: '#38bdf8',
        });
        break;
      }
      case 'dash_slash': {
        sound.playSwordSlash();
        actor.dashSlashRemaining = 0.38;
        actor.dashSlashTrailRemaining = 0.75;
        actor.vx = Math.cos(aim) * 470;
        actor.vy = Math.sin(aim) * 470;
        spawnParticles(state, actor.x, actor.y, '#38bdf8', 14, 1.25);
        break;
      }
      case 'mist_zone': {
        state.zones.push({
          id: state.nextEntityId++,
          ownerSide: actor.side,
          kind: 'mist_zone',
          x: actor.x,
          y: actor.y,
          radius: 96,
          followOwner: false, // Giữ nguyên vị trí kích hoạt
          remainingDuration: 3.0,
          tickInterval: 1.0,
          tickTimer: 0.2,
          damagePerTick: 120,
          color: '#4c1d95',
        });
        break;
      }

      // ĐẤU SĨ
      case 'five_shields': {
        actor.fiveShieldsRemaining = 2.0;
        sound.playShieldClang();
        spawnParticles(state, actor.x, actor.y, '#38bdf8', 14, 1.2);
        break;
      }
      case 'invulnerable': {
        actor.invulnerableRemaining = 3.0;
        actor.silverFlashRemaining = 0.35;
        sound.playShieldClang();
        spawnParticles(state, actor.x, actor.y, '#ffffff', 16, 1.25);
        break;
      }
      case 'shield_throw': {
        sound.playShieldClang();
        state.projectiles.push({
          id: state.nextEntityId++,
          ownerSide: actor.side,
          kind: 'thrown_shield',
          x: actor.x + Math.cos(aim) * 32,
          y: actor.y + Math.sin(aim) * 32,
          vx: Math.cos(aim) * 410,
          vy: Math.sin(aim) * 410,
          radius: 16,
          damage: 80,
          bouncesLeft: 1, // Chạm tường quay ngược trở lại
          bounceDamageDelta: 0,
          returning: false,
          hitTargets: new Set(),
          color: '#e2e8f0',
        });
        break;
      }

      // SÁT THỦ
      case 'assassinate': {
        sound.playSwordSlash();
        actor.assassinateDashRemaining = actor.ball.id === 'assassin' ? 0.57 : 0.38;
        actor.assassinateDashTrailRemaining = actor.ball.id === 'assassin' ? 0.95 : 0.75;
        actor.assassinPurpleFlashRemaining = 0.45;
        actor.vx = Math.cos(aim) * 520;
        actor.vy = Math.sin(aim) * 520;
        spawnParticles(state, actor.x, actor.y, '#c084fc', 16, 1.3);
        break;
      }
      case 'stealth': {
        actor.stealthRemaining = 3.0;
        // Khi bật Tàng Hình sẽ tỏa ra một lớp bụi mù xung quanh vị trí biến mất
        const puffs: Array<{ angle: number; dist: number; r: number }> = [];
        for (let pIdx = 0; pIdx < 12; pIdx++) {
          puffs.push({
            angle: (pIdx * Math.PI * 2) / 12 + (Math.random() * 0.25 - 0.12),
            dist: 12 + Math.random() * 24,
            r: 12 + Math.random() * 10,
          });
        }
        state.dustClouds.push({
          id: state.nextEntityId++,
          x: actor.x,
          y: actor.y,
          radius: 56,
          life: 0.95,
          maxLife: 0.95,
          puffs,
        });
        spawnParticles(state, actor.x, actor.y, '#d4d4d8', 18, 1.2);
        spawnParticles(state, actor.x, actor.y, '#a855f7', 10, 1.0);
        break;
      }
      case 'twin_daggers': {
        sound.playSwordSlash();
        const isAssassin = actor.ball.id === 'assassin';
        const castId = state.nextEntityId++;
        [-0.12, 0.12].forEach((offset) => {
          const a = aim + offset;
          state.projectiles.push({
            id: state.nextEntityId++,
            ownerSide: actor.side,
            kind: 'dagger',
            x: actor.x + Math.cos(a) * 32,
            y: actor.y + Math.sin(a) * 32,
            vx: Math.cos(a) * 450,
            vy: Math.sin(a) * 450,
            radius: 10,
            damage: isAssassin ? 80 : 40,
            bouncesLeft: 0,
            bounceDamageDelta: 0,
            castId: isAssassin ? castId : undefined,
            onHitTeleportAndCrit: isAssassin,
            hitTargets: new Set(),
            color: '#a855f7',
          });
        });
        break;
      }

      // TỐC ĐỘ — SPEED
      case 'self_boost': {
        actor.speedSelfBoostRemaining = 5.0;
        actor.speedBoostGlowRemaining = 5.0;
        spawnParticles(state, actor.x, actor.y, '#38bdf8', 16, 1.3);
        spawnParticles(state, actor.x, actor.y, '#ffffff', 10, 1.1);
        addFloatingText(
          state,
          actor.x,
          actor.y - 16,
          '+5% TỐC CHẠY • +10% ST (5s)',
          '#38bdf8',
          false,
          true
        );
        break;
      }
      case 'speed_chevron': {
        const curSpd = Math.hypot(actor.vx, actor.vy);
        const dirAng = curSpd > 1 ? Math.atan2(actor.vy, actor.vx) : actor.aimAngle;
        const ax = Math.max(64, Math.min(ARENA_SIZE - 64, actor.x + Math.cos(dirAng) * 62));
        const ay = Math.max(64, Math.min(ARENA_SIZE - 64, actor.y + Math.sin(dirAng) * 62));
        state.speedArrows.push({
          id: state.nextEntityId++,
          ownerSide: actor.side,
          x: ax,
          y: ay,
          angle: dirAng,
          radius: 44,
          remainingDuration: 3.0,
          maxDuration: 3.0,
          ownerInside: false,
          enemyInside: false,
          slowedEnemySide: null,
        });
        spawnParticles(state, ax, ay, '#38bdf8', 14, 1.15);
        break;
      }

      // PHÁP SƯ LỬA — FIRE MAGE
      case 'fireball_cast': {
        sound.playFireCast();
        actor.fireballChargeRemaining = 1.0;
        actor.vx = 0;
        actor.vy = 0;
        spawnParticles(
          state,
          actor.x + Math.cos(aim) * 34,
          actor.y + Math.sin(aim) * 34,
          '#f97316',
          14,
          1.15
        );
        break;
      }
      case 'fire_rain': {
        sound.playFireCast();
        const zx = 95 + Math.random() * (ARENA_SIZE - 190);
        const zy = 95 + Math.random() * (ARENA_SIZE - 190);
        state.zones.push({
          id: state.nextEntityId++,
          ownerSide: actor.side,
          kind: 'fire_rain',
          x: zx,
          y: zy,
          radius: 92,
          followOwner: false,
          remainingDuration: 3.0,
          tickInterval: 0.2,
          tickTimer: 0.1,
          damagePerTick: 10,
          color: '#ea580c',
        });
        break;
      }
      case 'fire_god': {
        sound.playFireCast();
        actor.phoenixChargeRemaining = 0.5;
        actor.vx = 0;
        actor.vy = 0;
        spawnParticles(state, actor.x, actor.y, '#ef4444', 18, 1.35);
        break;
      }

      // PHÁP SƯ BĂNG — ICE MAGE
      case 'ice_clasp': {
        sound.playIceCast();
        const centerX = 160 + Math.random() * (ARENA_SIZE - 320);
        const centerY = 160 + Math.random() * (ARENA_SIZE - 320);
        const angle = Math.random() * Math.PI;
        state.iceClasps.push({
          id: state.nextEntityId++,
          ownerSide: actor.side,
          centerX,
          centerY,
          angle,
          distFromCenter: 130,
          waitTimer: 1.0,
          caughtTargetSide: null,
          collided: false,
        });
        break;
      }
      case 'ice_swords': {
        sound.playIceCast();
        actor.iceSwordSummonRemaining = 0.5;
        actor.iceSwordQueueCount = 8;
        actor.iceSwordFireTick = 0;
        actor.vx = 0;
        actor.vy = 0;
        spawnParticles(state, actor.x, actor.y, '#7dd3fc', 16, 1.2);
        break;
      }
      case 'ice_zone': {
        sound.playIceCast();
        const hasChillPassive = opponent.chillRemaining > 0 && opponent.stealthRemaining <= 0;
        const zx = hasChillPassive
          ? Math.max(95, Math.min(ARENA_SIZE - 95, opponent.x))
          : 110 + Math.random() * (ARENA_SIZE - 220);
        const zy = hasChillPassive
          ? Math.max(95, Math.min(ARENA_SIZE - 95, opponent.y))
          : 110 + Math.random() * (ARENA_SIZE - 220);
        state.zones.push({
          id: state.nextEntityId++,
          ownerSide: actor.side,
          kind: 'ice_zone',
          x: zx,
          y: zy,
          radius: 122,
          maxRadius: 122,
          followOwner: false,
          remainingDuration: 3.0,
          maxDuration: 3.0,
          tickInterval: 1.0,
          tickTimer: 0.96,
          ownerHealTickTimer: 0.2,
          damagePerTick: 30,
          color: '#38bdf8',
        });
        break;
      }

      // PHÁP SƯ THỔ — EARTH MAGE
      case 'earth_mace': {
        sound.playEarthCast();
        actor.earthMaceRemaining = 5.0;
        spawnParticles(state, actor.x, actor.y, '#f59e0b', 14, 1.25);
        break;
      }
      case 'earth_wall': {
        sound.playEarthWallSlam();
        const wx = 96 + Math.random() * (ARENA_SIZE - 192);
        const wy = 96 + Math.random() * (ARENA_SIZE - 192);
        const wAngle = Math.random() * Math.PI;
        state.earthWalls.push({
          id: state.nextEntityId++,
          ownerSide: actor.side,
          x: wx,
          y: wy,
          angle: wAngle,
          halfLength: 62,
          halfThickness: 12,
          remainingDuration: 3.0,
          maxDuration: 3.0,
          isPassiveWall: false,
          impactGlowTimer: 0.35,
          bounceDamage: 20,
          hitCooldownBySide: {},
        });
        spawnEarthShatter(state, wx, wy, 10);
        break;
      }
      case 'earth_spikes': {
        sound.playEarthStomp();
        const dirX = Math.cos(aim);
        const dirY = Math.sin(aim);
        const sx = actor.x + dirX * (BALL_RADIUS + 10);
        const sy = actor.y + dirY * (BALL_RADIUS + 10);
        state.earthSpikes.push({
          id: state.nextEntityId++,
          ownerSide: actor.side,
          startX: sx,
          startY: sy,
          curX: sx,
          curY: sy,
          dirX,
          dirY,
          angle: aim,
          speed: 470,
          stopped: false,
          remainingDuration: 1.4,
          maxDuration: 1.4,
          hitTargets: new Set(),
          pillars: [{ x: sx, y: sy, size: 15, tilt: 0, age: 0 }],
        });
        break;
      }

      // PHÁP SƯ GIÓ — WIND MAGE
      case 'wind_tornado': {
        sound.playWindTornado();
        const tipX = actor.x + Math.cos(aim) * (BALL_RADIUS + 20);
        const tipY = actor.y + Math.sin(aim) * (BALL_RADIUS + 20);
        spawnParticles(state, tipX, tipY, '#86efac', 12, 1.1);
        spawnWindLeaves(state, tipX, tipY, 5, 0.9);
        state.projectiles.push({
          id: state.nextEntityId++,
          ownerSide: actor.side,
          kind: 'wind_tornado',
          x: tipX,
          y: tipY,
          vx: Math.cos(aim) * 415,
          vy: Math.sin(aim) * 415,
          radius: 20,
          damage: 80,
          bouncesLeft: 0,
          bounceDamageDelta: 0,
          hitTargets: new Set(),
          color: '#22c55e',
        });
        break;
      }
      case 'wind_burst': {
        sound.playWindBurst();
        spawnParticles(state, actor.x, actor.y, '#86efac', 16, 1.3);
        spawnWindLeaves(state, actor.x, actor.y, 10, 1.1);
        state.zones.push({
          id: state.nextEntityId++,
          ownerSide: actor.side,
          kind: 'wind_burst',
          x: actor.x,
          y: actor.y,
          radius: 110,
          maxRadius: 110,
          followOwner: true,
          remainingDuration: 2.0,
          maxDuration: 2.0,
          tickInterval: 0.5,
          tickTimer: 0.46,
          tickCount: 0,
          damagePerTick: 20,
          color: '#16a34a',
        });
        break;
      }
      case 'wind_maelstrom': {
        sound.playWindBurst();
        actor.windCastChargeRemaining = 0.25;
        actor.windMaelstromTargetX = Math.max(85, Math.min(ARENA_SIZE - 85, opponent.x));
        actor.windMaelstromTargetY = Math.max(85, Math.min(ARENA_SIZE - 85, opponent.y));
        spawnParticles(state, actor.x + Math.cos(aim) * 32, actor.y + Math.sin(aim) * 32, '#86efac', 16, 1.2);
        spawnWindLeaves(state, actor.x + Math.cos(aim) * 32, actor.y + Math.sin(aim) * 32, 8, 1.0);
        break;
      }
    }
    break; // Mỗi khung hình chỉ tung tối đa 1 chiêu
  }
}

/**
 * Kích hoạt nội tại khi bóng va chạm với tường hoặc bóng đối phương:
 * - Samurai: +10% tốc chạy và +10% tốc độ xoay kiếm mỗi lần va chạm
 * - Tốc Độ (Speed): Mỗi lần va chạm nhân 1,15 lần tốc độ hiện tại, +0,3% giảm ST, +0,15% ST và tạo 1 tàn ảnh
 */
function triggerCollisionPassive(
  state: BattleSimulationState,
  actor: CombatantState,
  _source: 'wall' | 'ball'
) {
  if (actor.passiveDisabledRemaining > 0) return;

  if (actor.ball.weaponType === 'katana') {
    actor.samuraiCollisionStacks += 1;
    if (actor.samuraiCollisionStacks <= 5 || actor.samuraiCollisionStacks % 3 === 0) {
      addFloatingText(
        state,
        actor.x,
        actor.y - 14,
        `+10% TỐC & KIẾM (${actor.samuraiCollisionStacks * 10}%)`,
        '#38bdf8',
        false,
        false
      );
    }
  }

  if (actor.ball.id === 'speed') {
    actor.speedCollisionMultiplier = Math.min(25, actor.speedCollisionMultiplier * 1.15);
    actor.speedAfterimageCount += 1;

    const curSpd = Math.hypot(actor.vx, actor.vy);
    const moveAng =
      curSpd > 0.001
        ? Math.atan2(actor.vy, actor.vx)
        : actor.aimAngle + (actor.side === 'BOT' ? 0.52 : -0.52);
    const nextSpd = Math.min(
      3600,
      curSpd > 0.001 ? curSpd * 1.15 : 168 * actor.speedCollisionMultiplier
    );
    actor.vx = Math.cos(moveAng) * nextSpd;
    actor.vy = Math.sin(moveAng) * nextSpd;

    // Tạo một tàn ảnh xanh lam tại vị trí kích hoạt nội tại
    if (state.afterimages.length >= 24) {
      state.afterimages.shift();
    }
    state.afterimages.push({
      x: actor.x,
      y: actor.y,
      aimAngle: actor.aimAngle,
      weaponAngle: actor.weaponAngle,
      color: actor.ball.primaryColor,
      accentColor: actor.ball.accentColor,
      life: 0.75,
      maxLife: 0.75,
    });
    spawnParticles(state, actor.x, actor.y, '#38bdf8', 10, 1.0);

    const dmgRedText = (actor.speedAfterimageCount * 0.3)
      .toFixed(1)
      .replace(/\.0$/, '');
    const dmgBoostText = (actor.speedAfterimageCount * 0.15)
      .toFixed(2)
      .replace(/\.00$/, '');
    addFloatingText(
      state,
      actor.x,
      actor.y - 14,
      `TÀN ẢNH #${actor.speedAfterimageCount} (-${dmgRedText}% NHẬN ST • +${dmgBoostText}% ST)`,
      '#38bdf8',
      false,
      true
    );
  }
}

/**
 * AI điều khiển hướng di chuyển và né đạn thông minh cho từng bóng
 */
function updateCombatantAIAndMovement(
  state: BattleSimulationState,
  actor: CombatantState,
  opponent: CombatantState,
  dt: number
) {
  // Nếu bóng đang bị Tường Phản Chấn (Nội tại 1 Pháp Sư Thổ) kéo về rìa map, để Tường Đất điều khiển quỹ đạo kéo
  if (
    state.earthWalls.some(
      (w) => w.isChargingWall && w.chargeDragging && w.chargeTargetSide === actor.side
    )
  ) {
    actor.vx = 0;
    actor.vy = 0;
    return;
  }

  if (actor.frozenRemaining > 0) {
    actor.frozenRemaining = Math.max(0, actor.frozenRemaining - dt);
    actor.vx = 0;
    actor.vy = 0;
    return;
  }

  if (actor.stunnedRemaining > 0) {
    actor.stunnedRemaining = Math.max(0, actor.stunnedRemaining - dt);
    actor.vx *= 0.9;
    actor.vy *= 0.9;
    return;
  }

  const dx = opponent.x - actor.x;
  const dy = opponent.y - actor.y;
  const opponentVisible = opponent.stealthRemaining <= 0;

  if (opponentVisible) {
    actor.aimAngle = Math.atan2(dy, dx);
  } else {
    actor.aimAngle += dt * 1.5;
  }

  // Pháp Sư Lửa đứng im khi tụ Cầu Lửa / Hỏa Thần; Pháp Sư Băng đứng im khi triệu hồi & bắn Kiếm Băng; Pháp Sư Thổ đứng im ngắn khi dậm rung chấn; Pháp Sư Gió giơ trượng tụ gió ngắn
  if (
    actor.knockbackRemaining <= 0 &&
    (actor.fireballChargeRemaining > 0 ||
      actor.phoenixChargeRemaining > 0 ||
      actor.iceSwordSummonRemaining > 0 ||
      actor.iceSwordQueueCount > 0 ||
      actor.earthStompRemaining > 0 ||
      actor.windCastChargeRemaining > 0)
  ) {
    actor.vx = 0;
    actor.vy = 0;
    return;
  }

  // Tính tốc độ mục tiêu dựa trên nội tại và buff
  const baseSpeed =
    168 *
    (actor.ball.id === 'speed' && actor.passiveDisabledRemaining <= 0
      ? actor.speedCollisionMultiplier
      : 1);
  let speedMultiplier = 1.0;
  if (actor.ball.weaponType === 'bow' && actor.passiveDisabledRemaining <= 0) {
    const lostPct = ((actor.maxHp - actor.hp) / actor.maxHp) * 100;
    const stacks = Math.floor(lostPct / 20);
    speedMultiplier += stacks * 0.01;
  }
  if (actor.ragePassiveRemaining > 0) speedMultiplier += 0.2;
  if (actor.rageSkillRemaining > 0) speedMultiplier += 0.3;
  if (actor.samuraiCollisionStacks > 0 && actor.passiveDisabledRemaining <= 0) {
    speedMultiplier *= 1 + actor.samuraiCollisionStacks * 0.1;
  }
  if (actor.speedSelfBoostRemaining > 0) {
    speedMultiplier *= 1.05;
  }
  if (actor.speedArrowPassStacks > 0) {
    speedMultiplier *= 1 + actor.speedArrowPassStacks * 0.05;
  }
  if (actor.stealthRemaining > 0) {
    speedMultiplier *= 2.0; // Tăng 100% tốc độ di chuyển khi Tàng Hình
  }
  if (actor.tailwindRemaining > 0) {
    speedMultiplier *= 1.12; // Nội tại 2 Pháp Sư Gió (Thuận Phong): +12% tốc độ di chuyển
  }

  // Làm chậm 10% từ Nội tại 1 (Lạnh Buốt) và 10% khi đứng trong Vùng Lạnh (Chiêu 3 Pháp Sư Băng)
  if (actor.chillRemaining > 0) {
    speedMultiplier *= 0.9;
  }
  const inEnemyIceZone = state.zones.some(
    (z) =>
      z.kind === 'ice_zone' &&
      z.ownerSide !== actor.side &&
      Math.hypot(actor.x - z.x, actor.y - z.y) <= z.radius + BALL_RADIUS * 0.6
  );
  if (inEnemyIceZone) {
    speedMultiplier *= 0.9;
  }
  // Chiêu 2 Speed: Giảm 50% tốc chạy cho đến khi mũi tên biến mất
  const slowedBySpeedArrow = state.speedArrows.some(
    (sa) => sa.slowedEnemySide === actor.side && sa.remainingDuration > 0
  );
  if (slowedBySpeedArrow) {
    speedMultiplier *= 0.5;
  }
  // Làm chậm 50% từ Nội tại 2 Pháp Sư Thổ & 80% từ Chiêu 3 Gai Đất
  if (actor.earthSlow50Remaining > 0) {
    speedMultiplier *= 0.5;
  }
  if (actor.earthSlow80Remaining > 0) {
    speedMultiplier *= 0.2;
  }

  const baseTargetSpeed = baseSpeed * speedMultiplier;

  // Nếu không đang trong trạng thái lướt kỹ năng hoặc bị đẩy lùi:
  // Quả bóng di chuyển ĐI THẲNG và BẬT LẠI với tốc độ không đổi (không bị hút vào nhau như nam châm)
  const isDashing =
    actor.flurryDashRemaining > 0 ||
    actor.plungeDashRemaining > 0 ||
    actor.dashSlashRemaining > 0 ||
    actor.assassinateDashRemaining > 0;

  if (actor.knockbackRemaining > 0) {
    const kbDt = Math.min(dt, actor.knockbackRemaining);
    actor.knockbackRemaining = Math.max(0, actor.knockbackRemaining - kbDt);
    actor.vx = actor.knockbackVx;
    actor.vy = actor.knockbackVy;
    actor.x += actor.knockbackVx * kbDt;
    actor.y += actor.knockbackVy * kbDt;
    if (actor.knockbackRemaining <= 0) {
      actor.knockbackVx = 0;
      actor.knockbackVy = 0;
      const resumeAng = Math.atan2(actor.vy, actor.vx);
      const effectiveTarget = Math.min(baseTargetSpeed, 3600);
      actor.vx = Math.cos(resumeAng) * effectiveTarget;
      actor.vy = Math.sin(resumeAng) * effectiveTarget;
    }
  } else {
    if (!isDashing) {
      const effectiveTarget = Math.min(baseTargetSpeed, 3600);
      const curSpd = Math.hypot(actor.vx, actor.vy);
      let moveAng =
        curSpd > 0.001
          ? Math.atan2(actor.vy, actor.vx)
          : actor.aimAngle + (actor.side === 'BOT' ? 0.52 : -0.52);

      // Nếu vừa thoát khỏi choáng và vận tốc bị triệt tiêu, khôi phục góc di chuyển chéo thẳng
      if (curSpd <= 1) {
        moveAng = actor.aimAngle + (actor.side === 'BOT' ? 0.52 : -0.52);
      }

      actor.vx = Math.cos(moveAng) * effectiveTarget;
      actor.vy = Math.sin(moveAng) * effectiveTarget;
    }

    // Lưu lịch sử vị trí để vẽ chuỗi Tàn Ảnh của Tốc Độ (Speed) và vệt lướt của Võ Sĩ / Samurai / Sát Thủ / Thuận Phong
    if (
      actor.ball.id === 'speed' ||
      actor.ball.weaponType === 'boxing_gloves' ||
      actor.ball.weaponType === 'katana' ||
      actor.ball.weaponType === 'dual_daggers' ||
      actor.ball.weaponType === 'wind_staff'
    ) {
      actor.positionTrail.unshift({
        x: actor.x,
        y: actor.y,
        aimAngle: actor.aimAngle,
        weaponAngle: actor.weaponAngle,
      });
      if (actor.positionTrail.length > 72) {
        actor.positionTrail.pop();
      }
    }

    // Cập nhật tọa độ
    actor.x += actor.vx * dt;
    actor.y += actor.vy * dt;
  }

  // Bật lại khi chạm tường đấu trường (kèm hiệu ứng sóng chấn động lan tỏa)
  let bouncedWall = false;
  if (actor.x - BALL_RADIUS < 0) {
    actor.x = BALL_RADIUS;
    actor.vx = Math.abs(actor.vx);
    state.wallFlashes.push({
      side: 'left',
      pos: actor.y,
      intensity: 1,
      color: actor.ball.accentColor,
      maxRadius: 62,
    });
    sound.playWallBounce();
    bouncedWall = true;
  } else if (actor.x + BALL_RADIUS > ARENA_SIZE) {
    actor.x = ARENA_SIZE - BALL_RADIUS;
    actor.vx = -Math.abs(actor.vx);
    state.wallFlashes.push({
      side: 'right',
      pos: actor.y,
      intensity: 1,
      color: actor.ball.accentColor,
      maxRadius: 62,
    });
    sound.playWallBounce();
    bouncedWall = true;
  }

  if (actor.y - BALL_RADIUS < 0) {
    actor.y = BALL_RADIUS;
    actor.vy = Math.abs(actor.vy);
    state.wallFlashes.push({
      side: 'top',
      pos: actor.x,
      intensity: 1,
      color: actor.ball.accentColor,
      maxRadius: 62,
    });
    sound.playWallBounce();
    bouncedWall = true;
  } else if (actor.y + BALL_RADIUS > ARENA_SIZE) {
    actor.y = ARENA_SIZE - BALL_RADIUS;
    actor.vy = -Math.abs(actor.vy);
    state.wallFlashes.push({
      side: 'bottom',
      pos: actor.x,
      intensity: 1,
      color: actor.ball.accentColor,
      maxRadius: 62,
    });
    sound.playWallBounce();
    bouncedWall = true;
  }

  if (bouncedWall) {
    triggerCollisionPassive(state, actor, 'wall');
  }

  // Bật lại khi va chạm với các Bức Tường Đất trên sân (tính năng như tường thật đấu trường; Chiêu 2 gây 20 ST cho đối thủ)
  for (const wall of state.earthWalls) {
    if (wall.isChargingWall) continue;
    const cosW = Math.cos(wall.angle);
    const sinW = Math.sin(wall.angle);
    const relX = actor.x - wall.x;
    const relY = actor.y - wall.y;
    const localPar = relX * cosW + relY * sinW;
    const localPerp = -relX * sinW + relY * cosW;

    const clampedPar = Math.max(-wall.halfLength, Math.min(wall.halfLength, localPar));
    const closestX = wall.x + clampedPar * cosW;
    const closestY = wall.y + clampedPar * sinW;
    const diffX = actor.x - closestX;
    const diffY = actor.y - closestY;
    const dist = Math.hypot(diffX, diffY);
    const minHitDist = BALL_RADIUS + wall.halfThickness;

    if (dist < minHitDist) {
      let nx = 0;
      let ny = 0;
      if (dist > 0.001) {
        nx = diffX / dist;
        ny = diffY / dist;
      } else {
        const sign = localPerp >= 0 ? 1 : -1;
        nx = -sinW * sign;
        ny = cosW * sign;
      }

      actor.x = Math.max(
        BALL_RADIUS,
        Math.min(ARENA_SIZE - BALL_RADIUS, closestX + nx * (minHitDist + 1.5))
      );
      actor.y = Math.max(
        BALL_RADIUS,
        Math.min(ARENA_SIZE - BALL_RADIUS, closestY + ny * (minHitDist + 1.5))
      );

      const dot = actor.vx * nx + actor.vy * ny;
      if (dot < 0) {
        actor.vx -= 2 * dot * nx;
        actor.vy -= 2 * dot * ny;
      } else {
        const spd = Math.max(150, Math.hypot(actor.vx, actor.vy));
        actor.vx = nx * spd;
        actor.vy = ny * spd;
      }

      wall.impactGlowTimer = Math.max(wall.impactGlowTimer, 0.45);
      sound.playWallBounce();
      triggerCollisionPassive(state, actor, 'wall');

      const wallCooldown = wall.hitCooldownBySide[actor.side] ?? 0;
      if (wall.bounceDamage > 0 && actor.side !== wall.ownerSide && wallCooldown <= 0) {
        wall.hitCooldownBySide[actor.side] = 0.22;
        const wallOwner = wall.ownerSide === 'BOT' ? state.bot : state.player;
        applyDamage(state, wallOwner, actor, wall.bounceDamage, true);
      }
    }
  }
}

/**
 * Cập nhật vũ khí cơ bản, đòn đánh đặc biệt và các hiệu ứng duy trì theo thời gian
 */
function updateCombatantWeaponsAndTimers(
  state: BattleSimulationState,
  actor: CombatantState,
  opponent: CombatantState,
  dt: number
) {
  // Giảm các bộ đếm thời gian
  for (let i = 0; i < actor.skillCooldowns.length; i++) {
    actor.skillCooldowns[i] = Math.max(0, actor.skillCooldowns[i] - dt);
  }
  actor.weaponHitCooldown = Math.max(0, actor.weaponHitCooldown - dt);
  actor.hitFlashTimer = Math.max(0, actor.hitFlashTimer - dt);
  actor.ragePassiveRemaining = Math.max(0, actor.ragePassiveRemaining - dt);
  actor.rageSkillRemaining = Math.max(0, actor.rageSkillRemaining - dt);
  actor.greatswordBuffRemaining = Math.max(0, actor.greatswordBuffRemaining - dt);
  actor.kunaiPassiveCooldown = Math.max(0, actor.kunaiPassiveCooldown - dt);
  actor.fiveShieldsRemaining = Math.max(0, actor.fiveShieldsRemaining - dt);
  actor.silverFlashRemaining = Math.max(0, actor.silverFlashRemaining - dt);
  if (actor.invulnerableRemaining > 0) {
    actor.invulnerableRemaining = Math.max(0, actor.invulnerableRemaining - dt);
    if (actor.invulnerableRemaining <= 0) {
      // Chiêu 2 Đấu Sĩ (Bất Khả Xâm Phạm): Khi kết thúc lóe sáng ánh bạc thêm một lần nữa rồi trở về trạng thái ban đầu
      actor.silverFlashRemaining = 0.48;
      spawnParticles(state, actor.x, actor.y, '#ffffff', 18, 1.35);
      spawnParticles(state, actor.x, actor.y, '#cbd5e1', 12, 1.05);
    }
  }
  actor.stealthRemaining = Math.max(0, actor.stealthRemaining - dt);
  actor.assassinRecallRemaining = Math.max(0, actor.assassinRecallRemaining - dt);
  actor.assassinateDashTrailRemaining = Math.max(0, actor.assassinateDashTrailRemaining - dt);
  actor.assassinPurpleFlashRemaining = Math.max(0, actor.assassinPurpleFlashRemaining - dt);
  actor.speedSelfBoostRemaining = Math.max(0, actor.speedSelfBoostRemaining - dt);
  actor.speedBoostGlowRemaining = Math.max(0, actor.speedBoostGlowRemaining - dt);
  actor.passiveDisabledRemaining = Math.max(0, actor.passiveDisabledRemaining - dt);
  actor.staffCastTiltTimer = Math.max(0, actor.staffCastTiltTimer - dt);
  actor.chillRemaining = Math.max(0, actor.chillRemaining - dt);
  actor.earthMaceRemaining = Math.max(0, actor.earthMaceRemaining - dt);
  if (actor.earthStompRemaining > 0) {
    actor.earthStompRemaining = Math.max(0, actor.earthStompRemaining - dt);
    if (actor.earthStompRemaining <= 0) {
      const resumeAng = actor.aimAngle + (actor.side === 'BOT' ? 0.52 : -0.52);
      actor.vx = Math.cos(resumeAng) * 168;
      actor.vy = Math.sin(resumeAng) * 168;
    }
  }
  actor.earthSlow50Remaining = Math.max(0, actor.earthSlow50Remaining - dt);
  actor.earthSlow80Remaining = Math.max(0, actor.earthSlow80Remaining - dt);
  actor.tailwindRemaining = Math.max(0, actor.tailwindRemaining - dt);
  actor.tailwindCooldownRemaining = Math.max(0, actor.tailwindCooldownRemaining - dt);

  // Chiêu 3 Pháp Sư Gió (THIÊN LONG QUYỂN): Sau 0.25s giơ trượng tụ gió -> triệu hồi Đại Cuồng Phong tại vị trí đối thủ
  if (actor.windCastChargeRemaining > 0) {
    actor.windCastChargeRemaining = Math.max(0, actor.windCastChargeRemaining - dt);
    if (actor.windCastChargeRemaining <= 0) {
      sound.playWindMaelstrom();
      const vx = Math.max(
        85,
        Math.min(
          ARENA_SIZE - 85,
          opponent.stealthRemaining <= 0 ? opponent.x : actor.windMaelstromTargetX
        )
      );
      const vy = Math.max(
        85,
        Math.min(
          ARENA_SIZE - 85,
          opponent.stealthRemaining <= 0 ? opponent.y : actor.windMaelstromTargetY
        )
      );
      state.windVortexes.push({
        id: state.nextEntityId++,
        ownerSide: actor.side,
        x: vx,
        y: vy,
        radius: 105,
        remainingDuration: 2.0,
        maxDuration: 2.0,
        tickInterval: 0.5,
        tickTimer: 0.48,
        ticksFired: 0,
        damagePerTick: 25,
      });
      spawnWindShockwave(state, vx, vy, 90, '#4ade80', 0.35);
      spawnWindLeaves(state, vx, vy, 14, 1.25);
      const resumeAng = actor.aimAngle + (actor.side === 'BOT' ? 0.52 : -0.52);
      actor.vx = Math.cos(resumeAng) * 168;
      actor.vy = Math.sin(resumeAng) * 168;
    }
  }

  // Chiêu 2 Pháp Sư Băng: KIẾM BĂNG (đứng lại 0.5s rồi bắn lần lượt 8 thanh kiếm băng)
  if (actor.iceSwordSummonRemaining > 0) {
    actor.iceSwordSummonRemaining = Math.max(0, actor.iceSwordSummonRemaining - dt);
    if (actor.iceSwordSummonRemaining <= 0) {
      actor.iceSwordFireTick = 0;
    }
  } else if (actor.iceSwordQueueCount > 0) {
    actor.iceSwordFireTick -= dt;
    while (actor.iceSwordFireTick <= 0 && actor.iceSwordQueueCount > 0) {
      actor.iceSwordFireTick += 0.06;
      const slotIndex = 8 - actor.iceSwordQueueCount;
      actor.iceSwordQueueCount -= 1;

      const orbitAng = actor.aimAngle + (slotIndex * Math.PI * 2) / 8;
      const spawnX = actor.x + Math.cos(orbitAng) * (BALL_RADIUS + 20);
      const spawnY = actor.y + Math.sin(orbitAng) * (BALL_RADIUS + 20);
      const fireAng =
        opponent.stealthRemaining <= 0
          ? Math.atan2(opponent.y - spawnY, opponent.x - spawnX)
          : actor.aimAngle + (slotIndex - 3.5) * 0.16;

      sound.playIceCast();
      actor.staffCastTiltTimer = Math.max(actor.staffCastTiltTimer, 0.28);
      state.projectiles.push({
        id: state.nextEntityId++,
        ownerSide: actor.side,
        kind: 'ice_sword',
        x: spawnX,
        y: spawnY,
        vx: Math.cos(fireAng) * 470,
        vy: Math.sin(fireAng) * 470,
        radius: 11,
        damage: 80,
        bouncesLeft: 0,
        bounceDamageDelta: 0,
        hitTargets: new Set(),
        color: '#38bdf8',
      });

      // Sau khi bắn xong cả 8 thanh kiếm, khôi phục trạng thái di chuyển ban đầu
      if (actor.iceSwordQueueCount === 0) {
        const resumeAng = actor.aimAngle + (actor.side === 'BOT' ? 0.52 : -0.52);
        actor.vx = Math.cos(resumeAng) * 168;
        actor.vy = Math.sin(resumeAng) * 168;
      }
    }
  }

  // Xử lý Nội Tại THIÊU ĐỐT trên quả bóng đang chịu hiệu ứng
  if (actor.burnStacks.length > 0 && actor.hp > 0) {
    const burnDamageByAttacker: Partial<Record<WinnerChoice, number>> = {};
    for (let bIdx = actor.burnStacks.length - 1; bIdx >= 0; bIdx--) {
      const bs = actor.burnStacks[bIdx];
      bs.remainingDuration -= dt;
      bs.tickTimer -= dt;
      if (bs.tickTimer <= 0) {
        bs.tickTimer += 1.0;
        burnDamageByAttacker[bs.attackerSide] =
          (burnDamageByAttacker[bs.attackerSide] ?? 0) + bs.damagePerSecond;
      }
      if (bs.remainingDuration <= 0) {
        actor.burnStacks.splice(bIdx, 1);
      }
    }
    (['BOT', 'PLAYER'] as const).forEach((srcSide) => {
      const dmgAmt = burnDamageByAttacker[srcSide];
      if (dmgAmt && dmgAmt > 0 && actor.hp > 0) {
        const srcCombatant = srcSide === 'BOT' ? state.bot : state.player;
        applyDamage(state, srcCombatant, actor, dmgAmt, true, false, true);
        spawnEmbers(state, actor.x, actor.y, 4);
      }
    });
  }

  // Chiêu 1 Pháp Sư Lửa: CẦU LỬA (đứng im 1s tụ cầu lửa rồi ném về phía đối thủ)
  if (actor.fireballChargeRemaining > 0) {
    actor.fireballChargeRemaining = Math.max(0, actor.fireballChargeRemaining - dt);
    if (actor.fireballChargeRemaining <= 0) {
      sound.playFireCast();
      actor.staffCastTiltTimer = Math.max(actor.staffCastTiltTimer, 0.38);
      const ang = actor.aimAngle;
      state.projectiles.push({
        id: state.nextEntityId++,
        ownerSide: actor.side,
        kind: 'charged_fireball',
        x: actor.x + Math.cos(ang) * 34,
        y: actor.y + Math.sin(ang) * 34,
        vx: Math.cos(ang) * 395,
        vy: Math.sin(ang) * 395,
        radius: 15,
        damage: 100,
        bouncesLeft: 0,
        bounceDamageDelta: 0,
        hitTargets: new Set(),
        color: '#ea580c',
      });
    }
  }

  // Chiêu 3 Pháp Sư Lửa: HỎA THẦN (đứng im 0.5s rồi bắn Phượng Hoàng Lửa nảy tường 3 lần)
  if (actor.phoenixChargeRemaining > 0) {
    actor.phoenixChargeRemaining = Math.max(0, actor.phoenixChargeRemaining - dt);
    if (actor.phoenixChargeRemaining <= 0) {
      sound.playPhoenixBeam();
      actor.staffCastTiltTimer = Math.max(actor.staffCastTiltTimer, 0.38);
      const ang = actor.aimAngle;
      const startX = actor.x + Math.cos(ang) * 34;
      const startY = actor.y + Math.sin(ang) * 34;
      state.projectiles.push({
        id: state.nextEntityId++,
        ownerSide: actor.side,
        kind: 'phoenix',
        x: startX,
        y: startY,
        vx: Math.cos(ang) * 490,
        vy: Math.sin(ang) * 490,
        radius: 18,
        damage: 0,
        bouncesLeft: 3,
        bounceDamageDelta: 0,
        trailPoints: [{ x: startX, y: startY }],
        hitTargets: new Set(),
        color: '#f97316',
      });
    }
  }

  // Nội tại Sát Thủ: cứ mỗi 1s trôi qua nhận thêm 1% tỉ lệ chí mạng
  if (actor.ball.id === 'assassin' && actor.passiveDisabledRemaining <= 0) {
    actor.assassinCritTimer += dt;
    while (actor.assassinCritTimer >= 1.0) {
      actor.assassinCritTimer -= 1.0;
      actor.bonusCritChancePct += 1;
    }
  }

  // Nội tại Đấu Sĩ: Giáp Thích Ứng (+2% giảm ST mỗi lần nhận ST, duy trì 3s)
  if (actor.defenderArmorTimer > 0) {
    actor.defenderArmorTimer = Math.max(0, actor.defenderArmorTimer - dt);
    if (actor.defenderArmorTimer <= 0) {
      actor.defenderArmorStacks = 0;
    }
  }

  // Nội tại Đấu Sĩ: KIÊN CƯỜNG (Đấu Sĩ hồi 100 HP mỗi 15s; Thiết Giáp hồi 50 HP mỗi 30s)
  if (actor.ball.weaponType === 'shield' && actor.passiveDisabledRemaining <= 0) {
    const regenInterval = actor.ball.id === 'defender' ? 15.0 : 30.0;
    const regenAmount = actor.ball.id === 'defender' ? 100 : 50;
    actor.regenPassiveTimer += dt;
    if (actor.regenPassiveTimer >= regenInterval) {
      actor.regenPassiveTimer -= regenInterval;
      if (actor.hp > 0 && actor.hp < actor.maxHp) {
        const heal = Math.min(regenAmount, actor.maxHp - actor.hp);
        actor.hp += heal;
        addFloatingText(state, actor.x, actor.y, `+${heal} HP`, '#22c55e', false, true);
      }
    }
  }

  // Kỹ năng 1 Cung Thủ: BẮN LIÊN THANH (mỗi 0.25s bắn 1 phát trong 3s)
  if (actor.rapidFireRemaining > 0) {
    actor.rapidFireRemaining = Math.max(0, actor.rapidFireRemaining - dt);
    actor.rapidFireTickTimer -= dt;
    if (actor.rapidFireTickTimer <= 0) {
      actor.rapidFireTickTimer += 0.25;
      sound.playBowShoot();
      const ang = actor.aimAngle;
      state.projectiles.push({
        id: state.nextEntityId++,
        ownerSide: actor.side,
        kind: 'arrow',
        x: actor.x + Math.cos(ang) * 32,
        y: actor.y + Math.sin(ang) * 32,
        vx: Math.cos(ang) * 500,
        vy: Math.sin(ang) * 500,
        radius: 6,
        damage: 20, // Giảm sát thương mũi tên bắn ra của Chiêu 1 Bắn Liên Thanh xuống 20
        bouncesLeft: 3,
        bounceDamageDelta: -10,
        hitTargets: new Set(),
        color: '#d97706',
      });
    }
  }

  // Kỹ năng 2 Cung Thủ: MŨI TÊN TỤ LỰC (tụ lực 0.5s rồi bắn đại tiễn vàng kim)
  if (actor.chargeShotAuraRemaining > 0) {
    actor.chargeShotAuraRemaining = Math.max(0, actor.chargeShotAuraRemaining - dt);
  }
  if (actor.chargeShotWindupRemaining > 0) {
    actor.chargeShotWindupRemaining -= dt;
    if (actor.chargeShotWindupRemaining <= 0) {
      actor.chargeShotWindupRemaining = 0;
      sound.playBowShoot();
      const ang = actor.aimAngle;
      spawnParticles(
        state,
        actor.x + Math.cos(ang) * 28,
        actor.y + Math.sin(ang) * 28,
        '#fde047',
        18,
        1.4
      );
      state.projectiles.push({
        id: state.nextEntityId++,
        ownerSide: actor.side,
        kind: 'charged_arrow',
        x: actor.x + Math.cos(ang) * 34,
        y: actor.y + Math.sin(ang) * 34,
        vx: Math.cos(ang) * 540,
        vy: Math.sin(ang) * 540,
        radius: 11,
        damage: actor.baseDamage * 2, // Gấp đôi sát thương cơ bản (160)
        bouncesLeft: 3,
        bounceDamageDelta: 30, // Mỗi lần nảy tường +30 ST
        hitTargets: new Set(),
        color: '#f59e0b',
      });
    }
  }

  // Kỹ năng 3 Boxing: DỊCH CHUYỂN ÁP SÁT (mỗi 0.5s dịch chuyển sát đối thủ gây ST cơ bản trong 1s, để lại tàn ảnh tồn tại 1s ở vị trí trước khi dịch chuyển)
  if (actor.blinkSkillRemaining > 0) {
    actor.blinkSkillRemaining = Math.max(0, actor.blinkSkillRemaining - dt);
    actor.blinkTickTimer -= dt;
    if (actor.blinkTickTimer <= 0) {
      actor.blinkTickTimer += 0.5;
      // Lưu lại Tàn Ảnh tồn tại 1s ngay tại vị trí trước khi dịch chuyển
      if (state.afterimages.length >= 24) {
        state.afterimages.shift();
      }
      state.afterimages.push({
        x: actor.x,
        y: actor.y,
        aimAngle: actor.aimAngle,
        weaponAngle: actor.weaponAngle,
        color: actor.ball.primaryColor,
        accentColor: actor.ball.accentColor,
        life: 1.0,
        maxLife: 1.0,
        isBoxerClone: true,
      });

      const offsetAng = Math.random() * Math.PI * 2;
      actor.x = Math.max(
        BALL_RADIUS + 4,
        Math.min(ARENA_SIZE - BALL_RADIUS - 4, opponent.x + Math.cos(offsetAng) * 48)
      );
      actor.y = Math.max(
        BALL_RADIUS + 4,
        Math.min(ARENA_SIZE - BALL_RADIUS - 4, opponent.y + Math.sin(offsetAng) * 48)
      );
      spawnParticles(state, actor.x, actor.y, '#ef4444', 10, 1.0);
      applyDamage(state, actor, opponent, actor.baseDamage, true);
    }
  }

  // Các kỹ năng Lao (Dash) va chạm với đối thủ
  const distToOpponent = Math.hypot(opponent.x - actor.x, opponent.y - actor.y);

  // Giảm dần bộ đếm hiệu ứng vệt lướt đỏ/xanh và đấm liên hoàn
  if (actor.flurryDashTrailRemaining > 0) {
    actor.flurryDashTrailRemaining = Math.max(0, actor.flurryDashTrailRemaining - dt);
  }
  if (actor.flurryBarrageRemaining > 0) {
    actor.flurryBarrageRemaining = Math.max(0, actor.flurryBarrageRemaining - dt);
  }
  if (actor.dashSlashTrailRemaining > 0) {
    actor.dashSlashTrailRemaining = Math.max(0, actor.dashSlashTrailRemaining - dt);
  }

  // Boxing ĐẤM LIÊN HOÀN (Tổng 100 sát thương + khống chế)
  if (actor.flurryDashRemaining > 0) {
    actor.flurryDashRemaining = Math.max(0, actor.flurryDashRemaining - dt);
    if (distToOpponent <= BALL_RADIUS * 2 + 18) {
      actor.flurryDashRemaining = 0;
      actor.flurryBarrageRemaining = 0.75;
      opponent.stunnedRemaining = Math.max(opponent.stunnedRemaining, 0.55);
      spawnParticles(state, opponent.x, opponent.y, '#fde047', 14, 1.3);
      applyDamage(state, actor, opponent, 100, true);
    }
  }

  // Kiếm sĩ CẮM KIẾM (120 sát thương, cắm thanh đại kiếm tại vị trí địch trúng chiêu trong 3s, chạm vào gây 30 ST)
  if (actor.plungeDashRemaining > 0) {
    actor.plungeDashRemaining = Math.max(0, actor.plungeDashRemaining - dt);
    if (distToOpponent <= BALL_RADIUS * 2 + 24) {
      actor.plungeDashRemaining = 0;
      sound.playSwordPlungeImpact();
      spawnParticles(state, opponent.x, opponent.y, '#fde047', 18, 1.45);
      applyDamage(state, actor, opponent, 120, true);

      // Tạo thanh đại kiếm cắm xuống vị trí địch trúng chiêu tồn tại trong 3 giây
      state.plantedSwords.push({
        id: state.nextEntityId++,
        ownerSide: actor.side,
        x: opponent.x,
        y: opponent.y,
        radius: 24,
        remainingDuration: 3.0,
        maxDuration: 3.0,
        touchCooldown: 0.4,
      });

      // Thu về hướng vị trí ban đầu
      const backDx = actor.plungeOriginX - actor.x;
      const backDy = actor.plungeOriginY - actor.y;
      const backAng = Math.atan2(backDy, backDx);
      actor.vx = Math.cos(backAng) * 240;
      actor.vy = Math.sin(backAng) * 240;
    }
  }

  // Samurai LAO CHÉM (60 sát thương + đẩy lùi đối phương)
  if (actor.dashSlashRemaining > 0) {
    actor.dashSlashRemaining = Math.max(0, actor.dashSlashRemaining - dt);
    if (distToOpponent <= BALL_RADIUS * 2 + 20) {
      actor.dashSlashRemaining = 0;
      spawnParticles(state, opponent.x, opponent.y, '#38bdf8', 14, 1.3);
      applyDamage(state, actor, opponent, 60, true);
      const pushAng = Math.atan2(opponent.y - actor.y, opponent.x - actor.x);
      opponent.vx = Math.cos(pushAng) * 380;
      opponent.vy = Math.sin(pushAng) * 380;
    }
  }

  // Sát thủ ÁM SÁT (50 sát thương khi tiếp xúc)
  if (actor.assassinateDashRemaining > 0) {
    actor.assassinateDashRemaining = Math.max(0, actor.assassinateDashRemaining - dt);
    if (distToOpponent <= BALL_RADIUS * 2 + 20) {
      actor.assassinateDashRemaining = 0;
      applyDamage(state, actor, opponent, 50, true);
    }
  }

  // Xử lý vũ khí cơ bản của từng bóng
  switch (actor.ball.weaponType) {
    case 'bow': {
      // Cung luôn hướng về đối thủ, mỗi 3 giây bắn 1 mũi tên tốc độ cao (tăng tốc theo nội tại Xạ Thủ Cuồng Nộ)
      actor.weaponAngle = actor.aimAngle;
      const lostPct = ((actor.maxHp - actor.hp) / actor.maxHp) * 100;
      const stacks = actor.passiveDisabledRemaining <= 0 ? Math.floor(lostPct / 20) : 0;
      const attackSpeedBonus = 1 + stacks * 0.03;
      actor.bowDrawTimer += dt * attackSpeedBonus;
      if (actor.bowDrawTimer >= 3.0) {
        actor.bowDrawTimer -= 3.0;
        sound.playBowShoot();
        const ang = actor.aimAngle;
        state.projectiles.push({
          id: state.nextEntityId++,
          ownerSide: actor.side,
          kind: 'arrow',
          x: actor.x + Math.cos(ang) * 32,
          y: actor.y + Math.sin(ang) * 32,
          vx: Math.cos(ang) * 490,
          vy: Math.sin(ang) * 490,
          radius: 6,
          damage: actor.baseDamage, // 80 (+nâng cấp)
          bouncesLeft: 3,
          bounceDamageDelta: -10, // Mỗi lần nảy tường giảm 10 ST (80 -> 70 -> 60 -> 50)
          hitTargets: new Set(),
          color: '#d97706',
        });
      }
      break;
    }

    case 'boxing_gloves': {
      // Hai găng tay luôn hướng về phía đối thủ
      actor.weaponAngle = actor.aimAngle;
      if (actor.weaponHitCooldown <= 0) {
        const gloveOffsets = [-0.42, 0.42];
        for (const off of gloveOffsets) {
          const gx = actor.x + Math.cos(actor.weaponAngle + off) * (BALL_RADIUS + 16);
          const gy = actor.y + Math.sin(actor.weaponAngle + off) * (BALL_RADIUS + 16);
          if (Math.hypot(gx - opponent.x, gy - opponent.y) <= BALL_RADIUS + 13) {
            actor.weaponHitCooldown = 0.42;
            applyDamage(state, actor, opponent, actor.baseDamage, false);
            break;
          }
        }
      }
      break;
    }

    case 'greatsword': {
      // Đại kiếm tầm xa xoay quanh bóng (xoay cực nhanh khi đang tung Chiêu 1 Xoáy Kiếm); chạm đối thủ gây 80 ST và đảo ngược chiều xoay
      const isVortexSpinning = state.zones.some(
        (z) => z.kind === 'blade_vortex' && z.ownerSide === actor.side
      );
      const spinSpeed =
        (isVortexSpinning ? 16.5 : 4.2) *
        (actor.greatswordBuffRemaining > 0 ? 1.2 : 1.0);
      actor.weaponAngle += spinSpeed * actor.weaponSpinDir * dt;
      if (actor.weaponHitCooldown <= 0) {
        const tipX = actor.x + Math.cos(actor.weaponAngle) * (BALL_RADIUS + 62);
        const tipY = actor.y + Math.sin(actor.weaponAngle) * (BALL_RADIUS + 62);
        const midX = actor.x + Math.cos(actor.weaponAngle) * (BALL_RADIUS + 38);
        const midY = actor.y + Math.sin(actor.weaponAngle) * (BALL_RADIUS + 38);
        const innerX = actor.x + Math.cos(actor.weaponAngle) * (BALL_RADIUS + 18);
        const innerY = actor.y + Math.sin(actor.weaponAngle) * (BALL_RADIUS + 18);
        if (
          Math.hypot(tipX - opponent.x, tipY - opponent.y) <= BALL_RADIUS + 16 ||
          Math.hypot(midX - opponent.x, midY - opponent.y) <= BALL_RADIUS + 15 ||
          Math.hypot(innerX - opponent.x, innerY - opponent.y) <= BALL_RADIUS + 13
        ) {
          actor.weaponHitCooldown = 0.44;
          actor.weaponSpinDir = (actor.weaponSpinDir * -1) as 1 | -1; // Đảo ngược chiều xoay
          sound.playSwordSlash();
          const dmg =
            actor.baseDamage * (actor.greatswordBuffRemaining > 0 ? 1.5 : 1.0);
          applyDamage(state, actor, opponent, dmg, false);
        }
      }
      break;
    }

    case 'katana': {
      // Katana tầm đánh xa xoay nhanh quanh bóng (+10% tốc độ xoay mỗi lần va chạm), gây 60 ST
      const katanaSpinSpeed = 6.4 * (1 + actor.samuraiCollisionStacks * 0.1);
      actor.weaponAngle += katanaSpinSpeed * dt;
      if (actor.weaponHitCooldown <= 0) {
        const tipX = actor.x + Math.cos(actor.weaponAngle) * (BALL_RADIUS + 52);
        const tipY = actor.y + Math.sin(actor.weaponAngle) * (BALL_RADIUS + 52);
        const midX = actor.x + Math.cos(actor.weaponAngle) * (BALL_RADIUS + 28);
        const midY = actor.y + Math.sin(actor.weaponAngle) * (BALL_RADIUS + 28);
        if (
          Math.hypot(tipX - opponent.x, tipY - opponent.y) <= BALL_RADIUS + 15 ||
          Math.hypot(midX - opponent.x, midY - opponent.y) <= BALL_RADIUS + 14
        ) {
          actor.weaponHitCooldown = 0.38;
          sound.playSwordSlash();
          applyDamage(state, actor, opponent, actor.baseDamage, false);
        }
      }
      break;
    }

    case 'shield': {
      // Khiên xoay xung quanh bóng, chạm gây 50 ST và phản đạn tầm xa
      actor.weaponAngle += 4.8 * dt;
      const sx = actor.x + Math.cos(actor.weaponAngle) * (BALL_RADIUS + 18);
      const sy = actor.y + Math.sin(actor.weaponAngle) * (BALL_RADIUS + 18);
      if (
        actor.weaponHitCooldown <= 0 &&
        Math.hypot(sx - opponent.x, sy - opponent.y) <= BALL_RADIUS + 14
      ) {
        actor.weaponHitCooldown = 0.45;
        sound.playShieldClang();
        applyDamage(state, actor, opponent, actor.baseDamage, false);
      }
      break;
    }

    case 'dual_daggers': {
      // Hai thanh đao săn Damascus xoay vòng xung quanh bóng (+15% tầm đánh), gây 60 ST
      actor.weaponAngle += 7.0 * dt;
      if (actor.weaponHitCooldown <= 0) {
        const angles = [actor.weaponAngle, actor.weaponAngle + Math.PI];
        for (const a of angles) {
          const dxTip = actor.x + Math.cos(a) * (BALL_RADIUS + 30);
          const dyTip = actor.y + Math.sin(a) * (BALL_RADIUS + 30);
          const dxMid = actor.x + Math.cos(a) * (BALL_RADIUS + 18);
          const dyMid = actor.y + Math.sin(a) * (BALL_RADIUS + 18);
          if (
            Math.hypot(dxTip - opponent.x, dyTip - opponent.y) <= BALL_RADIUS + 15 ||
            Math.hypot(dxMid - opponent.x, dyMid - opponent.y) <= BALL_RADIUS + 13
          ) {
            actor.weaponHitCooldown = 0.36;
            sound.playSwordSlash();
            applyDamage(state, actor, opponent, actor.baseDamage, false);
            break;
          }
        }
      }
      break;
    }

    case 'fire_staff': {
      // Trượng Phép Hỏa luôn hướng về phía kẻ địch; mỗi 5s tung quả cầu lửa chậm hơn mũi tên (~5) gây 80 ST
      actor.weaponAngle = actor.aimAngle;
      if (actor.fireballChargeRemaining <= 0 && actor.phoenixChargeRemaining <= 0) {
        actor.fireBoltTimer += dt;
        if (actor.fireBoltTimer >= 5.0) {
          actor.fireBoltTimer -= 5.0;
          sound.playFireCast();
          const ang = actor.aimAngle;
          state.projectiles.push({
            id: state.nextEntityId++,
            ownerSide: actor.side,
            kind: 'fire_bolt',
            x: actor.x + Math.cos(ang) * 34,
            y: actor.y + Math.sin(ang) * 34,
            vx: Math.cos(ang) * 365, // Chậm hơn mũi tên (370) khoảng 5
            vy: Math.sin(ang) * 365,
            radius: 10,
            damage: actor.baseDamage, // 80 (+nâng cấp)
            bouncesLeft: 0,
            bounceDamageDelta: 0,
            hitTargets: new Set(),
            color: '#f97316',
          });
        }
      }
      break;
    }

    case 'ice_staff': {
      // Trượng Phép Băng luôn hướng về phía kẻ địch; mỗi 5s bắn viên băng nhọn (70 ST) + Nội tại 2 tích lũy 5 viên băng xoay
      actor.weaponAngle = actor.aimAngle;
      if (
        actor.frozenRemaining <= 0 &&
        actor.iceSwordSummonRemaining <= 0 &&
        actor.iceSwordQueueCount <= 0
      ) {
        actor.iceBoltTimer += dt;
        if (actor.iceBoltTimer >= 5.0) {
          actor.iceBoltTimer -= 5.0;
          sound.playIceCast();
          const ang = actor.aimAngle;
          state.projectiles.push({
            id: state.nextEntityId++,
            ownerSide: actor.side,
            kind: 'ice_bolt',
            x: actor.x + Math.cos(ang) * 34,
            y: actor.y + Math.sin(ang) * 34,
            vx: Math.cos(ang) * 380,
            vy: Math.sin(ang) * 380,
            radius: 10,
            damage: actor.baseDamage, // 70 (+nâng cấp)
            bouncesLeft: 0,
            bounceDamageDelta: 0,
            hitTargets: new Set(),
            color: '#38bdf8',
          });

          // Nội tại 2: Mỗi đòn đánh thường tạo 1 viên băng xoay; khi đủ 5 viên phóng cả 5 viên (10 ST/viên)
          if (actor.passiveDisabledRemaining <= 0) {
            actor.orbitingIceCount += 1;
          }
          if (actor.orbitingIceCount >= 5) {
            actor.orbitingIceCount = 0;
            const oppInIceZone = state.zones.some(
              (z) =>
                z.kind === 'ice_zone' &&
                z.ownerSide === actor.side &&
                Math.hypot(opponent.x - z.x, opponent.y - z.y) <= z.radius + BALL_RADIUS * 0.6
            );
            const oppIsSlowed =
              (opponent.chillRemaining > 0 || oppInIceZone) &&
              opponent.stealthRemaining <= 0;
            for (let k = 0; k < 5; k++) {
              const orbitAng = state.elapsedTime * 3.2 + (k * Math.PI * 2) / 5;
              const sx = actor.x + Math.cos(orbitAng) * (BALL_RADIUS + 14);
              const sy = actor.y + Math.sin(orbitAng) * (BALL_RADIUS + 14);
              const fireAng =
                opponent.stealthRemaining <= 0
                  ? Math.atan2(opponent.y - sy, opponent.x - sx)
                  : actor.aimAngle + (k - 2) * 0.22;
              state.projectiles.push({
                id: state.nextEntityId++,
                ownerSide: actor.side,
                kind: 'mini_ice_bolt',
                x: sx,
                y: sy,
                vx: Math.cos(fireAng) * 440,
                vy: Math.sin(fireAng) * 440,
                radius: 5, // Nhỏ hơn 50% so với viên băng đánh thường (radius 10)
                damage: 10,
                bouncesLeft: 0,
                bounceDamageDelta: 0,
                homingTargetSide: oppIsSlowed ? opponent.side : undefined,
                hitTargets: new Set(),
                color: '#7dd3fc',
              });
            }
          }
        }
      }
      break;
    }

    case 'earth_staff': {
      // Chiêu 1 (TRÙY ĐẤT): Trong 5s thay thế Trượng Phép bằng Trùy Đất xoay đánh như Đại Kiếm (tầm đánh x1.5), mỗi nhát 60 ST
      if (actor.earthMaceRemaining > 0) {
        const spinSpeed = 4.2;
        actor.weaponAngle += spinSpeed * actor.weaponSpinDir * dt;
        if (actor.weaponHitCooldown <= 0) {
          const tipX = actor.x + Math.cos(actor.weaponAngle) * (BALL_RADIUS + 93);
          const tipY = actor.y + Math.sin(actor.weaponAngle) * (BALL_RADIUS + 93);
          const midX = actor.x + Math.cos(actor.weaponAngle) * (BALL_RADIUS + 57);
          const midY = actor.y + Math.sin(actor.weaponAngle) * (BALL_RADIUS + 57);
          const innerX = actor.x + Math.cos(actor.weaponAngle) * (BALL_RADIUS + 27);
          const innerY = actor.y + Math.sin(actor.weaponAngle) * (BALL_RADIUS + 27);
          if (
            Math.hypot(tipX - opponent.x, tipY - opponent.y) <= BALL_RADIUS + 20 ||
            Math.hypot(midX - opponent.x, midY - opponent.y) <= BALL_RADIUS + 18 ||
            Math.hypot(innerX - opponent.x, innerY - opponent.y) <= BALL_RADIUS + 16
          ) {
            actor.weaponHitCooldown = 0.44;
            actor.weaponSpinDir = (actor.weaponSpinDir * -1) as 1 | -1; // Đảo ngược chiều xoay giống Đại Kiếm
            sound.playEarthWallSlam();
            spawnEarthShatter(state, opponent.x, opponent.y, 10);
            applyDamage(state, actor, opponent, 60, true);
          }
        }
      } else {
        // Trượng Phép Thổ luôn hướng về kẻ địch; mỗi 5s bắn ra một khối đất gây 80 ST
        actor.weaponAngle = actor.aimAngle;
        actor.earthBoltTimer += dt;
        if (actor.earthBoltTimer >= 5.0) {
          actor.earthBoltTimer -= 5.0;
          sound.playEarthCast();
          const ang = actor.aimAngle;
          state.projectiles.push({
            id: state.nextEntityId++,
            ownerSide: actor.side,
            kind: 'earth_bolt',
            x: actor.x + Math.cos(ang) * 34,
            y: actor.y + Math.sin(ang) * 34,
            vx: Math.cos(ang) * 385,
            vy: Math.sin(ang) * 385,
            radius: 12,
            damage: actor.baseDamage, // 80 (+nâng cấp)
            bouncesLeft: 0,
            bounceDamageDelta: 0,
            hitTargets: new Set(),
            color: '#b45309',
          });
        }
      }
      break;
    }

    case 'wind_staff': {
      // Trượng Phong Linh luôn hướng về phía kẻ địch; mỗi 5s bắn Phong Đạn xoáy xanh phát sáng (70 ST + đẩy lùi 80 đơn vị)
      actor.weaponAngle = actor.aimAngle;
      if (actor.windCastChargeRemaining <= 0) {
        actor.windBoltTimer += dt;
        if (actor.windBoltTimer >= 5.0) {
          actor.windBoltTimer -= 5.0;
          sound.playWindBolt();
          const ang = actor.aimAngle;
          const bx = actor.x + Math.cos(ang) * 34;
          const by = actor.y + Math.sin(ang) * 34;
          spawnWindLeaves(state, bx, by, 4, 0.75);
          state.projectiles.push({
            id: state.nextEntityId++,
            ownerSide: actor.side,
            kind: 'wind_bolt',
            x: bx,
            y: by,
            vx: Math.cos(ang) * 385,
            vy: Math.sin(ang) * 385,
            radius: 10,
            damage: actor.baseDamage, // 70 (+nâng cấp)
            bouncesLeft: 0,
            bounceDamageDelta: 0,
            hitTargets: new Set(),
            color: '#22c55e',
          });
        }
      }
      break;
    }
  }
}

/**
 * Va chạm vật lý 2D giữa hai quả bóng:
 * - Bật lại đàn hồi theo đường thẳng với tốc độ không đổi (không bị hút dính vào nhau)
 * - Nếu Đấu Sĩ đang bật Chiêu 2 (Bất Khả Xâm Phạm), va chạm sẽ lóe sáng ánh bạc
 * - Chỉ tăng collisionCount đúng 1 lần cho mỗi sự kiện va chạm rồi tách ra
 */
function resolveBallToBallCollision(state: BattleSimulationState) {
  const b1 = state.bot;
  const b2 = state.player;
  const dx = b2.x - b1.x;
  const dy = b2.y - b1.y;
  const dist = Math.hypot(dx, dy);
  const minDist = BALL_RADIUS * 2;

  if (dist < minDist) {
    if (!state.ballsCurrentlyTouching) {
      state.ballsCurrentlyTouching = true;
      state.collisionCount += 1;
      sound.playBallCollision();
      const cx = (b1.x + b2.x) / 2;
      const cy = (b1.y + b2.y) / 2;
      spawnParticles(state, cx, cy, '#f8fafc', 7, 0.7);

      // Nếu Đấu Sĩ đang kích hoạt Chiêu 2 (Bất Khả Xâm Phạm), khi va chạm với quả bóng khác sẽ lóe ánh bạc
      if (b1.invulnerableRemaining > 0) {
        b1.silverFlashRemaining = 0.42;
        spawnParticles(state, b1.x, b1.y, '#ffffff', 16, 1.35);
        spawnParticles(state, cx, cy, '#e2e8f0', 10, 1.1);
      }
      if (b2.invulnerableRemaining > 0) {
        b2.silverFlashRemaining = 0.42;
        spawnParticles(state, b2.x, b2.y, '#ffffff', 16, 1.35);
        spawnParticles(state, cx, cy, '#e2e8f0', 10, 1.1);
      }

      triggerCollisionPassive(state, b1, 'ball');
      triggerCollisionPassive(state, b2, 'ball');
    }

    const nx = dist > 0.001 ? dx / dist : 1;
    const ny = dist > 0.001 ? dy / dist : 0;
    const overlap = minDist - dist + 1.5;

    b1.x -= nx * (overlap * 0.5);
    b1.y -= ny * (overlap * 0.5);
    b2.x += nx * (overlap * 0.5);
    b2.y += ny * (overlap * 0.5);

    // Phản xạ đàn hồi giữ nguyên tốc độ không đổi của mỗi quả bóng
    const spd1 = Math.max(150, Math.hypot(b1.vx, b1.vy));
    const spd2 = Math.max(150, Math.hypot(b2.vx, b2.vy));

    const kx = b1.vx - b2.vx;
    const ky = b1.vy - b2.vy;
    const p = nx * kx + ny * ky;
    if (p > 0) {
      b1.vx -= p * nx;
      b1.vy -= p * ny;
      b2.vx += p * nx;
      b2.vy += p * ny;
    } else {
      // Đảm bảo hai bóng luôn bật ngược ra xa nhau theo pháp tuyến
      b1.vx = -nx * spd1;
      b1.vy = -ny * spd1;
      b2.vx = nx * spd2;
      b2.vy = ny * spd2;
    }

    const newAng1 = Math.atan2(b1.vy, b1.vx);
    const newAng2 = Math.atan2(b2.vy, b2.vx);
    b1.vx = Math.cos(newAng1) * spd1;
    b1.vy = Math.sin(newAng1) * spd1;
    b2.vx = Math.cos(newAng2) * spd2;
    b2.vy = Math.sin(newAng2) * spd2;
  } else if (dist > minDist + 8) {
    state.ballsCurrentlyTouching = false;
  }
}

function detonateChargedFireball(
  state: BattleSimulationState,
  owner: CombatantState,
  target: CombatantState,
  x: number,
  y: number
) {
  sound.playFireExplosion();
  const explosionRadius = 56;
  state.explosions.push({
    id: state.nextEntityId++,
    x,
    y,
    radius: explosionRadius,
    life: 0.48,
    maxLife: 0.48,
  });
  spawnParticles(state, x, y, '#f97316', 18, 1.35);
  spawnParticles(state, x, y, '#fef08a', 10, 1.0);
  spawnEmbers(state, x, y, 14);
  if (Math.hypot(target.x - x, target.y - y) <= BALL_RADIUS + explosionRadius) {
    applyDamage(state, owner, target, 100, true);
  }
}

/**
 * Cập nhật đường bay của đạn, mũi tên nảy tường, khiên quay về, cầu lửa, phượng hoàng và phản đòn
 */
function updateProjectiles(state: BattleSimulationState, dt: number) {
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];

    // Nếu là viên băng thu nhỏ truy đuổi mục tiêu bị làm chậm -> bám đuổi nếu đối thủ không Tàng Hình
    if (p.homingTargetSide) {
      const homingTarget = p.homingTargetSide === 'BOT' ? state.bot : state.player;
      if (homingTarget.stealthRemaining > 0) {
        p.homingTargetSide = undefined;
      } else {
        const toDx = homingTarget.x - p.x;
        const toDy = homingTarget.y - p.y;
        const ang = Math.atan2(toDy, toDx);
        p.vx = Math.cos(ang) * 460;
        p.vy = Math.sin(ang) * 460;
      }
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    const owner = p.ownerSide === 'BOT' ? state.bot : state.player;
    const target = p.ownerSide === 'BOT' ? state.player : state.bot;

    // Hiệu ứng hạt phát sáng liên tục bay theo Kiếm Khí (Chiêu 1 Samurai như Hình 211451)
    if (p.kind === 'blade_wave' && Math.random() < 0.85) {
      spawnParticles(
        state,
        p.x + (Math.random() * 18 - 9),
        p.y + (Math.random() * 18 - 9),
        Math.random() < 0.5 ? '#ffffff' : '#38bdf8',
        1,
        0.42
      );
    }

    // Hạt băng lấp lánh bay theo Viên Băng / Kiếm Băng của Pháp Sư Băng
    if (
      (p.kind === 'ice_bolt' || p.kind === 'mini_ice_bolt' || p.kind === 'ice_sword') &&
      Math.random() < 0.45
    ) {
      spawnParticles(state, p.x, p.y, '#e0f2fe', 1, 0.35);
    }

    // Rơi tàn lửa nhẹ khi Quả Cầu Lửa đánh thường / Phượng Hoàng Lửa đang bay
    if ((p.kind === 'fire_bolt' || p.kind === 'phoenix') && Math.random() < 0.45) {
      spawnEmbers(state, p.x, p.y, 1);
    }

    // Rơi các hạt đất nhỏ khi Khối Đất đánh thường của Pháp Sư Thổ đang bay
    if (p.kind === 'earth_bolt' && Math.random() < 0.65) {
      spawnEarthShatter(state, p.x, p.y, 1, true);
    }

    // Bay theo luồng gió & lá xanh nhỏ khi Phong Đạn / Lốc Xoáy đang di chuyển
    if (p.kind === 'wind_bolt' && Math.random() < 0.55) {
      spawnWindLeaves(state, p.x, p.y, 1, 0.35);
    }
    if (p.kind === 'wind_tornado' && Math.random() < 0.75) {
      spawnWindLeaves(state, p.x, p.y, 1, 0.55);
      spawnParticles(state, p.x, p.y, '#86efac', 1, 0.35);
    }

    // Nếu là NÉM KHIÊN đang trên đường quay về chủ nhân
    if (p.kind === 'thrown_shield' && p.returning) {
      const toOwnerDx = owner.x - p.x;
      const toOwnerDy = owner.y - p.y;
      const distOwner = Math.hypot(toOwnerDx, toOwnerDy);
      if (distOwner < BALL_RADIUS + 16) {
        state.projectiles.splice(i, 1);
        continue;
      }
      const ang = Math.atan2(toOwnerDy, toOwnerDx);
      p.vx = Math.cos(ang) * 430;
      p.vy = Math.sin(ang) * 430;
    }

    // Kiểm tra chạm tường đấu trường hoặc Tường Đất (viên băng truy đuổi không bị hủy bởi tường)
    let hitWall = false;
    if (!p.homingTargetSide) {
      if (p.x - p.radius <= 0) {
        p.x = p.radius;
        p.vx = Math.abs(p.vx);
        hitWall = true;
      } else if (p.x + p.radius >= ARENA_SIZE) {
        p.x = ARENA_SIZE - p.radius;
        p.vx = -Math.abs(p.vx);
        hitWall = true;
      }
      if (p.y - p.radius <= 0) {
        p.y = p.radius;
        p.vy = Math.abs(p.vy);
        hitWall = true;
      } else if (p.y + p.radius >= ARENA_SIZE) {
        p.y = ARENA_SIZE - p.radius;
        p.vy = -Math.abs(p.vy);
        hitWall = true;
      }

      // Kiểm tra chạm Tường Đất trên sân (hoạt động như tường đấu trường)
      for (const wall of state.earthWalls) {
        const cosW = Math.cos(wall.angle);
        const sinW = Math.sin(wall.angle);
        const relX = p.x - wall.x;
        const relY = p.y - wall.y;
        const localPar = relX * cosW + relY * sinW;
        const clampedPar = Math.max(-wall.halfLength, Math.min(wall.halfLength, localPar));
        const closestX = wall.x + clampedPar * cosW;
        const closestY = wall.y + clampedPar * sinW;
        const diffX = p.x - closestX;
        const diffY = p.y - closestY;
        const distW = Math.hypot(diffX, diffY);
        const minW = p.radius + wall.halfThickness;
        if (distW < minW) {
          const nx = distW > 0.001 ? diffX / distW : -sinW;
          const ny = distW > 0.001 ? diffY / distW : cosW;
          p.x = closestX + nx * (minW + 1);
          p.y = closestY + ny * (minW + 1);
          const dot = p.vx * nx + p.vy * ny;
          if (dot < 0) {
            p.vx -= 2 * dot * nx;
            p.vy -= 2 * dot * ny;
          }
          wall.impactGlowTimer = Math.max(wall.impactGlowTimer, 0.35);
          hitWall = true;
          break;
        }
      }
    }

    if (hitWall) {
      if (p.kind === 'thrown_shield' && !p.returning) {
        p.returning = true;
        p.hitTargets.clear(); // Cho phép lượt về gây thêm 80 ST
        sound.playWallBounce();
      } else if (p.kind === 'phoenix') {
        if (!p.trailPoints) p.trailPoints = [];
        p.trailPoints.push({ x: p.x, y: p.y });
        spawnParticles(state, p.x, p.y, '#fbbf24', 14, 1.1);
        spawnEmbers(state, p.x, p.y, 8);
        if (p.bouncesLeft > 0) {
          p.bouncesLeft -= 1;
          sound.playWallBounce();
        } else {
          // Phượng hoàng hoàn thành 3 lần đập tường -> chưởng tia lửa đỏ rực theo đường đã vẽ tồn tại 3s
          sound.playPhoenixBeam();
          state.fireBeams.push({
            id: state.nextEntityId++,
            ownerSide: p.ownerSide,
            points: p.trailPoints,
            remainingDuration: 3.0,
            maxDuration: 3.0,
            tickInterval: 0.5,
            tickTimer: 0.05,
            damagePerTick: 20,
          });
          state.projectiles.splice(i, 1);
          continue;
        }
      } else if (p.kind === 'fire_bolt') {
        // Quả cầu lửa đánh thường chạm tường -> tan ra và rơi tàn lửa
        spawnParticles(state, p.x, p.y, '#fb923c', 10, 0.85);
        spawnEmbers(state, p.x, p.y, 10);
        state.projectiles.splice(i, 1);
        continue;
      } else if (p.kind === 'charged_fireball') {
        // Chiêu 1 Cầu Lửa chạm tường -> phát nổ nhỏ và gây 100 ST nếu đối thủ ở gần
        detonateChargedFireball(state, owner, target, p.x, p.y);
        state.projectiles.splice(i, 1);
        continue;
      } else if (
        p.kind === 'ice_bolt' ||
        p.kind === 'mini_ice_bolt' ||
        p.kind === 'ice_sword'
      ) {
        // Viên băng / Kiếm băng chạm tường -> tạo hiệu ứng vỡ băng
        sound.playIceShatter();
        spawnIceShatter(state, p.x, p.y, p.kind === 'mini_ice_bolt' ? 7 : 15);
        state.projectiles.splice(i, 1);
        continue;
      } else if (p.kind === 'earth_bolt') {
        // Khối đất đánh thường chạm vật thể -> vỡ thành mảnh nhỏ rồi biến mất
        sound.playEarthShatter();
        spawnEarthShatter(state, p.x, p.y, 16);
        state.projectiles.splice(i, 1);
        continue;
      } else if (p.kind === 'wind_bolt' || p.kind === 'wind_tornado') {
        // Phong Đạn / Lốc Xoáy không xuyên tường -> tan biến kèm sóng gió & lá bay
        spawnParticles(state, p.x, p.y, '#86efac', p.kind === 'wind_tornado' ? 16 : 10, 1.0);
        spawnWindLeaves(state, p.x, p.y, p.kind === 'wind_tornado' ? 10 : 5, 0.95);
        if (p.kind === 'wind_tornado') {
          spawnWindShockwave(state, p.x, p.y, 58, '#4ade80', 0.36);
        }
        state.projectiles.splice(i, 1);
        continue;
      } else if (p.bouncesLeft > 0) {
        p.bouncesLeft -= 1;
        p.damage = Math.max(10, p.damage + p.bounceDamageDelta);
        sound.playWallBounce();
      } else {
        state.projectiles.splice(i, 1);
        continue;
      }
    }

    // Chiêu 1 Pháp Sư Lửa: CẦU LỬA chạm bất kỳ vật thể nào trên sân (kiếm cắm, đạn địch, hoặc bóng địch) -> phát nổ nhỏ
    if (p.kind === 'charged_fireball') {
      const hitPlantedSword = state.plantedSwords.some(
        (ps) => Math.hypot(p.x - ps.x, p.y - ps.y) <= p.radius + ps.radius
      );
      const hitEnemyProj = state.projectiles.some(
        (other, oIdx) =>
          oIdx !== i &&
          other.ownerSide !== p.ownerSide &&
          Math.hypot(p.x - other.x, p.y - other.y) <= p.radius + other.radius
      );
      const hitTargetBall =
        Math.hypot(p.x - target.x, p.y - target.y) <= BALL_RADIUS + p.radius;

      if (hitPlantedSword || hitEnemyProj || hitTargetBall) {
        detonateChargedFireball(state, owner, target, p.x, p.y);
        state.projectiles.splice(i, 1);
        continue;
      }
    }

    // Khối đất đánh thường chạm vật thể khác (thanh kiếm cắm trên sân) -> vỡ mảnh nhỏ rồi biến mất
    if (p.kind === 'earth_bolt') {
      const hitPlantedSword = state.plantedSwords.some(
        (ps) => Math.hypot(p.x - ps.x, p.y - ps.y) <= p.radius + ps.radius
      );
      if (hitPlantedSword) {
        sound.playEarthShatter();
        spawnEarthShatter(state, p.x, p.y, 16);
        state.projectiles.splice(i, 1);
        continue;
      }
    }

    // Kiểm tra bị Khiên của Đấu Sĩ phản đòn (không phản Phượng Hoàng / Cầu Lửa / Viên băng truy đuổi)
    if (
      target.ball.weaponType === 'shield' &&
      !p.homingTargetSide &&
      p.kind !== 'thrown_shield' &&
      p.kind !== 'phoenix' &&
      p.kind !== 'charged_fireball'
    ) {
      const sx = target.x + Math.cos(target.weaponAngle) * (BALL_RADIUS + 18);
      const sy = target.y + Math.sin(target.weaponAngle) * (BALL_RADIUS + 18);
      if (
        Math.hypot(p.x - sx, p.y - sy) <= p.radius + 16 ||
        (target.fiveShieldsRemaining > 0 &&
          Math.hypot(p.x - target.x, p.y - target.y) <= BALL_RADIUS + 26)
      ) {
        p.ownerSide = target.side;
        p.vx = -p.vx * 1.1;
        p.vy = -p.vy * 1.1;
        p.onHitTeleportAndCrit = false;
        p.castId = undefined;
        p.hitTargets.clear();
        sound.playShieldClang();
        addFloatingText(state, target.x, target.y, 'PHẢN ĐẠN!', '#38bdf8', false, true);
        continue;
      }
    }

    // Kiểm tra trúng mục tiêu (Phượng Hoàng Lửa bay vẽ đường lửa xuyên suốt 3 lần nảy rồi mới chưởng tia lửa đỏ)
    if (
      p.kind !== 'phoenix' &&
      p.kind !== 'charged_fireball' &&
      !p.hitTargets.has(target.side) &&
      Math.hypot(p.x - target.x, p.y - target.y) <= BALL_RADIUS + p.radius
    ) {
      p.hitTargets.add(target.side);
      const isSkillProj =
        p.kind !== 'arrow' &&
        p.kind !== 'kunai' &&
        p.kind !== 'fire_bolt' &&
        p.kind !== 'ice_bolt' &&
        p.kind !== 'earth_bolt' &&
        p.kind !== 'wind_bolt';
      const dealt = applyDamage(state, owner, target, p.damage, isSkillProj);
      if (p.kind === 'dagger' && p.onHitTeleportAndCrit && dealt > 0) {
        owner.bonusCritChancePct += 10;
        addFloatingText(state, p.x, p.y - 26, '+10% CHÍ MẠNG!', '#c084fc', false, true);
        if (
          p.castId !== undefined &&
          owner.lastTwinDaggerTeleportCastId !== p.castId &&
          owner.hp > 0
        ) {
          owner.lastTwinDaggerTeleportCastId = p.castId;
          const oldX = owner.x;
          const oldY = owner.y;
          if (!state.finished) {
            owner.assassinRecallX = oldX;
            owner.assassinRecallY = oldY;
            owner.assassinRecallRemaining = 1.0;
          }
          owner.x = Math.max(BALL_RADIUS + 2, Math.min(ARENA_SIZE - BALL_RADIUS - 2, p.x));
          owner.y = Math.max(BALL_RADIUS + 2, Math.min(ARENA_SIZE - BALL_RADIUS - 2, p.y));
          spawnParticles(state, oldX, oldY, '#a855f7', 12, 1.0);
          spawnParticles(state, owner.x, owner.y, '#e9d5ff', 14, 1.2);
        }
      }
      if (p.kind === 'fire_bolt') {
        spawnParticles(state, p.x, p.y, '#fb923c', 12, 0.95);
        spawnEmbers(state, p.x, p.y, 12);
      } else if (p.kind === 'earth_bolt') {
        sound.playEarthShatter();
        spawnEarthShatter(state, p.x, p.y, 16);
      } else if (p.kind === 'wind_bolt') {
        sound.playWindBolt();
        spawnParticles(state, target.x, target.y, '#86efac', 14, 1.15);
        spawnWindLeaves(state, target.x, target.y, 8, 1.1);
        if (dealt > 0) {
          applyKnockback(state, owner, target, p.x - p.vx * 0.03, p.y - p.vy * 0.03, 80);
        }
      } else if (p.kind === 'wind_tornado') {
        sound.playWindTornado();
        spawnWindShockwave(state, target.x, target.y, 72, '#4ade80', 0.42);
        spawnParticles(state, target.x, target.y, '#86efac', 18, 1.35);
        spawnWindLeaves(state, target.x, target.y, 12, 1.3);
        if (dealt > 0) {
          applyKnockback(state, owner, target, p.x - p.vx * 0.03, p.y - p.vy * 0.03, 110);
        }
      } else if (
        p.kind === 'ice_bolt' ||
        p.kind === 'mini_ice_bolt' ||
        p.kind === 'ice_sword'
      ) {
        sound.playIceShatter();
        spawnIceShatter(state, p.x, p.y, p.kind === 'mini_ice_bolt' ? 7 : 13);
        if (p.kind === 'ice_sword' && target.hp > 0) {
          target.frozenRemaining = Math.max(target.frozenRemaining, 1.0);
          sound.playIceFreeze();
          addFloatingText(state, target.x, target.y - 18, 'ĐÓNG BĂNG!', '#e0f2fe', false, true);
        }
      }
      if (p.kind !== 'thrown_shield') {
        state.projectiles.splice(i, 1);
      }
    }
  }
}

/**
 * Cập nhật các vùng sát thương (VÙNG CHẾT, XOÁY KIẾM, MÀN SƯƠNG, MƯA LỬA), Tia Lửa Đỏ (Hỏa Thần) và Thanh Đại Kiếm cắm trên sân
 */
function updateHazardZones(state: BattleSimulationState, dt: number) {
  for (let i = state.zones.length - 1; i >= 0; i--) {
    const z = state.zones[i];
    const owner = z.ownerSide === 'BOT' ? state.bot : state.player;
    const target = z.ownerSide === 'BOT' ? state.player : state.bot;

    if (z.followOwner) {
      z.x = owner.x;
      z.y = owner.y;
    }

    if (z.kind === 'fire_rain' && Math.random() < 0.35) {
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.random() * z.radius * 0.85;
      spawnEmbers(state, z.x + Math.cos(ang) * rad, z.y + Math.sin(ang) * rad, 1);
    }

    if (z.kind === 'wind_burst' && Math.random() < 0.45) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 24 + Math.random() * (z.radius - 28);
      spawnWindLeaves(state, z.x + Math.cos(ang) * rad, z.y + Math.sin(ang) * rad, 1, 0.55);
    }

    z.remainingDuration -= dt;
    if (z.kind === 'ice_zone' && z.maxDuration && z.maxRadius) {
      // Vùng Lạnh mở rộng dần lúc xuất hiện và tan biến dần lúc kết thúc
      const elapsed = z.maxDuration - z.remainingDuration;
      if (elapsed < 0.55) {
        z.radius = z.maxRadius * Math.max(0.2, elapsed / 0.55);
      } else if (z.remainingDuration < 0.45) {
        z.radius = z.maxRadius * Math.max(0.25, z.remainingDuration / 0.45);
      } else {
        z.radius = z.maxRadius;
      }
    }

    z.tickTimer -= dt;

    if (z.kind === 'ice_zone') {
      z.ownerHealTickTimer = (z.ownerHealTickTimer ?? 0.2) - dt;
      if (z.ownerHealTickTimer <= 0) {
        z.ownerHealTickTimer += 0.2;
        if (
          owner.hp > 0 &&
          owner.hp < owner.maxHp &&
          Math.hypot(owner.x - z.x, owner.y - z.y) <= z.radius + BALL_RADIUS * 0.6
        ) {
          const heal = Math.min(20, owner.maxHp - owner.hp);
          owner.hp += heal;
          addFloatingText(state, owner.x, owner.y - 12, `+${heal} HP`, '#22c55e', false, false);
        }
      }
    }

    if (z.tickTimer <= 0) {
      z.tickTimer += z.tickInterval;
      if (z.kind === 'blade_vortex') {
        sound.playBladeVortexSpin();
      }
      const canTickWindBurst = z.kind !== 'wind_burst' || (z.tickCount ?? 0) < 4;
      if (z.kind === 'wind_burst' && canTickWindBurst) {
        z.tickCount = (z.tickCount ?? 0) + 1;
        sound.playWindBurst();
      }
      if (
        canTickWindBurst &&
        Math.hypot(target.x - z.x, target.y - z.y) <= z.radius + BALL_RADIUS * 0.6
      ) {
        const dealt = applyDamage(state, owner, target, z.damagePerTick, true);
        if (z.kind === 'wind_burst' && dealt > 0) {
          applyKnockback(state, owner, target, z.x, z.y, 48);
          spawnParticles(state, target.x, target.y, '#86efac', 8, 0.9);
        }
      }
      if (
        z.kind === 'fire_rain' &&
        owner.hp > 0 &&
        owner.hp < owner.maxHp &&
        Math.hypot(owner.x - z.x, owner.y - z.y) <= z.radius + BALL_RADIUS * 0.6
      ) {
        const heal = Math.min(20, owner.maxHp - owner.hp);
        owner.hp += heal;
        addFloatingText(state, owner.x, owner.y - 12, `+${heal} HP`, '#22c55e', false, false);
      }
    }

    if (z.remainingDuration <= 0) {
      if (z.kind === 'wind_burst') {
        spawnWindShockwave(state, z.x, z.y, z.radius * 1.15, '#86efac', 0.35);
        spawnWindLeaves(state, z.x, z.y, 10, 1.15);
      }
      state.zones.splice(i, 1);
    }
  }

  // Cập nhật Chiêu 2 Speed (MŨI TÊN TĂNG TỐC >> bán trong suốt tồn tại 3s)
  for (let i = state.speedArrows.length - 1; i >= 0; i--) {
    const sa = state.speedArrows[i];
    sa.remainingDuration -= dt;

    const owner = sa.ownerSide === 'BOT' ? state.bot : state.player;
    const target = sa.ownerSide === 'BOT' ? state.player : state.bot;

    const ownerDist = Math.hypot(owner.x - sa.x, owner.y - sa.y);
    if (!sa.ownerInside && ownerDist <= sa.radius + BALL_RADIUS * 0.45) {
      sa.ownerInside = true;
      owner.speedArrowPassStacks += 1;
      spawnParticles(state, owner.x, owner.y, '#7dd3fc', 10, 1.1);
      addFloatingText(
        state,
        owner.x,
        owner.y - 14,
        '+5% MIỄN THƯƠNG • +5% TỐC',
        '#7dd3fc',
        false,
        true
      );
    } else if (sa.ownerInside && ownerDist > sa.radius + BALL_RADIUS * 0.65) {
      sa.ownerInside = false;
    }

    const enemyDist = Math.hypot(target.x - sa.x, target.y - sa.y);
    if (
      target.stealthRemaining <= 0 &&
      !sa.enemyInside &&
      enemyDist <= sa.radius + BALL_RADIUS * 0.45
    ) {
      sa.enemyInside = true;
      sa.slowedEnemySide = target.side;
      spawnParticles(state, target.x, target.y, '#38bdf8', 10, 0.9);
      addFloatingText(state, target.x, target.y - 14, '-50% TỐC CHẠY!', '#38bdf8', false, true);
    } else if (sa.enemyInside && enemyDist > sa.radius + BALL_RADIUS * 0.65) {
      sa.enemyInside = false;
    }

    if (sa.remainingDuration <= 0) {
      state.speedArrows.splice(i, 1);
    }
  }

  // Cập nhật các cặp Khối Băng lao vào nhau (Chiêu 1 Pháp Sư Băng: KẸP BĂNG)
  for (let i = state.iceClasps.length - 1; i >= 0; i--) {
    const ic = state.iceClasps[i];
    const owner = ic.ownerSide === 'BOT' ? state.bot : state.player;
    const target = ic.ownerSide === 'BOT' ? state.player : state.bot;

    if (ic.waitTimer > 0) {
      ic.waitTimer = Math.max(0, ic.waitTimer - dt);
    } else if (!ic.collided) {
      ic.distFromCenter = Math.max(16, ic.distFromCenter - 430 * dt);
      const ax = ic.centerX + Math.cos(ic.angle) * ic.distFromCenter;
      const ay = ic.centerY + Math.sin(ic.angle) * ic.distFromCenter;
      const bx = ic.centerX - Math.cos(ic.angle) * ic.distFromCenter;
      const by = ic.centerY - Math.sin(ic.angle) * ic.distFromCenter;

      if (!ic.caughtTargetSide && target.stealthRemaining <= 0) {
        const hitA = Math.hypot(target.x - ax, target.y - ay) <= BALL_RADIUS + 34;
        const hitB = Math.hypot(target.x - bx, target.y - by) <= BALL_RADIUS + 34;
        if (hitA || hitB) {
          ic.caughtTargetSide = target.side;
        }
      }

      if (ic.caughtTargetSide) {
        // Kéo bóng dính khối băng về điểm va chạm giữa hai khối băng
        const stepX = ic.centerX - target.x;
        const stepY = ic.centerY - target.y;
        const stepDist = Math.hypot(stepX, stepY);
        const targetDistFromCenter = Math.max(0, ic.distFromCenter - 18);
        if (stepDist > targetDistFromCenter && stepDist > 1) {
          const pullStep = Math.min(stepDist, Math.max(520 * dt, stepDist - targetDistFromCenter));
          target.x += (stepX / stepDist) * pullStep;
          target.y += (stepY / stepDist) * pullStep;
        }
      }

      if (ic.distFromCenter <= 18) {
        ic.collided = true;
        if (ic.caughtTargetSide) {
          target.x = Math.max(BALL_RADIUS, Math.min(ARENA_SIZE - BALL_RADIUS, ic.centerX));
          target.y = Math.max(BALL_RADIUS, Math.min(ARENA_SIZE - BALL_RADIUS, ic.centerY));
        }
        sound.playIceShatter();
        spawnIceShatter(state, ic.centerX, ic.centerY, 24);
        spawnParticles(state, ic.centerX, ic.centerY, '#bae6fd', 16, 1.3);
        const targetDistCenter = Math.hypot(target.x - ic.centerX, target.y - ic.centerY);
        if (ic.caughtTargetSide || targetDistCenter <= BALL_RADIUS + 46) {
          applyDamage(state, owner, target, 80, true);
        }
        state.iceClasps.splice(i, 1);
      }
    }
  }

  // Cập nhật các Tia Lửa Đỏ từ Chiêu 3 Hỏa Thần (tồn tại 3s, khống chế đối thủ dính phải & gây 20 ST mỗi 0.5s)
  for (let i = state.fireBeams.length - 1; i >= 0; i--) {
    const fb = state.fireBeams[i];
    fb.remainingDuration -= dt;
    fb.tickTimer -= dt;

    const owner = fb.ownerSide === 'BOT' ? state.bot : state.player;
    const target = fb.ownerSide === 'BOT' ? state.player : state.bot;

    let isTouchingBeam = false;
    for (let s = 0; s < fb.points.length - 1; s++) {
      const a = fb.points[s];
      const b = fb.points[s + 1];
      if (pointToSegmentDistance(target.x, target.y, a.x, a.y, b.x, b.y) <= BALL_RADIUS + 18) {
        isTouchingBeam = true;
        break;
      }
    }

    if (isTouchingBeam && target.stealthRemaining <= 0) {
      target.stunnedRemaining = Math.max(target.stunnedRemaining, 0.3);
      if (fb.tickTimer <= 0) {
        applyDamage(state, owner, target, fb.damagePerTick, true);
      }
    }

    if (fb.tickTimer <= 0) {
      fb.tickTimer += fb.tickInterval;
    }

    if (fb.remainingDuration <= 0) {
      state.fireBeams.splice(i, 1);
    }
  }

  // Cập nhật các Thanh Đại Kiếm cắm trên mặt đất (tồn tại 3s, bóng địch chạm vào chịu 30 ST)
  for (let i = state.plantedSwords.length - 1; i >= 0; i--) {
    const ps = state.plantedSwords[i];
    ps.remainingDuration -= dt;
    ps.touchCooldown = Math.max(0, ps.touchCooldown - dt);

    const owner = ps.ownerSide === 'BOT' ? state.bot : state.player;
    const target = ps.ownerSide === 'BOT' ? state.player : state.bot;

    if (
      ps.touchCooldown <= 0 &&
      Math.hypot(target.x - ps.x, target.y - ps.y) <= BALL_RADIUS + ps.radius
    ) {
      ps.touchCooldown = 0.45;
      sound.playSwordSlash();
      spawnParticles(state, ps.x, ps.y, '#fde047', 10, 1.0);
      applyDamage(state, owner, target, 30, true);
    }

    if (ps.remainingDuration <= 0) {
      state.plantedSwords.splice(i, 1);
    }
  }

  // Cập nhật các Tường Đất trên sân (Chiêu 2 & Nội tại 1 Pháp Sư Thổ)
  for (let i = state.earthWalls.length - 1; i >= 0; i--) {
    const w = state.earthWalls[i];
    w.remainingDuration -= dt;
    w.impactGlowTimer = Math.max(0, w.impactGlowTimer - dt);
    if (w.hitCooldownBySide.BOT) {
      w.hitCooldownBySide.BOT = Math.max(0, w.hitCooldownBySide.BOT - dt);
    }
    if (w.hitCooldownBySide.PLAYER) {
      w.hitCooldownBySide.PLAYER = Math.max(0, w.hitCooldownBySide.PLAYER - dt);
    }

    // Nội tại 1 Pháp Sư Thổ: Bức tường đất phát sáng lao về phía đối thủ, kéo đối thủ về tường rìa map và phát nổ (80 ST + xóa sạch nội tại 5s)
    if (w.isChargingWall && w.chargeTargetSide) {
      const owner = w.ownerSide === 'BOT' ? state.bot : state.player;
      const target = w.chargeTargetSide === 'BOT' ? state.bot : state.player;
      const dirX = w.chargeDirX ?? 1;
      const dirY = w.chargeDirY ?? 0;
      const chargeSpeed = 620;
      w.chargeElapsed = (w.chargeElapsed ?? 0) + dt;
      w.x += dirX * chargeSpeed * dt;
      w.y += dirY * chargeSpeed * dt;

      if (!w.chargeDragging) {
        const projAlong = (target.x - w.x) * dirX + (target.y - w.y) * dirY;
        const perpDist = Math.abs(-(target.x - w.x) * dirY + (target.y - w.y) * dirX);
        if (projAlong <= BALL_RADIUS + w.halfThickness + 10 && perpDist <= w.halfLength + BALL_RADIUS) {
          w.chargeDragging = true;
        }
      }

      if (w.chargeDragging) {
        target.x = w.x + dirX * (BALL_RADIUS + w.halfThickness + 2);
        target.y = w.y + dirY * (BALL_RADIUS + w.halfThickness + 2);
        target.vx = 0;
        target.vy = 0;
      }

      const hitEdgeX =
        target.x <= BALL_RADIUS + 2 || target.x >= ARENA_SIZE - BALL_RADIUS - 2;
      const hitEdgeY =
        target.y <= BALL_RADIUS + 2 || target.y >= ARENA_SIZE - BALL_RADIUS - 2;
      const wallOut =
        w.x <= 18 || w.x >= ARENA_SIZE - 18 || w.y <= 18 || w.y >= ARENA_SIZE - 18;

      if ((w.chargeDragging && (hitEdgeX || hitEdgeY)) || wallOut || w.chargeElapsed >= 1.25) {
        target.x = Math.max(BALL_RADIUS + 2, Math.min(ARENA_SIZE - BALL_RADIUS - 2, target.x));
        target.y = Math.max(BALL_RADIUS + 2, Math.min(ARENA_SIZE - BALL_RADIUS - 2, target.y));

        const flashSide =
          target.x <= BALL_RADIUS + 4
            ? 'left'
            : target.x >= ARENA_SIZE - BALL_RADIUS - 4
            ? 'right'
            : target.y <= BALL_RADIUS + 4
            ? 'top'
            : 'bottom';
        state.wallFlashes.push({
          side: flashSide,
          pos: flashSide === 'left' || flashSide === 'right' ? target.y : target.x,
          intensity: 1,
          color: '#facc15',
          maxRadius: 88,
        });

        state.explosions.push({
          id: state.nextEntityId++,
          x: target.x,
          y: target.y,
          radius: 72,
          life: 0.55,
          maxLife: 0.55,
        });
        sound.playFireExplosion();
        sound.playEarthWallSlam();
        state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.78);
        spawnEarthShatter(state, target.x, target.y, 24);
        spawnParticles(state, target.x, target.y, '#fde047', 22, 1.5);

        clearAllPositiveBuffsAndPassives(target);
        target.passiveDisabledRemaining = 5.0;
        addFloatingText(
          state,
          target.x,
          target.y - 22,
          'NỔ TƯỜNG ĐẤT! MẤT NỘI TẠI 5s',
          '#facc15',
          false,
          true
        );
        applyDamage(state, owner, target, 80, true, false, false, true);

        const bounceSpd = 210;
        target.vx = -dirX * bounceSpd;
        target.vy = -dirY * bounceSpd;
        state.earthWalls.splice(i, 1);
        continue;
      }
    }

    if (w.remainingDuration <= 0) {
      spawnEarthShatter(state, w.x, w.y, 10);
      state.earthWalls.splice(i, 1);
    }
  }

  // Cập nhật các Hố Sụt Rung Chấn (Nội tại 2 Pháp Sư Thổ)
  for (let i = state.earthCraters.length - 1; i >= 0; i--) {
    state.earthCraters[i].remainingDuration -= dt;
    if (state.earthCraters[i].remainingDuration <= 0) {
      state.earthCraters.splice(i, 1);
    }
  }

  // Cập nhật Chiêu 3 Pháp Sư Thổ (GAI ĐẤT): Trồi gai liên tiếp tới khi chạm tường, chạm địch gây 80 ST + làm chậm 80% trong 1s
  for (let i = state.earthSpikes.length - 1; i >= 0; i--) {
    const sp = state.earthSpikes[i];
    const owner = sp.ownerSide === 'BOT' ? state.bot : state.player;
    const target = sp.ownerSide === 'BOT' ? state.player : state.bot;

    sp.remainingDuration -= dt;
    for (const pl of sp.pillars) {
      pl.age += dt;
    }

    if (!sp.stopped) {
      sp.curX += sp.dirX * sp.speed * dt;
      sp.curY += sp.dirY * sp.speed * dt;

      // Sinh thêm gai đá mới dọc theo đường phóng mỗi ~22px
      const lastPillar = sp.pillars[sp.pillars.length - 1];
      if (!lastPillar || Math.hypot(sp.curX - lastPillar.x, sp.curY - lastPillar.y) >= 22) {
        sp.pillars.push({
          x: sp.curX,
          y: sp.curY,
          size: 13 + (sp.pillars.length % 3) * 3,
          tilt: (sp.pillars.length % 2 === 0 ? 1 : -1) * 0.2,
          age: 0,
        });
        spawnEarthShatter(state, sp.curX, sp.curY, 2, true);
      }

      // Kiểm tra chạm tường đấu trường -> dừng lại
      if (
        sp.curX <= 12 ||
        sp.curX >= ARENA_SIZE - 12 ||
        sp.curY <= 12 ||
        sp.curY >= ARENA_SIZE - 12
      ) {
        sp.stopped = true;
        sp.curX = Math.max(12, Math.min(ARENA_SIZE - 12, sp.curX));
        sp.curY = Math.max(12, Math.min(ARENA_SIZE - 12, sp.curY));
        spawnEarthShatter(state, sp.curX, sp.curY, 10);
      } else {
        // Kiểm tra chạm Tường Đất trên sân -> dừng lại
        for (const wall of state.earthWalls) {
          const cosW = Math.cos(wall.angle);
          const sinW = Math.sin(wall.angle);
          const relX = sp.curX - wall.x;
          const relY = sp.curY - wall.y;
          const localPar = relX * cosW + relY * sinW;
          const localPerp = -relX * sinW + relY * cosW;
          if (Math.abs(localPar) <= wall.halfLength + 6 && Math.abs(localPerp) <= wall.halfThickness + 8) {
            sp.stopped = true;
            wall.impactGlowTimer = Math.max(wall.impactGlowTimer, 0.45);
            spawnEarthShatter(state, sp.curX, sp.curY, 10);
            break;
          }
        }
      }
    }

    // Kiểm tra đối thủ chạm vào chuỗi Gai Đất
    if (!sp.hitTargets.has(target.side) && target.stealthRemaining <= 0) {
      const hitSeg =
        pointToSegmentDistance(target.x, target.y, sp.startX, sp.startY, sp.curX, sp.curY) <=
        BALL_RADIUS + 18;
      if (hitSeg) {
        sp.hitTargets.add(target.side);
        target.earthSlow80Remaining = Math.max(target.earthSlow80Remaining, 1.0);
        sound.playEarthWallSlam();
        spawnEarthShatter(state, target.x, target.y, 14);
        addFloatingText(state, target.x, target.y - 16, 'GAI ĐẤT -80% TỐC!', '#f59e0b', false, true);
        applyDamage(state, owner, target, 80, true);
      }
    }

    if (sp.remainingDuration <= 0) {
      state.earthSpikes.splice(i, 1);
    }
  }

  // Cập nhật Chiêu 3 Pháp Sư Gió (THIÊN LONG QUYỂN): Hút nhẹ đối thủ về tâm + gây 25 ST mỗi 0.5s (tối đa 4 lần = 100 ST) -> kết thúc nổ hất văng 170 đơn vị
  for (let i = state.windVortexes.length - 1; i >= 0; i--) {
    const v = state.windVortexes[i];
    const owner = v.ownerSide === 'BOT' ? state.bot : state.player;
    const target = v.ownerSide === 'BOT' ? state.player : state.bot;

    v.remainingDuration -= dt;
    v.tickTimer -= dt;

    if (Math.random() < 0.55) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 18 + Math.random() * (v.radius * 0.72);
      spawnWindLeaves(state, v.x + Math.cos(ang) * rad, v.y + Math.sin(ang) * rad, 1, 0.5);
    }

    // Hút nhẹ đối thủ vào tâm cuồng phong mà không khóa cứng hay đẩy ra ngoài đấu trường
    if (
      target.hp > 0 &&
      target.stealthRemaining <= 0 &&
      target.knockbackRemaining <= 0 &&
      !state.earthWalls.some(
        (w) => w.isChargingWall && w.chargeDragging && w.chargeTargetSide === target.side
      )
    ) {
      const toCenterX = v.x - target.x;
      const toCenterY = v.y - target.y;
      const distCenter = Math.hypot(toCenterX, toCenterY);
      if (distCenter <= v.radius + BALL_RADIUS * 0.8 && distCenter > 14) {
        const pullSpeed = 72;
        target.x = Math.max(
          BALL_RADIUS,
          Math.min(ARENA_SIZE - BALL_RADIUS, target.x + (toCenterX / distCenter) * pullSpeed * dt)
        );
        target.y = Math.max(
          BALL_RADIUS,
          Math.min(ARENA_SIZE - BALL_RADIUS, target.y + (toCenterY / distCenter) * pullSpeed * dt)
        );
      }
    }

    if (v.tickTimer <= 0 && v.ticksFired < 4) {
      v.ticksFired += 1;
      v.tickTimer += v.tickInterval;
      if (Math.hypot(target.x - v.x, target.y - v.y) <= v.radius + BALL_RADIUS * 0.8) {
        applyDamage(state, owner, target, v.damagePerTick, true);
      }
    }

    if (v.remainingDuration <= 0) {
      sound.playWindMaelstrom();
      spawnWindShockwave(state, v.x, v.y, v.radius * 1.55, '#86efac', 0.52);
      spawnWindLeaves(state, v.x, v.y, 18, 1.55);
      spawnParticles(state, v.x, v.y, '#86efac', 20, 1.45);
      if (
        target.hp > 0 &&
        target.stealthRemaining <= 0 &&
        Math.hypot(target.x - v.x, target.y - v.y) <= v.radius + BALL_RADIUS + 45
      ) {
        applyKnockback(state, owner, target, v.x, v.y, 170);
      }
      state.windVortexes.splice(i, 1);
    }
  }
}

/**
 * Bước mô phỏng chính của trận đấu (gọi trong requestAnimationFrame với dt được kẹp <= 0.05s)
 */
export function stepBattleSimulation(state: BattleSimulationState, rawDt: number) {
  const dt = Math.min(rawDt, 0.05);
  if (state.finished) {
    // Cập nhật hiệu ứng hạt/chữ nổi và chuỗi hiệu ứng kết liễu sau khi phân định thắng thua
    state.shakeTrauma = Math.max(0, state.shakeTrauma - dt * 1.9);
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
      const ft = state.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.life -= dt;
      if (ft.life <= 0) state.floatingTexts.splice(i, 1);
    }
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const pt = state.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.94;
      pt.vy *= 0.94;
      pt.life -= dt;
      if (pt.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.windShockwaves.length - 1; i >= 0; i--) {
      state.windShockwaves[i].life -= dt;
      if (state.windShockwaves[i].life <= 0) state.windShockwaves.splice(i, 1);
    }
    for (let i = state.windLeaves.length - 1; i >= 0; i--) {
      const lf = state.windLeaves[i];
      lf.x += lf.vx * dt;
      lf.y += lf.vy * dt;
      lf.vx *= 0.95;
      lf.vy *= 0.95;
      lf.angle += lf.vAngle * dt;
      lf.life -= dt;
      if (lf.life <= 0) state.windLeaves.splice(i, 1);
    }
    updateFinisherAnimation(state, dt);
    return;
  }

  // Cập nhật các hiệu ứng hạt, chữ nổi, lóe tường và rung camera ngay cả khi hitstop
  state.shakeTrauma = Math.max(0, state.shakeTrauma - dt * 1.9);

  for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
    const ft = state.floatingTexts[i];
    ft.y += ft.vy * dt;
    ft.life -= dt;
    if (ft.life <= 0) state.floatingTexts.splice(i, 1);
  }

  for (let i = state.particles.length - 1; i >= 0; i--) {
    const pt = state.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.94;
    pt.vy *= 0.94;
    pt.life -= dt;
    if (pt.life <= 0) state.particles.splice(i, 1);
  }

  for (let i = state.wallFlashes.length - 1; i >= 0; i--) {
    state.wallFlashes[i].intensity -= dt * 2.1;
    if (state.wallFlashes[i].intensity <= 0) state.wallFlashes.splice(i, 1);
  }

  for (let i = state.afterimages.length - 1; i >= 0; i--) {
    state.afterimages[i].life -= dt;
    if (state.afterimages[i].life <= 0) state.afterimages.splice(i, 1);
  }

  for (let i = state.bloodSplatters.length - 1; i >= 0; i--) {
    state.bloodSplatters[i].life -= dt;
    if (state.bloodSplatters[i].life <= 0) state.bloodSplatters.splice(i, 1);
  }

  for (let i = state.dustClouds.length - 1; i >= 0; i--) {
    state.dustClouds[i].life -= dt;
    if (state.dustClouds[i].life <= 0) state.dustClouds.splice(i, 1);
  }

  for (let i = state.explosions.length - 1; i >= 0; i--) {
    state.explosions[i].life -= dt;
    if (state.explosions[i].life <= 0) state.explosions.splice(i, 1);
  }

  for (let i = state.embers.length - 1; i >= 0; i--) {
    const em = state.embers[i];
    em.x += em.vx * dt;
    em.y += em.vy * dt;
    em.vy += 120 * dt; // Tàn lửa rơi xuống tự nhiên
    em.vx *= 0.96;
    em.life -= dt;
    if (em.life <= 0) state.embers.splice(i, 1);
  }

  for (let i = state.iceShatters.length - 1; i >= 0; i--) {
    const sh = state.iceShatters[i];
    sh.x += sh.vx * dt;
    sh.y += sh.vy * dt;
    sh.vx *= 0.94;
    sh.vy *= 0.94;
    sh.angle += sh.vAngle * dt;
    sh.life -= dt;
    if (sh.life <= 0) state.iceShatters.splice(i, 1);
  }

  for (let i = state.earthShatters.length - 1; i >= 0; i--) {
    const es = state.earthShatters[i];
    es.x += es.vx * dt;
    es.y += es.vy * dt;
    es.vy += 110 * dt;
    es.vx *= 0.95;
    es.angle += es.vAngle * dt;
    es.life -= dt;
    if (es.life <= 0) state.earthShatters.splice(i, 1);
  }

  for (let i = state.windShockwaves.length - 1; i >= 0; i--) {
    state.windShockwaves[i].life -= dt;
    if (state.windShockwaves[i].life <= 0) state.windShockwaves.splice(i, 1);
  }

  for (let i = state.windLeaves.length - 1; i >= 0; i--) {
    const lf = state.windLeaves[i];
    lf.x += lf.vx * dt;
    lf.y += lf.vy * dt;
    lf.vx *= 0.95;
    lf.vy *= 0.95;
    lf.angle += lf.vAngle * dt;
    lf.life -= dt;
    if (lf.life <= 0) state.windLeaves.splice(i, 1);
  }

  if (state.hitstopTimer > 0) {
    state.hitstopTimer = Math.max(0, state.hitstopTimer - dt);
    return;
  }

  // Cập nhật đồng hồ ván đấu (5 phút)
  state.elapsedTime += dt;
  state.remainingTime = Math.max(0, 300 - state.elapsedTime);

  // Tung kỹ năng, di chuyển, vũ khí, va chạm
  tryCastSkills(state, state.bot, state.player);
  tryCastSkills(state, state.player, state.bot);

  updateCombatantAIAndMovement(state, state.bot, state.player, dt);
  updateCombatantAIAndMovement(state, state.player, state.bot, dt);

  resolveBallToBallCollision(state);

  updateCombatantWeaponsAndTimers(state, state.bot, state.player, dt);
  updateCombatantWeaponsAndTimers(state, state.player, state.bot, dt);

  updateProjectiles(state, dt);
  updateHazardZones(state, dt);

  // Hết 5 phút: phân định thắng thua theo quy tắc Phần XV.2
  if (state.remainingTime <= 0 && !state.finished) {
    state.finished = true;
    const pRatio = state.player.hp / state.player.maxHp;
    const bRatio = state.bot.hp / state.bot.maxHp;
    if (pRatio > bRatio) {
      state.winner = 'PLAYER';
    } else if (bRatio > pRatio) {
      state.winner = 'BOT';
    } else if (state.player.hp > state.bot.hp) {
      state.winner = 'PLAYER';
    } else if (state.bot.hp > state.player.hp) {
      state.winner = 'BOT';
    } else if (state.player.totalDamageDealt >= state.bot.totalDamageDealt) {
      state.winner = 'PLAYER';
    } else {
      state.winner = 'BOT';
    }
    if (state.winner === 'PLAYER') sound.playVictory();
    else sound.playDefeat();
    triggerFinisher(state);
  }
}

/**
 * Lấy thông tin Kỹ năng sắp được tung ra tiếp theo (hiển thị bên dưới đấu trường)
 */
export function getNextUpcomingSkill(actor: CombatantState): UpcomingSkillCue | null {
  if (actor.hp <= 0) return null;
  let minCd = Infinity;
  let bestSkill: SkillDefinition | null = null;
  for (let i = 0; i < actor.ball.skills.length; i++) {
    if (actor.skillCooldowns[i] < minCd) {
      minCd = actor.skillCooldowns[i];
      bestSkill = actor.ball.skills[i];
    }
  }
  if (!bestSkill) return null;
  return {
    skill: bestSkill,
    remainingSeconds: Math.max(0, minCd),
  };
}
