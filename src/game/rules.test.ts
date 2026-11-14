import test from 'node:test';
import assert from 'node:assert/strict';
import { BALL_CATALOG, BOT_NAMES, INITIAL_BALANCE, STARTER_BALL_IDS } from './constants';
import {
  calculateMatchWinBonus,
  calculatePlayerStars,
  calculateShopPrice,
  calculateUpgradeCost,
  evaluateBallScoreAndStars,
  getEffectiveBallStats,
  selectBotBallAndUpgrades,
  settleCollisionBet,
  settleDamageBet,
  settleFinalScoreBet,
  settleRemainingHpBet,
  settleWinnerBetPair,
} from './rules';
import { createBattleSimulation, stepBattleSimulation } from './battleEngine';

test('Initial balance and 6 starter balls match specification', () => {
  assert.equal(INITIAL_BALANCE, 1_000_000_000);
  assert.equal(STARTER_BALL_IDS.length, 6);
  assert.equal(BOT_NAMES.length, 108);

  const swordsman = BALL_CATALOG.find((b) => b.id === 'swordsman')!;
  assert.equal(swordsman.baseHp, 1300);
  assert.equal(swordsman.primaryColor, '#eab308');
  const plungeSkill = swordsman.skills.find((s) => s.id === 'swordsman_plunge')!;
  assert.ok(
    plungeSkill.description.includes('3 giây') &&
      plungeSkill.description.includes('30 sát thương')
  );

  const assassin = BALL_CATALOG.find((b) => b.id === 'assassin')!;
  assert.equal(assassin.baseHp, 900);

  const otherStarters = BALL_CATALOG.filter(
    (b) => b.isStarterPool && b.id !== 'swordsman' && b.id !== 'assassin'
  );
  assert.equal(otherStarters.length, 4);
  for (const ball of otherStarters) {
    assert.equal(ball.baseHp, 1000);
  }
});

test('Upgrade cost formula increases by 25% per level and rounds to integer', () => {
  const base = 10_000_000;
  assert.equal(calculateUpgradeCost(base, 0), 10_000_000);
  assert.equal(calculateUpgradeCost(base, 1), 12_500_000);
  assert.equal(calculateUpgradeCost(base, 2), 15_625_000);
});

test('Shop price formula matches 10,000,000 * 1.65^(stars - 1)', () => {
  assert.equal(calculateShopPrice(1), 10_000_000);
  assert.equal(calculateShopPrice(2), 16_500_000);
  assert.equal(calculateShopPrice(5), Math.round(10_000_000 * Math.pow(1.65, 4)));
});

test('Player stars calculation matches cumulative reward table', () => {
  assert.equal(calculatePlayerStars(0), 0);
  assert.equal(calculatePlayerStars(499_999_999), 0);
  assert.equal(calculatePlayerStars(500_000_000), 0.5);
  assert.equal(calculatePlayerStars(1_000_000_000), 1);
  assert.equal(calculatePlayerStars(2_000_000_000), 2);
  assert.equal(calculatePlayerStars(3_500_000_000), 3.5);
  assert.equal(calculatePlayerStars(5_000_000_000), 5);
  assert.equal(calculatePlayerStars(9_000_000_000), 5);
});

test('Ball star evaluation and effective stats scale with upgrades', () => {
  const archer = BALL_CATALOG.find((b) => b.id === 'archer')!;
  const baseStats = getEffectiveBallStats(archer, {
    defense: 0,
    basicDamage: 0,
    cooldown: 0,
  });
  const maxStats = getEffectiveBallStats(archer, {
    defense: 5,
    basicDamage: 5,
    cooldown: 5,
  });

  assert.equal(baseStats.damageReductionPct, 0);
  assert.equal(baseStats.hasEmergencyShieldPassive, false);
  assert.equal(maxStats.damageReductionPct, 10);
  assert.equal(maxStats.hasEmergencyShieldPassive, true);
  assert.equal(maxStats.effectiveBaseDamage, 84); // +5% of 80
  assert.equal(maxStats.cooldownReductionPct, 10);
  assert.ok(maxStats.stars > baseStats.stars);

  assert.equal(archer.baseDamage, 80);
  assert.ok(archer.passive.lines.join(' ').includes('3s/phát'));
  const rapidSkill = archer.skills.find((s) => s.id === 'archer_rapid')!;
  assert.ok(rapidSkill.description.includes('0,25 giây'));
});

test('Bot selects ball within +-0.5 stars of player ball', () => {
  const samurai = BALL_CATALOG.find((b) => b.id === 'samurai')!;
  const pUpgrades = { defense: 2, basicDamage: 2, cooldown: 1 };
  const pEval = evaluateBallScoreAndStars(samurai, pUpgrades);
  const botChoice = selectBotBallAndUpgrades(samurai, pUpgrades);
  assert.ok(Math.abs(botChoice.stars - pEval.stars) <= 0.5);
});

test('Bet 1 (Winner) settlement transfers loser pool to winner accurately', () => {
  const res = settleWinnerBetPair({
    playerBet: { amount: 100_000_000, prediction: 'PLAYER' },
    botBet: { amount: 50_000_000, prediction: 'BOT' },
    actualWinner: 'PLAYER',
  });
  assert.equal(res.playerPayout, 150_000_000);
  assert.equal(res.playerNetProfit, 50_000_000);
  assert.equal(res.botPayout, 0);
  assert.equal(res.botNetProfit, -50_000_000);
});

test('Bet 2 (Damage) settlement matches exact examples from prompt', () => {
  const bet = 100_000_000;
  // Opponent max HP = 1000.
  // Error 0% -> +100% reward (total 200M)
  assert.equal(settleDamageBet(bet, 800, 800, 1000).payout, 200_000_000);
  // Error 2% (diff 20 on 1000 HP) -> +70% reward (total 170M)
  assert.equal(settleDamageBet(bet, 820, 800, 1000).payout, 170_000_000);
  // Error 5% (diff 50 on 1000 HP) -> +25% reward (total 125M)
  assert.equal(settleDamageBet(bet, 850, 800, 1000).payout, 125_000_000);
  // Error 6% -> lose 25% (payout 75M)
  assert.equal(settleDamageBet(bet, 860, 800, 1000).payout, 75_000_000);
  // Error 7% -> lose 50% (payout 50M)
  assert.equal(settleDamageBet(bet, 870, 800, 1000).payout, 50_000_000);
  // Error 9%+ -> lose 100% (payout 0)
  assert.equal(settleDamageBet(bet, 890, 800, 1000).payout, 0);
});

test('Bet 3 (Collisions) and Bet 4 (Remaining HP) and Bet 5 (Final Score) formulas match specification', () => {
  const bet = 100_000_000;
  // Exact collisions -> +100% reward
  assert.equal(settleCollisionBet(bet, 10, 10).payout, 200_000_000);
  // 10% collision error (11 vs 10) -> +25% reward
  assert.equal(settleCollisionBet(bet, 11, 10).payout, 125_000_000);
  // 12% collision error (over by 2%) -> lose 25%
  assert.equal(settleCollisionBet(bet, 56, 50).payout, 75_000_000);

  // Remaining HP exact -> +100% reward
  assert.equal(settleRemainingHpBet(bet, 40, 40).payout, 200_000_000);
  // Remaining HP 5% off -> +25% reward
  assert.equal(settleRemainingHpBet(bet, 45, 40).payout, 125_000_000);

  // Final Score exact -> 500% total return
  assert.equal(
    settleFinalScoreBet(bet, 'PLAYER 3-1 BOT', 'PLAYER 3-1 BOT').payout,
    500_000_000
  );
  assert.equal(
    settleFinalScoreBet(bet, 'PLAYER 3-1 BOT', 'BOT 3-2 PLAYER').payout,
    0
  );
});

test('Match win margin bonus and Boxer ultimate 1s duration match balance update', () => {
  // Win by 1 point (3-2) -> 500,000 B
  assert.equal(calculateMatchWinBonus(3, 2), 500_000);
  // Win by 2 points (3-1) -> 1,000,000 B
  assert.equal(calculateMatchWinBonus(3, 1), 1_000_000);
  // Win by 3 points (3-0) -> 10,000,000 B
  assert.equal(calculateMatchWinBonus(3, 0), 10_000_000);
  // Loss -> 0 B
  assert.equal(calculateMatchWinBonus(2, 3), 0);
  assert.equal(calculateMatchWinBonus(0, 3), 0);

  const boxer = BALL_CATALOG.find((b) => b.id === 'boxer')!;
  const ult = boxer.skills.find((s) => s.iconType === 'blink_strike')!;
  assert.ok(ult.description.includes('1 giây'));
});

test('Updated Assassin, Samurai, Defender stats and new Speed ball match specification', () => {
  const assassin = BALL_CATALOG.find((b) => b.id === 'assassin')!;
  assert.equal(assassin.baseHp, 900);
  assert.equal(assassin.baseDamage, 60);
  const assassinateSkill = assassin.skills.find((s) => s.id === 'assassin_dash')!;
  assert.ok(assassinateSkill.cooldown < 20);
  const assassinPassiveText = assassin.passive.lines.join(' ');
  assert.ok(assassinPassiveText.includes('1 giây') && assassinPassiveText.includes('1%'));

  const samurai = BALL_CATALOG.find((b) => b.id === 'samurai')!;
  assert.equal(samurai.baseDamage, 80);
  assert.ok(samurai.passive.lines.some((l) => l.includes('10% tốc chạy')));

  const defender = BALL_CATALOG.find((b) => b.id === 'defender')!;
  assert.ok(defender.passive.lines.some((l) => l.includes('2% giảm sát thương') && l.includes('3 giây')));
  assert.ok(defender.passive.lines.some((l) => l.includes('15 giây') && l.includes('100 HP')));

  const speed = BALL_CATALOG.find((b) => b.id === 'speed')!;
  assert.ok(speed);
  assert.equal(speed.baseHp, 1000);
  assert.equal(speed.baseDamage, 75);
  assert.equal(speed.primaryColor, '#0ea5e9');
  assert.equal(speed.skills.length, 2);
  assert.deepEqual(
    speed.skills.map((s) => s.cooldown),
    [15, 30]
  );
  const speedPassiveText = speed.passive.lines.join(' ');
  assert.ok(
    speedPassiveText.includes('1,15') &&
      speedPassiveText.includes('0,3% giảm sát thương') &&
      speedPassiveText.includes('0,15% sát thương') &&
      speedPassiveText.includes('Tàn Ảnh')
  );
  const evalSpeed = evaluateBallScoreAndStars(speed);
  assert.equal(calculateShopPrice(evalSpeed.stars, speed.fixedShopPrice), 120_000_000);
});

test('Balls move in straight lines at constant speed without magnetic steering, and new skill VFX states trigger', () => {
  const defender = BALL_CATALOG.find((b) => b.id === 'defender')!;
  const assassin = BALL_CATALOG.find((b) => b.id === 'assassin')!;
  const speed = BALL_CATALOG.find((b) => b.id === 'speed')!;
  const zeroUpgrades = { defense: 0, basicDamage: 0, cooldown: 0 };

  // Test straight-line movement when far apart without wall/ball collision
  const sim = createBattleSimulation(defender, zeroUpgrades, assassin, zeroUpgrades);
  sim.player.x = 200;
  sim.player.y = 200;
  sim.player.vx = 240;
  sim.player.vy = 180;
  sim.bot.x = 450;
  sim.bot.y = 350;
  sim.bot.vx = -240;
  sim.bot.vy = 180;
  // Prevent skills from firing during pure movement check
  sim.player.skillCooldowns = [99, 99, 99];
  sim.bot.skillCooldowns = [99, 99, 99];

  const initialPlayerAngle = Math.atan2(sim.player.vy, sim.player.vx);
  const initialBotAngle = Math.atan2(sim.bot.vy, sim.bot.vx);

  stepBattleSimulation(sim, 1 / 60);
  stepBattleSimulation(sim, 1 / 60);
  stepBattleSimulation(sim, 1 / 60);

  const afterPlayerAngle = Math.atan2(sim.player.vy, sim.player.vx);
  const afterBotAngle = Math.atan2(sim.bot.vy, sim.bot.vx);
  assert.ok(Math.abs(afterPlayerAngle - initialPlayerAngle) < 1e-6, 'Player ball should move in a straight line');
  assert.ok(Math.abs(afterBotAngle - initialBotAngle) < 1e-6, 'Bot ball should move in a straight line');

  // Test Defender Skill 2 silver flash on expiration
  sim.player.invulnerableRemaining = 0.01;
  sim.player.silverFlashRemaining = 0;
  stepBattleSimulation(sim, 0.02);
  assert.equal(sim.player.invulnerableRemaining, 0);
  assert.ok(sim.player.silverFlashRemaining > 0, 'Defender should trigger silver flash when invulnerability ends');

  // Test Assassin Stealth dust cloud (skill index 1) and Assassinate purple flash (skill index 0)
  sim.bot.skillCooldowns = [99, 0, 99];
  stepBattleSimulation(sim, 1 / 60);
  assert.ok(sim.dustClouds.length > 0, 'Assassin stealth should spawn a dust cloud');

  sim.bot.skillCooldowns = [0, 99, 99];
  stepBattleSimulation(sim, 1 / 60);
  assert.ok(sim.bot.assassinPurpleFlashRemaining > 0, 'Assassin dash should trigger purple flash');

  // Test Speed self_boost glow
  const speedSim = createBattleSimulation(speed, zeroUpgrades, defender, zeroUpgrades);
  speedSim.player.skillCooldowns = [0];
  stepBattleSimulation(speedSim, 1 / 60);
  assert.ok(speedSim.player.speedBoostGlowRemaining > 0, 'Speed self_boost should activate glow');
});

test('Fire Mage (Pháp Sư Lửa) basic attack, stacking burn passive, and 3 skills match specification', () => {
  const fireMage = BALL_CATALOG.find((b) => b.id === 'fire_mage')!;
  const defender = BALL_CATALOG.find((b) => b.id === 'defender')!;
  const zeroUpgrades = { defense: 0, basicDamage: 0, cooldown: 0 };

  assert.ok(fireMage, 'fire_mage must exist in BALL_CATALOG');
  assert.equal(fireMage.baseHp, 1000);
  assert.equal(fireMage.baseDamage, 80);
  assert.equal(fireMage.weaponType, 'fire_staff');
  assert.equal(fireMage.skills.length, 3);
  assert.deepEqual(
    fireMage.skills.map((s) => s.cooldown),
    [18, 20, 40]
  );

  // 1) Basic attack every 5s fires fire_bolt (speed 365 < 370) & drops embers on wall hit
  const sim = createBattleSimulation(fireMage, zeroUpgrades, defender, zeroUpgrades);
  sim.player.x = 120;
  sim.player.y = 280;
  sim.bot.x = 420;
  sim.bot.y = 280;
  sim.player.skillCooldowns = [99, 99, 99];
  sim.bot.skillCooldowns = [99, 99, 99];
  sim.player.fireBoltTimer = 4.99;
  stepBattleSimulation(sim, 0.02);

  const bolt = sim.projectiles.find((p) => p.kind === 'fire_bolt');
  assert.ok(bolt, 'Fire Mage should shoot fire_bolt when timer elapses');
  assert.equal(bolt.damage, 80);
  const boltSpeed = Math.hypot(bolt.vx, bolt.vy);
  assert.ok(Math.abs(boltSpeed - 365) < 1e-3, 'Fire bolt speed should be 365 (5 slower than arrow 370)');

  // Force bolt into left wall to test dissipation + embers
  bolt.x = 4;
  bolt.vx = -365;
  bolt.vy = 0;
  stepBattleSimulation(sim, 0.03);
  assert.equal(sim.projectiles.some((p) => p.id === bolt.id), false, 'Fire bolt should dissipate on wall');
  assert.ok(sim.embers.length > 0, 'Fire bolt should drop embers when hitting wall');

  // 2) Skill 1 (Cầu Lửa): 1s standstill + 15 deg tilt + charged_fireball + stacking Burn
  const sim2 = createBattleSimulation(fireMage, zeroUpgrades, defender, zeroUpgrades);
  sim2.player.x = 120;
  sim2.player.y = 280;
  sim2.bot.x = 400;
  sim2.bot.y = 280;
  sim2.bot.skillCooldowns = [99, 99, 99];
  sim2.player.fireBoltTimer = 0;
  sim2.player.skillCooldowns = [0, 99, 99];
  stepBattleSimulation(sim2, 1 / 60);
  assert.ok(sim2.player.fireballChargeRemaining > 0.9, 'Skill 1 should freeze player for 1s charging');
  assert.ok(sim2.player.staffCastTiltTimer > 0, 'Casting skill should tilt Fire Staff 15 degrees');
  const startX = sim2.player.x;
  const startY = sim2.player.y;
  for (let i = 0; i < 65; i++) {
    stepBattleSimulation(sim2, 1 / 60);
    if (i === 10) {
      assert.equal(sim2.player.x, startX, 'Player must stand still while charging Cầu Lửa');
      assert.equal(sim2.player.y, startY, 'Player must stand still while charging Cầu Lửa');
    }
  }
  const chargedBall = sim2.projectiles.find((p) => p.kind === 'charged_fireball');
  assert.ok(chargedBall, 'charged_fireball should launch after 1s charge');
  assert.equal(chargedBall.damage, 100);

  // Move charged_fireball right onto bot to verify explosion + burn stack
  chargedBall.x = sim2.bot.x - 5;
  chargedBall.y = sim2.bot.y;
  stepBattleSimulation(sim2, 1 / 60);
  assert.ok(sim2.explosions.length > 0, 'charged_fireball should trigger small explosion on hit');
  assert.equal(sim2.bot.burnStacks.length, 1, 'Hit should apply 1 burn stack');
  assert.equal(sim2.bot.burnStacks[0].damagePerSecond, 20);

  // 3) Skill 2 (Mưa Lửa): 3s zone, 0.2s tick for 10 damage + stacks burn
  sim2.hitstopTimer = 0;
  sim2.player.skillCooldowns = [99, 0, 99];
  stepBattleSimulation(sim2, 1 / 60);
  const rainZone = sim2.zones.find((z) => z.kind === 'fire_rain');
  assert.ok(rainZone, 'Skill 2 should create fire_rain zone');
  assert.equal(rainZone.damagePerTick, 10);
  assert.equal(rainZone.tickInterval, 0.2);

  // Move bot inside rain zone and tick once to verify stacking burn
  sim2.hitstopTimer = 0;
  sim2.bot.x = rainZone.x;
  sim2.bot.y = rainZone.y;
  rainZone.tickTimer = 0.01;
  stepBattleSimulation(sim2, 0.02);
  assert.ok(sim2.bot.burnStacks.length >= 2, 'Multiple fire hits should stack burn debuffs independently');

  // 4) Skill 3 (Hỏa Thần): 0.5s standstill -> phoenix (3 bounces) -> 3s fireBeams CC + 20 dmg/0.5s
  const sim3 = createBattleSimulation(fireMage, zeroUpgrades, defender, zeroUpgrades);
  sim3.player.x = 280;
  sim3.player.y = 280;
  sim3.bot.x = 280;
  sim3.bot.y = 140;
  sim3.bot.skillCooldowns = [99, 99, 99];
  sim3.player.fireBoltTimer = 0;
  sim3.player.skillCooldowns = [99, 99, 0];
  stepBattleSimulation(sim3, 1 / 60);
  assert.ok(sim3.player.phoenixChargeRemaining > 0.4, 'Skill 3 should hold 0.5s before launching phoenix');
  for (let i = 0; i < 35; i++) {
    stepBattleSimulation(sim3, 1 / 60);
  }
  const phoenix = sim3.projectiles.find((p) => p.kind === 'phoenix');
  assert.ok(phoenix, 'Phoenix projectile should spawn after 0.5s windup');
  assert.equal(phoenix.bouncesLeft, 3, 'Phoenix should bounce off walls 3 times');

  // Step simulation until phoenix finishes all 3 bounces and becomes fireBeams
  for (let i = 0; i < 600 && sim3.fireBeams.length === 0; i++) {
    stepBattleSimulation(sim3, 1 / 60);
  }
  assert.ok(sim3.fireBeams.length > 0, 'Phoenix should unleash glowing red fireBeam along its path');
  const beam = sim3.fireBeams[0];
  assert.equal(beam.damagePerTick, 20);
  assert.equal(beam.tickInterval, 0.5);

  // Place bot directly onto first segment of beam and verify CC + damage tick
  const p0 = beam.points[0];
  const p1 = beam.points[1];
  sim3.bot.x = (p0.x + p1.x) / 2;
  sim3.bot.y = (p0.y + p1.y) / 2;
  sim3.bot.stunnedRemaining = 0;
  beam.tickTimer = 0.01;
  const hpBeforeBeam = sim3.bot.hp;
  stepBattleSimulation(sim3, 0.02);
  assert.ok(sim3.bot.stunnedRemaining > 0, 'Enemies touching the fire beam must be crowd-controlled (stunned)');
  assert.ok(sim3.bot.hp < hpBeforeBeam, 'Enemies touching the fire beam must take periodic beam damage');
});

test('Ice Mage (Pháp Sư Băng) basic attack, 2 passives, and 3 skills match specification', () => {
  const iceMage = BALL_CATALOG.find((b) => b.id === 'ice_mage')!;
  const defender = BALL_CATALOG.find((b) => b.id === 'defender')!;
  const zeroUpgrades = { defense: 0, basicDamage: 0, cooldown: 0 };

  assert.ok(iceMage, 'ice_mage must exist in BALL_CATALOG');
  assert.equal(iceMage.baseHp, 1000);
  assert.equal(iceMage.baseDamage, 70);
  assert.equal(iceMage.weaponType, 'ice_staff');
  assert.equal(iceMage.skills.length, 3);
  assert.deepEqual(
    iceMage.skills.map((s) => s.cooldown),
    [20, 25, 30]
  );

  // 1) Basic attack every 5s fires ice_bolt (70 dmg), creates 1 orbiting shard, and shatters on wall
  const sim = createBattleSimulation(iceMage, zeroUpgrades, defender, zeroUpgrades);
  sim.player.x = 120;
  sim.player.y = 280;
  sim.bot.x = 420;
  sim.bot.y = 280;
  sim.player.skillCooldowns = [99, 99, 99];
  sim.bot.skillCooldowns = [99, 99, 99];
  sim.player.iceBoltTimer = 4.99;
  stepBattleSimulation(sim, 0.02);

  const bolt = sim.projectiles.find((p) => p.kind === 'ice_bolt');
  assert.ok(bolt, 'Ice Mage should shoot ice_bolt every 5s');
  assert.equal(bolt.damage, 70);
  assert.equal(sim.player.orbitingIceCount, 1, 'Each basic attack adds 1 orbiting ice shard');

  // Force bolt into wall -> shatters
  bolt.x = 4;
  bolt.vx = -380;
  bolt.vy = 0;
  stepBattleSimulation(sim, 0.03);
  assert.equal(sim.projectiles.some((p) => p.id === bolt.id), false, 'ice_bolt shatters on wall');
  assert.ok(sim.iceShatters.length > 0, 'ice_bolt creates ice shatter fragments on wall hit');

  // 2) Passive 1 (Chill caps at 5s) + Passive 2 (5th basic attack launches 5 homing mini_ice_bolts when chilled)
  sim.hitstopTimer = 0;
  sim.player.orbitingIceCount = 4;
  sim.bot.chillRemaining = 2.5;
  sim.player.iceBoltTimer = 4.99;
  stepBattleSimulation(sim, 0.02);

  const miniBolts = sim.projectiles.filter((p) => p.kind === 'mini_ice_bolt');
  assert.equal(miniBolts.length, 5, '5th basic attack should launch all 5 mini ice shards');
  assert.equal(sim.player.orbitingIceCount, 0, 'orbitingIceCount resets to 0 on launch');
  assert.equal(miniBolts[0].damage, 10);
  assert.equal(miniBolts[0].radius, 5, 'mini_ice_bolt is 50% size of basic attack (radius 5 vs 10)');
  assert.equal(miniBolts[0].homingTargetSide, 'BOT', 'mini_ice_bolts home onto slowed enemy');

  // Step until homing mini bolts hit bot and confirm Chill stacks up to max 5s
  for (let i = 0; i < 60 && sim.projectiles.some((p) => p.kind === 'mini_ice_bolt'); i++) {
    sim.hitstopTimer = 0;
    stepBattleSimulation(sim, 1 / 60);
  }
  assert.ok(sim.bot.chillRemaining > 3.0 && sim.bot.chillRemaining <= 5.0, 'Chill stacks up to max 5s');

  // 3) Skill 1 (Kẹp Băng): 2 opposing ice blocks wait 1s then rush together, dragging enemy & dealing 80 dmg
  const simClasp = createBattleSimulation(iceMage, zeroUpgrades, defender, zeroUpgrades);
  simClasp.player.x = 120;
  simClasp.player.y = 280;
  simClasp.bot.x = 400;
  simClasp.bot.y = 280;
  simClasp.bot.skillCooldowns = [99, 99, 99];
  simClasp.player.skillCooldowns = [0, 99, 99];
  stepBattleSimulation(simClasp, 1 / 60);
  assert.equal(simClasp.iceClasps.length, 1, 'Skill 1 should summon 1 IceClasp pair');
  assert.ok(simClasp.player.staffCastTiltTimer > 0, 'Skill 1 should tilt staff 15 degrees');

  const clasp = simClasp.iceClasps[0];
  // Position bot right in front of one charging ice block right after 1s wait expires
  clasp.waitTimer = 0.01;
  simClasp.bot.x = clasp.centerX + Math.cos(clasp.angle) * (clasp.distFromCenter - 10);
  simClasp.bot.y = clasp.centerY + Math.sin(clasp.angle) * (clasp.distFromCenter - 10);
  const hpBeforeClasp = simClasp.bot.hp;
  for (let i = 0; i < 40 && simClasp.iceClasps.length > 0; i++) {
    simClasp.hitstopTimer = 0;
    stepBattleSimulation(simClasp, 1 / 60);
  }
  assert.equal(simClasp.iceClasps.length, 0, 'IceClasp pair finishes after smashing together');
  assert.ok(simClasp.bot.hp < hpBeforeClasp, 'Caught enemy should take 80 Ice Clasp damage');
  assert.ok(
    Math.hypot(simClasp.bot.x - clasp.centerX, simClasp.bot.y - clasp.centerY) < 40,
    'Caught enemy is dragged to the collision point'
  );

  // 4) Skill 2 (Kiếm Băng): holds 0.5s, shoots 8 ice_swords (80 dmg + 1s Freeze), then restores movement
  const boxer = BALL_CATALOG.find((b) => b.id === 'boxer')!;
  const simSwords = createBattleSimulation(iceMage, zeroUpgrades, boxer, zeroUpgrades);
  simSwords.player.x = 140;
  simSwords.player.y = 280;
  simSwords.bot.x = 320;
  simSwords.bot.y = 280;
  simSwords.bot.vx = 0;
  simSwords.bot.vy = 0;
  simSwords.bot.skillCooldowns = [99, 99, 99];
  simSwords.player.skillCooldowns = [99, 0, 99];
  stepBattleSimulation(simSwords, 1 / 60);
  assert.ok(simSwords.player.iceSwordSummonRemaining > 0.4, 'Skill 2 pauses 0.5s while summoning 8 swords');
  assert.equal(simSwords.player.iceSwordQueueCount, 8);

  let spawnedSwords = 0;
  let maxFrozenSeen = 0;
  const seenSwordIds = new Set<number>();
  for (let i = 0; i < 95; i++) {
    simSwords.hitstopTimer = 0;
    stepBattleSimulation(simSwords, 1 / 60);
    maxFrozenSeen = Math.max(maxFrozenSeen, simSwords.bot.frozenRemaining);
    for (const p of simSwords.projectiles) {
      if (p.kind === 'ice_sword' && !seenSwordIds.has(p.id)) {
        seenSwordIds.add(p.id);
        spawnedSwords += 1;
      }
    }
  }
  assert.equal(spawnedSwords, 8, 'Skill 2 should fire all 8 ice_sword projectiles');
  assert.ok(
    Math.hypot(simSwords.player.vx, simSwords.player.vy) > 100,
    'Ice Mage movement must be restored after firing all 8 swords'
  );
  assert.ok(maxFrozenSeen >= 0.9, 'Enemy hit by ice_sword should be frozen for 1s');

  // 5) Skill 3 (Vùng Lạnh): spawns directly under chilled enemy, deals 30 dmg every 1s
  const simZone = createBattleSimulation(iceMage, zeroUpgrades, defender, zeroUpgrades);
  simZone.player.x = 120;
  simZone.player.y = 120;
  simZone.bot.x = 410;
  simZone.bot.y = 410;
  simZone.bot.chillRemaining = 2.0;
  simZone.bot.skillCooldowns = [99, 99, 99];
  simZone.player.skillCooldowns = [99, 99, 0];
  stepBattleSimulation(simZone, 1 / 60);

  const iceZone = simZone.zones.find((z) => z.kind === 'ice_zone');
  assert.ok(iceZone, 'Skill 3 should create ice_zone');
  assert.equal(iceZone.x, 410, 'When enemy is chilled, Vùng Lạnh spawns directly under enemy');
  assert.equal(iceZone.y, 410);
  assert.equal(iceZone.damagePerTick, 30);
  assert.equal(iceZone.tickInterval, 1.0);
});

test('Archer speed/damage buffs and Boxer baseDamage 60 match update', () => {
  const archer = BALL_CATALOG.find((b) => b.id === 'archer')!;
  const boxer = BALL_CATALOG.find((b) => b.id === 'boxer')!;
  const defender = BALL_CATALOG.find((b) => b.id === 'defender')!;
  const zeroUpgrades = { defense: 0, basicDamage: 0, cooldown: 0 };

  assert.equal(archer.baseDamage, 80);
  assert.equal(boxer.baseDamage, 60);

  const sim = createBattleSimulation(archer, zeroUpgrades, defender, zeroUpgrades);
  sim.player.x = 120;
  sim.player.y = 280;
  sim.bot.x = 420;
  sim.bot.y = 280;
  sim.player.skillCooldowns = [99, 99, 99];
  sim.bot.skillCooldowns = [99, 99, 99];
  sim.player.bowDrawTimer = 2.99;
  stepBattleSimulation(sim, 0.02);

  const arrow = sim.projectiles.find((p) => p.kind === 'arrow');
  assert.ok(arrow, 'Archer should shoot arrow every 3s');
  assert.equal(arrow.damage, 80);
  const arrowSpeed = Math.hypot(arrow.vx, arrow.vy);
  assert.ok(arrowSpeed > 450, `Arrow speed (${arrowSpeed}) should be increased`);
});

test('Earth Mage (Pháp Sư Thổ) basic attack, 2 passives, and 3 skills match specification', () => {
  const earthMage = BALL_CATALOG.find((b) => b.id === 'earth_mage')!;
  const fireMage = BALL_CATALOG.find((b) => b.id === 'fire_mage')!;
  const greatsword = BALL_CATALOG.find((b) => b.id === 'swordsman')!;
  const zeroUpgrades = { defense: 0, basicDamage: 0, cooldown: 0 };

  assert.ok(earthMage, 'earth_mage must exist in BALL_CATALOG');
  assert.equal(earthMage.baseHp, 1000);
  assert.equal(earthMage.baseDamage, 80);
  assert.equal(earthMage.weaponType, 'earth_staff');
  assert.equal(earthMage.skills.length, 3);
  assert.deepEqual(
    earthMage.skills.map((s) => s.cooldown),
    [20, 30, 40]
  );

  // 1) Basic attack every 5s fires earth_bolt (80 dmg) and shatters on wall/obstacle
  const sim = createBattleSimulation(earthMage, zeroUpgrades, fireMage, zeroUpgrades);
  sim.player.x = 120;
  sim.player.y = 280;
  sim.bot.x = 420;
  sim.bot.y = 280;
  sim.player.skillCooldowns = [99, 99, 99];
  sim.bot.skillCooldowns = [99, 99, 99];
  sim.player.earthBoltTimer = 4.99;
  stepBattleSimulation(sim, 0.02);

  const bolt = sim.projectiles.find((p) => p.kind === 'earth_bolt');
  assert.ok(bolt, 'Earth Mage should fire earth_bolt every 5s');
  assert.equal(bolt.damage, 80);

  bolt.x = 4;
  bolt.vx = -360;
  bolt.vy = 0;
  stepBattleSimulation(sim, 0.03);
  assert.equal(sim.projectiles.some((p) => p.id === bolt.id), false, 'earth_bolt shatters on wall');
  assert.ok(sim.earthShatters.length > 0, 'earth_bolt creates shattering dirt chunks on wall hit');

  // 2) Passive 1: 3 damage hits within 1s spawns glowing charging Earth Wall in front of attacker,
  //    charges to arena boundary & explodes for 80 dmg, clears positive buffs/passives, and disables passives for 5s
  const simP1 = createBattleSimulation(earthMage, zeroUpgrades, greatsword, zeroUpgrades);
  simP1.player.x = 200;
  simP1.player.y = 280;
  simP1.bot.x = 340;
  simP1.bot.y = 280;
  simP1.player.skillCooldowns = [99, 99, 99];
  simP1.bot.skillCooldowns = [99, 99, 99];
  // Give attacker positive buffs/passives to verify purge
  simP1.bot.greatswordBuffRemaining = 4.0;
  simP1.bot.rageSkillRemaining = 3.0;
  simP1.bot.samuraiCollisionStacks = 4;
  simP1.bot.orbitingIceCount = 3;

  // Fire 3 hits from bot onto player within 1s
  for (let h = 0; h < 3; h++) {
    const k = {
      id: 900 + h,
      ownerSide: 'BOT' as const,
      kind: 'kunai' as const,
      x: simP1.player.x + 12,
      y: simP1.player.y,
      vx: -300,
      vy: 0,
      radius: 8,
      damage: 10,
      bouncesLeft: 0,
      bounceDamageDelta: 0,
      hitTargets: new Set<'PLAYER' | 'BOT'>(),
      color: '#fff',
    };
    simP1.projectiles.push(k);
    simP1.hitstopTimer = 0;
    stepBattleSimulation(simP1, 0.03);
  }
  assert.ok(simP1.earthWalls.some((w) => w.isChargingWall), 'Passive 1 should spawn a charging Earth Wall after 3 hits within 1s');

  // Step until the charging Earth Wall drags attacker to arena boundary and explodes
  for (let i = 0; i < 65 && simP1.explosions.length === 0; i++) {
    simP1.hitstopTimer = 0;
    stepBattleSimulation(simP1, 1 / 60);
  }
  assert.ok(simP1.explosions.length >= 1, 'Charging Earth Wall must explode when slamming attacker into arena wall');
  assert.ok(simP1.bot.hp <= 1300 - 80, 'Passive 1 wall explosion should deal 80 damage to attacker');
  assert.equal(simP1.bot.greatswordBuffRemaining, 0, 'Passive 1 must clear attacker positive buffs');
  assert.equal(simP1.bot.rageSkillRemaining, 0, 'Passive 1 must clear attacker rage buff');
  assert.equal(simP1.bot.samuraiCollisionStacks, 0, 'Passive 1 must clear attacker stacking passives');
  assert.equal(simP1.bot.orbitingIceCount, 0, 'Passive 1 must clear attacker orbiting passive stacks');
  assert.ok(simP1.bot.passiveDisabledRemaining > 4.5, 'Passive 1 must disable attacker passives for 5s');

  // 3) Passive 2: every 5 hits taken triggers stomp crater & 50% slow for 1s
  for (let h = 0; h < 2; h++) {
    const k = {
      id: 950 + h,
      ownerSide: 'BOT' as const,
      kind: 'kunai' as const,
      x: simP1.player.x + 10,
      y: simP1.player.y,
      vx: -300,
      vy: 0,
      radius: 8,
      damage: 10,
      bouncesLeft: 0,
      bounceDamageDelta: 0,
      hitTargets: new Set<'PLAYER' | 'BOT'>(),
      color: '#fff',
    };
    simP1.projectiles.push(k);
    simP1.hitstopTimer = 0;
    stepBattleSimulation(simP1, 0.25); // spaced out so Passive 1 doesn't re-trigger
  }
  assert.ok(simP1.earthCraters.length >= 1, 'Passive 2 should create a seismic crater on 5th hit taken');
  assert.ok(simP1.bot.earthSlow50Remaining > 0.5, 'Passive 2 should slow opponent by 50% for 1s');

  // 4) Skill 1 (Trùy Đất): 5s mace at 1.5x greatsword reach dealing 60 damage
  const simS1 = createBattleSimulation(earthMage, zeroUpgrades, fireMage, zeroUpgrades);
  simS1.player.x = 200;
  simS1.player.y = 280;
  // Place bot at 1.5x greatsword reach (~110px away: beyond normal greatsword 90px, inside 1.5x reach 119px!)
  simS1.bot.x = 308;
  simS1.bot.y = 280;
  simS1.bot.vx = 0;
  simS1.bot.vy = 0;
  simS1.bot.skillCooldowns = [99, 99, 99];
  simS1.player.skillCooldowns = [0, 99, 99];
  simS1.player.weaponAngle = 0;
  const hpBeforeMace = simS1.bot.hp;
  stepBattleSimulation(simS1, 1 / 60);
  assert.ok(simS1.player.earthMaceRemaining > 4.9, 'Skill 1 should equip Trùy Đất for 5s');
  assert.ok(simS1.player.staffCastTiltTimer > 0, 'Casting skill tilts staff 15 degrees');
  // Sweep mace over opponent
  for (let i = 0; i < 45 && simS1.bot.hp === hpBeforeMace; i++) {
    simS1.hitstopTimer = 0;
    simS1.bot.x = 308;
    simS1.bot.y = 280;
    stepBattleSimulation(simS1, 1 / 60);
  }
  assert.equal(simS1.bot.hp, hpBeforeMace - 60, 'Trùy Đất hit should deal 60 damage at 1.5x greatsword reach');

  // 5) Skill 2 (Tường Đất): spawns random 3s Earth Wall that bounces enemy & deals 20 damage
  const simS2 = createBattleSimulation(earthMage, zeroUpgrades, fireMage, zeroUpgrades);
  simS2.bot.skillCooldowns = [99, 99, 99];
  simS2.player.skillCooldowns = [99, 0, 99];
  stepBattleSimulation(simS2, 1 / 60);
  assert.equal(simS2.earthWalls.length, 1, 'Skill 2 should summon 1 Earth Wall');
  const wall = simS2.earthWalls[0];
  assert.equal(wall.bounceDamage, 20);
  // Make wall horizontal and bounce bot straight onto it
  wall.x = 280;
  wall.y = 280;
  wall.angle = 0;
  wall.hitCooldownBySide = {};
  simS2.bot.x = 280;
  simS2.bot.y = 250;
  simS2.bot.vx = 0;
  simS2.bot.vy = 240;
  const hpBeforeBounce = simS2.bot.hp;
  for (let i = 0; i < 10 && simS2.bot.hp === hpBeforeBounce; i++) {
    simS2.hitstopTimer = 0;
    stepBattleSimulation(simS2, 1 / 60);
  }
  assert.equal(simS2.bot.hp, hpBeforeBounce - 20, 'Bouncing into Earth Wall should deal 20 damage');
  assert.ok(simS2.bot.vy < 0, 'Enemy ball should bounce off Earth Wall like an arena boundary');

  // 6) Skill 3 (Gai Đất): erupts toward opponent, deals 80 dmg + 80% slow 1s, stops on hitting Earth Wall
  const simS3 = createBattleSimulation(earthMage, zeroUpgrades, fireMage, zeroUpgrades);
  simS3.player.x = 140;
  simS3.player.y = 280;
  simS3.bot.x = 300;
  simS3.bot.y = 280;
  simS3.bot.vx = 0;
  simS3.bot.vy = 0;
  simS3.bot.skillCooldowns = [99, 99, 99];
  simS3.player.skillCooldowns = [99, 99, 0];
  stepBattleSimulation(simS3, 1 / 60);
  assert.equal(simS3.earthSpikes.length, 1, 'Skill 3 should summon Earth Spikes wave');

  // Place an Earth Wall ahead of bot at x = 360 to test stopping behavior after hitting bot
  simS3.earthWalls.push({
    id: 999,
    ownerSide: 'PLAYER',
    x: 360,
    y: 280,
    angle: Math.PI / 2,
    halfLength: 60,
    halfThickness: 12,
    remainingDuration: 3,
    maxDuration: 3,
    isPassiveWall: false,
    impactGlowTimer: 0,
    bounceDamage: 20,
    hitCooldownBySide: {},
  });
  const hpBeforeSpikes = simS3.bot.hp;
  let maxEarthSlowSeen = 0;
  for (let i = 0; i < 60; i++) {
    simS3.hitstopTimer = 0;
    stepBattleSimulation(simS3, 1 / 60);
    maxEarthSlowSeen = Math.max(maxEarthSlowSeen, simS3.bot.earthSlow80Remaining);
  }
  assert.equal(simS3.bot.hp, hpBeforeSpikes - 80, 'Earth Spikes should deal 80 damage on hit');
  assert.ok(maxEarthSlowSeen >= 0.9, 'Earth Spikes should slow opponent by 80% for 1s');
  assert.equal(simS3.earthSpikes[0].stopped, true, 'Earth Spikes wave must stop upon hitting an Earth Wall');
});

test('Samurai baseDamage 80, Defender 100 HP / 15s regen, and Victory Finisher animation work as specified', () => {
  const samurai = BALL_CATALOG.find((b) => b.id === 'samurai')!;
  const defender = BALL_CATALOG.find((b) => b.id === 'defender')!;
  const archer = BALL_CATALOG.find((b) => b.id === 'archer')!;
  const zeroUpgrades = { defense: 0, basicDamage: 0, cooldown: 0 };

  assert.equal(samurai.baseDamage, 80);

  // 1) Verify Defender heals 100 HP every 15s
  const simDef = createBattleSimulation(defender, zeroUpgrades, archer, zeroUpgrades);
  simDef.player.skillCooldowns = [99, 99, 99];
  simDef.bot.skillCooldowns = [99, 99, 99];
  simDef.player.hp = 600;
  simDef.player.regenPassiveTimer = 14.98;
  stepBattleSimulation(simDef, 0.03);
  assert.equal(simDef.player.hp, 700, 'Defender should heal 100 HP at 15s mark');

  // 2) Verify Finisher sequence when a ball wins
  const simFin = createBattleSimulation(samurai, zeroUpgrades, archer, zeroUpgrades);
  simFin.player.x = 280;
  simFin.player.y = 280;
  simFin.bot.x = 340;
  simFin.bot.y = 280;
  simFin.player.skillCooldowns = [99, 99, 99];
  simFin.bot.skillCooldowns = [99, 99, 99];
  simFin.bot.hp = 30;
  simFin.player.weaponAngle = 0;
  simFin.player.weaponHitCooldown = 0;

  // Step until katana strike finishes off bot
  for (let i = 0; i < 30 && !simFin.finished; i++) {
    stepBattleSimulation(simFin, 1 / 60);
  }
  assert.equal(simFin.finished, true);
  assert.equal(simFin.winner, 'PLAYER');
  assert.equal(simFin.player.vx, 0, 'Winning ball must stand still');
  assert.equal(simFin.player.vy, 0, 'Winning ball must stand still');
  assert.ok(simFin.finisher, 'Finisher state must be created upon win');
  assert.equal(simFin.finisher.orbs.length, 8, 'Loser must disintegrate into 8 glowing gold orbs');
  assert.equal(simFin.finisher.coinColor, '#ef4444', 'Coin color must match winning side (PLAYER = red)');
  assert.ok(simFin.finisher.targetX > 560, 'Player coin must fly toward right (player) owner side');

  // Step to 0.4s -> orbs should be scattered outward from loserX/loserY
  for (let i = 0; i < 24; i++) {
    stepBattleSimulation(simFin, 1 / 60);
  }
  const scatteredDist = Math.hypot(
    simFin.finisher.orbs[0].x - simFin.finisher.loserX,
    simFin.finisher.orbs[0].y - simFin.finisher.loserY
  );
  assert.ok(scatteredDist > 25, 'Orbs should scatter outward during first 0.5s');

  // Step past 0.5s to ~1.3s -> orbs converge back to loser center
  for (let i = 0; i < 55; i++) {
    stepBattleSimulation(simFin, 1 / 60);
  }
  const convergedDist = Math.hypot(
    simFin.finisher.orbs[0].x - simFin.finisher.loserX,
    simFin.finisher.orbs[0].y - simFin.finisher.loserY
  );
  assert.ok(convergedDist < 5, 'Orbs must converge back into the coin after 0.5s');

  // Step until completion -> coin flies to winning owner side
  for (let i = 0; i < 70 && !simFin.finisher.completed; i++) {
    stepBattleSimulation(simFin, 1 / 60);
  }
  assert.equal(simFin.finisher.completed, true, 'Finisher animation should complete cleanly');
  assert.ok(simFin.finisher.coinX > 560, 'Coin should arrive at winning owner side');
});

test('Archer & Assassin balance patch mechanics match specification', () => {
  const archer = BALL_CATALOG.find((b) => b.id === 'archer')!;
  const assassin = BALL_CATALOG.find((b) => b.id === 'assassin')!;
  const boxer = BALL_CATALOG.find((b) => b.id === 'boxer')!;
  const zeroUpgrades = { defense: 0, basicDamage: 0, cooldown: 0 };

  // 1) Archer Skill 1 rapid fire arrows deal 20 damage; Skill 3 dead_zone radius expanded +50% (132)
  const simArch = createBattleSimulation(archer, zeroUpgrades, boxer, zeroUpgrades);
  simArch.player.x = 120;
  simArch.player.y = 280;
  simArch.bot.x = 400;
  simArch.bot.y = 280;
  simArch.bot.skillCooldowns = [99, 99, 99];
  simArch.player.bowDrawTimer = 0;
  simArch.player.skillCooldowns = [0, 99, 99];
  stepBattleSimulation(simArch, 0.08);
  const rapidArrows = simArch.projectiles.filter((p) => p.kind === 'arrow');
  assert.ok(rapidArrows.length >= 1, 'Archer Skill 1 should fire rapid arrows');
  assert.equal(rapidArrows[0].damage, 20, 'Archer Skill 1 rapid arrow damage must be reduced to 20');

  simArch.player.skillCooldowns = [99, 99, 0];
  stepBattleSimulation(simArch, 1 / 60);
  const deadZone = simArch.zones.find((z) => z.kind === 'dead_zone');
  assert.ok(deadZone, 'Archer Skill 3 should spawn dead_zone');
  assert.equal(deadZone.radius, 132, 'Dead Zone radius must be expanded by +50% (88 -> 132)');

  // 2) Assassin Passive: baseHp 900, +1% crit every 1s, and 2.5x (+150%) crit damage
  const simAss = createBattleSimulation(assassin, zeroUpgrades, boxer, zeroUpgrades);
  assert.equal(simAss.player.maxHp, 900, 'Assassin maxHp must be nerfed to 900');
  assert.equal(simAss.player.hp, 900, 'Assassin starting hp must be 900');
  simAss.player.skillCooldowns = [99, 99, 99];
  simAss.bot.skillCooldowns = [99, 99, 99];
  simAss.player.x = 120;
  simAss.player.y = 280;
  simAss.bot.x = 400;
  simAss.bot.y = 280;
  for (let i = 0; i < 62; i++) {
    stepBattleSimulation(simAss, 1 / 60); // > 1.0s total -> +1% crit
  }
  assert.equal(simAss.player.bonusCritChancePct, 1, 'Assassin gains +1% crit per 1s (1% in 1s)');
  for (let i = 0; i < 62; i++) {
    stepBattleSimulation(simAss, 1 / 60); // > 2.0s total -> +2% crit
  }
  assert.equal(simAss.player.bonusCritChancePct, 2, 'Assassin gains +1% crit per 1s (2% in 2s)');

  // Force 100% crit chance and check +150% crit damage (60 * 2.5 = 150)
  simAss.player.bonusCritChancePct = 100;
  simAss.player.x = simAss.bot.x - 40;
  simAss.player.y = simAss.bot.y;
  simAss.player.weaponAngle = 0;
  simAss.player.weaponHitCooldown = 0;
  const botHpBeforeCrit = simAss.bot.hp;
  stepBattleSimulation(simAss, 1 / 60);
  assert.equal(simAss.bot.hp, botHpBeforeCrit - 150, 'Assassin crit must deal +150% damage (60 * 2.5 = 150)');

  // 3) Assassin Skill 1 (+50% dash range: 0.57s)
  const simDash = createBattleSimulation(assassin, zeroUpgrades, boxer, zeroUpgrades);
  simDash.player.x = 100;
  simDash.player.y = 280;
  simDash.bot.x = 500;
  simDash.bot.y = 280;
  simDash.bot.skillCooldowns = [99, 99, 99];
  simDash.player.skillCooldowns = [0, 99, 99];
  stepBattleSimulation(simDash, 1 / 60);
  assert.ok(simDash.player.assassinateDashRemaining > 0.54, 'Assassin Skill 1 dash duration increased +50% to ~0.57s');

  // 4) Assassin Skill 2 (Stealth): untargetable, invulnerable to all damage, can still deal damage, +100% move speed
  const simStealth = createBattleSimulation(assassin, zeroUpgrades, archer, zeroUpgrades);
  simStealth.player.x = 200;
  simStealth.player.y = 280;
  simStealth.bot.x = 420;
  simStealth.bot.y = 280;
  simStealth.bot.skillCooldowns = [99, 99, 99];
  simStealth.player.skillCooldowns = [99, 0, 99];
  stepBattleSimulation(simStealth, 1 / 60);
  assert.ok(simStealth.player.stealthRemaining > 2.9, 'Assassin Stealth activates for 3s');

  // Now Archer tries to cast target-requiring skill while Assassin is already stealthed
  simStealth.bot.skillCooldowns = [0, 99, 99];
  stepBattleSimulation(simStealth, 1 / 60);
  assert.equal(simStealth.bot.rapidFireRemaining, 0, 'Opponent cannot target stealthed Assassin with target skills');
  const stealthSpeed = Math.hypot(simStealth.player.vx, simStealth.player.vy);
  assert.ok(Math.abs(stealthSpeed - 336) < 2, `Stealth speed (${stealthSpeed}) must be +100% (336)`);

  // Incoming projectile deals 0 damage while stealthed
  const hpWhileStealth = simStealth.player.hp;
  simStealth.projectiles.push({
    id: 9001,
    ownerSide: 'BOT',
    kind: 'arrow',
    x: simStealth.player.x,
    y: simStealth.player.y,
    vx: 0,
    vy: 0,
    radius: 15,
    damage: 100,
    bouncesLeft: 0,
    bounceDamageDelta: 0,
    hitTargets: new Set(),
    color: '#fff',
  });
  stepBattleSimulation(simStealth, 1 / 60);
  assert.equal(simStealth.player.hp, hpWhileStealth, 'Stealthed Assassin takes zero damage');

  // Stealthed Assassin still deals weapon damage to opponent
  simStealth.player.bonusCritChancePct = 0;
  simStealth.player.x = simStealth.bot.x - 40;
  simStealth.player.y = simStealth.bot.y;
  simStealth.player.weaponAngle = 0;
  simStealth.player.weaponHitCooldown = 0;
  const archHpBefore = simStealth.bot.hp;
  stepBattleSimulation(simStealth, 1 / 60);
  assert.equal(simStealth.bot.hp, archHpBefore - 60, 'Stealthed Assassin still deals damage to opponent');

  // 5) Assassin Skill 3 (Twin Daggers): 80 dmg per dagger, +10% crit on hit, teleports to dagger hit & leaves 1s afterimage, recalls on taking damage
  const simDag = createBattleSimulation(assassin, zeroUpgrades, boxer, zeroUpgrades);
  simDag.player.x = 120;
  simDag.player.y = 280;
  simDag.player.vx = 0;
  simDag.player.vy = 0;
  simDag.bot.x = 400;
  simDag.bot.y = 280;
  simDag.bot.vx = 0;
  simDag.bot.vy = 0;
  simDag.bot.skillCooldowns = [99, 99, 99];
  simDag.player.skillCooldowns = [99, 99, 0];
  simDag.player.bonusCritChancePct = 0;
  stepBattleSimulation(simDag, 1 / 60);

  const daggers = simDag.projectiles.filter((p) => p.kind === 'dagger');
  assert.equal(daggers.length, 2, 'Twin Daggers launches 2 daggers');
  assert.equal(daggers[0].damage, 80, 'Each dagger deals 80 damage');

  const oldAssassinX = simDag.player.x;
  const oldAssassinY = simDag.player.y;
  // Move first dagger onto boxer to verify hit -> +10% crit + teleport + 1s afterimage at old position
  const hitPosX = simDag.bot.x - 10;
  const hitPosY = simDag.bot.y;
  daggers[0].x = hitPosX;
  daggers[0].y = hitPosY;
  // Remove second dagger to isolate single dagger hit cleanly
  simDag.projectiles = [daggers[0]];
  simDag.hitstopTimer = 0;
  stepBattleSimulation(simDag, 1 / 60);

  assert.equal(simDag.player.bonusCritChancePct, 10, 'Hitting with thrown dagger grants +10% crit chance');
  assert.ok(simDag.bot.hp <= 1000 - 80, 'Thrown dagger deals 80 damage');
  assert.ok(
    Math.hypot(simDag.player.x - hitPosX, simDag.player.y - hitPosY) < 40,
    'Assassin teleports to damaging dagger location'
  );
  assert.ok(simDag.player.assassinRecallRemaining > 0.9, '1s faded recall afterimage remains at old location');
  assert.ok(
    Math.hypot(simDag.player.assassinRecallX - oldAssassinX, simDag.player.assassinRecallY - oldAssassinY) < 12,
    'Afterimage is saved at Assassin old position'
  );

  // Now hit Assassin while 1s recall afterimage is active -> immediately teleports back to afterimage
  simDag.hitstopTimer = 0;
  simDag.projectiles.push({
    id: 9002,
    ownerSide: 'BOT',
    kind: 'kunai',
    x: simDag.player.x,
    y: simDag.player.y,
    vx: 0,
    vy: 0,
    radius: 15,
    damage: 25,
    bouncesLeft: 0,
    bounceDamageDelta: 0,
    hitTargets: new Set(),
    color: '#fff',
  });
  stepBattleSimulation(simDag, 1 / 60);
  assert.equal(simDag.player.assassinRecallRemaining, 0, 'Recall consumes the afterimage');
  assert.ok(
    Math.hypot(simDag.player.x - oldAssassinX, simDag.player.y - oldAssassinY) < 15,
    'Taking damage during 1s recall window teleports Assassin back to afterimage'
  );
});

test('Speed, Fire Mage, Ice Mage, and Earth Mage balance patch mechanics work accurately', () => {
  const speedBall = BALL_CATALOG.find((b) => b.id === 'speed')!;
  const fireMage = BALL_CATALOG.find((b) => b.id === 'fire_mage')!;
  const iceMage = BALL_CATALOG.find((b) => b.id === 'ice_mage')!;
  const earthMage = BALL_CATALOG.find((b) => b.id === 'earth_mage')!;
  const boxer = BALL_CATALOG.find((b) => b.id === 'boxer')!;
  const zeroUpgrades = { defense: 0, basicDamage: 0, cooldown: 0 };

  // 1) Speed collision passive (x1.15 current speed per wall OR ball collision, +0.3% DR, +0.15% damage)
  const simSpd = createBattleSimulation(speedBall, zeroUpgrades, boxer, zeroUpgrades);
  simSpd.player.skillCooldowns = [99, 99];
  simSpd.bot.skillCooldowns = [99, 99, 99];
  // Position near left wall moving left to trigger 1 wall bounce
  simSpd.player.x = 24;
  simSpd.player.y = 140;
  simSpd.player.vx = -168;
  simSpd.player.vy = 0;
  simSpd.bot.x = 450;
  simSpd.bot.y = 450;
  stepBattleSimulation(simSpd, 1 / 60);

  assert.equal(simSpd.player.speedAfterimageCount, 1, 'Wall collision grants 1 Speed stack');
  assert.ok(Math.abs(simSpd.player.speedCollisionMultiplier - 1.15) < 1e-6, 'First collision multiplies speed by 1.15x');
  const spdAfter1 = Math.hypot(simSpd.player.vx, simSpd.player.vy);
  assert.ok(Math.abs(spdAfter1 - 168 * 1.15) < 1, `Speed after 1st collision (${spdAfter1}) should equal 168 * 1.15 = 193.2`);

  // Second collision (ball-to-ball) also multiplies current speed directly by 1.15x
  simSpd.ballsCurrentlyTouching = false;
  simSpd.player.x = 280;
  simSpd.player.y = 280;
  simSpd.player.vx = spdAfter1;
  simSpd.player.vy = 0;
  simSpd.bot.x = 320;
  simSpd.bot.y = 280;
  simSpd.bot.vx = -168;
  simSpd.bot.vy = 0;
  stepBattleSimulation(simSpd, 1 / 60);
  assert.equal(simSpd.player.speedAfterimageCount, 2, 'Ball-to-ball collision also grants 1 Speed stack');
  assert.ok(Math.abs(simSpd.player.speedCollisionMultiplier - 1.15 * 1.15) < 1e-6);
  const spdAfter2 = Math.hypot(simSpd.player.vx, simSpd.player.vy);
  assert.ok(Math.abs(spdAfter2 - 168 * 1.15 * 1.15) < 1, `Speed after 2nd collision (${spdAfter2}) should equal 168 * 1.15^2 = 222.18`);

  // Verify +0.3% DR (20 stacks => 6% DR on 100 dmg -> 94 dmg -> 906 HP) and +0.15% outgoing damage (20 stacks => +3% dmg -> 103 dmg -> 897 HP)
  simSpd.player.x = 120;
  simSpd.player.y = 280;
  simSpd.bot.x = 450;
  simSpd.bot.y = 280;
  simSpd.bot.ragePassiveRemaining = 0;
  simSpd.hitstopTimer = 0;
  simSpd.player.speedAfterimageCount = 20;
  simSpd.player.hp = 1000;
  simSpd.projectiles.push({
    id: 9201,
    ownerSide: 'BOT',
    kind: 'kunai',
    x: simSpd.player.x,
    y: simSpd.player.y,
    vx: 0,
    vy: 0,
    radius: 15,
    damage: 100,
    bouncesLeft: 0,
    bounceDamageDelta: 0,
    hitTargets: new Set(),
    color: '#fff',
  });
  stepBattleSimulation(simSpd, 1 / 60);
  assert.equal(simSpd.player.hp, 906, '20 collision stacks grant 6% damage reduction (100 -> 94 dmg)');

  simSpd.hitstopTimer = 0;
  simSpd.bot.hp = 1000;
  simSpd.projectiles.push({
    id: 9203,
    ownerSide: 'PLAYER',
    kind: 'kunai',
    x: simSpd.bot.x,
    y: simSpd.bot.y,
    vx: 0,
    vy: 0,
    radius: 15,
    damage: 100,
    bouncesLeft: 0,
    bounceDamageDelta: 0,
    hitTargets: new Set(),
    color: '#fff',
  });
  stepBattleSimulation(simSpd, 1 / 60);
  assert.equal(simSpd.bot.hp, 897, '20 collision stacks grant +3% outgoing damage (100 -> 103 dmg)');

  // 2) Speed Skill 1 lasts 5 seconds and expires cleanly
  const simS1 = createBattleSimulation(speedBall, zeroUpgrades, boxer, zeroUpgrades);
  simS1.bot.skillCooldowns = [99, 99, 99];
  simS1.player.skillCooldowns = [0, 99];
  stepBattleSimulation(simS1, 1 / 60);
  assert.ok(simS1.player.speedSelfBoostRemaining > 4.9, 'Speed Skill 1 lasts 5s');
  assert.ok(simS1.player.speedBoostGlowRemaining > 4.9, 'Speed Skill 1 glow lasts 5s');
  for (let i = 0; i < 310; i++) {
    simS1.hitstopTimer = 0;
    stepBattleSimulation(simS1, 1 / 60);
  }
  assert.equal(simS1.player.speedSelfBoostRemaining, 0, 'Speed Skill 1 expires after 5s');
  assert.equal(simS1.player.speedBoostGlowRemaining, 0, 'Speed Skill 1 glow ends after 5s');

  // 3) Speed Skill 2 (speed_chevron): 30s CD, 3s duration, owner +5% DR & +5% speed per pass, opponent -50% speed while arrow active
  const simArrow = createBattleSimulation(speedBall, zeroUpgrades, boxer, zeroUpgrades);
  simArrow.player.x = 180;
  simArrow.player.y = 280;
  simArrow.bot.x = 420;
  simArrow.bot.y = 280;
  simArrow.bot.skillCooldowns = [99, 99, 99];
  simArrow.player.skillCooldowns = [99, 0];
  stepBattleSimulation(simArrow, 1 / 60);

  const sa = simArrow.speedArrows[0];
  assert.ok(sa, 'Speed Skill 2 spawns a SpeedArrowEntity');
  assert.equal(simArrow.player.skillCooldowns[1] > 29, true, 'Speed Skill 2 has 30s cooldown');

  // Place Speed outside then move through arrow -> +1 speedArrowPassStacks (+5% DR & +5% speed)
  sa.ownerInside = false;
  simArrow.player.x = sa.x;
  simArrow.player.y = sa.y;
  stepBattleSimulation(simArrow, 1 / 60);
  stepBattleSimulation(simArrow, 1 / 60);
  assert.equal(simArrow.player.speedArrowPassStacks, 1, 'Passing through arrow grants +1 pass stack (+5% speed & +5% DR)');
  const buffedSpd = Math.hypot(simArrow.player.vx, simArrow.player.vy);
  assert.ok(Math.abs(buffedSpd - 168 * 1.05) < 2, `Owner speed (${buffedSpd}) boosted by +5%`);

  // Move enemy through arrow -> 50% move speed slow until arrow disappears
  simArrow.player.x = 60;
  simArrow.player.y = 60;
  sa.enemyInside = false;
  simArrow.bot.x = sa.x;
  simArrow.bot.y = sa.y;
  stepBattleSimulation(simArrow, 1 / 60);
  stepBattleSimulation(simArrow, 1 / 60);
  assert.equal(sa.slowedEnemySide, 'BOT', 'Enemy passing arrow becomes slowed by 50%');
  const slowedBotSpd = Math.hypot(simArrow.bot.vx, simArrow.bot.vy);
  assert.ok(Math.abs(slowedBotSpd - 168 * 0.5) < 2, `Slowed enemy speed (${slowedBotSpd}) should be 50%`);

  // Fast-forward past 3s -> arrow expires and enemy speed recovers
  for (let i = 0; i < 190; i++) {
    simArrow.hitstopTimer = 0;
    stepBattleSimulation(simArrow, 1 / 60);
  }
  assert.equal(simArrow.speedArrows.length, 0, 'Speed arrow disappears after 3s');
  const recoveredBotSpd = Math.hypot(simArrow.bot.vx, simArrow.bot.vy);
  assert.ok(Math.abs(recoveredBotSpd - 168) < 2, 'Enemy speed restores once arrow disappears');

  // 4) Fire Mage Skill 2 (fire_rain): heals Fire Mage +20 HP every 0.2s when standing inside
  const simFireHeal = createBattleSimulation(fireMage, zeroUpgrades, boxer, zeroUpgrades);
  simFireHeal.bot.skillCooldowns = [99, 99, 99];
  simFireHeal.player.skillCooldowns = [99, 0, 99];
  stepBattleSimulation(simFireHeal, 1 / 60);
  const fZone = simFireHeal.zones.find((z) => z.kind === 'fire_rain')!;
  assert.ok(fZone);
  simFireHeal.player.hp = 600;
  simFireHeal.player.x = fZone.x;
  simFireHeal.player.y = fZone.y;
  fZone.tickTimer = 0.01;
  stepBattleSimulation(simFireHeal, 0.02);
  assert.equal(simFireHeal.player.hp, 620, 'Fire Mage heals 20 HP per 0.2s inside Mưa Lửa');

  // 5) Ice Mage Skill 3 (ice_zone): heals Ice Mage +20 HP every 0.2s & grants 10% damage reduction inside
  const simIceHeal = createBattleSimulation(iceMage, zeroUpgrades, boxer, zeroUpgrades);
  simIceHeal.bot.skillCooldowns = [99, 99, 99];
  simIceHeal.player.skillCooldowns = [99, 99, 0];
  stepBattleSimulation(simIceHeal, 1 / 60);
  const iZone = simIceHeal.zones.find((z) => z.kind === 'ice_zone')!;
  assert.ok(iZone);
  simIceHeal.player.hp = 600;
  simIceHeal.player.x = iZone.x;
  simIceHeal.player.y = iZone.y;
  iZone.ownerHealTickTimer = 0.01;
  stepBattleSimulation(simIceHeal, 0.02);
  assert.equal(simIceHeal.player.hp, 620, 'Ice Mage heals 20 HP per 0.2s inside Vùng Lạnh');

  // Verify 10% damage reduction while standing inside own ice_zone (100 -> 90 dmg)
  simIceHeal.player.hp = 600;
  simIceHeal.projectiles.push({
    id: 9202,
    ownerSide: 'BOT',
    kind: 'kunai',
    x: simIceHeal.player.x,
    y: simIceHeal.player.y,
    vx: 0,
    vy: 0,
    radius: 15,
    damage: 100,
    bouncesLeft: 0,
    bounceDamageDelta: 0,
    hitTargets: new Set(),
    color: '#fff',
  });
  stepBattleSimulation(simIceHeal, 1 / 60);
  assert.equal(simIceHeal.player.hp, 510, 'Ice Mage gains 10% damage reduction inside Vùng Lạnh');

  // 6) Earth Mage 5s passive disable actually blocks target's passives while active
  const simDisable = createBattleSimulation(speedBall, zeroUpgrades, earthMage, zeroUpgrades);
  simDisable.player.skillCooldowns = [99, 99];
  simDisable.bot.skillCooldowns = [99, 99, 99];
  simDisable.player.passiveDisabledRemaining = 4.0;
  simDisable.player.x = 24;
  simDisable.player.y = 140;
  simDisable.player.vx = -168;
  simDisable.player.vy = 0;
  stepBattleSimulation(simDisable, 1 / 60);
  assert.equal(simDisable.player.speedAfterimageCount, 0, 'Disabled passive prevents Speed from gaining collision stacks');
  assert.equal(simDisable.player.speedCollisionMultiplier, 1.0, 'Disabled passive prevents Speed collision multiplier');
});

test('Wind Mage: catalog metadata, stats, skills, and existing roster preservation', () => {
  const windMage = BALL_CATALOG.find((b) => b.id === 'wind_mage');
  assert.ok(windMage, 'wind_mage must exist in BALL_CATALOG');
  const zeroUpgrades = { defense: 0, basicDamage: 0, cooldown: 0 };
  assert.equal(windMage.baseHp, 1000);
  assert.equal(windMage.baseDamage, 70);
  assert.equal(windMage.baseDefensePct, 0);
  assert.equal(windMage.weaponType, 'wind_staff');
  assert.equal(windMage.aiArchetype, 'aeromancer');
  assert.equal(evaluateBallScoreAndStars(windMage, zeroUpgrades).stars, 6.5);
  assert.equal(windMage.skills.length, 3);
  assert.deepEqual(
    windMage.skills.map((s) => s.cooldown),
    [16, 25, 42]
  );
  assert.ok(BALL_CATALOG.some((b) => b.id === 'fire_mage'));
  assert.ok(BALL_CATALOG.some((b) => b.id === 'ice_mage'));
  assert.ok(BALL_CATALOG.some((b) => b.id === 'earth_mage'));
});

test('Wind Mage: Passive 1 (Phong Đạn) fires every 5s, deals 70 dmg, vanishes on wall, and knocks back', () => {
  const windMage = BALL_CATALOG.find((b) => b.id === 'wind_mage')!;
  const boxer = BALL_CATALOG.find((b) => b.id === 'boxer')!;
  const zeroUpgrades = { defense: 0, basicDamage: 0, cooldown: 0 };

  // 1) Fires wind_bolt every 5.0s
  const sim = createBattleSimulation(windMage, zeroUpgrades, boxer, zeroUpgrades);
  sim.player.skillCooldowns = [99, 99, 99];
  sim.bot.skillCooldowns = [99, 99, 99];
  sim.player.x = 120;
  sim.player.y = 280;
  sim.bot.x = 420;
  sim.bot.y = 280;
  sim.player.windBoltTimer = 4.98;
  stepBattleSimulation(sim, 0.04);

  const bolt = sim.projectiles.find((p) => p.kind === 'wind_bolt');
  assert.ok(bolt, 'Wind Mage fires wind_bolt after 5s');
  assert.equal(bolt.damage, 70);
  assert.equal(bolt.bouncesLeft, 0);

  // 2) Hits opponent for 70 dmg and initiates knockback away from bolt + triggers Thuận Phong
  bolt.x = sim.bot.x - 10;
  bolt.y = sim.bot.y;
  bolt.vx = 385;
  bolt.vy = 0;
  const botHpBefore = sim.bot.hp;
  const botXBefore = sim.bot.x;
  stepBattleSimulation(sim, 1 / 60);

  assert.equal(sim.bot.hp, botHpBefore - 70, 'Phong Đạn deals 70 damage');
  assert.ok(sim.bot.knockbackRemaining > 0, 'Phong Đạn starts knockback on target');
  assert.ok(sim.player.tailwindRemaining > 1.9, 'Knockback triggers Thuận Phong buff');
  assert.ok(sim.player.tailwindCooldownRemaining > 4.9, 'Thuận Phong starts 5s cooldown');

  for (let i = 0; i < 16; i++) {
    sim.hitstopTimer = 0;
    stepBattleSimulation(sim, 1 / 60);
  }
  assert.ok(sim.bot.x - botXBefore > 60, `Opponent should be knocked back right (~80px), got ${sim.bot.x - botXBefore}`);

  // 3) Disappears when hitting arena wall
  const simWall = createBattleSimulation(windMage, zeroUpgrades, boxer, zeroUpgrades);
  simWall.player.skillCooldowns = [99, 99, 99];
  simWall.bot.skillCooldowns = [99, 99, 99];
  simWall.projectiles.push({
    id: 9501,
    ownerSide: 'PLAYER',
    kind: 'wind_bolt',
    x: 550,
    y: 120,
    vx: 385,
    vy: 0,
    radius: 10,
    damage: 70,
    bouncesLeft: 0,
    bounceDamageDelta: 0,
    hitTargets: new Set(),
    color: '#86efac',
  });
  stepBattleSimulation(simWall, 0.05);
  assert.equal(simWall.projectiles.length, 0, 'Phong Đạn disappears upon hitting wall');
});

test('Wind Mage: Passive 2 (Thuận Phong) grants +12% speed, -8% dmg taken, 5s cooldown, and respects passive disable', () => {
  const windMage = BALL_CATALOG.find((b) => b.id === 'wind_mage')!;
  const boxer = BALL_CATALOG.find((b) => b.id === 'boxer')!;
  const zeroUpgrades = { defense: 0, basicDamage: 0, cooldown: 0 };

  const sim = createBattleSimulation(windMage, zeroUpgrades, boxer, zeroUpgrades);
  sim.player.skillCooldowns = [99, 99, 99];
  sim.bot.skillCooldowns = [99, 99, 99];
  sim.player.x = 120;
  sim.player.y = 140;
  sim.bot.x = 430;
  sim.bot.y = 430;

  // Activate Thuận Phong directly via knockback hit
  sim.projectiles.push({
    id: 9502,
    ownerSide: 'PLAYER',
    kind: 'wind_bolt',
    x: sim.bot.x - 5,
    y: sim.bot.y,
    vx: 385,
    vy: 0,
    radius: 10,
    damage: 70,
    bouncesLeft: 0,
    bounceDamageDelta: 0,
    hitTargets: new Set(),
    color: '#86efac',
  });
  stepBattleSimulation(sim, 1 / 60);
  sim.hitstopTimer = 0;
  stepBattleSimulation(sim, 1 / 60);
  const twSpeed = Math.hypot(sim.player.vx, sim.player.vy);
  assert.ok(Math.abs(twSpeed - 168 * 1.12) < 2, `Thuận Phong speed (${twSpeed}) should be +12%`);

  // Incoming 100 damage is reduced by 8% -> 92 damage
  const pHpBefore = sim.player.hp;
  sim.projectiles.push({
    id: 9503,
    ownerSide: 'BOT',
    kind: 'kunai',
    x: sim.player.x,
    y: sim.player.y,
    vx: 0,
    vy: 0,
    radius: 16,
    damage: 100,
    bouncesLeft: 0,
    bounceDamageDelta: 0,
    hitTargets: new Set(),
    color: '#fff',
  });
  stepBattleSimulation(sim, 1 / 60);
  assert.equal(sim.player.hp, pHpBefore - 92, 'Thuận Phong reduces incoming damage by 8%');

  // Cannot re-trigger while tailwindCooldownRemaining > 0
  sim.hitstopTimer = 0;
  sim.player.tailwindRemaining = 0;
  sim.player.tailwindCooldownRemaining = 3.0;
  sim.projectiles.push({
    id: 9504,
    ownerSide: 'PLAYER',
    kind: 'wind_bolt',
    x: sim.bot.x,
    y: sim.bot.y,
    vx: 385,
    vy: 0,
    radius: 10,
    damage: 70,
    bouncesLeft: 0,
    bounceDamageDelta: 0,
    hitTargets: new Set(),
    color: '#86efac',
  });
  stepBattleSimulation(sim, 1 / 60);
  assert.equal(sim.player.tailwindRemaining, 0, 'Thuận Phong respects 5s internal cooldown');

  // Cannot trigger when passiveDisabledRemaining > 0
  sim.hitstopTimer = 0;
  sim.player.tailwindCooldownRemaining = 0;
  sim.player.passiveDisabledRemaining = 3.0;
  sim.projectiles.push({
    id: 9505,
    ownerSide: 'PLAYER',
    kind: 'wind_bolt',
    x: sim.bot.x,
    y: sim.bot.y,
    vx: 385,
    vy: 0,
    radius: 10,
    damage: 70,
    bouncesLeft: 0,
    bounceDamageDelta: 0,
    hitTargets: new Set(),
    color: '#86efac',
  });
  stepBattleSimulation(sim, 1 / 60);
  assert.equal(sim.player.tailwindRemaining, 0, 'Disabled passive prevents Thuận Phong');
});

test('Wind Mage: Skill 1 (Lốc Xoáy) deals 80 dmg, vanishes on hit, and knocks opponent back ~110px', () => {
  const windMage = BALL_CATALOG.find((b) => b.id === 'wind_mage')!;
  const boxer = BALL_CATALOG.find((b) => b.id === 'boxer')!;
  const zeroUpgrades = { defense: 0, basicDamage: 0, cooldown: 0 };

  const sim = createBattleSimulation(windMage, zeroUpgrades, boxer, zeroUpgrades);
  sim.bot.skillCooldowns = [99, 99, 99];
  sim.player.skillCooldowns = [0, 99, 99];
  sim.player.x = 120;
  sim.player.y = 280;
  sim.bot.x = 220;
  sim.bot.y = 280;

  stepBattleSimulation(sim, 1 / 60);
  assert.ok(sim.player.skillCooldowns[0] > 15, 'Lốc Xoáy sets 16s cooldown');
  const tornado = sim.projectiles.find((p) => p.kind === 'wind_tornado');
  assert.ok(tornado, 'Skill 1 spawns wind_tornado projectile');
  assert.equal(tornado.damage, 80);

  const botHpBefore = sim.bot.hp;
  const botXBefore = sim.bot.x;
  for (let i = 0; i < 35; i++) {
    sim.hitstopTimer = 0;
    stepBattleSimulation(sim, 1 / 60);
  }
  assert.equal(sim.bot.hp, botHpBefore - 80, 'Lốc Xoáy deals 80 damage');
  assert.equal(sim.projectiles.filter((p) => p.kind === 'wind_tornado').length, 0, 'Lốc Xoáy vanishes after hit');
  assert.ok(sim.bot.x - botXBefore > 85, `Lốc Xoáy knocks opponent back ~110px, moved ${sim.bot.x - botXBefore}`);
});

test('Wind Mage: Skill 2 (Phong Bạo) triggers only at close range, follows owner, ticks 4x20=80 dmg', () => {
  const windMage = BALL_CATALOG.find((b) => b.id === 'wind_mage')!;
  const boxer = BALL_CATALOG.find((b) => b.id === 'boxer')!;
  const zeroUpgrades = { defense: 0, basicDamage: 0, cooldown: 0 };

  const sim = createBattleSimulation(windMage, zeroUpgrades, boxer, zeroUpgrades);
  sim.bot.skillCooldowns = [99, 99, 99];
  sim.player.skillCooldowns = [99, 0, 99];

  // Too far (> 165px) -> AI holds Skill 2
  sim.player.x = 100;
  sim.player.y = 280;
  sim.bot.x = 420;
  sim.bot.y = 280;
  stepBattleSimulation(sim, 1 / 60);
  assert.equal(sim.zones.filter((z) => z.kind === 'wind_burst').length, 0, 'AI holds Phong Bạo when opponent is far');

  // Close range (<= 165px) -> casts Phong Bạo
  sim.bot.x = 200;
  sim.bot.y = 280;
  stepBattleSimulation(sim, 1 / 60);
  const burst = sim.zones.find((z) => z.kind === 'wind_burst');
  assert.ok(burst, 'Phong Bạo spawns when opponent is within close range');
  assert.equal(burst.followOwner, true);
  assert.ok(sim.player.skillCooldowns[1] > 24, 'Phong Bạo sets 25s cooldown');

  // Keep opponent near center (outside melee contact range) to verify 4 ticks of 20 dmg = 80 dmg total
  const botHpBefore = sim.bot.hp;
  for (let i = 0; i < 130; i++) {
    sim.hitstopTimer = 0;
    sim.bot.x = sim.player.x + 68;
    sim.bot.y = sim.player.y;
    sim.bot.knockbackRemaining = 0;
    stepBattleSimulation(sim, 1 / 60);
  }
  assert.equal(sim.bot.hp, botHpBefore - 80, 'Phong Bạo deals 4 ticks of 20 damage (80 total)');
  assert.equal(sim.zones.filter((z) => z.kind === 'wind_burst').length, 0, 'Phong Bạo disappears after 2s');
});

test('Wind Mage: Skill 3 (Thiên Long Quyển) charges 0.25s, pulls target, ticks 4x25=100 dmg, and explodes knockback', () => {
  const windMage = BALL_CATALOG.find((b) => b.id === 'wind_mage')!;
  const boxer = BALL_CATALOG.find((b) => b.id === 'boxer')!;
  const zeroUpgrades = { defense: 0, basicDamage: 0, cooldown: 0 };

  const sim = createBattleSimulation(windMage, zeroUpgrades, boxer, zeroUpgrades);
  sim.bot.skillCooldowns = [99, 99, 99];
  sim.player.skillCooldowns = [99, 99, 0];
  sim.player.x = 120;
  sim.player.y = 280;
  sim.bot.x = 340;
  sim.bot.y = 280;

  stepBattleSimulation(sim, 1 / 60);
  assert.ok(sim.player.windCastChargeRemaining > 0.2, 'Thiên Long Quyển starts 0.25s charge');
  assert.ok(sim.player.skillCooldowns[2] > 41, 'Thiên Long Quyển sets 42s cooldown');

  for (let i = 0; i < 20; i++) {
    sim.hitstopTimer = 0;
    stepBattleSimulation(sim, 1 / 60);
  }
  const vortex = sim.windVortexes[0];
  assert.ok(vortex, 'Thiên Long Quyển spawns WindVortexEntity after 0.25s charge');

  // Verify soft pull toward vortex center when target is inside radius
  sim.bot.x = vortex.x + 70;
  sim.bot.y = vortex.y;
  sim.bot.vx = 0;
  sim.bot.vy = 0;
  const distBeforePull = Math.hypot(sim.bot.x - vortex.x, sim.bot.y - vortex.y);
  stepBattleSimulation(sim, 1 / 60);
  const distAfterPull = Math.hypot(sim.bot.x - vortex.x, sim.bot.y - vortex.y);
  assert.ok(distAfterPull < distBeforePull, 'Thiên Long Quyển gently pulls opponent toward center');

  // Let full vortex finish (4 ticks x 25 = 100 dmg) + final knockback explosion
  const botHpBeforeTicks = sim.bot.hp;
  sim.bot.x = vortex.x + 25;
  sim.bot.y = vortex.y;
  for (let i = 0; i < 140; i++) {
    sim.hitstopTimer = 0;
    if (sim.windVortexes.length > 0) {
      sim.bot.x = vortex.x + 25;
      sim.bot.y = vortex.y;
    }
    stepBattleSimulation(sim, 1 / 60);
  }
  assert.equal(sim.windVortexes.length, 0, 'Thiên Long Quyển ends after 2.0s');
  assert.equal(sim.bot.hp, botHpBeforeTicks - 100, 'Thiên Long Quyển deals 4 ticks of 25 damage (100 total)');
  assert.ok(sim.bot.x > vortex.x + 120, `Thiên Long Quyển explodes and knocks opponent outward (~170px), bot.x=${sim.bot.x}`);
});

import {
  MUSIC_TRACKS,
  computeEffectiveMusicVolume,
  extractYoutubeVideoId,
  resolveMusicTrackForState,
} from './music';

test('Background Music: track IDs match requested YouTube links and resolve cleanly per screen state', () => {
  assert.equal(MUSIC_TRACKS.battle.videoId, 'ulHcNwK1q_U');
  assert.equal(MUSIC_TRACKS.lobby.videoId, 'NGP-IukPLEo');

  assert.equal(
    extractYoutubeVideoId('https://www.youtube.com/watch?v=ulHcNwK1q_U&list=RDulHcNwK1q_U&start_radio=1'),
    'ulHcNwK1q_U'
  );
  assert.equal(
    extractYoutubeVideoId('https://www.youtube.com/watch?v=NGP-IukPLEo&list=RDNGP-IukPLEo&start_radio=1'),
    'NGP-IukPLEo'
  );
  assert.equal(extractYoutubeVideoId('https://youtu.be/NGP-IukPLEo?si=abc'), 'NGP-IukPLEo');

  // Lobby screens & pre-battle Round 1 preparation use lobby track
  assert.equal(resolveMusicTrackForState('MAIN_MENU', false), 'lobby');
  assert.equal(resolveMusicTrackForState('SHOP', false), 'lobby');
  assert.equal(resolveMusicTrackForState('COLLECTION', false), 'lobby');
  assert.equal(resolveMusicTrackForState('BALL_SELECTION', false), 'lobby');
  assert.equal(resolveMusicTrackForState('PREPARATION', false), 'lobby');

  // Active match keeps battle track across combat rounds until match finishes
  assert.equal(resolveMusicTrackForState('BATTLE', true), 'battle');
  assert.equal(resolveMusicTrackForState('ROUND_RESULT', true), 'battle');
  assert.equal(resolveMusicTrackForState('PREPARATION', true), 'battle');
  assert.equal(resolveMusicTrackForState('MATCH_RESULT', true), 'lobby');
  assert.equal(resolveMusicTrackForState('MAIN_MENU', true), 'lobby');

  // Volume calculation obeys both master soundEnabled and musicEnabled
  assert.equal(computeEffectiveMusicVolume(true, true, 0.45), 0.45);
  assert.equal(computeEffectiveMusicVolume(false, true, 0.8), 0);
  assert.equal(computeEffectiveMusicVolume(true, false, 0.8), 0);
  assert.equal(computeEffectiveMusicVolume(true, true, 1.5), 1);
  assert.equal(computeEffectiveMusicVolume(true, true, -0.2), 0);
});
