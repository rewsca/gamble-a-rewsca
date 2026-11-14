import React, { useEffect, useRef } from 'react';
import {
  ARENA_SIZE,
  BALL_RADIUS,
  BattleSimulationState,
  CombatantState,
  getNextUpcomingSkill,
  stepBattleSimulation,
  UpcomingSkillCue,
} from '../game/battleEngine';
import { WinnerChoice } from '../game/types';

export interface LiveHudSnapshot {
  remainingTime: number;
  collisionCount: number;
  playerDamageDealt: number;
  botDamageDealt: number;
  playerHp: number;
  playerMaxHp: number;
  botHp: number;
  botMaxHp: number;
  botNextSkill: UpcomingSkillCue | null;
  playerNextSkill: UpcomingSkillCue | null;
}

interface BattleArenaCanvasProps {
  simRef: React.MutableRefObject<BattleSimulationState | null>;
  isBattleActive: boolean;
  isPaused: boolean;
  speedMultiplier?: 1 | 2;
  onHudUpdate: (snapshot: LiveHudSnapshot) => void;
  onRoundFinished: (result: {
    winner: WinnerChoice;
    playerDamageDealt: number;
    botDamageDealt: number;
    collisionCount: number;
    winnerRemainingHp: number;
    winnerRemainingHpPct: number;
    durationSeconds: number;
  }) => void;
}

export const BattleArenaCanvas: React.FC<BattleArenaCanvasProps> = ({
  simRef,
  isBattleActive,
  isPaused,
  speedMultiplier = 1,
  onHudUpdate,
  onRoundFinished,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const callbacksRef = useRef({ onHudUpdate, onRoundFinished, isBattleActive, isPaused, speedMultiplier });
  callbacksRef.current = { onHudUpdate, onRoundFinished, isBattleActive, isPaused, speedMultiplier };

  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let hudEmitTimer = 0;
    let roundDoneEmitted = false;

    const drawCombatant = (ctx: CanvasRenderingContext2D, actor: CombatantState) => {
      // Vẽ chuỗi Tàn Ảnh bám đuôi của Tốc Độ (Speed) — mỗi lần kích hoạt nội tại tạo thêm 1 tàn ảnh
      if (
        actor.ball.id === 'speed' &&
        actor.speedAfterimageCount > 0 &&
        actor.positionTrail.length > 0
      ) {
        const visibleClones = Math.min(actor.speedAfterimageCount, 12);
        for (let c = visibleClones; c >= 1; c--) {
          const trailIdx = Math.min(actor.positionTrail.length - 1, c * 4 - 1);
          const pos = actor.positionTrail[trailIdx];
          if (!pos) continue;
          const alpha = Math.max(0.12, 0.52 * (1 - c / (visibleClones + 1.5)));
          ctx.save();
          ctx.translate(pos.x, pos.y);
          ctx.globalAlpha = alpha;

          // Nắm đấm của tàn ảnh
          ctx.save();
          ctx.rotate(pos.weaponAngle);
          [-0.45, 0.45].forEach((angleOff) => {
            ctx.save();
            ctx.rotate(angleOff);
            ctx.fillStyle = '#38bdf8';
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(BALL_RADIUS + 13, 0, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          });
          ctx.restore();

          // Thân bóng tàn ảnh xanh lam
          ctx.beginPath();
          ctx.arc(0, 0, BALL_RADIUS - 1, 0, Math.PI * 2);
          ctx.fillStyle = '#0ea5e9';
          ctx.fill();
          ctx.lineWidth = 2.8;
          ctx.strokeStyle = '#7dd3fc';
          ctx.stroke();
          ctx.restore();
        }
      }

      // CHIÊU 1 VÕ SĨ QUYỀN ANH: Hiệu ứng lướt có các vệt đỏ-vàng rực cháy ở đằng sau (như Hình 203943)
      if (
        actor.ball.weaponType === 'boxing_gloves' &&
        actor.ball.id !== 'speed' &&
        (actor.flurryDashRemaining > 0 || actor.flurryDashTrailRemaining > 0) &&
        actor.positionTrail.length > 1
      ) {
        const trailAlpha =
          actor.flurryDashRemaining > 0
            ? 0.95
            : Math.min(0.9, actor.flurryDashTrailRemaining / 0.75);
        const trailLen = Math.min(actor.positionTrail.length, 16);

        ctx.save();
        ctx.globalAlpha = trailAlpha;

        // Vẽ 3 dải vệt lướt đỏ cam & tia chớp vàng chạy song song phía sau quỹ đạo lướt
        const lateralOffsets = [-13, 0, 13];
        lateralOffsets.forEach((latOff, trackIdx) => {
          ctx.beginPath();
          for (let i = 0; i < trailLen; i++) {
            const pt = actor.positionTrail[i];
            const perpAng = pt.aimAngle + Math.PI / 2;
            const taper = 1 - i / trailLen;
            const jitter =
              trackIdx === 1
                ? Math.sin(performance.now() * 0.06 + i * 1.4) * 3.5
                : 0;
            const tx = pt.x + Math.cos(perpAng) * (latOff * (0.55 + 0.45 * taper) + jitter);
            const ty = pt.y + Math.sin(perpAng) * (latOff * (0.55 + 0.45 * taper) + jitter);
            if (i === 0) ctx.moveTo(tx, ty);
            else ctx.lineTo(tx, ty);
          }
          ctx.strokeStyle =
            trackIdx === 1 ? '#fde047' : '#ef4444';
          ctx.lineWidth = trackIdx === 1 ? 5.5 : 8.5;
          ctx.lineCap = 'round';
          ctx.stroke();

          // Lõi sáng bên trong mỗi vệt lướt
          ctx.strokeStyle = trackIdx === 1 ? '#ffffff' : '#f97316';
          ctx.lineWidth = trackIdx === 1 ? 2.2 : 3.4;
          ctx.stroke();
        });
        ctx.restore();
      }

      // CHIÊU 2 SAMURAI (LAO CHÉM): Hiệu ứng khi lao lên giống Võ Sĩ Quyền Anh nhưng là màu XANH NƯỚC
      if (
        actor.ball.weaponType === 'katana' &&
        (actor.dashSlashRemaining > 0 || actor.dashSlashTrailRemaining > 0) &&
        actor.positionTrail.length > 1
      ) {
        const trailAlpha =
          actor.dashSlashRemaining > 0
            ? 0.95
            : Math.min(0.9, actor.dashSlashTrailRemaining / 0.75);
        const trailLen = Math.min(actor.positionTrail.length, 16);

        ctx.save();
        ctx.globalAlpha = trailAlpha;

        // Vẽ 3 dải vệt lướt xanh nước biển & tia nước lam sáng chạy song song phía sau quỹ đạo lướt
        const lateralOffsets = [-13, 0, 13];
        lateralOffsets.forEach((latOff, trackIdx) => {
          ctx.beginPath();
          for (let i = 0; i < trailLen; i++) {
            const pt = actor.positionTrail[i];
            const perpAng = pt.aimAngle + Math.PI / 2;
            const taper = 1 - i / trailLen;
            const jitter =
              trackIdx === 1
                ? Math.sin(performance.now() * 0.06 + i * 1.4) * 3.5
                : 0;
            const tx =
              pt.x + Math.cos(perpAng) * (latOff * (0.55 + 0.45 * taper) + jitter);
            const ty =
              pt.y + Math.sin(perpAng) * (latOff * (0.55 + 0.45 * taper) + jitter);
            if (i === 0) ctx.moveTo(tx, ty);
            else ctx.lineTo(tx, ty);
          }
          ctx.strokeStyle = trackIdx === 1 ? '#bae6fd' : '#0284c7';
          ctx.lineWidth = trackIdx === 1 ? 5.5 : 8.5;
          ctx.lineCap = 'round';
          ctx.stroke();

          // Lõi sáng bên trong mỗi vệt lướt xanh nước
          ctx.strokeStyle = trackIdx === 1 ? '#ffffff' : '#38bdf8';
          ctx.lineWidth = trackIdx === 1 ? 2.2 : 3.4;
          ctx.stroke();
        });
        ctx.restore();
      }

      // CHIÊU 1 SÁT THỦ (ÁM SÁT): Hiệu ứng vệt lướt như Samurai nhưng MÀU TÍM
      if (
        actor.ball.weaponType === 'dual_daggers' &&
        (actor.assassinateDashRemaining > 0 || actor.assassinateDashTrailRemaining > 0) &&
        actor.positionTrail.length > 1
      ) {
        const trailAlpha =
          actor.assassinateDashRemaining > 0
            ? 0.96
            : Math.min(0.9, actor.assassinateDashTrailRemaining / 0.75);
        const trailLen = Math.min(actor.positionTrail.length, 16);

        ctx.save();
        ctx.globalAlpha = trailAlpha;

        // Vẽ 3 dải vệt lướt tím sẫm & tia chớp tím sáng chạy song song phía sau quỹ đạo lướt
        const lateralOffsets = [-13, 0, 13];
        lateralOffsets.forEach((latOff, trackIdx) => {
          ctx.beginPath();
          for (let i = 0; i < trailLen; i++) {
            const pt = actor.positionTrail[i];
            const perpAng = pt.aimAngle + Math.PI / 2;
            const taper = 1 - i / trailLen;
            const jitter =
              trackIdx === 1
                ? Math.sin(performance.now() * 0.06 + i * 1.4) * 3.5
                : 0;
            const tx =
              pt.x + Math.cos(perpAng) * (latOff * (0.55 + 0.45 * taper) + jitter);
            const ty =
              pt.y + Math.sin(perpAng) * (latOff * (0.55 + 0.45 * taper) + jitter);
            if (i === 0) ctx.moveTo(tx, ty);
            else ctx.lineTo(tx, ty);
          }
          ctx.strokeStyle = trackIdx === 1 ? '#e9d5ff' : '#7e22ce';
          ctx.lineWidth = trackIdx === 1 ? 5.5 : 8.5;
          ctx.lineCap = 'round';
          ctx.stroke();

          // Lõi sáng bên trong mỗi vệt lướt màu tím
          ctx.strokeStyle = trackIdx === 1 ? '#ffffff' : '#c084fc';
          ctx.lineWidth = trackIdx === 1 ? 2.2 : 3.4;
          ctx.stroke();
        });
        ctx.restore();
      }

      // NỘI TẠI 2 PHÁP SƯ GIÓ (THUẬN PHONG): Vệt gió xanh ngọc kéo dài theo đường di chuyển
      if (actor.tailwindRemaining > 0 && actor.positionTrail.length >= 2) {
        const nowMs = performance.now();
        ctx.save();
        [-1, 1].forEach((sideDir, tIdx) => {
          ctx.beginPath();
          for (let i = 0; i < actor.positionTrail.length; i++) {
            const pt = actor.positionTrail[i];
            const progress = i / Math.max(1, actor.positionTrail.length - 1);
            const perpAng = pt.aimAngle + Math.PI / 2;
            const wave = Math.sin(nowMs * 0.02 + i * 0.9 + tIdx * 1.5) * 3.5;
            const offset = sideDir * (8 + progress * 5) + wave * (1 - progress * 0.5);
            const tx = pt.x + Math.cos(perpAng) * offset;
            const ty = pt.y + Math.sin(perpAng) * offset;
            if (i === 0) ctx.moveTo(tx, ty);
            else ctx.lineTo(tx, ty);
          }
          ctx.strokeStyle = tIdx === 0 ? 'rgba(134, 239, 172, 0.72)' : 'rgba(34, 197, 94, 0.52)';
          ctx.lineWidth = tIdx === 0 ? 3.2 : 2.2;
          ctx.lineCap = 'round';
          ctx.stroke();
        });
        ctx.restore();
      }

      ctx.save();
      ctx.translate(actor.x, actor.y);

      // Hiệu ứng Tàng Hình của Sát Thủ
      if (actor.stealthRemaining > 0) {
        ctx.globalAlpha = 0.35 + Math.sin(performance.now() * 0.02) * 0.12;
      }

      // CHIÊU 1 VÕ SĨ QUYỀN ANH: Luồng khí lướt đỏ rực & xoáy ốc vàng-đỏ quanh thân khi lao (như Hình 203943)
      if (
        actor.ball.weaponType === 'boxing_gloves' &&
        actor.ball.id !== 'speed' &&
        (actor.flurryDashRemaining > 0 || actor.flurryDashTrailRemaining > 0.25)
      ) {
        ctx.save();
        ctx.rotate(actor.aimAngle);
        const dashPulse = 0.9 + Math.sin(performance.now() * 0.05) * 0.12;

        // Luồng lửa đỏ cam kéo dài ra phía sau lưng
        const wakeGrad = ctx.createLinearGradient(18, 0, -78, 0);
        wakeGrad.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
        wakeGrad.addColorStop(0.35, 'rgba(239, 68, 68, 0.78)');
        wakeGrad.addColorStop(0.75, 'rgba(185, 28, 28, 0.42)');
        wakeGrad.addColorStop(1, 'rgba(127, 29, 29, 0)');
        ctx.fillStyle = wakeGrad;
        ctx.beginPath();
        ctx.moveTo(16, -BALL_RADIUS * 0.85);
        ctx.lineTo(-76 * dashPulse, -BALL_RADIUS * 1.35);
        ctx.lineTo(-54 * dashPulse, 0);
        ctx.lineTo(-76 * dashPulse, BALL_RADIUS * 1.35);
        ctx.lineTo(16, BALL_RADIUS * 0.85);
        ctx.closePath();
        ctx.fill();

        // Các vệt xé gió đỏ - vàng sắc nhọn hai bên sườn
        [-1, 1].forEach((dir) => {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(14, dir * (BALL_RADIUS + 4));
          ctx.lineTo(-68 * dashPulse, dir * (BALL_RADIUS + 16));
          ctx.stroke();

          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(18, dir * (BALL_RADIUS - 2));
          ctx.lineTo(-52 * dashPulse, dir * (BALL_RADIUS + 8));
          ctx.stroke();
        });

        // Họa tiết xoáy ốc năng lượng cam-vàng rực sáng (như góc trên Hình 203943)
        ctx.save();
        ctx.translate(4, -BALL_RADIUS - 10);
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 3.5; a += 0.25) {
          const r = a * 1.15;
          const sx = Math.cos(a) * r;
          const sy = Math.sin(a) * r;
          if (a === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        ctx.restore();

        ctx.restore();
      }

      // CHIÊU 2 SAMURAI (LAO CHÉM): Luồng khí lướt màu XANH NƯỚC & xoáy nước quanh thân khi lao (giống Võ Sĩ Quyền Anh nhưng màu xanh nước)
      if (
        actor.ball.weaponType === 'katana' &&
        (actor.dashSlashRemaining > 0 || actor.dashSlashTrailRemaining > 0.25)
      ) {
        ctx.save();
        ctx.rotate(actor.aimAngle);
        const dashPulse = 0.9 + Math.sin(performance.now() * 0.05) * 0.12;

        // Luồng sóng xanh nước kéo dài ra phía sau lưng
        const wakeGrad = ctx.createLinearGradient(18, 0, -78, 0);
        wakeGrad.addColorStop(0, 'rgba(224, 242, 254, 0.92)');
        wakeGrad.addColorStop(0.35, 'rgba(14, 165, 233, 0.82)');
        wakeGrad.addColorStop(0.75, 'rgba(2, 132, 199, 0.45)');
        wakeGrad.addColorStop(1, 'rgba(12, 74, 110, 0)');
        ctx.fillStyle = wakeGrad;
        ctx.beginPath();
        ctx.moveTo(16, -BALL_RADIUS * 0.85);
        ctx.lineTo(-76 * dashPulse, -BALL_RADIUS * 1.35);
        ctx.lineTo(-54 * dashPulse, 0);
        ctx.lineTo(-76 * dashPulse, BALL_RADIUS * 1.35);
        ctx.lineTo(16, BALL_RADIUS * 0.85);
        ctx.closePath();
        ctx.fill();

        // Các vệt xé gió xanh nước - băng lam sắc nhọn hai bên sườn
        [-1, 1].forEach((dir) => {
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(14, dir * (BALL_RADIUS + 4));
          ctx.lineTo(-68 * dashPulse, dir * (BALL_RADIUS + 16));
          ctx.stroke();

          ctx.strokeStyle = '#7dd3fc';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(18, dir * (BALL_RADIUS - 2));
          ctx.lineTo(-52 * dashPulse, dir * (BALL_RADIUS + 8));
          ctx.stroke();
        });

        // Họa tiết xoáy ốc thủy lưu xanh lam sáng
        ctx.save();
        ctx.translate(4, -BALL_RADIUS - 10);
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 3.5; a += 0.25) {
          const r = a * 1.15;
          const sx = Math.cos(a) * r;
          const sy = Math.sin(a) * r;
          if (a === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        ctx.restore();

        ctx.restore();
      }

      // CHIÊU 1 SÁT THỦ (ÁM SÁT): Luồng khí lướt màu TÍM & LÓE ÁNH TÍM khi lướt
      if (
        actor.ball.weaponType === 'dual_daggers' &&
        (actor.assassinateDashRemaining > 0 || actor.assassinateDashTrailRemaining > 0.25)
      ) {
        ctx.save();
        ctx.rotate(actor.aimAngle);
        const dashPulse = 0.9 + Math.sin(performance.now() * 0.05) * 0.12;

        // Luồng sóng tím kéo dài ra phía sau lưng (giống Samurai nhưng màu tím)
        const wakeGrad = ctx.createLinearGradient(18, 0, -78, 0);
        wakeGrad.addColorStop(0, 'rgba(243, 232, 255, 0.94)');
        wakeGrad.addColorStop(0.35, 'rgba(168, 85, 247, 0.84)');
        wakeGrad.addColorStop(0.75, 'rgba(126, 34, 206, 0.46)');
        wakeGrad.addColorStop(1, 'rgba(59, 7, 100, 0)');
        ctx.fillStyle = wakeGrad;
        ctx.beginPath();
        ctx.moveTo(16, -BALL_RADIUS * 0.85);
        ctx.lineTo(-76 * dashPulse, -BALL_RADIUS * 1.35);
        ctx.lineTo(-54 * dashPulse, 0);
        ctx.lineTo(-76 * dashPulse, BALL_RADIUS * 1.35);
        ctx.lineTo(16, BALL_RADIUS * 0.85);
        ctx.closePath();
        ctx.fill();

        // Các vệt xé gió tím sẫm - tím hồng sắc nhọn hai bên sườn
        [-1, 1].forEach((dir) => {
          ctx.strokeStyle = '#9333ea';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(14, dir * (BALL_RADIUS + 4));
          ctx.lineTo(-68 * dashPulse, dir * (BALL_RADIUS + 16));
          ctx.stroke();

          ctx.strokeStyle = '#e9d5ff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(18, dir * (BALL_RADIUS - 2));
          ctx.lineTo(-52 * dashPulse, dir * (BALL_RADIUS + 8));
          ctx.stroke();
        });

        // Họa tiết xoáy ốc năng lượng tím sáng
        ctx.save();
        ctx.translate(4, -BALL_RADIUS - 10);
        ctx.strokeStyle = '#f3e8ff';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 3.5; a += 0.25) {
          const r = a * 1.15;
          const sx = Math.cos(a) * r;
          const sy = Math.sin(a) * r;
          if (a === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        ctx.restore();

        ctx.restore();
      }

      // LÓE ÁNH TÍM khi Sát Thủ lướt Chiêu 1
      if (actor.assassinPurpleFlashRemaining > 0) {
        const flashRatio = Math.min(1, actor.assassinPurpleFlashRemaining / 0.45);
        ctx.save();
        const purpleBurst = ctx.createRadialGradient(
          0,
          0,
          2,
          0,
          0,
          BALL_RADIUS + 34 * (1.2 - flashRatio * 0.4)
        );
        purpleBurst.addColorStop(0, `rgba(255, 255, 255, ${0.95 * flashRatio})`);
        purpleBurst.addColorStop(0.35, `rgba(233, 213, 255, ${0.85 * flashRatio})`);
        purpleBurst.addColorStop(0.7, `rgba(168, 85, 247, ${0.55 * flashRatio})`);
        purpleBurst.addColorStop(1, 'rgba(88, 28, 135, 0)');
        ctx.fillStyle = purpleBurst;
        ctx.beginPath();
        ctx.arc(0, 0, BALL_RADIUS + 34, 0, Math.PI * 2);
        ctx.fill();

        // 6 tia chớp ánh tím lóe ra quanh thân
        ctx.strokeStyle = `rgba(243, 232, 255, ${flashRatio})`;
        ctx.lineWidth = 2.6;
        for (let k = 0; k < 6; k++) {
          const ang = (k * Math.PI) / 3 + performance.now() * 0.01;
          ctx.beginPath();
          ctx.moveTo(Math.cos(ang) * (BALL_RADIUS - 2), Math.sin(ang) * (BALL_RADIUS - 2));
          ctx.lineTo(
            Math.cos(ang) * (BALL_RADIUS + 24),
            Math.sin(ang) * (BALL_RADIUS + 24)
          );
          ctx.stroke();
        }
        ctx.restore();
      }

      // CHIÊU 1 SPEED (CƯỜNG HÓA BẢN THÂN - 5s): Khi cường hóa nhân vật sẽ phát sáng rực rỡ
      if (
        actor.ball.id === 'speed' &&
        (actor.speedBoostGlowRemaining > 0 || actor.speedSelfBoostRemaining > 0)
      ) {
        const t = performance.now() * 0.008;
        const pulse = 1 + Math.sin(t * 3) * 0.1;
        const boostAlpha =
          actor.speedBoostGlowRemaining > 0
            ? 0.92
            : Math.min(0.88, 0.65 + (actor.speedSelfBoostRemaining / 5.0) * 0.23);
        ctx.save();
        ctx.globalAlpha = boostAlpha;

        const speedAura = ctx.createRadialGradient(
          0,
          0,
          BALL_RADIUS * 0.3,
          0,
          0,
          (BALL_RADIUS + 30) * pulse
        );
        speedAura.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        speedAura.addColorStop(0.4, 'rgba(125, 211, 252, 0.72)');
        speedAura.addColorStop(0.75, 'rgba(14, 165, 233, 0.36)');
        speedAura.addColorStop(1, 'rgba(2, 132, 199, 0)');
        ctx.fillStyle = speedAura;
        ctx.beginPath();
        ctx.arc(0, 0, (BALL_RADIUS + 30) * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Vòng điện quang xanh lam-trắng xoay nhanh quanh Speed
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 2.4;
        ctx.setLineDash([10, 6]);
        ctx.save();
        ctx.rotate(t * 2.5);
        ctx.beginPath();
        ctx.arc(0, 0, (BALL_RADIUS + 14) * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        ctx.restore();
      }

      // CHIÊU 2 VÕ SĨ QUYỀN ANH: Tỏa ra Aura Đỏ rực với các Vành Đai xung quanh (actor.rageSkillRemaining > 0)
      if (actor.rageSkillRemaining > 0) {
        const t = performance.now() * 0.005;
        const pulse = 1 + Math.sin(t * 4) * 0.08;
        ctx.save();

        // 1. Quầng Aura Đỏ rực tỏa rộng xung quanh quả bóng
        const rageAura = ctx.createRadialGradient(
          0,
          0,
          BALL_RADIUS * 0.4,
          0,
          0,
          (BALL_RADIUS + 34) * pulse
        );
        rageAura.addColorStop(0, 'rgba(254, 202, 202, 0.85)');
        rageAura.addColorStop(0.45, 'rgba(239, 68, 68, 0.58)');
        rageAura.addColorStop(0.78, 'rgba(185, 28, 28, 0.28)');
        rageAura.addColorStop(1, 'rgba(127, 29, 29, 0)');
        ctx.fillStyle = rageAura;
        ctx.beginPath();
        ctx.arc(0, 0, (BALL_RADIUS + 34) * pulse, 0, Math.PI * 2);
        ctx.fill();

        // 2. Vành đai sóng xung kích tròn đồng tâm bên ngoài
        ctx.strokeStyle = 'rgba(248, 113, 113, 0.78)';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(0, 0, (BALL_RADIUS + 18) * pulse, 0, Math.PI * 2);
        ctx.stroke();

        // 3. Hai vành đai năng lượng (Orbital Belts) xoay chéo bao quanh quả bóng
        [-0.55, 0.55].forEach((tilt, idx) => {
          ctx.save();
          ctx.rotate(tilt + (idx === 0 ? t * 1.6 : -t * 1.6));
          ctx.strokeStyle = idx === 0 ? '#ef4444' : '#fca5a5';
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.ellipse(0, 0, BALL_RADIUS + 22, BALL_RADIUS * 0.52, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Điểm sáng chạy trên vành đai
          const orbAng = t * 3.2 + idx * Math.PI;
          const ox = Math.cos(orbAng) * (BALL_RADIUS + 22);
          const oy = Math.sin(orbAng) * (BALL_RADIUS * 0.52);
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(ox, oy, 3.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        ctx.restore();
      } else if (
        actor.ragePassiveRemaining > 0 ||
        actor.greatswordBuffRemaining > 0
      ) {
        // Hiệu ứng Cuồng Nộ nội tại / Cường Hóa đại kiếm
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, BALL_RADIUS + 12, 0, Math.PI * 2);
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.restore();
      }

      // CHIÊU 2 ĐẤU SĨ (BẤT KHẢ XÂM PHẠM): Quả bóng phát sáng ÁNH BẠC
      if (actor.invulnerableRemaining > 0) {
        const pulse = 1 + Math.sin(performance.now() * 0.015) * 0.08;
        ctx.save();
        const silverAura = ctx.createRadialGradient(
          0,
          0,
          BALL_RADIUS * 0.35,
          0,
          0,
          (BALL_RADIUS + 28) * pulse
        );
        silverAura.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        silverAura.addColorStop(0.5, 'rgba(226, 232, 240, 0.68)');
        silverAura.addColorStop(0.82, 'rgba(148, 163, 184, 0.32)');
        silverAura.addColorStop(1, 'rgba(71, 85, 105, 0)');
        ctx.fillStyle = silverAura;
        ctx.beginPath();
        ctx.arc(0, 0, (BALL_RADIUS + 28) * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 0, (BALL_RADIUS + 11) * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.2;
        ctx.stroke();
        ctx.restore();
      }

      // HIỆU ỨNG LÓE SÁNG ÁNH BẠC của Đấu Sĩ (khi va chạm với bóng khác trong lúc bật Chiêu 2, và khi kết thúc Chiêu 2)
      if (actor.silverFlashRemaining > 0) {
        const flashRatio = Math.min(1, actor.silverFlashRemaining / 0.45);
        const expand = 1 - flashRatio;
        ctx.save();

        // Quầng lóe bạc trắng chói lọi
        const flashGrad = ctx.createRadialGradient(
          0,
          0,
          2,
          0,
          0,
          BALL_RADIUS + 18 + expand * 36
        );
        flashGrad.addColorStop(0, `rgba(255, 255, 255, ${0.98 * flashRatio})`);
        flashGrad.addColorStop(0.45, `rgba(241, 245, 249, ${0.85 * flashRatio})`);
        flashGrad.addColorStop(0.8, `rgba(203, 213, 225, ${0.45 * flashRatio})`);
        flashGrad.addColorStop(1, 'rgba(148, 163, 184, 0)');
        ctx.fillStyle = flashGrad;
        ctx.beginPath();
        ctx.arc(0, 0, BALL_RADIUS + 18 + expand * 36, 0, Math.PI * 2);
        ctx.fill();

        // Vòng sóng ánh bạc bung ra
        ctx.strokeStyle = `rgba(255, 255, 255, ${flashRatio})`;
        ctx.lineWidth = 4 * flashRatio;
        ctx.beginPath();
        ctx.arc(0, 0, BALL_RADIUS + 8 + expand * 30, 0, Math.PI * 2);
        ctx.stroke();

        // 8 tia sao ánh bạc sắc lẹm
        ctx.strokeStyle = `rgba(248, 250, 252, ${flashRatio})`;
        ctx.lineWidth = 2.6;
        for (let r = 0; r < 8; r++) {
          const rAng = (r * Math.PI) / 4;
          const innerR = BALL_RADIUS * 0.7;
          const outerR = BALL_RADIUS + 20 + (r % 2 === 0 ? 14 : 6) * (0.6 + expand * 0.5);
          ctx.beginPath();
          ctx.moveTo(Math.cos(rAng) * innerR, Math.sin(rAng) * innerR);
          ctx.lineTo(Math.cos(rAng) * outerR, Math.sin(rAng) * outerR);
          ctx.stroke();
        }

        ctx.restore();
      }

      // Hiệu ứng Khiên Khẩn Cấp Cấp 5 Phòng Thủ (<10% HP)
      if (actor.emergencyShieldActive) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, BALL_RADIUS + 14, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(250, 204, 21, 0.2)';
        ctx.fill();
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }

      // CHIÊU 1 ĐẤU SĨ (PHÒNG THỦ TOÀN DIỆN): 5 chiếc khiên xoay quanh quả bóng với tốc độ cao và phát sáng
      if (actor.fiveShieldsRemaining > 0) {
        const nowMs = performance.now();
        const baseRot = nowMs * 0.022; // Xoay tốc độ cao quanh quả bóng
        ctx.save();

        // Vòng hào quang nối 5 chiếc khiên phát sáng
        ctx.strokeStyle = 'rgba(125, 211, 252, 0.65)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, BALL_RADIUS + 20, 0, Math.PI * 2);
        ctx.stroke();

        for (let k = 0; k < 5; k++) {
          const ang = baseRot + (k * Math.PI * 2) / 5;
          const sx = Math.cos(ang) * (BALL_RADIUS + 20);
          const sy = Math.sin(ang) * (BALL_RADIUS + 20);
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(ang);

          // Phát sáng rực rỡ trên mỗi chiếc khiên
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 16;

          // Thân khiên hiệp sĩ thu nhỏ phát sáng
          const sGrad = ctx.createLinearGradient(-6, -11, 6, 11);
          sGrad.addColorStop(0, '#ffffff');
          sGrad.addColorStop(0.5, '#e0f2fe');
          sGrad.addColorStop(1, '#94a3b8');
          ctx.fillStyle = sGrad;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-5, -11);
          ctx.lineTo(3, -11);
          ctx.quadraticCurveTo(8, 0, 0, 12);
          ctx.quadraticCurveTo(-6, 5, -5, -11);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Chữ thập phát sáng giữa khiên
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(0, -9);
          ctx.lineTo(0, 9);
          ctx.moveTo(-4, -1);
          ctx.lineTo(4, -1);
          ctx.stroke();

          ctx.restore();
        }
        ctx.restore();
      }

      // PHÁP SƯ GIÓ: Luồng gió xoay nhẹ & lá xanh bay quanh thân (bừng sáng khi tung chiêu hoặc kích hoạt Thuận Phong)
      if (actor.ball.weaponType === 'wind_staff') {
        const nowMs = performance.now();
        const isCastingWind = actor.staffCastTiltTimer > 0 || actor.windCastChargeRemaining > 0;
        const hasTailwind = actor.tailwindRemaining > 0;
        const rotSpeed = hasTailwind ? 0.0095 : isCastingWind ? 0.0075 : 0.0038;
        const baseRot = nowMs * rotSpeed;

        ctx.save();
        if (hasTailwind || isCastingWind) {
          const auraR = BALL_RADIUS + (hasTailwind ? 28 : 24);
          const windGlow = ctx.createRadialGradient(0, 0, BALL_RADIUS * 0.4, 0, 0, auraR);
          windGlow.addColorStop(0, 'rgba(187, 247, 208, 0.35)');
          windGlow.addColorStop(0.6, 'rgba(134, 239, 172, 0.28)');
          windGlow.addColorStop(1, 'rgba(22, 163, 74, 0)');
          ctx.fillStyle = windGlow;
          ctx.beginPath();
          ctx.arc(0, 0, auraR, 0, Math.PI * 2);
          ctx.fill();
        }

        // Các vòng gió xoáy xanh ngọc mỏng xoay quanh thân Pháp Sư Gió
        const arcCount = hasTailwind ? 3 : 2;
        for (let w = 0; w < arcCount; w++) {
          const startA = baseRot + (w * Math.PI * 2) / arcCount;
          ctx.strokeStyle =
            w % 2 === 0
              ? hasTailwind
                ? 'rgba(187, 247, 208, 0.92)'
                : 'rgba(134, 239, 172, 0.65)'
              : 'rgba(74, 222, 128, 0.55)';
          ctx.lineWidth = hasTailwind ? 2.6 : 1.9;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(0, 0, BALL_RADIUS + 11 + w * 3.5, startA, startA + Math.PI * 0.72);
          ctx.stroke();
        }

        // Lá xanh bay nhẹ theo dòng khí quanh bóng
        for (let lf = 0; lf < 3; lf++) {
          const lAng = baseRot * 1.15 + (lf * Math.PI * 2) / 3;
          const lR = BALL_RADIUS + 15 + Math.sin(nowMs * 0.004 + lf * 2) * 3;
          const lx = Math.cos(lAng) * lR;
          const ly = Math.sin(lAng) * lR;
          ctx.save();
          ctx.translate(lx, ly);
          ctx.rotate(lAng + Math.PI * 0.35);
          ctx.fillStyle = lf % 2 === 0 ? '#86efac' : '#4ade80';
          ctx.beginPath();
          ctx.ellipse(0, 0, 4.2, 2.0, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }

      // Vẽ Vũ Khí Đặc Trưng
      ctx.save();
      ctx.rotate(actor.weaponAngle);
      switch (actor.ball.weaponType) {
        case 'bow': {
          // Cây cung hướng về đối phương + hiệu ứng kéo dây cung trong 5 giây
          const isChargingSkill2 = actor.chargeShotWindupRemaining > 0;
          const chargeProgress = isChargingSkill2
            ? 1 - actor.chargeShotWindupRemaining / 0.5
            : 0;
          const pullRatio = isChargingSkill2
            ? 0.85 + chargeProgress * 0.35
            : Math.min(1, actor.bowDrawTimer / 3.0);
          const stringPull = -8.5 * pullRatio;

          // Hiệu ứng Tụ Lực Chiêu 2 ngay trên thân cung (vòng xoáy kim quang + tia năng lượng hội tụ)
          if (isChargingSkill2 || actor.chargeShotAuraRemaining > 0.6) {
            const pulse = 0.85 + Math.sin(performance.now() * 0.03) * 0.15;
            ctx.save();
            // Hào quang lửa vàng cam bùng cháy quanh đầu mũi tên tụ lực
            const chargeGrad = ctx.createRadialGradient(
              BALL_RADIUS + 18,
              0,
              2,
              BALL_RADIUS + 14,
              0,
              34 * pulse
            );
            chargeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            chargeGrad.addColorStop(0.35, 'rgba(253, 224, 71, 0.85)');
            chargeGrad.addColorStop(0.7, 'rgba(245, 158, 11, 0.45)');
            chargeGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
            ctx.fillStyle = chargeGrad;
            ctx.beginPath();
            ctx.arc(BALL_RADIUS + 16, 0, 34 * pulse, 0, Math.PI * 2);
            ctx.fill();

            // Vòng sóng khí xoáy quanh cung khi tụ lực
            ctx.strokeStyle = 'rgba(254, 240, 138, 0.8)';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.ellipse(BALL_RADIUS + 8, 0, 12, 26 * pulse, 0, -Math.PI * 0.6, Math.PI * 0.6);
            ctx.stroke();
            ctx.restore();
          }

          // Cánh cung vàng đồng viền nâu đậm
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 6.5;
          ctx.beginPath();
          ctx.arc(BALL_RADIUS - 2, 0, 20, -Math.PI * 0.45, Math.PI * 0.45);
          ctx.stroke();

          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(BALL_RADIUS - 2, 0, 20, -Math.PI * 0.45, Math.PI * 0.45);
          ctx.stroke();

          // Dây cung ánh vàng
          ctx.strokeStyle = '#fef3c7';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(BALL_RADIUS + 1, -19);
          ctx.lineTo(BALL_RADIUS - 4 + stringPull, 0);
          ctx.lineTo(BALL_RADIUS + 1, 19);
          ctx.stroke();

          // Mũi tên đang giương trên cung (màu nâu vàng như Hình 201213, rực sáng khi Tụ Lực Chiêu 2)
          const tailX = BALL_RADIUS - 4 + stringPull;
          const tipX = BALL_RADIUS + 26 + stringPull * 0.4;

          // Đuôi lông vũ chẻ đôi màu vàng nâu
          ctx.fillStyle = '#facc15';
          ctx.strokeStyle = '#92400e';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(tailX + 5, 0);
          ctx.lineTo(tailX - 3, -4.5);
          ctx.lineTo(tailX - 1, 0);
          ctx.lineTo(tailX - 3, 4.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Thân mũi tên màu nâu vàng
          ctx.strokeStyle = '#92400e';
          ctx.lineWidth = 4.6;
          ctx.beginPath();
          ctx.moveTo(tailX + 2, 0);
          ctx.lineTo(tipX - 5, 0);
          ctx.stroke();

          ctx.strokeStyle = isChargingSkill2 ? '#fef08a' : '#f59e0b';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(tailX + 2, 0);
          ctx.lineTo(tipX - 5, 0);
          ctx.stroke();

          // Đầu mũi tên hình thoi phát sáng vàng kim
          ctx.fillStyle = '#fef08a';
          ctx.strokeStyle = '#b45309';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(tipX + 4, 0);
          ctx.lineTo(tipX - 6, -4.5);
          ctx.lineTo(tipX - 4, 0);
          ctx.lineTo(tipX - 6, 4.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        }

        case 'boxing_gloves': {
          const isSpeedBall = actor.ball.id === 'speed';
          const isFlurryActive =
            !isSpeedBall &&
            (actor.flurryDashRemaining > 0 || actor.flurryBarrageRemaining > 0);
          const nowMs = performance.now();

          // CHIÊU 1 VÕ SĨ QUYỀN ANH: Hiệu ứng Đấm Liên Hoàn như Video 204332 (vệt hồ quang đỏ-vàng + chuỗi cú đấm kình lực phóng về phía trước)
          if (isFlurryActive) {
            ctx.save();
            // 1. Vòm kình lực (Shockwave Cone) phía trước hai nắm đấm
            const coneGrad = ctx.createRadialGradient(
              BALL_RADIUS + 14,
              0,
              4,
              BALL_RADIUS + 26,
              0,
              46
            );
            coneGrad.addColorStop(0, 'rgba(254, 240, 138, 0.65)');
            coneGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.38)');
            coneGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
            ctx.fillStyle = coneGrad;
            ctx.beginPath();
            ctx.arc(BALL_RADIUS + 10, 0, 46, -Math.PI * 0.42, Math.PI * 0.42);
            ctx.lineTo(BALL_RADIUS + 10, 0);
            ctx.closePath();
            ctx.fill();

            // 2. Các vệt hồ quang đấm xoay tròn đỏ - vàng cam (như giây 00:02-00:03 trong Video 204332)
            [-1, 1].forEach((sideDir, sIdx) => {
              const swingPhase = (nowMs * 0.022 + sIdx * Math.PI) % (Math.PI * 2);
              ctx.strokeStyle = sIdx === 0 ? '#fde047' : '#ef4444';
              ctx.lineWidth = 3.5;
              ctx.beginPath();
              ctx.arc(
                BALL_RADIUS + 8,
                sideDir * 6,
                28 + Math.sin(swingPhase) * 6,
                -Math.PI * 0.48,
                Math.PI * 0.48
              );
              ctx.stroke();
            });

            // 3. Những cú đấm kình lực (Phantom Punches) phóng liên hoàn ra phía trước
            for (let pIdx = 0; pIdx < 4; pIdx++) {
              const cycle = ((nowMs * 0.015 + pIdx * 0.25) % 1);
              const reach = BALL_RADIUS + 16 + cycle * 38;
              const spreadY =
                (pIdx % 2 === 0 ? -1 : 1) * (8 + Math.sin(nowMs * 0.03 + pIdx) * 7);
              const fistAlpha = (1 - cycle) * 0.85;

              ctx.save();
              ctx.globalAlpha = fistAlpha;

              // Vệt tia lửa đỏ-vàng nối theo cú đấm
              ctx.strokeStyle = pIdx % 2 === 0 ? '#fde047' : '#ef4444';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(BALL_RADIUS + 6, spreadY * 0.5);
              ctx.lineTo(reach, spreadY);
              ctx.stroke();

              // Quả đấm kình lực phóng đại
              ctx.fillStyle = pIdx % 2 === 0 ? '#ef4444' : '#f97316';
              ctx.strokeStyle = '#fef08a';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(reach, spreadY, 9.5 + (1 - cycle) * 3, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
              ctx.restore();
            }
            ctx.restore();
          }

          const jabOffset = isFlurryActive
            ? Math.sin(nowMs * 0.065) * 14
            : Math.sin(nowMs * 0.012) * 3;
          [-0.45, 0.45].forEach((angleOff, idx) => {
            ctx.save();
            ctx.rotate(angleOff);
            const dist = BALL_RADIUS + 13 + (idx === 0 ? jabOffset : -jabOffset);
            ctx.fillStyle = isSpeedBall
              ? '#0284c7'
              : actor.rageSkillRemaining > 0
              ? '#f87171'
              : '#dc2626';
            ctx.strokeStyle = actor.rageSkillRemaining > 0 ? '#fef08a' : '#09090b';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(dist, 0, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          });
          break;
        }

        case 'greatsword': {
          // THANH ĐẠI KIẾM DRAGON SLAYER (như Hình 210112) + CHIÊU 3 TỎA AURA VÀNG KIM & PHÁT SÁNG
          const isBuffed = actor.greatswordBuffRemaining > 0;
          const nowMs = performance.now();
          ctx.save();

          if (isBuffed) {
            const pulse = 1 + Math.sin(nowMs * 0.018) * 0.12;
            // Quầng Aura Vàng Kim tỏa rộng quanh thanh đại kiếm khi cường hóa Chiêu 3
            const auraGrad = ctx.createRadialGradient(
              BALL_RADIUS + 38,
              0,
              4,
              BALL_RADIUS + 38,
              0,
              46 * pulse
            );
            auraGrad.addColorStop(0, 'rgba(254, 249, 195, 0.92)');
            auraGrad.addColorStop(0.45, 'rgba(250, 204, 21, 0.62)');
            auraGrad.addColorStop(0.8, 'rgba(234, 179, 8, 0.28)');
            auraGrad.addColorStop(1, 'rgba(161, 98, 7, 0)');
            ctx.fillStyle = auraGrad;
            ctx.beginPath();
            ctx.ellipse(BALL_RADIUS + 38, 0, 48 * pulse, 22 * pulse, 0, 0, Math.PI * 2);
            ctx.fill();

            // Các tia hồ quang vàng kim lấp lánh dọc thân kiếm
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 2;
            for (let s = 0; s < 3; s++) {
              const sx = BALL_RADIUS + 18 + ((nowMs * 0.06 + s * 18) % 48);
              const sy = (s % 2 === 0 ? -1 : 1) * (10 + Math.sin(nowMs * 0.03 + s) * 3);
              ctx.beginPath();
              ctx.moveTo(sx - 5, sy);
              ctx.lineTo(sx + 5, sy * 0.6);
              ctx.stroke();
            }

            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = 22;
          }

          // 1. Dải vải / lụa quấn bay phấp phới ở chuôi kiếm (như Hình 210112)
          const clothWave = Math.sin(nowMs * 0.012) * 3;
          ctx.fillStyle = isBuffed ? '#fef9c3' : '#e2e8f0';
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(BALL_RADIUS - 3, -2);
          ctx.quadraticCurveTo(
            BALL_RADIUS - 9,
            -13 + clothWave,
            BALL_RADIUS - 2,
            -19 + clothWave
          );
          ctx.quadraticCurveTo(
            BALL_RADIUS + 3,
            -12 + clothWave,
            BALL_RADIUS + 1,
            -2
          );
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // 2. Cán đại kiếm quấn băng vải trắng xám + đốc kiếm kim loại (Pommel)
          ctx.fillStyle = '#cbd5e1';
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 2;
          ctx.fillRect(BALL_RADIUS - 2, -3.2, 13, 6.4);
          ctx.strokeRect(BALL_RADIUS - 2, -3.2, 13, 6.4);

          // Các vòng dây băng quấn chéo trên cán kiếm
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1.2;
          for (let gx = BALL_RADIUS; gx < BALL_RADIUS + 10; gx += 2.6) {
            ctx.beginPath();
            ctx.moveTo(gx, -3);
            ctx.lineTo(gx + 1.2, 3);
            ctx.stroke();
          }

          // Đốc kiếm (Pommel)
          ctx.fillStyle = isBuffed ? '#fde047' : '#94a3b8';
          ctx.beginPath();
          ctx.arc(BALL_RADIUS - 3, 0, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // 3. Thân Đại Kiếm khổng lồ bản rộng (Hai rìa lưỡi vát sáng bạc/vàng kim bên ngoài)
          const bladeOuterGrad = ctx.createLinearGradient(
            BALL_RADIUS + 11,
            -11,
            BALL_RADIUS + 74,
            11
          );
          if (isBuffed) {
            bladeOuterGrad.addColorStop(0, '#fef9c3');
            bladeOuterGrad.addColorStop(0.5, '#fde047');
            bladeOuterGrad.addColorStop(1, '#ffffff');
          } else {
            bladeOuterGrad.addColorStop(0, '#cbd5e1');
            bladeOuterGrad.addColorStop(0.5, '#f8fafc');
            bladeOuterGrad.addColorStop(1, '#94a3b8');
          }
          ctx.fillStyle = bladeOuterGrad;
          ctx.strokeStyle = isBuffed ? '#eab308' : '#09090b';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(BALL_RADIUS + 11, -11);
          ctx.lineTo(BALL_RADIUS + 62, -8.5);
          ctx.lineTo(BALL_RADIUS + 76, 0);
          ctx.lineTo(BALL_RADIUS + 62, 8.5);
          ctx.lineTo(BALL_RADIUS + 11, 11);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // 4. Sống kiếm sắt đen thẫm bản rộng ở chính giữa (như Hình 210112)
          ctx.fillStyle = isBuffed ? '#713f12' : '#09090b';
          ctx.beginPath();
          ctx.moveTo(BALL_RADIUS + 11, -6.5);
          ctx.lineTo(BALL_RADIUS + 59, -4.8);
          ctx.lineTo(BALL_RADIUS + 68, 0);
          ctx.lineTo(BALL_RADIUS + 59, 4.8);
          ctx.lineTo(BALL_RADIUS + 11, 6.5);
          ctx.closePath();
          ctx.fill();

          // Vết xước kim loại chéo trên lưỡi kiếm
          ctx.strokeStyle = isBuffed
            ? 'rgba(254, 240, 138, 0.85)'
            : 'rgba(226, 232, 240, 0.55)';
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(BALL_RADIUS + 34, -8);
          ctx.lineTo(BALL_RADIUS + 42, 7.5);
          ctx.moveTo(BALL_RADIUS + 48, -6.5);
          ctx.lineTo(BALL_RADIUS + 54, 6.5);
          ctx.stroke();

          // 5. Khuyên tròn và vòng bán nguyệt kim loại ở gốc lưỡi kiếm (chi tiết đặc trưng Hình 210112)
          ctx.strokeStyle = isBuffed ? '#fde047' : '#94a3b8';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(BALL_RADIUS + 12, 0, 5.5, -Math.PI * 0.45, Math.PI * 0.45);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(BALL_RADIUS + 15.5, 0, 2.2, 0, Math.PI * 2);
          ctx.stroke();

          ctx.restore();
          break;
        }

        case 'katana': {
          // THANH KIẾM KATANA SAMURAI SẮC BÉN (như Hình 211256)
          ctx.save();

          // 1. Cán kiếm (Tsuka) màu đen dài với họa tiết dây quấn hình thoi (Tsuka-ito)
          ctx.fillStyle = '#18181b';
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(BALL_RADIUS - 4, -2.8, 15, 5.6, 1.5);
          ctx.fill();
          ctx.stroke();

          // Họa tiết hình thoi xám bạc trên cán kiếm đen
          ctx.fillStyle = '#71717a';
          for (let hx = BALL_RADIUS - 1.5; hx < BALL_RADIUS + 9; hx += 3.2) {
            ctx.beginPath();
            ctx.moveTo(hx, -1.6);
            ctx.lineTo(hx + 1.3, 0);
            ctx.lineTo(hx, 1.6);
            ctx.lineTo(hx - 1.3, 0);
            ctx.closePath();
            ctx.fill();
          }

          // 2. Chắn tay tròn dẹt màu đen viền thép (Tsuba)
          ctx.fillStyle = '#09090b';
          ctx.strokeStyle = '#52525b';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.ellipse(BALL_RADIUS + 11.5, 0, 2.2, 6.8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // 3. Cổ kiếm bằng đồng vàng (Habaki) ngay sát chắn tay (như Hình 211256)
          ctx.fillStyle = '#eab308';
          ctx.strokeStyle = '#713f12';
          ctx.lineWidth = 1.2;
          ctx.fillRect(BALL_RADIUS + 13.5, -2.5, 4.5, 5);
          ctx.strokeRect(BALL_RADIUS + 13.5, -2.5, 4.5, 5);

          // 4. Lưỡi kiếm Katana cong nhẹ mảnh mai sắc lạnh (2 tông màu: sống kiếm thép sẫm + lưỡi kiếm bạc trắng)
          // Phần lưỡi tổng thể
          const katanaGrad = ctx.createLinearGradient(
            BALL_RADIUS + 18,
            -4,
            BALL_RADIUS + 68,
            4
          );
          katanaGrad.addColorStop(0, '#cbd5e1');
          katanaGrad.addColorStop(0.5, '#ffffff');
          katanaGrad.addColorStop(1, '#e2e8f0');
          ctx.fillStyle = katanaGrad;
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(BALL_RADIUS + 18, -2.5);
          ctx.quadraticCurveTo(BALL_RADIUS + 44, -6.2, BALL_RADIUS + 68, -1.5);
          ctx.lineTo(BALL_RADIUS + 64, 2.6);
          ctx.quadraticCurveTo(BALL_RADIUS + 42, -0.8, BALL_RADIUS + 18, 2.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Sống lưng kiếm (Mune) màu xám thép đậm chạy dọc mép trên
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(BALL_RADIUS + 18, -1.6);
          ctx.quadraticCurveTo(BALL_RADIUS + 44, -5.0, BALL_RADIUS + 66, -1.1);
          ctx.stroke();

          // Đường vân lưỡi kiếm sáng trắng (Hamon)
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(BALL_RADIUS + 19, 1.2);
          ctx.quadraticCurveTo(BALL_RADIUS + 43, -2.2, BALL_RADIUS + 64, 1.4);
          ctx.stroke();

          ctx.restore();
          break;
        }

        case 'shield': {
          // KHIÊN HIỆP SĨ BẠC CHỮ THẬP ĐINH TÁN (như Hình 231006)
          ctx.save();
          ctx.translate(BALL_RADIUS + 14, 0);

          const shieldGrad = ctx.createLinearGradient(-7, -16, 9, 16);
          shieldGrad.addColorStop(0, '#f8fafc');
          shieldGrad.addColorStop(0.5, '#cbd5e1');
          shieldGrad.addColorStop(1, '#64748b');
          ctx.fillStyle = shieldGrad;
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 2.4;

          // Dáng khiên hiệp sĩ (Heater Shield) nhìn từ trên xuống/nghiêng bên sườn bóng
          ctx.beginPath();
          ctx.moveTo(-5, -16);
          ctx.quadraticCurveTo(0, -19, 6, -15);
          ctx.quadraticCurveTo(10, 0, 0, 18);
          ctx.quadraticCurveTo(-8, 6, -5, -16);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Chữ thập kim loại nổi ở tâm khiên
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.moveTo(0, -15);
          ctx.lineTo(0, 15);
          ctx.moveTo(-5, -2);
          ctx.lineTo(6, -2);
          ctx.stroke();

          // Đinh tán tròn trên thanh chữ thập
          ctx.fillStyle = '#334155';
          [
            [0, -10],
            [0, -2],
            [0, 7],
            [-3, -2],
            [3.5, -2],
          ].forEach(([rx, ry]) => {
            ctx.beginPath();
            ctx.arc(rx, ry, 1.1, 0, Math.PI * 2);
            ctx.fill();
          });

          ctx.restore();
          break;
        }

        case 'dual_daggers': {
          // VŨ KHÍ SÁT THỦ: ĐAO SĂN DAMASCUS CÁN ĐẦU SÓI (như Hình 231249) + TĂNG 15% TẦM ĐÁNH (vươn tới BALL_RADIUS + 35)
          [0, Math.PI].forEach((rot) => {
            ctx.save();
            ctx.rotate(rot);

            // 1. Đầu Sói/Gấu bằng bạc nhe nanh ở đốc cán đao (Pommel)
            ctx.fillStyle = '#cbd5e1';
            ctx.strokeStyle = '#09090b';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(BALL_RADIUS + 1.5, 0, 3.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 2. Cán gỗ mun đen bóng uốn lượn công thái học (Ergonomic Black Handle)
            ctx.fillStyle = '#18181b';
            ctx.strokeStyle = '#09090b';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(BALL_RADIUS + 3, -2.8);
            ctx.quadraticCurveTo(BALL_RADIUS + 7.5, -3.6, BALL_RADIUS + 12, -2.5);
            ctx.lineTo(BALL_RADIUS + 12, 3.0);
            ctx.quadraticCurveTo(BALL_RADIUS + 7.5, 1.8, BALL_RADIUS + 3, 2.8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 3. Cổ đao kim loại bạc khắc hình tam giác (Bolster)
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath();
            ctx.moveTo(BALL_RADIUS + 11.5, -3.6);
            ctx.lineTo(BALL_RADIUS + 15, -3.2);
            ctx.lineTo(BALL_RADIUS + 15, 4.6);
            ctx.lineTo(BALL_RADIUS + 11.5, 3.2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 4. Lưỡi đao săn cong sắc bén (Tăng 15% tầm đánh: vươn dài tới BALL_RADIUS + 35)
            // Lưỡi cắt sắc bén màu bạc sáng ở mép dưới
            const bladeGrad = ctx.createLinearGradient(
              BALL_RADIUS + 15,
              -4,
              BALL_RADIUS + 35,
              5
            );
            bladeGrad.addColorStop(0, '#cbd5e1');
            bladeGrad.addColorStop(0.55, '#f8fafc');
            bladeGrad.addColorStop(1, '#ffffff');
            ctx.fillStyle = bladeGrad;
            ctx.strokeStyle = '#09090b';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(BALL_RADIUS + 15, -3.5);
            ctx.lineTo(BALL_RADIUS + 26, -4.2);
            ctx.lineTo(BALL_RADIUS + 35.5, -0.5); // Mũi đao nhọn vươn xa (+15% tầm đánh)
            ctx.quadraticCurveTo(BALL_RADIUS + 26, 6.2, BALL_RADIUS + 15, 4.2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Sống lưng đao vân đá đen nhám (Dark textured spine như Hình 231249)
            ctx.fillStyle = '#18181b';
            ctx.beginPath();
            ctx.moveTo(BALL_RADIUS + 15, -3.3);
            ctx.lineTo(BALL_RADIUS + 25.5, -3.9);
            ctx.lineTo(BALL_RADIUS + 32.5, -0.8);
            ctx.quadraticCurveTo(BALL_RADIUS + 24, 1.2, BALL_RADIUS + 15, 0.5);
            ctx.closePath();
            ctx.fill();

            // Vân thép Damascus gợn sóng bạc-xám chạy giữa lưỡi đao
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(BALL_RADIUS + 16, 1.5);
            ctx.quadraticCurveTo(BALL_RADIUS + 24, 3.2, BALL_RADIUS + 32, 0.2);
            ctx.stroke();

            ctx.restore();
          });
          break;
        }

        case 'fire_staff': {
          // TRƯỢNG PHÉP HỎA (như Hình 111731): Luôn hướng về kẻ địch; khi tung chiêu ngã về phía trước 15 độ rồi trở về vị trí ban đầu
          const nowMs = performance.now();
          const tiltFactor =
            actor.staffCastTiltTimer > 0
              ? Math.sin((actor.staffCastTiltTimer / 0.45) * Math.PI)
              : 0;
          const tiltAngle = tiltFactor * ((15 * Math.PI) / 180);

          ctx.save();
          ctx.translate(tiltFactor * 6, 0);
          ctx.rotate(tiltAngle);

          // 1. Đuôi trượng (Bottom finial) với 3 ngạnh lửa đen-đỏ ôm viên ngọc cam nhỏ
          ctx.fillStyle = '#09090b';
          ctx.strokeStyle = '#ea580c';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(BALL_RADIUS - 14, 0);
          ctx.quadraticCurveTo(BALL_RADIUS - 10, -5, BALL_RADIUS - 5, -3);
          ctx.lineTo(BALL_RADIUS - 5, 3);
          ctx.quadraticCurveTo(BALL_RADIUS - 10, 5, BALL_RADIUS - 14, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#fb923c';
          ctx.beginPath();
          ctx.arc(BALL_RADIUS - 9, 0, 2.2, 0, Math.PI * 2);
          ctx.fill();

          // 2. Thân cán trượng dài màu đen bóng với hai đoạn bọc đỏ cam ánh vàng & vòng nhẫn vàng
          ctx.fillStyle = '#18181b';
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 2;
          ctx.fillRect(BALL_RADIUS - 5, -2.2, 34, 4.4);
          ctx.strokeRect(BALL_RADIUS - 5, -2.2, 34, 4.4);

          // Hai đoạn bọc đỏ cam trên cán trượng
          ctx.fillStyle = '#c2410c';
          ctx.fillRect(BALL_RADIUS - 3, -2, 7, 4);
          ctx.fillRect(BALL_RADIUS + 18, -2, 8, 4);

          // Các vòng nhẫn vàng ở khớp nối
          ctx.fillStyle = '#facc15';
          ctx.fillRect(BALL_RADIUS + 4, -2.6, 2, 5.2);
          ctx.fillRect(BALL_RADIUS + 17, -2.6, 2, 5.2);

          // 3. Cổ trượng uốn cong hình sừng ngang (Crossbar) + 2 bùa ngọc treo hai bên
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.moveTo(BALL_RADIUS + 29, -11);
          ctx.quadraticCurveTo(BALL_RADIUS + 32, 0, BALL_RADIUS + 29, 11);
          ctx.stroke();
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 1.4;
          ctx.stroke();

          // Hai tua bùa ngọc treo ở cổ trượng
          [-1, 1].forEach((sideDir) => {
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(BALL_RADIUS + 29, sideDir * 9);
            ctx.lineTo(BALL_RADIUS + 24, sideDir * 13);
            ctx.stroke();
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.arc(BALL_RADIUS + 23.5, sideDir * 13.5, 2.2, 0, Math.PI * 2);
            ctx.fill();
          });

          // Ngọc cam nhỏ ở tâm cổ trượng
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(BALL_RADIUS + 30.5, 0, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // 4. Đầu Trượng Phép Hỏa: Hai sừng cong vút màu đen pha sọc lửa cam-đỏ ôm đài lửa & ngọc lớn
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = actor.fireballChargeRemaining > 0 || actor.phoenixChargeRemaining > 0 ? 22 : 10;

          // Sừng trên và sừng dưới uốn lưỡi liềm hướng về phía trước (+X)
          [-1, 1].forEach((dir) => {
            ctx.fillStyle = '#18181b';
            ctx.strokeStyle = '#ea580c';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(BALL_RADIUS + 32, dir * 2);
            ctx.quadraticCurveTo(BALL_RADIUS + 38, dir * 18, BALL_RADIUS + 56, dir * 10);
            ctx.quadraticCurveTo(BALL_RADIUS + 44, dir * 12, BALL_RADIUS + 37, dir * 3);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Vệt lửa cam sáng bên trong mặt sừng
            ctx.strokeStyle = '#fb923c';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(BALL_RADIUS + 35, dir * 5);
            ctx.quadraticCurveTo(BALL_RADIUS + 41, dir * 13, BALL_RADIUS + 51, dir * 9.5);
            ctx.stroke();
          });

          // Đài hoa lửa cam rực ở chính giữa đầu trượng
          ctx.fillStyle = '#ea580c';
          ctx.beginPath();
          ctx.ellipse(BALL_RADIUS + 39, 0, 6.5, 5.2, 0, 0, Math.PI * 2);
          ctx.fill();

          // Viên ngọc hỏa diễm lớn màu cam vàng phát sáng
          const gemGrad = ctx.createRadialGradient(
            BALL_RADIUS + 38,
            -1,
            1,
            BALL_RADIUS + 39,
            0,
            5.5
          );
          gemGrad.addColorStop(0, '#fef9c3');
          gemGrad.addColorStop(0.5, '#f59e0b');
          gemGrad.addColorStop(1, '#dc2626');
          ctx.fillStyle = gemGrad;
          ctx.strokeStyle = '#7c2d12';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.ellipse(BALL_RADIUS + 39.5, 0, 5.2, 3.8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Viên ngọc nhỏ lơ lửng phía trước giữa hai đầu sừng
          const floatPulse = Math.sin(nowMs * 0.01) * 1.4;
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(BALL_RADIUS + 50 + floatPulse, 0, 2.6, 0, Math.PI * 2);
          ctx.fill();

          // 5. Hiệu ứng Tụ Cầu Lửa (Chiêu 1 - 1s như Hình 112639) ngay trước đầu trượng
          if (actor.fireballChargeRemaining > 0) {
            const chargeProgress = Math.min(1, 1 - actor.fireballChargeRemaining / 1.0);
            const r = 6 + chargeProgress * 15;
            const cx = BALL_RADIUS + 54;
            const smokeGrad = ctx.createRadialGradient(cx, 0, r * 0.2, cx, 0, r * 1.35);
            smokeGrad.addColorStop(0, '#fef08a');
            smokeGrad.addColorStop(0.45, '#f97316');
            smokeGrad.addColorStop(0.78, 'rgba(185, 28, 28, 0.85)');
            smokeGrad.addColorStop(1, 'rgba(24, 24, 27, 0)');
            ctx.fillStyle = smokeGrad;
            ctx.beginPath();
            ctx.arc(cx, 0, r * 1.35, 0, Math.PI * 2);
            ctx.fill();

            // Các cụm lửa cuộn xoáy quanh quả cầu đang tụ
            for (let k = 0; k < 6; k++) {
              const pa = (k * Math.PI) / 3 + nowMs * 0.012;
              const px = cx + Math.cos(pa) * r * 0.72;
              const py = Math.sin(pa) * r * 0.72;
              ctx.fillStyle = k % 2 === 0 ? 'rgba(251, 146, 60, 0.85)' : 'rgba(63, 25, 18, 0.6)';
              ctx.beginPath();
              ctx.arc(px, py, r * 0.42, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // 6. Hiệu ứng Tụ Hỏa Thần Phượng Hoàng (Chiêu 3 - 0.5s)
          if (actor.phoenixChargeRemaining > 0) {
            const pProg = Math.min(1, 1 - actor.phoenixChargeRemaining / 0.5);
            const cx = BALL_RADIUS + 50;
            ctx.strokeStyle = `rgba(253, 224, 71, ${0.5 + pProg * 0.5})`;
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            ctx.arc(cx, 0, 10 + pProg * 12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
            ctx.fill();
          }

          ctx.restore();
          break;
        }

        case 'ice_staff': {
          // TRƯỢNG PHÉP BĂNG (như Hình 193722): Cán gỗ nâu vàng quấn dải băng xanh, cổ rồng xanh đậm, đầu tinh thể băng phát sáng
          // Luôn hướng về đối thủ; khi tung chiêu ngã về trước 15 độ rồi trở về vị trí ban đầu
          const nowMs = performance.now();
          const tiltFactor =
            actor.staffCastTiltTimer > 0
              ? Math.sin((actor.staffCastTiltTimer / 0.45) * Math.PI)
              : 0;
          const tiltAngle = tiltFactor * ((15 * Math.PI) / 180);

          ctx.save();
          ctx.translate(tiltFactor * 6, 0);
          ctx.rotate(tiltAngle);

          // 1. Đuôi trượng (Bottom pommel) vàng kim bọc tinh thể băng xanh
          ctx.fillStyle = '#d97706';
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(BALL_RADIUS - 14, 0);
          ctx.lineTo(BALL_RADIUS - 7, -5.2);
          ctx.lineTo(BALL_RADIUS - 4, 0);
          ctx.lineTo(BALL_RADIUS - 7, 5.2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#7dd3fc';
          ctx.beginPath();
          ctx.arc(BALL_RADIUS - 9, 0, 2.4, 0, Math.PI * 2);
          ctx.fill();

          // 2. Thân cán trượng hơi uốn nhẹ màu nâu vàng quấn ruy-băng băng xanh
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 6.2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(BALL_RADIUS - 5, 0);
          ctx.quadraticCurveTo(BALL_RADIUS + 12, -2.5, BALL_RADIUS + 29, 0);
          ctx.stroke();

          ctx.strokeStyle = '#b45309';
          ctx.lineWidth = 3.6;
          ctx.stroke();

          // Dải băng xanh quấn xoắn quanh thân trượng
          ctx.strokeStyle = '#bae6fd';
          ctx.lineWidth = 1.6;
          for (let w = 0; w < 5; w++) {
            const wx = BALL_RADIUS + w * 6.2;
            ctx.beginPath();
            ctx.moveTo(wx, -2.5);
            ctx.lineTo(wx + 3.2, 2.5);
            ctx.stroke();
          }

          // 3. Cổ trượng xanh dương đậm dạng vảy rồng ôm chặt đầu băng
          ctx.fillStyle = '#1e3a8a';
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(BALL_RADIUS + 25, -4.5);
          ctx.quadraticCurveTo(BALL_RADIUS + 34, -8.5, BALL_RADIUS + 40, -4);
          ctx.lineTo(BALL_RADIUS + 40, 4);
          ctx.quadraticCurveTo(BALL_RADIUS + 34, 8.5, BALL_RADIUS + 25, 4.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Vòng vàng nhỏ ở cổ trượng
          ctx.fillStyle = '#facc15';
          ctx.fillRect(BALL_RADIUS + 24, -3.5, 2.6, 7);

          // 4. Đầu Trượng Phép Băng: Khối tinh thể băng góc cạnh phát sáng xanh ngọc (như Hình 193722)
          const iceAura =
            actor.iceSwordSummonRemaining > 0 || actor.iceSwordQueueCount > 0 ? 22 : 12;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = iceAura;

          const crystalGrad = ctx.createLinearGradient(
            BALL_RADIUS + 33,
            -10,
            BALL_RADIUS + 56,
            10
          );
          crystalGrad.addColorStop(0, '#0284c7');
          crystalGrad.addColorStop(0.5, '#38bdf8');
          crystalGrad.addColorStop(1, '#e0f2fe');

          ctx.fillStyle = crystalGrad;
          ctx.strokeStyle = '#0369a1';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(BALL_RADIUS + 33, -6);
          ctx.lineTo(BALL_RADIUS + 40, -11);
          ctx.lineTo(BALL_RADIUS + 44, -6);
          ctx.lineTo(BALL_RADIUS + 57, -1); // Đỉnh nhọn tinh thể băng
          ctx.lineTo(BALL_RADIUS + 47, 7);
          ctx.lineTo(BALL_RADIUS + 40, 11);
          ctx.lineTo(BALL_RADIUS + 33, 6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Các mặt cắt phản quang trắng sáng trên khối băng
          ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
          ctx.beginPath();
          ctx.moveTo(BALL_RADIUS + 38, -2);
          ctx.lineTo(BALL_RADIUS + 45, -5.5);
          ctx.lineTo(BALL_RADIUS + 54, -1);
          ctx.lineTo(BALL_RADIUS + 44, 2);
          ctx.closePath();
          ctx.fill();

          // Đốm sáng lạnh lơ lửng quanh đầu trượng
          const crystalPulse = 0.75 + Math.sin(nowMs * 0.012) * 0.25;
          ctx.fillStyle = `rgba(224, 242, 254, ${crystalPulse})`;
          ctx.beginPath();
          ctx.arc(BALL_RADIUS + 48, -8, 1.8, 0, Math.PI * 2);
          ctx.arc(BALL_RADIUS + 52, 6, 1.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
          break;
        }

        case 'earth_staff': {
          const nowMs = performance.now();
          if (actor.earthMaceRemaining > 0) {
            // CHIÊU 1 PHÁP SƯ THỔ: TRÙY ĐẤT KHỔNG LỒ (như Hình 095107) — tầm đánh x1.5 Đại Kiếm (vươn tới BALL_RADIUS + 93)
            ctx.save();
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 14;

            // 1. Cán gỗ chạm khắc xoắn dài tới BALL_RADIUS + 46
            ctx.fillStyle = '#5c3a21';
            ctx.strokeStyle = '#09090b';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.roundRect(BALL_RADIUS - 4, -4, 50, 8, 2);
            ctx.fill();
            ctx.stroke();

            // Vân gỗ xoắn trên cán trùy
            ctx.strokeStyle = '#92400e';
            ctx.lineWidth = 1.4;
            for (let gx = BALL_RADIUS + 2; gx < BALL_RADIUS + 40; gx += 7) {
              ctx.beginPath();
              ctx.moveTo(gx, -3);
              ctx.quadraticCurveTo(gx + 3, 0, gx + 5, 3);
              ctx.stroke();
            }

            // Vòng cổ đồng nối cán & đầu búa (Bronze Collar)
            ctx.fillStyle = '#d97706';
            ctx.strokeStyle = '#451a03';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.roundRect(BALL_RADIUS + 40, -7, 8, 14, 2);
            ctx.fill();
            ctx.stroke();

            // 2. Đầu búa đá xám xanh chia khối rãnh phát sáng hổ phách (BALL_RADIUS + 46 .. +82, rộng +-26)
            const headStart = BALL_RADIUS + 46;
            const headEnd = BALL_RADIUS + 82;
            const headMidX = (headStart + headEnd) / 2;

            // Ánh sáng hổ phách rực từ các khe nứt bên trong đầu búa
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(headStart + 2, -22, headEnd - headStart - 4, 44);

            // 4 khối góc đá xám xanh đậm có đinh tán đồng (như Hình 095107)
            const cornerBlocks = [
              { x: headStart, y: -26, w: 15, h: 17, rx: headStart + 7, ry: -17 },
              { x: headEnd - 15, y: -26, w: 15, h: 17, rx: headEnd - 7, ry: -17 },
              { x: headStart, y: 9, w: 15, h: 17, rx: headStart + 7, ry: 17 },
              { x: headEnd - 15, y: 9, w: 15, h: 17, rx: headEnd - 7, ry: 17 },
            ];
            for (const cb of cornerBlocks) {
              ctx.fillStyle = '#475569';
              ctx.strokeStyle = '#0f172a';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.roundRect(cb.x, cb.y, cb.w, cb.h, 3);
              ctx.fill();
              ctx.stroke();

              // Đinh tán đồng tròn ở mỗi góc
              ctx.fillStyle = '#c2410c';
              ctx.strokeStyle = '#fef08a';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.arc(cb.rx, cb.ry, 2.7, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            }

            // Hai khối đá sườn giữa trên-dưới
            ctx.fillStyle = '#64748b';
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.roundRect(headStart + 10, -24, 16, 13, 2);
            ctx.roundRect(headStart + 10, 11, 16, 13, 2);
            ctx.fill();
            ctx.stroke();

            // Khối thân trung tâm đá xám xanh ôm lõi ngọc bát giác phát sáng
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.roundRect(headStart + 3, -12, headEnd - headStart - 6, 24, 3);
            ctx.fill();
            ctx.stroke();

            // 3. Lõi ngọc bát giác nâu hổ phách rực sáng ở chính giữa đầu Trùy Đất
            const corePulse = 0.85 + Math.sin(nowMs * 0.015) * 0.15;
            ctx.strokeStyle = `rgba(254, 240, 138, ${corePulse})`;
            ctx.lineWidth = 2.6;
            const octR = 8.5;
            ctx.fillStyle = '#9a3412';
            ctx.beginPath();
            for (let k = 0; k < 8; k++) {
              const a = (k * Math.PI) / 4 + Math.PI / 8;
              const ox = headMidX + Math.cos(a) * octR;
              const oy = Math.sin(a) * octR;
              if (k === 0) ctx.moveTo(ox, oy);
              else ctx.lineTo(ox, oy);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Tia sáng hổ phách trên lõi
            ctx.fillStyle = 'rgba(251, 146, 60, 0.55)';
            ctx.beginPath();
            ctx.arc(headMidX - 2, -2, 3.5, 0, Math.PI * 2);
            ctx.fill();

            // 4. Đỉnh tinh thể đá nhọn màu xanh ngọc xám trên đầu búa (vươn tới BALL_RADIUS + 94)
            ctx.fillStyle = '#d97706';
            ctx.strokeStyle = '#451a03';
            ctx.lineWidth = 1.4;
            ctx.fillRect(headEnd - 1, -7, 4, 14);
            ctx.strokeRect(headEnd - 1, -7, 4, 14);

            ctx.fillStyle = '#38bdf8';
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(headEnd + 3, -6.5);
            ctx.lineTo(headEnd + 13, 0);
            ctx.lineTo(headEnd + 3, 6.5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#94a3b8';
            ctx.beginPath();
            ctx.moveTo(headEnd + 3, -6);
            ctx.lineTo(headEnd + 12, 0);
            ctx.lineTo(headEnd + 3, 0);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
          } else {
            // TRƯỢNG PHÉP THỔ (như Hình 093908): Cán gỗ quấn rễ cây nâu sẫm ôm viên đá tinh thể nâu nhọn
            // Luôn hướng về kẻ địch; khi tung chiêu ngã về phía trước 15 độ rồi trở về vị trí ban đầu
            const tiltFactor =
              actor.staffCastTiltTimer > 0
                ? Math.sin((actor.staffCastTiltTimer / 0.45) * Math.PI)
                : 0;
            const tiltAngle = tiltFactor * ((15 * Math.PI) / 180);

            ctx.save();
            ctx.translate(tiltFactor * 6, 0);
            ctx.rotate(tiltAngle);

            // 1. Thân cán gỗ màu nâu vàng mộc mạc
            ctx.strokeStyle = '#09090b';
            ctx.lineWidth = 6.2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(BALL_RADIUS - 10, 0);
            ctx.lineTo(BALL_RADIUS + 34, 0);
            ctx.stroke();

            ctx.strokeStyle = '#a16207';
            ctx.lineWidth = 3.8;
            ctx.stroke();

            // 2. Dây rễ cây nâu sẫm quấn xoắn ốc dọc cán trượng lên cổ trượng
            ctx.strokeStyle = '#29170b';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(BALL_RADIUS - 7, 2.5);
            ctx.quadraticCurveTo(BALL_RADIUS + 3, -4.5, BALL_RADIUS + 12, 3);
            ctx.quadraticCurveTo(BALL_RADIUS + 20, -4.5, BALL_RADIUS + 30, 2.5);
            ctx.stroke();

            // Cổ rễ cây xoắn dày ở BALL_RADIUS + 26 .. +38
            ctx.fillStyle = '#3f2312';
            ctx.strokeStyle = '#09090b';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.roundRect(BALL_RADIUS + 26, -5.2, 12, 10.4, 3);
            ctx.fill();
            ctx.stroke();

            // 3. Bốn nhánh rễ cây xòe như bàn tay ôm lấy viên đá tinh thể (như Hình 093908)
            ctx.strokeStyle = '#09090b';
            ctx.lineWidth = 4.2;
            [-1, 1].forEach((dir) => {
              // Nhánh rễ dài ngoài
              ctx.beginPath();
              ctx.moveTo(BALL_RADIUS + 36, dir * 3);
              ctx.quadraticCurveTo(BALL_RADIUS + 46, dir * 13, BALL_RADIUS + 56, dir * 8.5);
              ctx.stroke();
              // Nhánh rễ phụ thấp hơn
              ctx.beginPath();
              ctx.moveTo(BALL_RADIUS + 36, dir * 4);
              ctx.quadraticCurveTo(BALL_RADIUS + 42, dir * 11, BALL_RADIUS + 48, dir * 12);
              ctx.stroke();
            });
            ctx.strokeStyle = '#452714';
            ctx.lineWidth = 2.2;
            [-1, 1].forEach((dir) => {
              ctx.beginPath();
              ctx.moveTo(BALL_RADIUS + 36, dir * 3);
              ctx.quadraticCurveTo(BALL_RADIUS + 46, dir * 13, BALL_RADIUS + 56, dir * 8.5);
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(BALL_RADIUS + 36, dir * 4);
              ctx.quadraticCurveTo(BALL_RADIUS + 42, dir * 11, BALL_RADIUS + 48, dir * 12);
              ctx.stroke();
            });

            // 4. Viên đá tinh thể nâu khắc rãnh chữ V nhọn ở tâm đầu trượng
            ctx.shadowColor = '#d97706';
            ctx.shadowBlur = actor.earthStompRemaining > 0 ? 18 : 8;
            const rockGrad = ctx.createLinearGradient(BALL_RADIUS + 38, -7, BALL_RADIUS + 59, 7);
            rockGrad.addColorStop(0, '#573620');
            rockGrad.addColorStop(0.5, '#8c5a3c');
            rockGrad.addColorStop(1, '#3b2313');
            ctx.fillStyle = rockGrad;
            ctx.strokeStyle = '#1c1008';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(BALL_RADIUS + 59, 0); // Đỉnh nhọn đá
            ctx.lineTo(BALL_RADIUS + 47, -7.2);
            ctx.lineTo(BALL_RADIUS + 38, 0);
            ctx.lineTo(BALL_RADIUS + 47, 7.2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Đường vân khắc chữ V trên mặt đá
            ctx.strokeStyle = '#d6a87c';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(BALL_RADIUS + 45, -4);
            ctx.lineTo(BALL_RADIUS + 51, 0);
            ctx.lineTo(BALL_RADIUS + 45, 4);
            ctx.stroke();

            ctx.restore();
          }
          break;
        }

        case 'wind_staff': {
          // VŨ KHÍ PHÁP SƯ GIÓ: TRƯỢNG PHONG LINH (gỗ sẫm + đai vàng + 2 dải lụa xanh + cánh gió uốn lượn + tinh thể ngọc lục bảo phát sáng + vòng gió xoáy)
          const nowMs = performance.now();
          const tiltRatio = actor.staffCastTiltTimer > 0 ? actor.staffCastTiltTimer / 0.45 : 0;
          const tiltFactor = Math.sin(tiltRatio * Math.PI);
          const tiltAngle = tiltFactor * (Math.PI / 12); // Ngả về phía trước 15 độ khi tung chiêu
          const isConverging = actor.windCastChargeRemaining > 0 || actor.staffCastTiltTimer > 0;

          ctx.save();
          ctx.translate(tiltFactor * 6, 0);
          ctx.rotate(tiltAngle);

          // 1. Thân cán trượng gỗ xanh đậm / nâu sẫm dài
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 6.2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(BALL_RADIUS - 10, 0);
          ctx.lineTo(BALL_RADIUS + 34, 0);
          ctx.stroke();

          const shaftGrad = ctx.createLinearGradient(BALL_RADIUS - 10, 0, BALL_RADIUS + 34, 0);
          shaftGrad.addColorStop(0, '#3f2e18');
          shaftGrad.addColorStop(0.55, '#14532d');
          shaftGrad.addColorStop(1, '#166534');
          ctx.strokeStyle = shaftGrad;
          ctx.lineWidth = 3.8;
          ctx.stroke();

          // 2. Hai vòng kim loại vàng kim dọc cán và cổ trượng
          [BALL_RADIUS + 3, BALL_RADIUS + 26].forEach((rx) => {
            ctx.fillStyle = '#eab308';
            ctx.strokeStyle = '#09090b';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.roundRect(rx, -3.6, 4.2, 7.2, 1.5);
            ctx.fill();
            ctx.stroke();
          });

          // 3. Hai dải lụa xanh ngọc uốn lượn nhẹ từ cổ trượng theo gió
          const ribbonWave = Math.sin(nowMs * 0.014) * 3.8;
          const ribbonWave2 = Math.cos(nowMs * 0.016) * 3.8;
          ctx.strokeStyle = '#4ade80';
          ctx.lineWidth = 2.4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(BALL_RADIUS + 27, -2);
          ctx.quadraticCurveTo(BALL_RADIUS + 17, -10 + ribbonWave, BALL_RADIUS + 6, -7 - ribbonWave * 0.5);
          ctx.stroke();
          ctx.strokeStyle = '#86efac';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(BALL_RADIUS + 27, 2);
          ctx.quadraticCurveTo(BALL_RADIUS + 16, 10 + ribbonWave2, BALL_RADIUS + 7, 8 - ribbonWave2 * 0.5);
          ctx.stroke();

          // 4. Hai cánh gió bằng ngọc - vàng uốn cong đối xứng ôm viên tinh thể ở đầu trượng
          [-1, 1].forEach((dir) => {
            ctx.strokeStyle = '#09090b';
            ctx.lineWidth = 5.0;
            ctx.beginPath();
            ctx.moveTo(BALL_RADIUS + 30, dir * 2.5);
            ctx.quadraticCurveTo(BALL_RADIUS + 42, dir * 15, BALL_RADIUS + 56, dir * 10);
            ctx.stroke();

            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 3.0;
            ctx.stroke();

            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(BALL_RADIUS + 31, dir * 2.2);
            ctx.quadraticCurveTo(BALL_RADIUS + 40, dir * 11.5, BALL_RADIUS + 52, dir * 9);
            ctx.stroke();
          });

          // 5. Vòng gió xoay nhỏ bao quanh đầu trượng (hội tụ rực sáng khi đang gồng chiêu)
          const headX = BALL_RADIUS + 47;
          ctx.save();
          ctx.translate(headX, 0);
          ctx.rotate(nowMs * (isConverging ? 0.016 : 0.007));
          ctx.strokeStyle = isConverging ? 'rgba(187, 247, 208, 0.95)' : 'rgba(134, 239, 172, 0.65)';
          ctx.lineWidth = isConverging ? 2.4 : 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, isConverging ? 14 : 11, 0, Math.PI * 1.15);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, isConverging ? 14 : 11, Math.PI, Math.PI * 2.15);
          ctx.stroke();
          ctx.restore();

          // 6. Viên tinh thể gió xanh ngọc phát sáng ở tâm đầu trượng
          ctx.shadowColor = '#4ade80';
          ctx.shadowBlur = isConverging ? 24 : 13;
          if (isConverging) {
            const convGlow = ctx.createRadialGradient(headX, 0, 2, headX, 0, 18);
            convGlow.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            convGlow.addColorStop(0.5, 'rgba(134, 239, 172, 0.7)');
            convGlow.addColorStop(1, 'rgba(22, 163, 74, 0)');
            ctx.fillStyle = convGlow;
            ctx.beginPath();
            ctx.arc(headX, 0, 18, 0, Math.PI * 2);
            ctx.fill();
          }

          const gemGrad = ctx.createLinearGradient(BALL_RADIUS + 38, -7, BALL_RADIUS + 57, 7);
          gemGrad.addColorStop(0, '#bbf7d0');
          gemGrad.addColorStop(0.5, '#22c55e');
          gemGrad.addColorStop(1, '#14532d');
          ctx.fillStyle = gemGrad;
          ctx.strokeStyle = '#052e16';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(BALL_RADIUS + 57, 0);
          ctx.lineTo(BALL_RADIUS + 47, -6.5);
          ctx.lineTo(BALL_RADIUS + 38, 0);
          ctx.lineTo(BALL_RADIUS + 47, 6.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Ánh phản quang trắng ngọc ở lõi tinh thể
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(BALL_RADIUS + 46, -1.5, 2.2, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
          break;
        }
      }
      ctx.restore();

      // Thân quả bóng tròn với viền đen dày nét vẽ tay (phát sáng khi Võ Sĩ bật Chiêu 2, Đấu Sĩ bật Chiêu 2 ánh bạc, hoặc Speed bật Chiêu 1)
      ctx.save();
      const isSilverGlowing =
        actor.invulnerableRemaining > 0 || actor.silverFlashRemaining > 0;
      const isSpeedGlowing =
        actor.ball.id === 'speed' &&
        (actor.speedBoostGlowRemaining > 0 || actor.speedSelfBoostRemaining > 0);
      const isAssassinFlashing = actor.assassinPurpleFlashRemaining > 0;

      if (actor.rageSkillRemaining > 0) {
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 24;
      } else if (isSilverGlowing) {
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = actor.silverFlashRemaining > 0 ? 34 : 24;
      } else if (isSpeedGlowing) {
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 26;
      } else if (isAssassinFlashing) {
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 26;
      }

      ctx.beginPath();
      ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
      if (actor.hitFlashTimer > 0 || actor.silverFlashRemaining > 0.25) {
        ctx.fillStyle = '#ffffff';
      } else if (actor.rageSkillRemaining > 0) {
        const glowBallGrad = ctx.createRadialGradient(-6, -6, 3, 0, 0, BALL_RADIUS);
        glowBallGrad.addColorStop(0, '#fef2f2');
        glowBallGrad.addColorStop(0.38, '#f87171');
        glowBallGrad.addColorStop(0.8, '#ef4444');
        glowBallGrad.addColorStop(1, '#b91c1c');
        ctx.fillStyle = glowBallGrad;
      } else if (isSilverGlowing) {
        const silverBallGrad = ctx.createRadialGradient(-7, -7, 3, 0, 0, BALL_RADIUS);
        silverBallGrad.addColorStop(0, '#ffffff');
        silverBallGrad.addColorStop(0.45, '#f8fafc');
        silverBallGrad.addColorStop(0.82, '#cbd5e1');
        silverBallGrad.addColorStop(1, '#94a3b8');
        ctx.fillStyle = silverBallGrad;
      } else if (isSpeedGlowing) {
        const speedBallGrad = ctx.createRadialGradient(-7, -7, 3, 0, 0, BALL_RADIUS);
        speedBallGrad.addColorStop(0, '#ffffff');
        speedBallGrad.addColorStop(0.38, '#bae6fd');
        speedBallGrad.addColorStop(0.78, '#38bdf8');
        speedBallGrad.addColorStop(1, '#0284c7');
        ctx.fillStyle = speedBallGrad;
      } else if (isAssassinFlashing) {
        const purpleBallGrad = ctx.createRadialGradient(-6, -6, 3, 0, 0, BALL_RADIUS);
        purpleBallGrad.addColorStop(0, '#f3e8ff');
        purpleBallGrad.addColorStop(0.45, '#c084fc');
        purpleBallGrad.addColorStop(0.85, '#7e22ce');
        purpleBallGrad.addColorStop(1, '#4c1d95');
        ctx.fillStyle = purpleBallGrad;
      } else {
        ctx.fillStyle = actor.ball.primaryColor;
      }
      ctx.fill();
      ctx.lineWidth = 4.2;
      ctx.strokeStyle =
        actor.rageSkillRemaining > 0
          ? '#fde047'
          : isSilverGlowing
          ? '#ffffff'
          : isSpeedGlowing
          ? '#e0f2fe'
          : isAssassinFlashing
          ? '#e9d5ff'
          : '#09090b';
      ctx.stroke();
      ctx.restore();

      // Điểm sáng vẽ tay
      if (actor.hitFlashTimer <= 0) {
        ctx.beginPath();
        ctx.arc(-8, -9, 6, 0, Math.PI * 2);
        ctx.fillStyle =
          actor.rageSkillRemaining > 0 || isSilverGlowing || isSpeedGlowing
            ? 'rgba(255,255,255,0.75)'
            : 'rgba(255,255,255,0.35)';
        ctx.fill();
      }

      // Đôi mắt hoạt hình hướng về đối thủ
      const lookX = Math.cos(actor.aimAngle) * 5;
      const lookY = Math.sin(actor.aimAngle) * 5;
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(lookX - 6, lookY - 2, 3.3, 0, Math.PI * 2);
      ctx.arc(lookX + 6, lookY - 2, 3.3, 0, Math.PI * 2);
      ctx.fill();

      // Lông mày sắc bén
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(lookX - 11, lookY - 8);
      ctx.lineTo(lookX - 2, lookY - 5);
      ctx.moveTo(lookX + 11, lookY - 8);
      ctx.lineTo(lookX + 2, lookY - 5);
      ctx.stroke();

      // Hiệu ứng Thiêu Đốt (Burn) bùng cháy quanh quả bóng khi đang chịu nội tại Pháp Sư Lửa
      if (actor.burnStacks.length > 0) {
        const nowMs = performance.now();
        ctx.save();
        for (let f = 0; f < 5; f++) {
          const ang = (f * Math.PI * 2) / 5 + nowMs * 0.006;
          const fx = Math.cos(ang) * (BALL_RADIUS - 2);
          const fy = Math.sin(ang) * (BALL_RADIUS - 2) - 4;
          const flameH = 9 + Math.sin(nowMs * 0.025 + f * 2) * 3.5;
          ctx.fillStyle = f % 2 === 0 ? 'rgba(249, 115, 22, 0.85)' : 'rgba(250, 204, 21, 0.82)';
          ctx.beginPath();
          ctx.moveTo(fx - 4, fy + 3);
          ctx.quadraticCurveTo(fx, fy - flameH, fx + 4, fy + 3);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // Hiệu ứng Lạnh Giá: Lớp phủ màu xanh nước nhạt bán trong suốt khi dính Nội tại 1 (Lạnh Buốt) hoặc đứng trong Vùng Lạnh
      const inEnemyIceZoneVisual = (simRef.current?.zones ?? []).some(
        (z) =>
          z.kind === 'ice_zone' &&
          z.ownerSide !== actor.side &&
          Math.hypot(actor.x - z.x, actor.y - z.y) <= z.radius + BALL_RADIUS * 0.6
      );
      if (actor.chillRemaining > 0 || inEnemyIceZoneVisual) {
        ctx.save();
        const chillGrad = ctx.createRadialGradient(-4, -4, 3, 0, 0, BALL_RADIUS + 1);
        chillGrad.addColorStop(0, 'rgba(224, 242, 254, 0.25)');
        chillGrad.addColorStop(0.55, 'rgba(125, 211, 252, 0.42)');
        chillGrad.addColorStop(1, 'rgba(56, 189, 248, 0.56)');
        ctx.fillStyle = chillGrad;
        ctx.beginPath();
        ctx.arc(0, 0, BALL_RADIUS + 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(186, 230, 253, 0.88)';
        ctx.lineWidth = 2.4;
        ctx.stroke();

        // Hạt sương băng nhỏ lấp lánh trên thân bóng
        const nowMs = performance.now();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        for (let cf = 0; cf < 4; cf++) {
          const cAng = (cf * Math.PI) / 2 + nowMs * 0.0025;
          ctx.beginPath();
          ctx.arc(Math.cos(cAng) * 14, Math.sin(cAng) * 14, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Hiệu ứng Đóng Băng 1s (Chiêu 2 Kiếm Băng): Khối tinh thể băng trong suốt giam cầm quả bóng
      if (actor.frozenRemaining > 0) {
        ctx.save();
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 16;
        ctx.fillStyle = 'rgba(186, 230, 253, 0.48)';
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 2.4;
        const rIce = BALL_RADIUS + 9;
        ctx.beginPath();
        ctx.moveTo(0, -rIce - 3);
        ctx.lineTo(rIce * 0.92, -rIce * 0.48);
        ctx.lineTo(rIce * 0.86, rIce * 0.62);
        ctx.lineTo(0, rIce + 2);
        ctx.lineTo(-rIce * 0.86, rIce * 0.62);
        ctx.lineTo(-rIce * 0.92, -rIce * 0.48);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Đường cắt tinh thể bên trong khối băng
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.68)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-rIce * 0.6, -rIce * 0.35);
        ctx.lineTo(0, 4);
        ctx.lineTo(rIce * 0.65, -rIce * 0.3);
        ctx.moveTo(0, 4);
        ctx.lineTo(0, rIce);
        ctx.stroke();
        ctx.restore();
      }

      // Hiệu ứng Làm Chậm Thổ (50% từ Dậm Rung Chấn hoặc 80% từ Gai Đất) & Gồng Dậm Đất
      if (actor.earthSlow50Remaining > 0 || actor.earthSlow80Remaining > 0) {
        ctx.save();
        const isHeavySlow = actor.earthSlow80Remaining > 0;
        ctx.strokeStyle = isHeavySlow ? 'rgba(245, 158, 11, 0.9)' : 'rgba(180, 83, 9, 0.85)';
        ctx.lineWidth = isHeavySlow ? 3.2 : 2.4;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, BALL_RADIUS + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Các mảnh đá xiềng xích quanh chân bóng khi bị làm chậm bởi Pháp Sư Thổ
        const rockCount = isHeavySlow ? 6 : 4;
        for (let rk = 0; rk < rockCount; rk++) {
          const rAng = (rk * Math.PI * 2) / rockCount + performance.now() * 0.0015;
          const rx = Math.cos(rAng) * (BALL_RADIUS + 6);
          const ry = Math.sin(rAng) * (BALL_RADIUS + 6);
          ctx.fillStyle = isHeavySlow ? '#f59e0b' : '#92400e';
          ctx.strokeStyle = '#1c1917';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.rect(rx - 3.5, ry - 3.5, 7, 7);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
      if (actor.earthStompRemaining > 0) {
        ctx.save();
        const stompPulse = 0.5 + Math.sin(performance.now() * 0.04) * 0.5;
        ctx.strokeStyle = `rgba(245, 158, 11, ${0.5 + stompPulse * 0.45})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, BALL_RADIUS + 10 + stompPulse * 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      if (actor.passiveDisabledRemaining > 0) {
        ctx.save();
        const sealPulse = 0.55 + Math.sin(performance.now() * 0.012) * 0.3;
        ctx.strokeStyle = `rgba(245, 158, 11, ${sealPulse})`;
        ctx.lineWidth = 2.6;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, BALL_RADIUS + 11, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        // Dấu phong ấn X nhỏ phía trên quả bóng báo hiệu nội tại bị vô hiệu hóa
        ctx.strokeStyle = `rgba(251, 191, 36, ${Math.min(1, sealPulse + 0.15)})`;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-6, -(BALL_RADIUS + 18));
        ctx.lineTo(6, -(BALL_RADIUS + 6));
        ctx.moveTo(6, -(BALL_RADIUS + 18));
        ctx.lineTo(-6, -(BALL_RADIUS + 6));
        ctx.stroke();
        ctx.restore();
      }

      // Nội tại 2 Pháp Sư Băng: Viên băng xoay quanh quả bóng (tối đa 5 viên trước khi bắn)
      if (actor.orbitingIceCount > 0) {
        const nowMs = performance.now();
        ctx.save();
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        const count = Math.min(5, actor.orbitingIceCount);
        for (let oi = 0; oi < count; oi++) {
          const orbAngle = nowMs * 0.0045 + (oi * Math.PI * 2) / 5;
          const ox = Math.cos(orbAngle) * (BALL_RADIUS + 16);
          const oy = Math.sin(orbAngle) * (BALL_RADIUS + 16);
          ctx.save();
          ctx.translate(ox, oy);
          ctx.rotate(orbAngle + Math.PI / 2);
          ctx.fillStyle = '#bae6fd';
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(7.5, 0);
          ctx.lineTo(-3.5, -3.2);
          ctx.lineTo(-5.5, 0);
          ctx.lineTo(-3.5, 3.2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(5.5, 0);
          ctx.lineTo(-1.5, -1.2);
          ctx.lineTo(-1.5, 1.2);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }

      // Chiêu 2 Pháp Sư Băng: 8 Thanh Kiếm Băng tinh thể xoay tụ quanh Pháp Sư Băng trước khi bắn liên hoàn (như Hình 195456)
      if (actor.iceSwordSummonRemaining > 0 || actor.iceSwordQueueCount > 0) {
        const nowMs = performance.now();
        const totalSwords = 8;
        const remainingSwords =
          actor.iceSwordSummonRemaining > 0
            ? totalSwords
            : Math.min(totalSwords, actor.iceSwordQueueCount);
        const startIndex = totalSwords - remainingSwords;

        ctx.save();
        // Vòng tròn băng triệu hồi quanh Pháp Sư Băng
        ctx.strokeStyle = 'rgba(125, 211, 252, 0.72)';
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, BALL_RADIUS + 26, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        for (let si = startIndex; si < totalSwords; si++) {
          const ringAng =
            actor.aimAngle + ((si - (totalSwords - 1) / 2) * (Math.PI * 1.55)) / totalSwords;
          const dist = BALL_RADIUS + 28 + Math.sin(nowMs * 0.015 + si) * 2;
          const sx = Math.cos(ringAng) * dist;
          const sy = Math.sin(ringAng) * dist;

          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(actor.aimAngle);
          ctx.scale(0.68, 0.68);
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 10;

          // Cán kiếm xanh đậm + đá quý băng
          ctx.fillStyle = '#0c4a6e';
          ctx.fillRect(-16, -2.2, 11, 4.4);
          ctx.fillStyle = '#7dd3fc';
          ctx.beginPath();
          ctx.moveTo(-18, -3.6);
          ctx.lineTo(-22, 0);
          ctx.lineTo(-18, 3.6);
          ctx.lineTo(-14, 0);
          ctx.closePath();
          ctx.fill();

          // Lưỡi kiếm tinh thể băng sắc nhọn (như Hình 195456)
          ctx.fillStyle = '#38bdf8';
          ctx.strokeStyle = '#e0f2fe';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(22, 0);
          ctx.lineTo(4, -5.6);
          ctx.lineTo(-5, -7.2);
          ctx.lineTo(-3, 0);
          ctx.lineTo(-5, 7.2);
          ctx.lineTo(4, 5.6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(19, 0);
          ctx.lineTo(3, -2.5);
          ctx.lineTo(-1, 0);
          ctx.lineTo(3, 2.5);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }

      ctx.restore();

      // Thanh máu và tên bóng hiển thị ngay phía trên quả bóng
      const barWidth = 68;
      const barHeight = 8;
      const bx = actor.x - barWidth / 2;
      const by = Math.max(12, actor.y - BALL_RADIUS - 24);
      const hpRatio = Math.max(0, Math.min(1, actor.hp / actor.maxHp));

      // Tên bóng nhỏ phía trên thanh máu
      ctx.font = 'bold 10px "Chakra Petch", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#09090b';
      const labelText = `${actor.side === 'PLAYER' ? 'P' : 'BOT'} · ${Math.ceil(actor.hp)}/${actor.maxHp}`;
      ctx.strokeText(labelText, actor.x, by - 4);
      ctx.fillStyle = actor.side === 'PLAYER' ? '#fca5a5' : '#e2e8f0';
      ctx.fillText(labelText, actor.x, by - 4);

      // Khung thanh máu
      ctx.fillStyle = '#18181b';
      ctx.fillRect(bx, by, barWidth, barHeight);
      ctx.fillStyle =
        actor.side === 'PLAYER'
          ? hpRatio < 0.25
            ? '#facc15'
            : '#ef4444'
          : '#38bdf8';
      ctx.fillRect(bx + 1, by + 1, (barWidth - 2) * hpRatio, barHeight - 2);
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, barWidth, barHeight);

      // Ấn Hỏa Long / Thái Dương Vàng Cam phía trên Cung Thủ khi Tụ Lực & Bắn Chiêu 2 (như Hình 201426)
      if (actor.ball.weaponType === 'bow' && actor.chargeShotAuraRemaining > 0) {
        const emblemAlpha = Math.min(1, actor.chargeShotAuraRemaining * 1.4);
        const ex = actor.x;
        const ey = Math.max(22, by - 22);
        ctx.save();
        ctx.translate(ex, ey);
        ctx.globalAlpha = emblemAlpha;

        // Cánh ấn vàng cam hai bên
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.6;
        [-1, 1].forEach((dir) => {
          ctx.save();
          ctx.scale(dir, 1);
          ctx.beginPath();
          ctx.moveTo(3, 2);
          ctx.quadraticCurveTo(14, -10, 18, -2);
          ctx.quadraticCurveTo(15, 6, 8, 8);
          ctx.quadraticCurveTo(11, 0, 3, 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        });

        // Đầu ấn trung tâm rực sáng
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(0, -9);
        ctx.lineTo(6, -1);
        ctx.lineTo(3, 8);
        ctx.lineTo(0, 5);
        ctx.lineTo(-3, 8);
        ctx.lineTo(-6, -1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    };

    const renderFrame = (now: number) => {
      rafId = requestAnimationFrame(renderFrame);
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;

      const sim = simRef.current;
      const canvas = canvasRef.current;
      if (!sim || !canvas) return;

      const { isBattleActive: active, isPaused: paused, speedMultiplier: spd } =
        callbacksRef.current;

      const finisherActive = Boolean(sim.finished && sim.finisher && !sim.finisher.completed);

      if (active && !paused && (!sim.finished || finisherActive)) {
        const steps = spd === 2 ? 2 : 1;
        for (let s = 0; s < steps; s++) {
          stepBattleSimulation(sim, rawDt);
        }
      }

      // Cập nhật HUD định kỳ ~10Hz để không gây re-render React 60fps
      hudEmitTimer += rawDt;
      if (hudEmitTimer >= 0.1 || sim.finished) {
        hudEmitTimer = 0;
        callbacksRef.current.onHudUpdate({
          remainingTime: sim.remainingTime,
          collisionCount: sim.collisionCount,
          playerDamageDealt: sim.player.totalDamageDealt,
          botDamageDealt: sim.bot.totalDamageDealt,
          playerHp: sim.player.hp,
          playerMaxHp: sim.player.maxHp,
          botHp: sim.bot.hp,
          botMaxHp: sim.bot.maxHp,
          botNextSkill: getNextUpcomingSkill(sim.bot),
          playerNextSkill: getNextUpcomingSkill(sim.player),
        });
      }

      const finisherDone = !sim.finisher || sim.finisher.completed;
      if (sim.finished && finisherDone && !roundDoneEmitted && active) {
        roundDoneEmitted = true;
        const winner = sim.winner ?? 'PLAYER';
        const winActor = winner === 'PLAYER' ? sim.player : sim.bot;
        const remPct = (winActor.hp / winActor.maxHp) * 100;
        callbacksRef.current.onRoundFinished({
          winner,
          playerDamageDealt: sim.player.totalDamageDealt,
          botDamageDealt: sim.bot.totalDamageDealt,
          collisionCount: sim.collisionCount,
          winnerRemainingHp: Math.round(winActor.hp),
          winnerRemainingHpPct: Number(remPct.toFixed(2)),
          durationSeconds: Math.round(sim.elapsedTime),
        });
      } else if (!sim.finished) {
        roundDoneEmitted = false;
      }

      // Vẽ Canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.clearRect(0, 0, ARENA_SIZE, ARENA_SIZE);

      // Áp dụng rung nhẹ khi va chạm mạnh
      if (sim.shakeTrauma > 0) {
        const shake = sim.shakeTrauma * sim.shakeTrauma * 7;
        ctx.translate(
          (Math.random() * 2 - 1) * shake,
          (Math.random() * 2 - 1) * shake
        );
      }

      // Nền đấu trường màu xanh đậm (Dark Navy) tạo độ tương phản cao
      const grad = ctx.createRadialGradient(
        ARENA_SIZE / 2,
        ARENA_SIZE / 2,
        40,
        ARENA_SIZE / 2,
        ARENA_SIZE / 2,
        ARENA_SIZE * 0.72
      );
      grad.addColorStop(0, '#112240');
      grad.addColorStop(1, '#091120');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, ARENA_SIZE, ARENA_SIZE);

      // Họa tiết vòng tròn tâm đấu trường nét vẽ tay
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ARENA_SIZE / 2, ARENA_SIZE / 2, 110, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(ARENA_SIZE / 2, 0);
      ctx.lineTo(ARENA_SIZE / 2, ARENA_SIZE);
      ctx.stroke();

      // Vẽ Hố Rung Chấn (Nội tại 2 Pháp Sư Thổ): Vùng đất sụt lún nứt toác màu nâu hổ phách
      for (const cr of sim.earthCraters) {
        const ratio = Math.max(0, cr.remainingDuration / cr.maxDuration);
        ctx.save();
        ctx.translate(cr.x, cr.y);
        ctx.globalAlpha = Math.min(0.9, ratio * 1.4);

        const craterGrad = ctx.createRadialGradient(0, 0, 6, 0, 0, cr.radius);
        craterGrad.addColorStop(0, 'rgba(28, 25, 23, 0.72)');
        craterGrad.addColorStop(0.5, 'rgba(120, 53, 15, 0.45)');
        craterGrad.addColorStop(0.85, 'rgba(217, 119, 6, 0.25)');
        craterGrad.addColorStop(1, 'rgba(120, 53, 15, 0)');
        ctx.fillStyle = craterGrad;
        ctx.beginPath();
        ctx.arc(0, 0, cr.radius, 0, Math.PI * 2);
        ctx.fill();

        // Đường nứt địa chấn tỏa từ tâm hố
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.2;
        for (let ck = 0; ck < 8; ck++) {
          const ang = (ck * Math.PI) / 4 + 0.2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(ang) * 8, Math.sin(ang) * 8);
          ctx.lineTo(Math.cos(ang + 0.1) * (cr.radius * 0.55), Math.sin(ang + 0.1) * (cr.radius * 0.55));
          ctx.lineTo(Math.cos(ang - 0.08) * (cr.radius * 0.92), Math.sin(ang - 0.08) * (cr.radius * 0.92));
          ctx.stroke();
        }
        ctx.restore();
      }

      // Vẽ các Vùng Kỹ Năng (VÙNG CHẾT, XOÁY KIẾM, MÀN SƯƠNG)
      for (const z of sim.zones) {
        ctx.save();
        if (z.kind === 'dead_zone') {
          // CHIÊU 3 CUNG THỦ: Vòng tròn Thần Quang Lục Bảo & Cột Sáng Vàng Kim (như Hình 201641)
          const t = performance.now() * 0.003;
          ctx.translate(z.x, z.y);

          // 1. Nền vòng tròn lớn bên ngoài (ngọc lục bảo pha ánh vàng dịu)
          const outerGrad = ctx.createRadialGradient(0, 0, z.radius * 0.35, 0, 0, z.radius);
          outerGrad.addColorStop(0, 'rgba(74, 222, 128, 0.26)');
          outerGrad.addColorStop(0.72, 'rgba(34, 197, 94, 0.14)');
          outerGrad.addColorStop(1, 'rgba(217, 249, 157, 0.28)');
          ctx.fillStyle = outerGrad;
          ctx.beginPath();
          ctx.arc(0, 0, z.radius, 0, Math.PI * 2);
          ctx.fill();

          // Viền sáng vòng ngoài mảnh sắc nét (vàng nhạt pha lục bảo)
          ctx.strokeStyle = 'rgba(217, 249, 157, 0.78)';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(0, 0, z.radius, 0, Math.PI * 2);
          ctx.stroke();

          // Hoa văn cổ ngữ bán nguyệt dọc theo vành ngoài
          ctx.save();
          ctx.rotate(t * 0.45);
          ctx.strokeStyle = 'rgba(190, 242, 100, 0.45)';
          ctx.lineWidth = 1.6;
          for (let k = 0; k < 6; k++) {
            const a = (k * Math.PI) / 3;
            ctx.beginPath();
            ctx.arc(0, 0, z.radius - 6, a, a + 0.55);
            ctx.stroke();
          }
          ctx.restore();

          // 2. Tâm xoáy năng lượng xanh lục bảo rực sáng ở giữa (như Hình 201641)
          const coreRadius = z.radius * 0.46;
          const coreGrad = ctx.createRadialGradient(0, 0, 3, 0, 0, coreRadius);
          coreGrad.addColorStop(0, '#fef08a');
          coreGrad.addColorStop(0.32, '#84cc16');
          coreGrad.addColorStop(0.7, '#22c55e');
          coreGrad.addColorStop(1, 'rgba(21, 128, 61, 0.85)');
          ctx.fillStyle = coreGrad;
          ctx.beginPath();
          ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
          ctx.fill();

          // Các luồng xoáy lục bảo - vàng chanh cuộn bên trong tâm
          ctx.save();
          ctx.rotate(-t * 1.8);
          for (let s = 0; s < 4; s++) {
            ctx.save();
            ctx.rotate((s * Math.PI) / 2);
            ctx.strokeStyle = s % 2 === 0 ? '#bef264' : '#4ade80';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(6, 0, coreRadius * 0.62, -0.3, Math.PI * 0.75);
            ctx.stroke();
            ctx.restore();
          }
          ctx.restore();

          // Viền cánh sen lửa vàng kim bao quanh tâm xoáy xanh lá
          ctx.save();
          ctx.rotate(t * 0.9);
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.arc(0, 0, coreRadius + 2, 0, Math.PI * 2);
          ctx.stroke();

          for (let p = 0; p < 6; p++) {
            const pa = (p * Math.PI) / 3;
            ctx.save();
            ctx.rotate(pa);
            ctx.fillStyle = 'rgba(250, 204, 21, 0.78)';
            ctx.beginPath();
            ctx.moveTo(coreRadius - 2, -6);
            ctx.quadraticCurveTo(coreRadius + 9, 0, coreRadius - 2, 6);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
          ctx.restore();

          // 3. Cột sáng / Ngọn lửa thần quang vàng kim giáng xuống chính giữa + 2 tia sáng trắng xanh uốn cong hai bên
          const flamePulse = 1 + Math.sin(performance.now() * 0.015) * 0.1;

          // Hai cánh hồ quang trắng-xanh lam vươn lên hai bên tâm xoáy
          ctx.strokeStyle = '#e0f2fe';
          ctx.lineWidth = 2.4;
          [-1, 1].forEach((dir) => {
            ctx.beginPath();
            ctx.moveTo(dir * 5, -2);
            ctx.quadraticCurveTo(dir * 16, -16, dir * 24, -28 * flamePulse);
            ctx.stroke();
          });

          // Ngọn lửa / mũi tên thần quang vàng rực ở trung tâm
          const pillarGrad = ctx.createLinearGradient(0, 8, 0, -44 * flamePulse);
          pillarGrad.addColorStop(0, '#ffffff');
          pillarGrad.addColorStop(0.35, '#fef08a');
          pillarGrad.addColorStop(0.8, '#facc15');
          pillarGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
          ctx.fillStyle = pillarGrad;
          ctx.beginPath();
          ctx.moveTo(0, -44 * flamePulse);
          ctx.quadraticCurveTo(13, -22, 9, -2);
          ctx.quadraticCurveTo(15, -14, 14, -28 * flamePulse);
          ctx.quadraticCurveTo(18, -6, 0, 6);
          ctx.quadraticCurveTo(-18, -6, -14, -28 * flamePulse);
          ctx.quadraticCurveTo(-15, -14, -9, -2);
          ctx.quadraticCurveTo(-13, -22, 0, -44 * flamePulse);
          ctx.closePath();
          ctx.fill();

          // Vòng sóng gợn trắng vàng ngay chân cột sáng
          ctx.strokeStyle = '#fef9c3';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.ellipse(0, 2, 14 * flamePulse, 6 * flamePulse, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else if (z.kind === 'blade_vortex') {
          // CHIÊU 1 KIẾM SĨ (XOÁY KIẾM): Hiệu ứng lốc xoáy kiếm khí Hoàng Kim tốc độ cao (như Video 210451)
          const t = performance.now() * 0.012;
          ctx.translate(z.x, z.y);

          // 1. Nền hào quang vàng kim xoáy tròn
          const vortexGrad = ctx.createRadialGradient(0, 0, z.radius * 0.18, 0, 0, z.radius);
          vortexGrad.addColorStop(0, 'rgba(254, 249, 195, 0.42)');
          vortexGrad.addColorStop(0.55, 'rgba(250, 204, 21, 0.28)');
          vortexGrad.addColorStop(0.88, 'rgba(234, 179, 8, 0.36)');
          vortexGrad.addColorStop(1, 'rgba(161, 98, 7, 0)');
          ctx.fillStyle = vortexGrad;
          ctx.beginPath();
          ctx.arc(0, 0, z.radius, 0, Math.PI * 2);
          ctx.fill();

          // 2. Các lưỡi kiếm khí hình bán nguyệt vàng - trắng xoay cực nhanh quanh thân bóng
          ctx.save();
          ctx.rotate(t * 2.2);
          for (let b = 0; b < 4; b++) {
            ctx.save();
            ctx.rotate((b * Math.PI) / 2);

            // Vệt chém ngoài màu vàng hoàng kim rực sáng
            ctx.strokeStyle = b % 2 === 0 ? '#fde047' : '#eab308';
            ctx.lineWidth = 5.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(0, 0, z.radius - 6, -0.35, Math.PI * 0.58);
            ctx.stroke();

            // Lõi lưỡi gió trắng sắc bén bên trong
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(0, 0, z.radius - 12, -0.2, Math.PI * 0.48);
            ctx.stroke();

            ctx.restore();
          }
          ctx.restore();

          // 3. Vòng xoáy ngược chiều bên trong + tia lửa vàng văng ra
          ctx.save();
          ctx.rotate(-t * 1.6);
          ctx.strokeStyle = 'rgba(254, 240, 138, 0.75)';
          ctx.lineWidth = 2.6;
          ctx.setLineDash([14, 10]);
          ctx.beginPath();
          ctx.arc(0, 0, z.radius * 0.66, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else if (z.kind === 'mist_zone') {
          // CHIÊU 3 SAMURAI (MÀN SƯƠNG): Đám mây sương mù đen tím thẫm + mưa rơi + biểu tượng phi tiêu tâm sáng (như Hình 211911)
          const nowMs = performance.now();
          ctx.save();
          ctx.translate(z.x, z.y);

          // 1. Nền đám mây sương mù đen tím thẫm mềm mại với các cụm mây cuộn quanh rìa
          const mistGrad = ctx.createRadialGradient(0, 0, z.radius * 0.12, 0, 0, z.radius);
          mistGrad.addColorStop(0, 'rgba(226, 232, 240, 0.45)');
          mistGrad.addColorStop(0.28, 'rgba(30, 27, 75, 0.78)');
          mistGrad.addColorStop(0.72, 'rgba(15, 23, 42, 0.86)');
          mistGrad.addColorStop(1, 'rgba(9, 9, 11, 0)');
          ctx.fillStyle = mistGrad;
          ctx.beginPath();
          ctx.arc(0, 0, z.radius, 0, Math.PI * 2);
          ctx.fill();

          // Các đám mây khói đen tím trôi lững lờ bên trong vùng sương mù
          for (let c = 0; c < 7; c++) {
            const ang = (c * Math.PI * 2) / 7 + nowMs * 0.0006 * (c % 2 === 0 ? 1 : -1);
            const dist = z.radius * (0.38 + (c % 3) * 0.14);
            const cx = Math.cos(ang) * dist;
            const cy = Math.sin(ang) * dist;
            const puffRad = z.radius * (0.34 + (c % 2) * 0.08);
            const puffGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, puffRad);
            puffGrad.addColorStop(0, 'rgba(24, 24, 27, 0.72)');
            puffGrad.addColorStop(0.65, 'rgba(49, 46, 129, 0.42)');
            puffGrad.addColorStop(1, 'rgba(9, 9, 11, 0)');
            ctx.fillStyle = puffGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, puffRad, 0, Math.PI * 2);
            ctx.fill();
          }

          // 2. Tâm sáng mờ ở chính giữa + biểu tượng thanh Kunai / Đoản kiếm đen (như Hình 211911)
          const centerGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, 24);
          centerGlow.addColorStop(0, 'rgba(248, 250, 252, 0.75)');
          centerGlow.addColorStop(0.6, 'rgba(148, 163, 184, 0.25)');
          centerGlow.addColorStop(1, 'rgba(30, 41, 59, 0)');
          ctx.fillStyle = centerGlow;
          ctx.beginPath();
          ctx.arc(0, 0, 24, 0, Math.PI * 2);
          ctx.fill();

          // Biểu tượng phi tiêu Kunai màu đen viền sáng ở tâm màn sương
          ctx.save();
          ctx.rotate(-Math.PI * 0.35);
          ctx.fillStyle = '#09090b';
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(11, 0);
          ctx.lineTo(-2, -4.5);
          ctx.lineTo(-6, 0);
          ctx.lineTo(-2, 4.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(-9, 0, 2.3, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // 3. Các vệt mưa rơi / kim châm màu trắng bạc rơi thẳng đứng trong màn sương (như Hình 211911)
          ctx.strokeStyle = 'rgba(226, 232, 240, 0.75)';
          ctx.lineWidth = 1.6;
          ctx.lineCap = 'round';
          for (let r = 0; r < 14; r++) {
            const seedX = ((r * 37) % 100) / 100;
            const rx = (seedX - 0.5) * z.radius * 1.45;
            const maxRy = Math.sqrt(Math.max(100, z.radius * z.radius - rx * rx)) * 0.82;
            const fallProgress = ((nowMs * 0.0028 + r * 0.19) % 1);
            const ry = -maxRy + fallProgress * (maxRy * 2);
            const streakLen = 8 + (r % 3) * 4;

            ctx.beginPath();
            ctx.moveTo(rx, ry - streakLen / 2);
            ctx.lineTo(rx, ry + streakLen / 2);
            ctx.stroke();
          }

          // Viền sương mù mờ ảo bên ngoài
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)';
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.arc(0, 0, z.radius - 2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // 4. Nếu bóng đối phương đang ở trong Màn Sương (bị giảm tầm đánh & tốc chạy), vẽ vòng chỉ thị cam-đỏ dưới chân (như Hình 211911)
          const targetBall = z.ownerSide === 'PLAYER' ? sim.bot : sim.player;
          if (Math.hypot(targetBall.x - z.x, targetBall.y - z.y) <= z.radius + BALL_RADIUS) {
            ctx.save();
            ctx.strokeStyle = 'rgba(249, 115, 22, 0.85)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(targetBall.x, targetBall.y, BALL_RADIUS + 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        } else if (z.kind === 'fire_rain') {
          // CHIÊU 2 PHÁP SƯ LỬA (MƯA LỬA): Vùng lửa + các quả cầu lửa đánh thường thu nhỏ rơi xuống bên trong vùng
          const nowMs = performance.now();
          ctx.translate(z.x, z.y);

          // Nền vòng tròn nhiệt hỏa cam đỏ rực
          const rainGrad = ctx.createRadialGradient(0, 0, z.radius * 0.15, 0, 0, z.radius);
          rainGrad.addColorStop(0, 'rgba(251, 146, 60, 0.34)');
          rainGrad.addColorStop(0.65, 'rgba(234, 88, 12, 0.24)');
          rainGrad.addColorStop(1, 'rgba(185, 28, 28, 0.08)');
          ctx.fillStyle = rainGrad;
          ctx.beginPath();
          ctx.arc(0, 0, z.radius, 0, Math.PI * 2);
          ctx.fill();

          // Viền vòng tròn lửa rực sáng
          ctx.strokeStyle = 'rgba(249, 115, 22, 0.82)';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.arc(0, 0, z.radius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(253, 224, 71, 0.65)';
          ctx.lineWidth = 1.6;
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.arc(0, 0, z.radius - 7, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          // Hiệu ứng các quả cầu lửa đánh thường (Hình 112018) được thu nhỏ rơi xuống trong vùng lửa
          for (let m = 0; m < 6; m++) {
            const cycle = ((nowMs * 0.0022 + m * 0.17) % 1);
            const seedAng = m * 2.1;
            const targetDist = ((m * 37) % 62);
            const landX = Math.cos(seedAng) * targetDist;
            const landY = Math.sin(seedAng) * targetDist;
            const dropX = landX + (1 - cycle) * 18;
            const dropY = landY - (1 - cycle) * 64;

            ctx.save();
            ctx.translate(dropX, dropY);
            ctx.rotate(Math.atan2(64, -18)); // Hướng rơi chéo từ trên xuống
            ctx.scale(0.55, 0.55); // Thu nhỏ quả cầu lửa đánh thường
            ctx.globalAlpha = cycle < 0.85 ? 0.92 : (1 - cycle) * 6;

            // Đuôi lửa xoáy của cầu lửa mini
            const miniGrad = ctx.createRadialGradient(2, 0, 1, -4, 0, 16);
            miniGrad.addColorStop(0, '#ffffff');
            miniGrad.addColorStop(0.35, '#fef08a');
            miniGrad.addColorStop(0.7, '#f97316');
            miniGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
            ctx.fillStyle = miniGrad;
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.quadraticCurveTo(-2, -10, -18, -6);
            ctx.lineTo(-12, 0);
            ctx.lineTo(-18, 6);
            ctx.quadraticCurveTo(-2, 10, 10, 0);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#fef9c3';
            ctx.beginPath();
            ctx.arc(4, 0, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Vòng gợn lửa nhỏ khi vừa chạm mặt đất
            if (cycle > 0.78) {
              const splashAlpha = (1 - cycle) / 0.22;
              ctx.strokeStyle = `rgba(251, 146, 60, ${splashAlpha * 0.8})`;
              ctx.lineWidth = 1.6;
              ctx.beginPath();
              ctx.arc(landX, landY, 5 + (1 - splashAlpha) * 9, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
        } else if (z.kind === 'ice_zone') {
          // CHIÊU 3 PHÁP SƯ BĂNG (VÙNG LẠNH): Mở rộng khi xuất hiện, thu nhỏ & mờ dần khi hết 3s, tuyết rơi bên trong
          const nowMs = performance.now();
          const maxDur = z.maxDuration ?? 3.0;
          const age = maxDur - z.remainingDuration;
          const zoneAlpha =
            z.remainingDuration < 0.35
              ? Math.max(0, z.remainingDuration / 0.35)
              : Math.min(1, age / 0.2);

          ctx.translate(z.x, z.y);
          ctx.globalAlpha = zoneAlpha;

          // Nền vùng băng xanh ngọc dịu mắt
          const iceGrad = ctx.createRadialGradient(0, 0, z.radius * 0.1, 0, 0, z.radius);
          iceGrad.addColorStop(0, 'rgba(224, 242, 254, 0.36)');
          iceGrad.addColorStop(0.55, 'rgba(125, 211, 252, 0.24)');
          iceGrad.addColorStop(0.88, 'rgba(56, 189, 248, 0.16)');
          iceGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
          ctx.fillStyle = iceGrad;
          ctx.beginPath();
          ctx.arc(0, 0, z.radius, 0, Math.PI * 2);
          ctx.fill();

          // Viền vòng tròn băng phát sáng + vòng cổ ngữ tuyết xoay chậm
          ctx.strokeStyle = 'rgba(186, 230, 253, 0.85)';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.arc(0, 0, z.radius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.save();
          ctx.rotate(nowMs * 0.0008);
          ctx.strokeStyle = 'rgba(224, 242, 254, 0.55)';
          ctx.lineWidth = 1.6;
          ctx.setLineDash([10, 8]);
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(8, z.radius - 10), 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Những hạt tuyết nhỏ rơi bên trong vòng tròn Vùng Lạnh
          for (let sf = 0; sf < 16; sf++) {
            const seedX = ((sf * 43) % 100) / 100;
            const rx = (seedX - 0.5) * z.radius * 1.48;
            const maxRy = Math.sqrt(Math.max(40, z.radius * z.radius - rx * rx)) * 0.84;
            const fallProg = (nowMs * 0.0014 + sf * 0.13) % 1;
            const ry = -maxRy + fallProg * (maxRy * 2);
            const swayX = rx + Math.sin(nowMs * 0.004 + sf * 1.7) * 5;
            const flakeR = 1.8 + (sf % 3) * 0.9;

            ctx.fillStyle = sf % 2 === 0 ? 'rgba(255, 255, 255, 0.92)' : 'rgba(186, 230, 253, 0.88)';
            ctx.beginPath();
            ctx.arc(swayX, ry, flakeR, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (z.kind === 'wind_burst') {
          // CHIÊU 2 PHÁP SƯ GIÓ (PHONG BẠO): Vùng gió xoáy xanh ngọc quét tròn quanh bản thân
          const nowMs = performance.now();
          const maxDur = z.maxDuration ?? 2.0;
          const age = maxDur - z.remainingDuration;
          const zoneAlpha =
            z.remainingDuration < 0.3
              ? Math.max(0, z.remainingDuration / 0.3)
              : Math.min(1, age / 0.14);
          const pulse = 0.94 + Math.sin(nowMs * 0.022) * 0.06;

          ctx.translate(z.x, z.y);
          ctx.globalAlpha = zoneAlpha;

          // Nền xoáy gió xanh ngọc phát sáng nhẹ
          const burstGrad = ctx.createRadialGradient(0, 0, z.radius * 0.16, 0, 0, z.radius * pulse);
          burstGrad.addColorStop(0, 'rgba(187, 247, 208, 0.12)');
          burstGrad.addColorStop(0.55, 'rgba(74, 222, 128, 0.24)');
          burstGrad.addColorStop(0.88, 'rgba(22, 163, 74, 0.34)');
          burstGrad.addColorStop(1, 'rgba(20, 83, 45, 0)');
          ctx.fillStyle = burstGrad;
          ctx.beginPath();
          ctx.arc(0, 0, z.radius * pulse, 0, Math.PI * 2);
          ctx.fill();

          // Các dải gió xanh ngọc & trắng uốn xoáy tốc độ cao
          ctx.save();
          ctx.rotate(nowMs * 0.0085);
          for (let b = 0; b < 4; b++) {
            ctx.save();
            ctx.rotate((b * Math.PI) / 2);
            ctx.strokeStyle = b % 2 === 0 ? 'rgba(134, 239, 172, 0.9)' : 'rgba(34, 197, 94, 0.85)';
            ctx.lineWidth = 4.2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(0, 0, z.radius - 7, -0.3, Math.PI * 0.65);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
            ctx.lineWidth = 1.9;
            ctx.beginPath();
            ctx.arc(0, 0, z.radius - 19, -0.1, Math.PI * 0.55);
            ctx.stroke();
            ctx.restore();
          }
          ctx.restore();

          // Vòng khí nội tâm quay ngược chiều
          ctx.save();
          ctx.rotate(-nowMs * 0.011);
          ctx.strokeStyle = 'rgba(187, 247, 208, 0.65)';
          ctx.lineWidth = 2.0;
          ctx.setLineDash([12, 10]);
          ctx.beginPath();
          ctx.arc(0, 0, z.radius * 0.6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
        ctx.restore();
      }

      // Vẽ Chiêu 2 Speed (MŨI TÊN TĂNG TỐC >>): Bán trong suốt, phát sáng xanh lam nhạt như Hình 145009
      for (const sa of sim.speedArrows) {
        ctx.save();
        ctx.translate(sa.x, sa.y);
        ctx.rotate(sa.angle);
        const nowMs = performance.now();
        const fadeOut = sa.remainingDuration < 0.35 ? sa.remainingDuration / 0.35 : 1;
        const pulse = 0.88 + Math.sin(nowMs * 0.01) * 0.12;
        ctx.globalAlpha = 0.84 * fadeOut;

        // Vầng sáng trường tốc độ bao quanh mũi tên >>
        const padAura = ctx.createRadialGradient(0, 0, 8, 0, 0, sa.radius * 1.05);
        padAura.addColorStop(0, 'rgba(186, 230, 253, 0.34)');
        padAura.addColorStop(0.55, 'rgba(56, 189, 248, 0.18)');
        padAura.addColorStop(1, 'rgba(14, 165, 233, 0)');
        ctx.fillStyle = padAura;
        ctx.beginPath();
        ctx.arc(0, 0, sa.radius * 1.05, 0, Math.PI * 2);
        ctx.fill();

        // Viền mảnh bán trong suốt giúp nhận diện phạm vi đi qua
        ctx.strokeStyle = `rgba(125, 211, 252, ${0.35 * pulse})`;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, sa.radius * 0.86, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Vẽ 2 mũi tên chữ V kép (>>) đậm nét phát sáng đúng hình 145009
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 18 * pulse;
        const chevronOffsets = [-16, 10];
        for (let ci = 0; ci < chevronOffsets.length; ci++) {
          const ox = chevronOffsets[ci];
          const phase = ((nowMs * 0.005 + ci * 0.45) % 1);
          const alphaC = 0.56 + Math.sin(phase * Math.PI) * 0.28;
          ctx.beginPath();
          ctx.moveTo(ox - 16, -24);
          ctx.lineTo(ox - 2, -24);
          ctx.lineTo(ox + 18, 0);
          ctx.lineTo(ox - 2, 24);
          ctx.lineTo(ox - 16, 24);
          ctx.lineTo(ox + 3, 0);
          ctx.closePath();

          ctx.fillStyle = `rgba(186, 230, 253, ${alphaC})`;
          ctx.fill();
          ctx.lineWidth = 1.6;
          ctx.strokeStyle = `rgba(224, 242, 254, ${Math.min(0.92, alphaC + 0.2)})`;
          ctx.stroke();
        }
        ctx.restore();
      }

      // Vẽ Chiêu 1 Pháp Sư Băng (KẸP BĂNG): 2 khối băng đối nhau mũi nhọn quay vào nhau (như Hình 195125)
      for (const ic of sim.iceClasps) {
        ctx.save();
        ctx.translate(ic.centerX, ic.centerY);
        ctx.rotate(ic.angle);

        // Đường cảnh báo va chạm giữa 2 khối băng trong 1s chờ
        if (ic.waitTimer > 0) {
          ctx.strokeStyle = 'rgba(125, 211, 252, 0.45)';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(-ic.distFromCenter, 0);
          ctx.lineTo(ic.distFromCenter, 0);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Vẽ 2 khối băng ở hai phía -distFromCenter và +distFromCenter với mũi nhọn quay vào tâm
        [-1, 1].forEach((sideDir) => {
          ctx.save();
          ctx.translate(sideDir * ic.distFromCenter, 0);
          // Nếu sideDir = -1 (trái), mũi nhọn hướng sang +X (vào tâm); nếu sideDir = 1 (phải), lật ngang để mũi nhọn hướng sang -X
          ctx.scale(-sideDir, 1);

          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 14;

          // Bệ tuyết/băng dày ở đáy khối băng (x = +12)
          ctx.fillStyle = '#bae6fd';
          ctx.strokeStyle = '#0369a1';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(10, -24, 10, 48, 5);
          ctx.fill();
          ctx.stroke();

          // Các nhũ băng nhọn dài ngắn xen kẽ hướng về tâm (-X) như Hình 195125
          const spikes = [
            { y: -18, len: 24, w: 5.2 },
            { y: -11, len: 18, w: 4.4 },
            { y: -4, len: 31, w: 5.8 },
            { y: 4, len: 27, w: 5.4 },
            { y: 12, len: 21, w: 4.6 },
            { y: 19, len: 25, w: 5.0 },
          ];
          for (const sp of spikes) {
            const spGrad = ctx.createLinearGradient(12, sp.y, 12 - sp.len, sp.y);
            spGrad.addColorStop(0, '#0284c7');
            spGrad.addColorStop(0.55, '#7dd3fc');
            spGrad.addColorStop(1, '#ffffff');
            ctx.fillStyle = spGrad;
            ctx.strokeStyle = '#0369a1';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(12, sp.y - sp.w);
            ctx.lineTo(12 - sp.len, sp.y); // Mũi nhọn hướng vào nhau
            ctx.lineTo(12, sp.y + sp.w);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Sống sáng trắng giữa nhũ băng
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(10, sp.y);
            ctx.lineTo(14 - sp.len, sp.y);
            ctx.stroke();
          }

          ctx.restore();
        });

        ctx.restore();
      }

      // Vẽ TƯỜNG ĐẤT (Nội tại 1 & Chiêu 2 Pháp Sư Thổ - như Hình 094727): Khối đá nâu nứt phát sáng ánh vàng cam rực rỡ
      for (const ew of sim.earthWalls) {
        const lifeRatio = Math.max(0, ew.remainingDuration / ew.maxDuration);
        const isGlowing = ew.impactGlowTimer > 0;
        const nowMs = performance.now();
        const pulse = 0.85 + Math.sin(nowMs * 0.015) * 0.15;

        ctx.save();
        ctx.translate(ew.x, ew.y);
        ctx.rotate(ew.angle);
        ctx.globalAlpha = Math.min(1, lifeRatio * 3.0);

        const hl = ew.halfLength;
        const ht = ew.halfThickness;

        // Quầng sáng vàng cam phát tỏa từ bức tường đất
        ctx.shadowColor = isGlowing ? '#fef08a' : '#f59e0b';
        ctx.shadowBlur = isGlowing ? 28 : 14 * pulse;

        // Thân khối đá gồ ghề (Fractured Earth Wall như Hình 094727)
        const wallGrad = ctx.createLinearGradient(-hl, -ht, hl, ht);
        wallGrad.addColorStop(0, '#573620');
        wallGrad.addColorStop(0.45, '#b45309');
        wallGrad.addColorStop(0.75, '#d97706');
        wallGrad.addColorStop(1, '#78350f');
        ctx.fillStyle = wallGrad;
        ctx.strokeStyle = isGlowing ? '#fef9c3' : '#29170b';
        ctx.lineWidth = isGlowing ? 3 : 2.2;

        ctx.beginPath();
        ctx.moveTo(-hl + 4, -ht);
        ctx.lineTo(-hl * 0.4, -ht - 2);
        ctx.lineTo(hl * 0.35, -ht + 1);
        ctx.lineTo(hl - 5, -ht);
        ctx.lineTo(hl + 2, 0);
        ctx.lineTo(hl - 4, ht);
        ctx.lineTo(hl * 0.25, ht + 2);
        ctx.lineTo(-hl * 0.45, ht - 1);
        ctx.lineTo(-hl + 3, ht);
        ctx.lineTo(-hl - 2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Các đường khe nứt vàng rực sáng cắt chéo qua khối đá (như Hình 094727)
        ctx.strokeStyle = isGlowing ? '#ffffff' : `rgba(254, 240, 138, ${0.72 * pulse})`;
        ctx.lineWidth = isGlowing ? 2.4 : 1.6;
        ctx.beginPath();
        ctx.moveTo(-hl * 0.72, -ht + 2);
        ctx.lineTo(-hl * 0.48, 2);
        ctx.lineTo(-hl * 0.56, ht - 2);
        ctx.moveTo(-hl * 0.15, -ht + 1);
        ctx.lineTo(hl * 0.05, 0);
        ctx.lineTo(-hl * 0.08, ht - 1);
        ctx.moveTo(hl * 0.32, -ht + 2);
        ctx.lineTo(hl * 0.54, 1);
        ctx.lineTo(hl * 0.42, ht - 2);
        ctx.stroke();

        ctx.restore();
      }

      // Vẽ GAI ĐẤT (Chiêu 3 Pháp Sư Thổ - như Hình 095845): Các trụ đá nhọn trồi lên từ luồng xoáy bụi vàng
      for (const sp of sim.earthSpikes) {
        const lifeRatio = Math.max(0, sp.remainingDuration / sp.maxDuration);
        ctx.save();
        ctx.globalAlpha = Math.min(1, lifeRatio * 2.2);

        // Luồng cát bụi & ánh sáng hoàng thổ chạy dọc đường trồi gai
        const dustGrad = ctx.createLinearGradient(sp.startX, sp.startY, sp.curX, sp.curY);
        dustGrad.addColorStop(0, 'rgba(217, 119, 6, 0.18)');
        dustGrad.addColorStop(0.65, 'rgba(245, 158, 11, 0.55)');
        dustGrad.addColorStop(1, 'rgba(254, 240, 138, 0.85)');
        ctx.strokeStyle = dustGrad;
        ctx.lineWidth = 22;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sp.startX, sp.startY);
        ctx.lineTo(sp.curX, sp.curY);
        ctx.stroke();

        // Từng khối đá gai nhọn trồi nghiêng theo hướng lao
        for (const pl of sp.pillars) {
          const popScale = Math.min(1, pl.age / 0.1);
          const sz = pl.size * popScale;
          ctx.save();
          ctx.translate(pl.x, pl.y);
          ctx.rotate(sp.angle + pl.tilt);

          // Bóng cát vàng dưới chân trụ đá
          ctx.fillStyle = 'rgba(251, 191, 36, 0.42)';
          ctx.beginPath();
          ctx.ellipse(0, 0, sz * 0.72, sz * 0.42, 0, 0, Math.PI * 2);
          ctx.fill();

          // Khối trụ đá nhọn nhiều mặt (như Hình 095845)
          const pillarGrad = ctx.createLinearGradient(-sz * 0.4, -sz, sz * 0.5, sz * 0.4);
          pillarGrad.addColorStop(0, '#44403c');
          pillarGrad.addColorStop(0.55, '#92400e');
          pillarGrad.addColorStop(1, '#f59e0b');
          ctx.fillStyle = pillarGrad;
          ctx.strokeStyle = '#1c1917';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(sz * 0.85, 0);
          ctx.lineTo(-sz * 0.2, -sz * 0.55);
          ctx.lineTo(-sz * 0.7, -sz * 0.25);
          ctx.lineTo(-sz * 0.55, sz * 0.45);
          ctx.lineTo(sz * 0.1, sz * 0.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Mặt phản quang vàng sáng trên cạnh vát trụ đá
          ctx.fillStyle = 'rgba(254, 240, 138, 0.55)';
          ctx.beginPath();
          ctx.moveTo(sz * 0.8, 0);
          ctx.lineTo(-sz * 0.15, -sz * 0.48);
          ctx.lineTo(0, 0);
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        }
        ctx.restore();
      }

      // Vẽ Tia Lửa Đỏ phát sáng rực (Chiêu 3 Hỏa Thần) theo đường mà Phượng Hoàng Lửa đã vẽ ra
      for (const fb of sim.fireBeams) {
        if (fb.points.length < 2) continue;
        const nowMs = performance.now();
        const lifeRatio = Math.max(0, fb.remainingDuration / fb.maxDuration);
        const pulse = 0.88 + Math.sin(nowMs * 0.03) * 0.14;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = Math.min(1, lifeRatio * 1.6);

        const traceBeamPath = () => {
          ctx.beginPath();
          ctx.moveTo(fb.points[0].x, fb.points[0].y);
          for (let ptIdx = 1; ptIdx < fb.points.length; ptIdx++) {
            ctx.lineTo(fb.points[ptIdx].x, fb.points[ptIdx].y);
          }
        };

        // 1. Quầng hào quang đỏ rực tỏa rộng dọc toàn tuyến tia lửa
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 28;
        ctx.strokeStyle = 'rgba(220, 38, 38, 0.55)';
        ctx.lineWidth = 24 * pulse;
        traceBeamPath();
        ctx.stroke();

        // 2. Thân tia lửa đỏ tươi chói lòa
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 12 * pulse;
        traceBeamPath();
        ctx.stroke();

        // 3. Lõi năng lượng đỏ cam - trắng hồng rực sáng
        ctx.strokeStyle = '#fecaca';
        ctx.lineWidth = 4.5 * pulse;
        traceBeamPath();
        ctx.stroke();

        // 4. Các điểm nút sáng tại những góc đập tường của Phượng Hoàng
        for (const pt of fb.points) {
          ctx.fillStyle = '#fef2f2';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 7 * pulse, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Vẽ Thanh Đại Kiếm cắm xuống đất 3s của Kiếm Sĩ (Chiêu 2 CẮM KIẾM - như Video 210725: cột sáng hoàng kim + nứt đất + chạm vào gây 30 sát thương)
      for (const ps of sim.plantedSwords) {
        const lifeRatio = Math.max(0, ps.remainingDuration / ps.maxDuration);
        const impactAge = ps.maxDuration - ps.remainingDuration; // 0 -> 3.0s
        const nowMs = performance.now();

        ctx.save();
        ctx.translate(ps.x, ps.y);

        // 1. Vết nứt mặt đất phát sáng vàng kim & hố địa chấn dưới chân thanh kiếm
        const craterAlpha = Math.min(1, lifeRatio * 1.4);
        ctx.save();
        ctx.globalAlpha = craterAlpha;

        // Quầng sáng mặt đất vàng rực
        const groundGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, ps.radius + 14);
        groundGrad.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
        groundGrad.addColorStop(0.5, 'rgba(234, 179, 8, 0.45)');
        groundGrad.addColorStop(1, 'rgba(161, 98, 7, 0)');
        ctx.fillStyle = groundGrad;
        ctx.beginPath();
        ctx.ellipse(0, 6, ps.radius + 14, (ps.radius + 14) * 0.52, 0, 0, Math.PI * 2);
        ctx.fill();

        // Các tia nứt mặt đất phát sáng vàng trắng tỏa ra 6 hướng (như Video 210725)
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2.4;
        for (let c = 0; c < 6; c++) {
          const cAng = (c * Math.PI) / 3 + 0.3;
          ctx.beginPath();
          ctx.moveTo(0, 6);
          ctx.lineTo(Math.cos(cAng) * 16, 6 + Math.sin(cAng) * 9);
          ctx.lineTo(
            Math.cos(cAng + 0.15) * (ps.radius + 8),
            6 + Math.sin(cAng + 0.15) * ((ps.radius + 8) * 0.55)
          );
          ctx.stroke();
        }

        // Vòng tròn cảnh báo sát thương (chạm vào chịu 30 sát thương)
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.75)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, ps.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // 2. Cột sáng Hoàng Kim giáng từ bầu trời xuống (rực rỡ nhất trong 0.9s đầu và duy trì hào quang suốt 3s)
        const pillarIntensity =
          impactAge < 0.75
            ? 1 - (impactAge / 0.75) * 0.45
            : 0.35 + Math.sin(nowMs * 0.015) * 0.1;
        const pillarWidth = impactAge < 0.4 ? 38 - impactAge * 30 : 24;
        const pillarGrad = ctx.createLinearGradient(0, 12, 0, -135);
        pillarGrad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * pillarIntensity})`);
        pillarGrad.addColorStop(0.25, `rgba(254, 240, 138, ${0.82 * pillarIntensity})`);
        pillarGrad.addColorStop(0.65, `rgba(250, 204, 21, ${0.45 * pillarIntensity})`);
        pillarGrad.addColorStop(1, 'rgba(234, 179, 8, 0)');
        ctx.fillStyle = pillarGrad;
        ctx.beginPath();
        ctx.moveTo(-pillarWidth, 8);
        ctx.lineTo(-pillarWidth * 0.55, -135);
        ctx.lineTo(pillarWidth * 0.55, -135);
        ctx.lineTo(pillarWidth, 8);
        ctx.closePath();
        ctx.fill();

        // Vòng sóng xung kích vàng kim bung rộng lúc mới cắm kiếm (như Video 210725)
        if (impactAge < 0.65) {
          const ringProgress = impactAge / 0.65;
          ctx.save();
          ctx.globalAlpha = 1 - ringProgress;
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 4 * (1 - ringProgress * 0.5);
          ctx.beginPath();
          ctx.ellipse(
            0,
            4,
            14 + ringProgress * 56,
            (14 + ringProgress * 56) * 0.5,
            0,
            0,
            Math.PI * 2
          );
          ctx.stroke();
          ctx.restore();
        }

        // 3. Thanh Đại Kiếm Dragon Slayer cắm thẳng đứng xuống mặt đất tại vị trí trúng chiêu
        ctx.save();
        ctx.globalAlpha = Math.min(1, lifeRatio * 1.8);
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 16;

        // Lưỡi kiếm bạc-vàng cắm ngập mũi xuống đất (từ y = 8 lên y = -48)
        ctx.fillStyle = '#fde047';
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(0, 10);
        ctx.lineTo(-10, -4);
        ctx.lineTo(-12, -46);
        ctx.lineTo(12, -46);
        ctx.lineTo(10, -4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Lõi sắt đen chính giữa thân đại kiếm
        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.lineTo(-6, -4);
        ctx.lineTo(-7, -46);
        ctx.lineTo(7, -46);
        ctx.lineTo(6, -4);
        ctx.closePath();
        ctx.fill();

        // Khuyên tròn kim loại ở gốc lưỡi kiếm
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, -43, 5, 0, Math.PI);
        ctx.stroke();

        // Cán kiếm quấn băng trắng hướng lên trời
        ctx.fillStyle = '#e2e8f0';
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 2;
        ctx.fillRect(-3.2, -62, 6.4, 16);
        ctx.strokeRect(-3.2, -62, 6.4, 16);

        // Dải lụa trắng vàng bay ở đốc kiếm
        const ribbonWave = Math.sin(nowMs * 0.015) * 4;
        ctx.fillStyle = '#fef9c3';
        ctx.beginPath();
        ctx.moveTo(2, -62);
        ctx.quadraticCurveTo(14, -68 + ribbonWave, 20, -56 + ribbonWave);
        ctx.quadraticCurveTo(10, -58 + ribbonWave, 2, -59);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Đốc kiếm tròn
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(0, -64, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
        ctx.restore();
      }

      // Vẽ hiệu ứng Tóe Máu (Blood Splatters) khi bóng bị trúng chiêu hoặc đòn đánh
      for (const bs of sim.bloodSplatters) {
        const ratio = Math.max(0, bs.life / bs.maxLife);
        ctx.save();
        ctx.translate(bs.x, bs.y);
        ctx.globalAlpha = Math.min(0.88, ratio * 1.1);

        // Vệt tóe máu trung tâm
        ctx.fillStyle = '#991b1b';
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 0, bs.isHeavy ? 9 : 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Các giọt máu văng xung quanh theo hướng bị đánh trúng
        for (let i = 0; i < bs.droplets.length; i++) {
          const d = bs.droplets[i];
          const progress = 1 - Math.pow(ratio, 2);
          const gx = d.dx * (0.45 + progress * 0.65);
          const gy = d.dy * (0.45 + progress * 0.65);
          ctx.fillStyle = i % 2 === 0 ? '#dc2626' : '#ef4444';
          ctx.beginPath();
          ctx.arc(gx, gy, d.r * (0.55 + ratio * 0.45), 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }

      // Vẽ các Tàn Ảnh (nội tại của Tốc Độ Speed & Chiêu 3 Dịch Chuyển của Võ Sĩ Quyền Anh tồn tại 1s)
      for (const ai of sim.afterimages) {
        const ratio = Math.max(0, ai.life / ai.maxLife);
        ctx.save();
        ctx.translate(ai.x, ai.y);
        if (ai.isBoxerClone) {
          // Tàn ảnh Chiêu 3 của Võ Sĩ Quyền Anh tại vị trí trước khi dịch chuyển (tồn tại 1s)
          ctx.globalAlpha = Math.min(0.78, ratio * 0.85);

          // Hai găng tay quyền anh của tàn ảnh
          ctx.save();
          ctx.rotate(ai.weaponAngle);
          [-0.45, 0.45].forEach((angleOff) => {
            ctx.save();
            ctx.rotate(angleOff);
            ctx.fillStyle = '#ef4444';
            ctx.strokeStyle = '#fca5a5';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(BALL_RADIUS + 13, 0, 9.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          });
          ctx.restore();

          // Thân bóng tàn ảnh đỏ rực
          ctx.beginPath();
          ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = ai.color;
          ctx.fill();
          ctx.lineWidth = 3.2;
          ctx.strokeStyle = '#fca5a5';
          ctx.setLineDash([6, 4]);
          ctx.stroke();

          // Ánh mắt tàn ảnh hướng theo mục tiêu lúc dịch chuyển
          const lx = Math.cos(ai.aimAngle) * 5;
          const ly = Math.sin(ai.aimAngle) * 5;
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(lx - 6, ly - 2, 2.8, 0, Math.PI * 2);
          ctx.arc(lx + 6, ly - 2, 2.8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.globalAlpha = ratio * 0.55;
          ctx.beginPath();
          ctx.arc(0, 0, BALL_RADIUS + (1 - ratio) * 8, 0, Math.PI * 2);
          ctx.fillStyle = ai.color;
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = ai.accentColor;
          ctx.setLineDash([5, 3]);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Vẽ Tàn Ảnh Mờ Chiêu 3 Sát Thủ (Song Đao Phi): tồn tại 1s tại vị trí cũ để dịch chuyển về nếu chịu sát thương
      for (const actor of [sim.bot, sim.player]) {
        if (actor.assassinRecallRemaining > 0) {
          const ratio = Math.max(0, Math.min(1, actor.assassinRecallRemaining / 1.0));
          ctx.save();

          // Đường nối mờ giữa vị trí Sát Thủ và Tàn Ảnh Mờ
          ctx.strokeStyle = `rgba(192, 132, 252, ${0.24 * ratio})`;
          ctx.lineWidth = 1.6;
          ctx.setLineDash([5, 6]);
          ctx.beginPath();
          ctx.moveTo(actor.assassinRecallX, actor.assassinRecallY);
          ctx.lineTo(actor.x, actor.y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Tàn ảnh mờ Sát Thủ tại vị trí cũ
          ctx.translate(actor.assassinRecallX, actor.assassinRecallY);
          ctx.globalAlpha = 0.28 + 0.24 * ratio;

          // Quầng bóng tím mờ
          const ghostGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, BALL_RADIUS + 14);
          ghostGrad.addColorStop(0, 'rgba(192, 132, 252, 0.55)');
          ghostGrad.addColorStop(0.65, 'rgba(107, 33, 168, 0.35)');
          ghostGrad.addColorStop(1, 'rgba(76, 29, 149, 0)');
          ctx.fillStyle = ghostGrad;
          ctx.beginPath();
          ctx.arc(0, 0, BALL_RADIUS + 14, 0, Math.PI * 2);
          ctx.fill();

          // Thân bóng tàn ảnh mờ
          ctx.beginPath();
          ctx.arc(0, 0, BALL_RADIUS - 1, 0, Math.PI * 2);
          ctx.fillStyle = '#4c1d95';
          ctx.fill();
          ctx.lineWidth = 2.2;
          ctx.strokeStyle = '#c084fc';
          ctx.setLineDash([5, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Vòng thời gian 1s thu dần quanh tàn ảnh
          ctx.strokeStyle = '#e9d5ff';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(0, 0, BALL_RADIUS + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
          ctx.stroke();

          ctx.restore();
        }
      }

      // Vẽ Lớp Bụi Mù (Dust Cloud) khi Sát Thủ bật Chiêu 2 Tàng Hình
      for (const dc of sim.dustClouds) {
        const ratio = Math.max(0, dc.life / dc.maxLife);
        const expand = 1 - ratio;
        ctx.save();
        ctx.translate(dc.x, dc.y);
        ctx.globalAlpha = Math.min(0.85, ratio * 1.15);

        // Quầng bụi mù trung tâm lan rộng
        const dustGrad = ctx.createRadialGradient(
          0,
          0,
          4,
          0,
          0,
          dc.radius * (0.55 + expand * 0.65)
        );
        dustGrad.addColorStop(0, 'rgba(228, 228, 231, 0.78)');
        dustGrad.addColorStop(0.55, 'rgba(161, 161, 170, 0.52)');
        dustGrad.addColorStop(0.85, 'rgba(113, 113, 122, 0.25)');
        dustGrad.addColorStop(1, 'rgba(63, 63, 70, 0)');
        ctx.fillStyle = dustGrad;
        ctx.beginPath();
        ctx.arc(0, 0, dc.radius * (0.55 + expand * 0.65), 0, Math.PI * 2);
        ctx.fill();

        // Các cụm khói bụi tròn bung tỏa ra xung quanh
        for (let i = 0; i < dc.puffs.length; i++) {
          const pf = dc.puffs[i];
          const curDist = pf.dist * (0.35 + expand * 1.05);
          const px = Math.cos(pf.angle) * curDist;
          const py = Math.sin(pf.angle) * curDist;
          const pr = pf.r * (0.65 + expand * 0.45);
          ctx.fillStyle = i % 2 === 0 ? 'rgba(212, 212, 216, 0.68)' : 'rgba(161, 161, 170, 0.6)';
          ctx.strokeStyle = 'rgba(82, 82, 91, 0.45)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(px, py, pr, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }

      // Vẽ hai quả bóng (khi vào hiệu ứng kết liễu, bóng thua biến mất để phân rã thành 8 viên vàng sáng)
      if (!sim.finisher || sim.finisher.winnerSide === 'BOT') {
        drawCombatant(ctx, sim.bot);
      }
      if (!sim.finisher || sim.finisher.winnerSide === 'PLAYER') {
        drawCombatant(ctx, sim.player);
      }

      // Vẽ Đạn / Mũi Tên / Kiếm Khí / Khiên Bay / Phi Tiêu
      for (const p of sim.projectiles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        const ang = Math.atan2(p.vy, p.vx);
        ctx.rotate(ang);

        if (p.kind === 'arrow') {
          // MŨI TÊN ĐÁNH THƯỜNG MÀU NÂU VÀNG (như Hình 201213)
          // Quầng sáng nâu vàng ấm bao quanh mũi tên
          const glowGrad = ctx.createRadialGradient(2, 0, 1, 0, 0, 20);
          glowGrad.addColorStop(0, 'rgba(254, 240, 138, 0.55)');
          glowGrad.addColorStop(0.55, 'rgba(217, 119, 6, 0.28)');
          glowGrad.addColorStop(1, 'rgba(180, 83, 9, 0)');
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.ellipse(0, 0, 22, 9, 0, 0, Math.PI * 2);
          ctx.fill();

          // Đuôi lông vũ chẻ đôi màu vàng sáng viền nâu vàng
          ctx.fillStyle = '#facc15';
          ctx.strokeStyle = '#92400e';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(-11, 0);
          ctx.lineTo(-19, -5.5);
          ctx.lineTo(-16, 0);
          ctx.lineTo(-19, 5.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Thân mũi tên màu nâu vàng (viền nâu đậm + lõi vàng hổ phách)
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 5.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-13, 0);
          ctx.lineTo(8, 0);
          ctx.stroke();

          const shaftGrad = ctx.createLinearGradient(-14, 0, 12, 0);
          shaftGrad.addColorStop(0, '#d97706');
          shaftGrad.addColorStop(0.55, '#f59e0b');
          shaftGrad.addColorStop(1, '#fef08a');
          ctx.strokeStyle = shaftGrad;
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.moveTo(-13, 0);
          ctx.lineTo(9, 0);
          ctx.stroke();

          // Đầu mũi tên hình thoi bản rộng phát sáng vàng trắng
          ctx.fillStyle = '#fef08a';
          ctx.strokeStyle = '#92400e';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(19, 0);
          ctx.lineTo(6, -6.5);
          ctx.lineTo(8.5, 0);
          ctx.lineTo(6, 6.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Điểm lóe sáng trắng vàng ở mũi nhọn
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(16.5, 0);
          ctx.lineTo(9, -2.6);
          ctx.lineTo(9, 2.6);
          ctx.closePath();
          ctx.fill();
        } else if (p.kind === 'charged_arrow') {
          // CHIÊU 2 CUNG THỦ: ĐẠI TIỄN TỤ LỰC HỎA LONG VÀNG KIM (như Hình 201426)
          const pulse = 0.92 + Math.sin(performance.now() * 0.04) * 0.1;

          // 1. Luồng sóng xung kích (Shockwave Wind Cone & Smoke Rings) bao bọc quanh thân tiễn
          ctx.strokeStyle = 'rgba(254, 249, 195, 0.42)';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.ellipse(-12, 0, 8, 17 * pulse, 0, -Math.PI * 0.65, Math.PI * 0.65);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(-26, 0, 10, 22 * pulse, 0, -Math.PI * 0.6, Math.PI * 0.6);
          ctx.stroke();

          // Luồng khí lốc xoáy chạy dọc hai bên sườn mũi tên
          ctx.strokeStyle = 'rgba(253, 224, 71, 0.38)';
          ctx.lineWidth = 2;
          [-1, 1].forEach((dir) => {
            ctx.beginPath();
            ctx.moveTo(22, dir * 4);
            ctx.quadraticCurveTo(-5, dir * 18 * pulse, -42, dir * 24);
            ctx.stroke();
          });

          // 2. Đuôi lửa thần quang vàng cam bùng cháy rực rỡ
          const flameGrad = ctx.createRadialGradient(-4, 0, 3, -10, 0, 42 * pulse);
          flameGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
          flameGrad.addColorStop(0.28, 'rgba(254, 240, 138, 0.92)');
          flameGrad.addColorStop(0.62, 'rgba(250, 204, 21, 0.72)');
          flameGrad.addColorStop(0.88, 'rgba(245, 158, 11, 0.35)');
          flameGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
          ctx.fillStyle = flameGrad;
          ctx.beginPath();
          ctx.moveTo(28, 0);
          ctx.quadraticCurveTo(4, -20 * pulse, -44, -14);
          ctx.lineTo(-32, 0);
          ctx.lineTo(-44, 14);
          ctx.quadraticCurveTo(4, 20 * pulse, 28, 0);
          ctx.closePath();
          ctx.fill();

          // Trục tia sáng lõi trắng vàng xuyên suốt
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4.5;
          ctx.beginPath();
          ctx.moveTo(-36, 0);
          ctx.lineTo(24, 0);
          ctx.stroke();

          // 3. Đầu Hỏa Long / Mũi Giáo Thái Dương Vàng Kim ở phía trước
          ctx.fillStyle = '#facc15';
          ctx.strokeStyle = '#b45309';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(30, 0);
          ctx.lineTo(14, -11);
          ctx.lineTo(18, -4);
          ctx.lineTo(8, -7);
          ctx.lineTo(12, 0);
          ctx.lineTo(8, 7);
          ctx.lineTo(18, 4);
          ctx.lineTo(14, 11);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Điểm mắt/lõi đỏ cam trên đầu hỏa long tiễn
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(19, -3.5, 1.8, 0, Math.PI * 2);
          ctx.arc(19, 3.5, 1.8, 0, Math.PI * 2);
          ctx.fill();

          // 4. Các hạt tinh linh xanh lục - vàng sáng bay kèm hai bên luồng tiễn (như Hình 201426)
          const sparkOffsets = [
            { x: -8, y: 15, r: 2.6 },
            { x: -18, y: 19, r: 2.2 },
            { x: -24, y: -16, r: 2.4 },
            { x: -30, y: 12, r: 2.0 },
          ];
          for (const sp of sparkOffsets) {
            ctx.fillStyle = '#bef264';
            ctx.beginPath();
            ctx.arc(sp.x, sp.y * pulse, sp.r, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (p.kind === 'blade_wave') {
          // CHIÊU 1 SAMURAI (KIẾM KHÍ): Lưỡi trăng khuyết phát sáng lõi trắng + hào quang xanh lam điện + hiệu ứng hạt lấp lánh (như Hình 211451)
          const nowMs = performance.now();
          ctx.save();

          // 1. Hào quang phát sáng xanh lam đậm & lam điện tỏa rộng quanh lưỡi kiếm khí
          ctx.shadowColor = '#2563eb';
          ctx.shadowBlur = 24;

          const waveAura = ctx.createRadialGradient(4, 0, 2, 0, 0, 30);
          waveAura.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          waveAura.addColorStop(0.38, 'rgba(56, 189, 248, 0.82)');
          waveAura.addColorStop(0.72, 'rgba(37, 99, 235, 0.48)');
          waveAura.addColorStop(1, 'rgba(29, 78, 216, 0)');
          ctx.fillStyle = waveAura;
          ctx.beginPath();
          ctx.ellipse(2, 0, 24, 28, 0, 0, Math.PI * 2);
          ctx.fill();

          // 2. Viền hào quang xanh lam điện (Electric Blue) bao quanh lưỡi trăng khuyết
          ctx.fillStyle = '#1d4ed8';
          ctx.beginPath();
          ctx.moveTo(-12, -24);
          ctx.quadraticCurveTo(22, -8, 16, 25);
          ctx.quadraticCurveTo(2, 6, -12, -24);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.moveTo(-10, -22);
          ctx.quadraticCurveTo(19, -7, 14, 23);
          ctx.quadraticCurveTo(3, 5, -10, -22);
          ctx.closePath();
          ctx.fill();

          // 3. Lõi kiếm khí trắng tinh khiết rực sáng bất đối xứng (đầu trên dày tròn, vuốt nhọn sắc bén về đuôi dưới như Hình 211451)
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(-8, -19);
          ctx.quadraticCurveTo(15, -6, 12, 21);
          ctx.quadraticCurveTo(4, 4, -8, -19);
          ctx.closePath();
          ctx.fill();

          // 4. Hiệu ứng hạt ánh sáng (Sparkling Particles) xanh lam & trắng bay lấp lánh quanh kiếm khí
          for (let sp = 0; sp < 7; sp++) {
            const phase = nowMs * 0.012 + sp * 1.15;
            const px = -6 - ((phase * 9) % 24) + Math.cos(phase) * 5;
            const py = ((sp - 3) * 7) + Math.sin(phase * 1.3) * 4;
            const pr = 1.6 + (sp % 3) * 0.9;
            ctx.fillStyle = sp % 2 === 0 ? '#ffffff' : '#7dd3fc';
            ctx.beginPath();
            ctx.arc(px, py, pr, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        } else if (p.kind === 'thrown_shield') {
          // CHIÊU 3 ĐẤU SĨ (NÉM KHIÊN): Chiếc khiên hiệp sĩ chữ thập đinh tán như Hình 231006
          // Chiều mũi nhọn của chiếc khiên là đầu lao ra (+X) kèm hiệu ứng xung kích ở chiếc khiên
          const pulse = 0.92 + Math.sin(performance.now() * 0.035) * 0.1;
          ctx.save();

          // 1. Hiệu ứng luồng khí xung kích bạc-lam ở mũi nhọn chiếc khiên và vệt gió phía sau
          const shieldAura = ctx.createRadialGradient(4, 0, 2, 0, 0, 28 * pulse);
          shieldAura.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
          shieldAura.addColorStop(0.5, 'rgba(125, 211, 252, 0.45)');
          shieldAura.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ctx.fillStyle = shieldAura;
          ctx.beginPath();
          ctx.ellipse(2, 0, 28 * pulse, 20 * pulse, 0, 0, Math.PI * 2);
          ctx.fill();

          // Vòm sóng xé gió hình chữ V ngay trước mũi nhọn của khiên (+X)
          ctx.strokeStyle = 'rgba(224, 242, 254, 0.88)';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(23, 0);
          ctx.quadraticCurveTo(10, -15 * pulse, -14, -20 * pulse);
          ctx.moveTo(23, 0);
          ctx.quadraticCurveTo(10, 15 * pulse, -14, 20 * pulse);
          ctx.stroke();

          // Vòng sóng xung kích phía sau đuôi khiên
          ctx.strokeStyle = 'rgba(125, 211, 252, 0.55)';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.ellipse(-16, 0, 6, 15 * pulse, 0, -Math.PI * 0.65, Math.PI * 0.65);
          ctx.stroke();

          // 2. Thân Khiên Hiệp Sĩ (Heater Shield - Hình 231006) với MŨI NHỌN hướng về +X (đầu lao ra)
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 14;

          const metalGrad = ctx.createLinearGradient(-15, -14, 18, 14);
          metalGrad.addColorStop(0, '#94a3b8');
          metalGrad.addColorStop(0.45, '#f8fafc');
          metalGrad.addColorStop(0.75, '#cbd5e1');
          metalGrad.addColorStop(1, '#64748b');
          ctx.fillStyle = metalGrad;
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 2.8;

          // Hình dáng khiên hiệp sĩ nằm ngang: Đáy khiên uốn lượn ở -X, Mũi nhọn lao ra ở +X (x = +19)
          ctx.beginPath();
          ctx.moveTo(19, 0); // Mũi nhọn của khiên lao về phía trước (+X)
          ctx.quadraticCurveTo(5, -13.5, -14, -14); // Cạnh cong trên
          ctx.quadraticCurveTo(-11, -7, -16, 0); // Đỉnh nhọn giữa của viền đáy khiên
          ctx.quadraticCurveTo(-11, 7, -14, 14); // Cạnh đáy dưới
          ctx.quadraticCurveTo(5, 13.5, 19, 0); // Cạnh cong dưới hội tụ về mũi nhọn
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Viền khung thép bên trong
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(14.5, 0);
          ctx.quadraticCurveTo(3, -10.5, -11, -11);
          ctx.lineTo(-12.5, 0);
          ctx.lineTo(-11, 11);
          ctx.quadraticCurveTo(3, 10.5, 14.5, 0);
          ctx.closePath();
          ctx.stroke();

          // 3. Thanh Chữ Thập kim loại nổi chính giữa mặt khiên (như Hình 231006)
          ctx.fillStyle = '#e2e8f0';
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.2;
          // Trục dọc của khiên (nằm dọc theo trục X từ -13 đến +15)
          ctx.fillRect(-13, -2.2, 27, 4.4);
          ctx.strokeRect(-13, -2.2, 27, 4.4);
          // Trục ngang của chữ thập (tại x = -2, từ y = -11 đến +11)
          ctx.fillRect(-4.2, -11, 4.4, 22);
          ctx.strokeRect(-4.2, -11, 4.4, 22);

          // 4. Các hạt đinh tán tròn (Rivets) dọc theo chữ thập và viền khiên (như Hình 231006)
          ctx.fillStyle = '#334155';
          const rivetPoints = [
            [-9, 0],
            [-2, 0],
            [5, 0],
            [11, 0],
            [-2, -7],
            [-2, 7],
            [-11, -12],
            [0, -11],
            [10, -7],
            [-11, 12],
            [0, 11],
            [10, 7],
          ];
          for (const [rx, ry] of rivetPoints) {
            ctx.beginPath();
            ctx.arc(rx, ry, 1.15, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        } else if (p.kind === 'dagger') {
          // CHIÊU 3 SÁT THỦ (SONG ĐAO PHI): Phi 2 thanh đao Damascus Đầu Sói như Hình 231249
          // Kèm hiệu ứng Tụ Lực của Xạ Thủ nhưng MÀU TÍM và NHẠT HƠN để nhìn thấy rõ thanh đao
          const pulse = 0.92 + Math.sin(performance.now() * 0.04) * 0.1;
          ctx.save();

          // PHẦN 1: Hiệu ứng Tụ Lực kiểu Xạ Thủ nhưng màu TÍM và ĐỘ ĐẬM NHẠT HƠN (translucent)
          ctx.save();
          // Vòng sóng xung kích elip màu tím nhạt
          ctx.strokeStyle = 'rgba(233, 213, 255, 0.28)';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.ellipse(-10, 0, 6, 13 * pulse, 0, -Math.PI * 0.65, Math.PI * 0.65);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(-22, 0, 8, 17 * pulse, 0, -Math.PI * 0.6, Math.PI * 0.6);
          ctx.stroke();

          // Luồng khí lốc xoáy tím chạy dọc hai bên sườn đao
          ctx.strokeStyle = 'rgba(192, 132, 252, 0.26)';
          ctx.lineWidth = 1.8;
          [-1, 1].forEach((dir) => {
            ctx.beginPath();
            ctx.moveTo(18, dir * 3);
            ctx.quadraticCurveTo(-4, dir * 13 * pulse, -34, dir * 18);
            ctx.stroke();
          });

          // Đuôi năng lượng thần quang tím mờ ảo (alpha nhạt để tôn nổi thanh đao)
          const purpleFlameGrad = ctx.createRadialGradient(-2, 0, 2, -8, 0, 34 * pulse);
          purpleFlameGrad.addColorStop(0, 'rgba(243, 232, 255, 0.38)');
          purpleFlameGrad.addColorStop(0.35, 'rgba(192, 132, 252, 0.30)');
          purpleFlameGrad.addColorStop(0.7, 'rgba(147, 51, 234, 0.18)');
          purpleFlameGrad.addColorStop(1, 'rgba(88, 28, 135, 0)');
          ctx.fillStyle = purpleFlameGrad;
          ctx.beginPath();
          ctx.moveTo(22, 0);
          ctx.quadraticCurveTo(3, -15 * pulse, -36, -11);
          ctx.lineTo(-26, 0);
          ctx.lineTo(-36, 11);
          ctx.quadraticCurveTo(3, 15 * pulse, 22, 0);
          ctx.closePath();
          ctx.fill();

          // Các hạt tinh linh tím sáng bay kèm hai bên luồng đao
          const purpleSparks = [
            { x: -6, y: 11, r: 2.0 },
            { x: -15, y: -12, r: 1.8 },
            { x: -22, y: 10, r: 1.7 },
          ];
          for (const sp of purpleSparks) {
            ctx.fillStyle = 'rgba(233, 213, 255, 0.65)';
            ctx.beginPath();
            ctx.arc(sp.x, sp.y * pulse, sp.r, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

          // PHẦN 2: Vẽ Thanh Đao Săn Damascus Đầu Sói sắc nét ở chính giữa (như Hình 231249)
          // 1. Đầu Sói bạc ở chuôi đao (x = -16)
          ctx.fillStyle = '#e2e8f0';
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(-15.5, 0, 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // 2. Cán gỗ mun đen bóng uốn lượn (x = -14 đến -3)
          ctx.fillStyle = '#18181b';
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(-14, -2.6);
          ctx.quadraticCurveTo(-8.5, -3.5, -3, -2.4);
          ctx.lineTo(-3, 2.8);
          ctx.quadraticCurveTo(-8.5, 1.8, -14, 2.6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // 3. Cổ đao kim loại bạc khắc hình tam giác (x = -3 đến 0.5)
          ctx.fillStyle = '#cbd5e1';
          ctx.beginPath();
          ctx.moveTo(-3.2, -3.5);
          ctx.lineTo(0.5, -3.0);
          ctx.lineTo(0.5, 4.4);
          ctx.lineTo(-3.2, 3.0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // 4. Lưỡi đao Damascus cong nhọn hướng về +X (x = 0.5 đến +20)
          ctx.fillStyle = '#f8fafc';
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(0.5, -3.2);
          ctx.lineTo(11, -3.8);
          ctx.lineTo(20, -0.4); // Mũi đao nhọn lao về phía trước
          ctx.quadraticCurveTo(11, 5.8, 0.5, 4.0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Sống lưng đao vân đá đen nhám (như Hình 231249)
          ctx.fillStyle = '#18181b';
          ctx.beginPath();
          ctx.moveTo(0.5, -3.0);
          ctx.lineTo(10.5, -3.5);
          ctx.lineTo(17.5, -0.6);
          ctx.quadraticCurveTo(9, 1.0, 0.5, 0.4);
          ctx.closePath();
          ctx.fill();

          // Vân thép Damascus gợn sóng trên lưỡi đao
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(1.5, 1.4);
          ctx.quadraticCurveTo(9.5, 3.0, 16.5, 0.2);
          ctx.stroke();

          ctx.restore();
        } else if (p.kind === 'fire_bolt') {
          // ĐÁNH THƯỜNG PHÁP SƯ LỬA: Quả cầu lửa xoáy sao chổi phát sáng (như Hình 112018)
          const pulse = 0.92 + Math.sin(performance.now() * 0.035) * 0.1;
          ctx.save();
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = 18;

          // Đuôi lửa đỏ cam kéo dải tua tủa về phía sau
          const boltGrad = ctx.createRadialGradient(4, 0, 2, -6, 0, 26 * pulse);
          boltGrad.addColorStop(0, '#ffffff');
          boltGrad.addColorStop(0.28, '#fef08a');
          boltGrad.addColorStop(0.62, '#f97316');
          boltGrad.addColorStop(0.9, 'rgba(220, 38, 38, 0.55)');
          boltGrad.addColorStop(1, 'rgba(185, 28, 28, 0)');
          ctx.fillStyle = boltGrad;
          ctx.beginPath();
          ctx.moveTo(15, 0);
          ctx.quadraticCurveTo(2, -14 * pulse, -26 * pulse, -9);
          ctx.lineTo(-17, -2);
          ctx.lineTo(-29 * pulse, 2);
          ctx.lineTo(-18, 6);
          ctx.lineTo(-24 * pulse, 11);
          ctx.quadraticCurveTo(2, 14 * pulse, 15, 0);
          ctx.closePath();
          ctx.fill();

          // Các dải lửa vàng xoáy ôm quanh đầu quả cầu lửa
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(3, 0, 9.5, -Math.PI * 0.72, Math.PI * 0.72);
          ctx.stroke();

          // Lõi cầu lửa trắng vàng rực sáng
          ctx.fillStyle = '#fef9c3';
          ctx.beginPath();
          ctx.arc(4, 0, 6.2 * pulse, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        } else if (p.kind === 'charged_fireball') {
          // CHIÊU 1 PHÁP SƯ LỬA (CẦU LỬA): Quả cầu lửa bùng nổ cuồn cuộn khói lửa (như Hình 112639)
          const nowMs = performance.now();
          const pulse = 0.94 + Math.sin(nowMs * 0.03) * 0.08;
          ctx.save();
          ctx.shadowColor = '#ea580c';
          ctx.shadowBlur = 24;

          // 1. Viền khói nâu đen bốc quanh rìa cầu lửa
          for (let sm = 0; sm < 8; sm++) {
            const ang = (sm * Math.PI) / 4 + nowMs * 0.005;
            const sx = Math.cos(ang) * 14 * pulse;
            const sy = Math.sin(ang) * 14 * pulse;
            ctx.fillStyle = 'rgba(63, 29, 24, 0.72)';
            ctx.beginPath();
            ctx.arc(sx, sy, 8.5, 0, Math.PI * 2);
            ctx.fill();
          }

          // 2. Thân cầu lửa đỏ cam cuồn cuộn đậm đặc
          const fbGrad = ctx.createRadialGradient(0, 0, 3, 0, 0, 20 * pulse);
          fbGrad.addColorStop(0, '#ffffff');
          fbGrad.addColorStop(0.28, '#fef08a');
          fbGrad.addColorStop(0.58, '#f97316');
          fbGrad.addColorStop(0.85, '#dc2626');
          fbGrad.addColorStop(1, 'rgba(127, 29, 29, 0)');
          ctx.fillStyle = fbGrad;
          ctx.beginPath();
          ctx.arc(0, 0, 20 * pulse, 0, Math.PI * 2);
          ctx.fill();

          // 3. Các cụm lửa vàng sáng cuộn xoáy bên trong quả cầu
          for (let fl = 0; fl < 5; fl++) {
            const fa = (fl * Math.PI * 2) / 5 - nowMs * 0.009;
            ctx.fillStyle = fl % 2 === 0 ? '#fde047' : '#fb923c';
            ctx.beginPath();
            ctx.arc(Math.cos(fa) * 7, Math.sin(fa) * 7, 5.2, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        } else if (p.kind === 'phoenix') {
          // CHIÊU 3 PHÁP SƯ LỬA (HỎA THẦN): Vẽ đường lửa Phượng Hoàng đã đi qua + Con Phượng Hoàng Lửa sải cánh (như Hình 113117)
          // Khôi phục transform để vẽ đường lửa theo tọa độ thực trên sân trước khi vẽ thân Phượng Hoàng
          ctx.restore();
          ctx.save();
          if (p.trailPoints && p.trailPoints.length > 0) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowColor = '#f97316';
            ctx.shadowBlur = 18;

            const drawTrail = () => {
              ctx.beginPath();
              ctx.moveTo(p.trailPoints![0].x, p.trailPoints![0].y);
              for (let tIdx = 1; tIdx < p.trailPoints!.length; tIdx++) {
                ctx.lineTo(p.trailPoints![tIdx].x, p.trailPoints![tIdx].y);
              }
              ctx.lineTo(p.x, p.y);
            };

            ctx.strokeStyle = 'rgba(234, 88, 12, 0.55)';
            ctx.lineWidth = 14;
            drawTrail();
            ctx.stroke();

            ctx.strokeStyle = '#fb923c';
            ctx.lineWidth = 7;
            drawTrail();
            ctx.stroke();

            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 2.6;
            drawTrail();
            ctx.stroke();
          }

          // Di chuyển tới vị trí hiện tại để vẽ Phượng Hoàng Lửa phát sáng (như Hình 113117)
          ctx.translate(p.x, p.y);
          ctx.rotate(ang);
          const nowMs = performance.now();
          const wingFlap = Math.sin(nowMs * 0.025) * 4;

          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 24;

          // Quầng hào quang lửa rực quanh Phượng Hoàng
          const phAura = ctx.createRadialGradient(2, 0, 3, -4, 0, 34);
          phAura.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
          phAura.addColorStop(0.4, 'rgba(253, 224, 71, 0.65)');
          phAura.addColorStop(0.75, 'rgba(239, 68, 68, 0.35)');
          phAura.addColorStop(1, 'rgba(185, 28, 28, 0)');
          ctx.fillStyle = phAura;
          ctx.beginPath();
          ctx.arc(0, 0, 34, 0, Math.PI * 2);
          ctx.fill();

          // Đuôi lửa uốn lượn dài phía sau (như Hình 113117)
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 6.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-8, 0);
          ctx.quadraticCurveTo(-20, -7, -30, 3);
          ctx.quadraticCurveTo(-38, 9, -46, -2);
          ctx.stroke();

          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 2.6;
          ctx.stroke();

          // Đôi cánh lửa sải rộng hai bên
          [-1, 1].forEach((dir) => {
            ctx.fillStyle = '#fb923c';
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(6, dir * 2);
            ctx.quadraticCurveTo(10, dir * (22 + wingFlap), -10, dir * (30 + wingFlap));
            ctx.lineTo(-4, dir * (18 + wingFlap * 0.5));
            ctx.lineTo(-14, dir * (20 + wingFlap * 0.4));
            ctx.quadraticCurveTo(-6, dir * 10, -8, dir * 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          });

          // Thân và đầu Phượng Hoàng rực sáng vàng trắng ở phía trước (+X)
          ctx.fillStyle = '#fef9c3';
          ctx.beginPath();
          ctx.moveTo(20, 0);
          ctx.quadraticCurveTo(10, -7, -10, -4);
          ctx.lineTo(-10, 4);
          ctx.quadraticCurveTo(10, 7, 20, 0);
          ctx.closePath();
          ctx.fill();

          // Mào lửa phượng hoàng
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(14, -2);
          ctx.quadraticCurveTo(6, -9, 2, -6);
          ctx.moveTo(14, 2);
          ctx.quadraticCurveTo(6, 9, 2, 6);
          ctx.stroke();
        } else if (p.kind === 'ice_bolt' || p.kind === 'mini_ice_bolt') {
          // ĐÁNH THƯỜNG & NỘI TẠI 2 PHÁP SƯ BĂNG (như Hình 193919; mini_ice_bolt nhỏ hơn 50%)
          if (p.kind === 'mini_ice_bolt') {
            ctx.scale(0.55, 0.55);
          }
          ctx.save();
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = p.kind === 'mini_ice_bolt' ? 12 : 18;

          // Quầng sáng xanh băng phía sau
          const boltAura = ctx.createRadialGradient(2, 0, 1, -4, 0, 22);
          boltAura.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
          boltAura.addColorStop(0.45, 'rgba(125, 211, 252, 0.58)');
          boltAura.addColorStop(1, 'rgba(2, 132, 199, 0)');
          ctx.fillStyle = boltAura;
          ctx.beginPath();
          ctx.ellipse(0, 0, 22, 11, 0, 0, Math.PI * 2);
          ctx.fill();

          // Viên băng nhọn màu xanh trắng bóng mượt (như Hình 193919)
          const icicleGrad = ctx.createLinearGradient(-15, -7, 19, 7);
          icicleGrad.addColorStop(0, '#0284c7');
          icicleGrad.addColorStop(0.45, '#7dd3fc');
          icicleGrad.addColorStop(0.85, '#e0f2fe');
          icicleGrad.addColorStop(1, '#ffffff');
          ctx.fillStyle = icicleGrad;
          ctx.strokeStyle = '#0369a1';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(19, 0); // Mũi nhọn băng hướng về phía trước (+X)
          ctx.quadraticCurveTo(5, -6.5, -14, -7.2);
          ctx.lineTo(-10, -2.5);
          ctx.lineTo(-16, 0);
          ctx.lineTo(-10, 2.5);
          ctx.lineTo(-14, 7.2);
          ctx.quadraticCurveTo(5, 6.5, 19, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Sống phản quang trắng tinh khiết dọc thân băng
          ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
          ctx.beginPath();
          ctx.moveTo(16, 0);
          ctx.lineTo(-9, -2.5);
          ctx.lineTo(-6, 0);
          ctx.lineTo(-9, 1.5);
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        } else if (p.kind === 'ice_sword') {
          // CHIÊU 2 PHÁP SƯ BĂNG (KIẾM BĂNG): Thanh kiếm tinh thể băng sắc cạnh phát sáng (như Hình 195456)
          ctx.save();
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 18;

          // Vệt gió băng phía sau kiếm
          const swordTrail = ctx.createLinearGradient(-32, 0, 18, 0);
          swordTrail.addColorStop(0, 'rgba(56, 189, 248, 0)');
          swordTrail.addColorStop(0.6, 'rgba(125, 211, 252, 0.35)');
          swordTrail.addColorStop(1, 'rgba(224, 242, 254, 0.72)');
          ctx.fillStyle = swordTrail;
          ctx.beginPath();
          ctx.moveTo(22, 0);
          ctx.lineTo(-32, -9);
          ctx.lineTo(-24, 0);
          ctx.lineTo(-32, 9);
          ctx.closePath();
          ctx.fill();

          // Đốc kiếm hình thoi tinh thể băng ở chuôi (-22)
          ctx.fillStyle = '#7dd3fc';
          ctx.strokeStyle = '#0369a1';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(-20, -4.5);
          ctx.lineTo(-25, 0);
          ctx.lineTo(-20, 4.5);
          ctx.lineTo(-15, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Cán kiếm xanh đậm bọc ngọc băng
          ctx.fillStyle = '#0c4a6e';
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 1.4;
          ctx.fillRect(-16, -2.5, 11, 5);
          ctx.strokeRect(-16, -2.5, 11, 5);

          // Lưỡi kiếm băng góc cạnh sắc bén nhiều mặt cắt (như Hình 195456)
          const bladeGrad = ctx.createLinearGradient(-6, -8, 25, 8);
          bladeGrad.addColorStop(0, '#0284c7');
          bladeGrad.addColorStop(0.45, '#38bdf8');
          bladeGrad.addColorStop(0.82, '#bae6fd');
          bladeGrad.addColorStop(1, '#ffffff');
          ctx.fillStyle = bladeGrad;
          ctx.strokeStyle = '#0369a1';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(26, 0); // Mũi kiếm nhọn lao ra (+X)
          ctx.lineTo(13, -5.8);
          ctx.lineTo(4, -6.2);
          ctx.lineTo(-4, -9.2); // Ngạnh hộ thủ pha lê trên
          ctx.lineTo(-6, -3.5);
          ctx.lineTo(-6, 3.5);
          ctx.lineTo(-4, 9.2); // Ngạnh hộ thủ pha lê dưới
          ctx.lineTo(4, 6.2);
          ctx.lineTo(13, 5.8);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Các mặt cắt kim cương trắng sáng dọc giữa lưỡi kiếm
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.beginPath();
          ctx.moveTo(23, 0);
          ctx.lineTo(8, -2.6);
          ctx.lineTo(-2, 0);
          ctx.lineTo(8, 2.6);
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        } else if (p.kind === 'earth_bolt') {
          // ĐÁNH THƯỜNG PHÁP SƯ THỔ (như Hình 094148): Khối đất 3D đẳng cự màu nâu đất
          ctx.save();
          ctx.rotate(-ang + Math.sin(performance.now() * 0.012 + p.id) * 0.35);
          const s = 11.5;

          // Quầng bụi đất vàng nâu nhẹ quanh khối đất bay
          ctx.shadowColor = '#b45309';
          ctx.shadowBlur = 10;

          // Mặt trên (Top face - nâu sáng)
          ctx.fillStyle = '#c26d27';
          ctx.strokeStyle = '#29170b';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(0, -s);
          ctx.lineTo(s * 0.92, -s * 0.45);
          ctx.lineTo(0, s * 0.08);
          ctx.lineTo(-s * 0.92, -s * 0.45);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Mặt trái (Left face - nâu vừa)
          ctx.fillStyle = '#92400e';
          ctx.beginPath();
          ctx.moveTo(-s * 0.92, -s * 0.45);
          ctx.lineTo(0, s * 0.08);
          ctx.lineTo(0, s);
          ctx.lineTo(-s * 0.92, s * 0.48);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Mặt phải (Right face - nâu sẫm)
          ctx.fillStyle = '#6c2e0a';
          ctx.beginPath();
          ctx.moveTo(s * 0.92, -s * 0.45);
          ctx.lineTo(0, s * 0.08);
          ctx.lineTo(0, s);
          ctx.lineTo(s * 0.92, s * 0.48);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Hạt pixel vân đất đặc trưng trên khối đất
          ctx.fillStyle = '#d97706';
          ctx.fillRect(-3, -s * 0.52, 3, 2.5);
          ctx.fillRect(2, -s * 0.4, 2.5, 2);
          ctx.fillStyle = '#451a03';
          ctx.fillRect(-6, s * 0.15, 3, 3);
          ctx.fillRect(3, s * 0.25, 3, 3);

          ctx.restore();
        } else if (p.kind === 'wind_bolt') {
          // ĐÁNH THƯỜNG PHÁP SƯ GIÓ (PHONG ĐẠN): Quả cầu khí xanh ngọc phát sáng + vệt gió cong
          const nowMs = performance.now();
          const pulse = 0.92 + Math.sin(nowMs * 0.03) * 0.09;
          ctx.save();
          ctx.shadowColor = '#4ade80';
          ctx.shadowBlur = 16;

          // Đuôi gió uốn lượn phía sau (-X)
          const tailGrad = ctx.createLinearGradient(8, 0, -28, 0);
          tailGrad.addColorStop(0, 'rgba(187, 247, 208, 0.85)');
          tailGrad.addColorStop(0.55, 'rgba(74, 222, 128, 0.45)');
          tailGrad.addColorStop(1, 'rgba(22, 163, 74, 0)');
          ctx.fillStyle = tailGrad;
          ctx.beginPath();
          ctx.moveTo(10, -4);
          ctx.quadraticCurveTo(-8, -11 * pulse, -28, -5);
          ctx.lineTo(-20, 0);
          ctx.lineTo(-28, 5);
          ctx.quadraticCurveTo(-8, 11 * pulse, 10, 4);
          ctx.closePath();
          ctx.fill();

          // Hai dải khí xoáy quanh quả cầu gió
          ctx.save();
          ctx.rotate(nowMs * 0.018 + p.id);
          ctx.strokeStyle = 'rgba(220, 252, 231, 0.9)';
          ctx.lineWidth = 1.9;
          ctx.beginPath();
          ctx.arc(0, 0, 10.5 * pulse, 0.2, Math.PI * 1.05);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, 10.5 * pulse, Math.PI + 0.2, Math.PI * 2.05);
          ctx.stroke();
          ctx.restore();

          // Quả cầu gió lõi trắng ngọc - xanh lục
          const orbGrad = ctx.createRadialGradient(2, -1, 1.5, 0, 0, 8.5 * pulse);
          orbGrad.addColorStop(0, '#ffffff');
          orbGrad.addColorStop(0.38, '#bbf7d0');
          orbGrad.addColorStop(0.75, '#4ade80');
          orbGrad.addColorStop(1, '#15803d');
          ctx.fillStyle = orbGrad;
          ctx.beginPath();
          ctx.arc(0, 0, 8.5 * pulse, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        } else if (p.kind === 'wind_tornado') {
          // CHIÊU 1 PHÁP SƯ GIÓ (LỐC XOÁY): Phễu lốc xoáy nằm ngang xoáy cuồn cuộn lao thẳng
          const nowMs = performance.now();
          ctx.save();
          ctx.shadowColor = '#4ade80';
          ctx.shadowBlur = 18;

          // Luồng khí tốc độ dài phía sau đuôi lốc (-X)
          ctx.strokeStyle = 'rgba(187, 247, 208, 0.55)';
          ctx.lineWidth = 2.0;
          [-1, 1].forEach((dir) => {
            ctx.beginPath();
            ctx.moveTo(14, dir * 18);
            ctx.quadraticCurveTo(-12, dir * 14, -38, dir * 5);
            ctx.stroke();
          });

          // Các vòng xoáy elip xếp tầng tạo hình phễu lốc xoáy (đầu rộng ở +X, thuôn nhọn về -X)
          const ringSteps = 6;
          for (let i = 0; i < ringSteps; i++) {
            const frac = i / (ringSteps - 1); // 0 = đuôi nhỏ (-22), 1 = miệng rộng (+14)
            const rx = -22 + frac * 34;
            const radiusY = 5.5 + frac * 14.5;
            const radiusX = 3.2 + frac * 4.5;
            const wobble = Math.sin(nowMs * 0.025 + i * 1.3) * 2.2;

            ctx.fillStyle =
              i % 2 === 0 ? 'rgba(134, 239, 172, 0.24)' : 'rgba(34, 197, 94, 0.28)';
            ctx.strokeStyle = i % 2 === 0 ? '#bbf7d0' : '#4ade80';
            ctx.lineWidth = 2.2 + frac * 1.1;
            ctx.beginPath();
            ctx.ellipse(rx, wobble, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }

          // Vệt gió trắng sáng cuộn xoắn ở tâm miệng lốc
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(-18, 0);
          ctx.bezierCurveTo(-6, -12, 4, 13, 15, -3);
          ctx.stroke();

          ctx.restore();
        } else {
          // Kunai nội tại của Samurai
          ctx.fillStyle = p.color;
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(12, 0);
          ctx.lineTo(-8, -5);
          ctx.lineTo(-8, 5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }

      // Vẽ Vụ Nổ Cầu Lửa Nhỏ (Chiêu 1 Pháp Sư Lửa)
      for (const ex of sim.explosions) {
        const ratio = Math.max(0, ex.life / ex.maxLife);
        const expand = 1 - ratio;
        const curR = ex.radius * (0.45 + expand * 0.72);
        ctx.save();
        ctx.translate(ex.x, ex.y);
        ctx.globalAlpha = Math.min(1, ratio * 1.4);

        const expGrad = ctx.createRadialGradient(0, 0, curR * 0.12, 0, 0, curR);
        expGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        expGrad.addColorStop(0.35, 'rgba(253, 224, 71, 0.88)');
        expGrad.addColorStop(0.68, 'rgba(249, 115, 22, 0.72)');
        expGrad.addColorStop(0.9, 'rgba(185, 28, 28, 0.42)');
        expGrad.addColorStop(1, 'rgba(63, 25, 18, 0)');
        ctx.fillStyle = expGrad;
        ctx.beginPath();
        ctx.arc(0, 0, curR, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3 * ratio;
        ctx.beginPath();
        ctx.arc(0, 0, curR * 0.85, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Vẽ Tàn Lửa Rơi Ra (Embers) từ cầu lửa đánh thường / mưa lửa / nổ cầu lửa
      for (const em of sim.embers) {
        const ratio = Math.max(0, em.life / em.maxLife);
        ctx.save();
        ctx.globalAlpha = Math.min(1, ratio * 1.25);
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 6;
        ctx.fillStyle = em.color;
        ctx.beginPath();
        ctx.arc(em.x, em.y, em.size * (0.6 + ratio * 0.4), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Vẽ Mảnh Vỡ Băng (Ice Shatters) khi đạn băng / kiếm băng / kẹp băng vỡ tung
      for (const sh of sim.iceShatters) {
        const ratio = Math.max(0, sh.life / sh.maxLife);
        const s = sh.size * (0.55 + ratio * 0.45);
        ctx.save();
        ctx.translate(sh.x, sh.y);
        ctx.rotate(sh.angle);
        ctx.globalAlpha = Math.min(1, ratio * 1.35);
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 6;
        ctx.fillStyle = sh.color;
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(s * 1.3, 0);
        ctx.lineTo(-s * 0.6, -s * 0.75);
        ctx.lineTo(-s * 0.9, s * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Vẽ Mảnh Đất Vỡ (Earth Shatters) khi khối đất chạm vật thể vỡ thành mảnh nhỏ
      for (const es of sim.earthShatters) {
        const ratio = Math.max(0, es.life / es.maxLife);
        const s = es.size * (0.55 + ratio * 0.45);
        ctx.save();
        ctx.translate(es.x, es.y);
        ctx.rotate(es.angle);
        ctx.globalAlpha = Math.min(1, ratio * 1.4);
        ctx.fillStyle = es.color;
        ctx.strokeStyle = '#29170b';
        ctx.lineWidth = 1;
        ctx.fillRect(-s, -s * 0.85, s * 2, s * 1.7);
        ctx.strokeRect(-s, -s * 0.85, s * 2, s * 1.7);
        ctx.restore();
      }

      // Vẽ Chiêu 3 Pháp Sư Gió (THIÊN LONG QUYỂN): Cột lốc xoáy dựng đứng nhiều tầng quay ngược chiều + vòng mặt đất phát sáng
      for (const wv of sim.windVortexes) {
        const nowMs = performance.now();
        const age = wv.maxDuration - wv.remainingDuration;
        const alpha =
          wv.remainingDuration < 0.28
            ? Math.max(0, wv.remainingDuration / 0.28)
            : Math.min(1, age / 0.16);

        ctx.save();
        ctx.translate(wv.x, wv.y);
        ctx.globalAlpha = alpha;

        // 1. Vòng năng lượng & vết rạn sáng xanh ngọc dưới chân cột lốc
        const baseGrad = ctx.createRadialGradient(0, 0, 12, 0, 0, wv.radius + 14);
        baseGrad.addColorStop(0, 'rgba(187, 247, 208, 0.42)');
        baseGrad.addColorStop(0.55, 'rgba(34, 197, 94, 0.28)');
        baseGrad.addColorStop(0.88, 'rgba(20, 83, 45, 0.18)');
        baseGrad.addColorStop(1, 'rgba(20, 83, 45, 0)');
        ctx.fillStyle = baseGrad;
        ctx.beginPath();
        ctx.arc(0, 0, wv.radius + 14, 0, Math.PI * 2);
        ctx.fill();

        // Vòng chân lốc & tia sáng rạn mặt đất xanh ngọc
        ctx.strokeStyle = 'rgba(134, 239, 172, 0.85)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(0, 0, wv.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.save();
        ctx.rotate(nowMs * 0.004);
        ctx.strokeStyle = 'rgba(187, 247, 208, 0.55)';
        ctx.lineWidth = 1.6;
        for (let r = 0; r < 6; r++) {
          const rAng = (r * Math.PI) / 3;
          ctx.beginPath();
          ctx.moveTo(Math.cos(rAng) * 26, Math.sin(rAng) * 26);
          ctx.lineTo(Math.cos(rAng + 0.16) * (wv.radius - 4), Math.sin(rAng + 0.16) * (wv.radius - 4));
          ctx.stroke();
        }
        ctx.restore();

        // 2. Thân cột lốc xoáy dựng đứng nhiều tầng quay ngược chiều nhau (nhỏ ở đáy, loe rộng lên đỉnh)
        const layers = 7;
        const columnHeight = 86;
        for (let l = 0; l < layers; l++) {
          const t = l / (layers - 1); // 0 đáy -> 1 đỉnh
          const ly = 6 - t * columnHeight;
          const rx = 24 + t * (wv.radius * 0.58);
          const ry = rx * 0.36;
          const spinDir = l % 2 === 0 ? 1 : -1;
          const phase = nowMs * 0.011 * spinDir + l * 0.9;
          const swayX = Math.sin(nowMs * 0.009 + l * 0.7) * (4 + t * 5);

          ctx.save();
          ctx.translate(swayX, ly);
          ctx.shadowColor = '#4ade80';
          ctx.shadowBlur = 14;
          ctx.strokeStyle =
            l % 2 === 0 ? 'rgba(134, 239, 172, 0.88)' : 'rgba(22, 163, 74, 0.82)';
          ctx.lineWidth = 3.2 - t * 0.5;
          ctx.beginPath();
          ctx.ellipse(0, 0, rx, ry, 0, phase, phase + Math.PI * 1.45);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(0, 0, rx * 0.86, ry * 0.86, 0, phase + Math.PI * 0.8, phase + Math.PI * 1.9);
          ctx.stroke();
          ctx.restore();
        }

        // 3. Cột luồng khí thẳng đứng mờ ở tâm lốc xoáy
        const coreColGrad = ctx.createLinearGradient(0, 10, 0, -columnHeight);
        coreColGrad.addColorStop(0, 'rgba(187, 247, 208, 0.35)');
        coreColGrad.addColorStop(0.5, 'rgba(74, 222, 128, 0.22)');
        coreColGrad.addColorStop(1, 'rgba(134, 239, 172, 0)');
        ctx.fillStyle = coreColGrad;
        ctx.beginPath();
        ctx.moveTo(-22, 8);
        ctx.lineTo(-wv.radius * 0.62, -columnHeight);
        ctx.lineTo(wv.radius * 0.62, -columnHeight);
        ctx.lineTo(22, 8);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }

      // Vẽ Sóng Xung Kích Gió (Wind Shockwaves) bung nở khi đẩy lùi hoặc kết thúc Thiên Long Quyển
      for (const sw of sim.windShockwaves) {
        const ratio = Math.max(0, sw.life / sw.maxLife);
        const progress = 1 - ratio;
        const curR = 12 + progress * sw.maxRadius;
        ctx.save();
        ctx.translate(sw.x, sw.y);
        ctx.globalAlpha = Math.min(1, ratio * 1.35);

        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 12;
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 4.2 * ratio;
        ctx.beginPath();
        ctx.arc(0, 0, curR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8 * ratio;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, curR * 0.78, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // Vẽ Hạt Lá Xanh & Hạt Gió Bay (Wind Leaves)
      for (const lf of sim.windLeaves) {
        const ratio = Math.max(0, lf.life / lf.maxLife);
        const sz = lf.size * (0.65 + ratio * 0.35);
        ctx.save();
        ctx.translate(lf.x, lf.y);
        ctx.rotate(lf.angle);
        ctx.globalAlpha = Math.min(1, ratio * 1.3);
        ctx.fillStyle = lf.color;
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(sz * 1.4, 0);
        ctx.quadraticCurveTo(0, -sz * 0.85, -sz * 1.4, 0);
        ctx.quadraticCurveTo(0, sz * 0.85, sz * 1.4, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Vẽ hạt ánh sáng va chạm
      for (const pt of sim.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Vẽ hiệu ứng Sóng Chấn Động (Shockwave Ripple) và lóe sáng khi bóng chạm tường đấu trường
      for (const wf of sim.wallFlashes) {
        const alpha = Math.max(0, wf.intensity);
        const progress = 1 - alpha;
        const maxRad = wf.maxRadius ?? 62;
        const waveRadius1 = 8 + progress * maxRad;
        const waveRadius2 = Math.max(4, waveRadius1 * 0.55);

        let wx = 0;
        let wy = 0;
        let startAng = 0;
        let endAng = Math.PI;

        if (wf.side === 'left') {
          wx = 2;
          wy = wf.pos;
          startAng = -Math.PI / 2;
          endAng = Math.PI / 2;
        } else if (wf.side === 'right') {
          wx = ARENA_SIZE - 2;
          wy = wf.pos;
          startAng = Math.PI / 2;
          endAng = Math.PI * 1.5;
        } else if (wf.side === 'top') {
          wx = wf.pos;
          wy = 2;
          startAng = 0;
          endAng = Math.PI;
        } else {
          wx = wf.pos;
          wy = ARENA_SIZE - 2;
          startAng = Math.PI;
          endAng = Math.PI * 2;
        }

        ctx.save();
        ctx.globalAlpha = alpha;

        // Vệt sáng ngay trên mép tường
        ctx.strokeStyle = wf.color ?? '#ef4444';
        ctx.lineWidth = 6;
        ctx.beginPath();
        if (wf.side === 'left' || wf.side === 'right') {
          ctx.moveTo(wx, wy - 36);
          ctx.lineTo(wx, wy + 36);
        } else {
          ctx.moveTo(wx - 36, wy);
          ctx.lineTo(wx + 36, wy);
        }
        ctx.stroke();

        // Vòng sóng chấn động ngoài lan tỏa vào trong sân
        ctx.strokeStyle = wf.color ?? '#ef4444';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.arc(wx, wy, waveRadius1, startAng, endAng);
        ctx.stroke();

        // Vòng sóng chấn động thứ hai bên trong (nét đứt)
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(wx, wy, waveRadius2, startAng, endAng);
        ctx.stroke();

        ctx.restore();
      }

      // Vẽ Số Sát Thương Nổi (Floating Damage Numbers)
      for (const ft of sim.floatingTexts) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, (ft.life / ft.maxLife) * 1.65);
        ctx.font = ft.isCrit
          ? '900 20px "Chakra Petch", sans-serif'
          : ft.isSkill
          ? '800 16px "Chakra Petch", sans-serif'
          : '800 15px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#09090b';
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      // Vẽ Hiệu Ứng Kết Liễu: 8 viên vàng sáng nhỏ (20%) phân rã -> sau 0.5s hội tụ thành đồng tiền màu bên thắng -> bay về phía chủ sở hữu
      if (sim.finisher) {
        const fin = sim.finisher;
        const orbRadius = BALL_RADIUS * 0.2; // Kích thước bằng 20% quả bóng

        // 1. Vẽ 8 viên vàng sáng nhỏ (0s -> 1.35s)
        if (fin.elapsed <= 1.35) {
          const orbAlpha =
            fin.elapsed <= 1.15
              ? 1
              : Math.max(0, 1 - (fin.elapsed - 1.15) / 0.2);

          // Vầng sáng hội tụ nhẹ ở tâm khi đang thu về đồng tiền
          if (fin.elapsed > 0.5) {
            const convRatio = Math.min(1, (fin.elapsed - 0.5) / 0.85);
            ctx.save();
            ctx.globalAlpha = convRatio * 0.65;
            const centerGlow = ctx.createRadialGradient(
              fin.loserX,
              fin.loserY,
              2,
              fin.loserX,
              fin.loserY,
              28 * (1 - convRatio * 0.4)
            );
            centerGlow.addColorStop(0, '#ffffff');
            centerGlow.addColorStop(0.4, fin.coinColor);
            centerGlow.addColorStop(1, 'rgba(250, 204, 21, 0)');
            ctx.fillStyle = centerGlow;
            ctx.beginPath();
            ctx.arc(fin.loserX, fin.loserY, 28, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          for (const orb of fin.orbs) {
            ctx.save();
            ctx.globalAlpha = orbAlpha;
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = 16;

            // Vệt kéo sáng khi hội tụ (sau 0.5s)
            if (fin.elapsed > 0.5) {
              ctx.strokeStyle = 'rgba(254, 240, 138, 0.55)';
              ctx.lineWidth = 2.4;
              ctx.beginPath();
              ctx.moveTo(orb.x, orb.y);
              ctx.lineTo(
                orb.x + (orb.x - fin.loserX) * 0.24,
                orb.y + (orb.y - fin.loserY) * 0.24
              );
              ctx.stroke();
            }

            // Viên vàng sáng kích thước 20% quả bóng
            const orbGrad = ctx.createRadialGradient(
              orb.x - 1.5,
              orb.y - 1.5,
              0.8,
              orb.x,
              orb.y,
              orbRadius
            );
            orbGrad.addColorStop(0, '#ffffff');
            orbGrad.addColorStop(0.45, '#fef08a');
            orbGrad.addColorStop(0.85, '#facc15');
            orbGrad.addColorStop(1, '#d97706');
            ctx.fillStyle = orbGrad;
            ctx.strokeStyle = '#fef9c3';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, orbRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
        }

        // 2. Đồng tiền màu tương ứng bên thắng tụ thành và bay về phía chủ sở hữu (1.15s -> 2.25s)
        if (fin.elapsed >= 1.15) {
          const popScale =
            fin.elapsed < 1.35
              ? Math.max(0.15, (fin.elapsed - 1.15) / 0.2)
              : 1;
          const flyRatio =
            fin.elapsed > 1.35
              ? Math.min(1, (fin.elapsed - 1.35) / 0.9)
              : 0;

          // Vệt đuôi sáng khi đồng tiền bay về phía người sở hữu bên thắng
          if (flyRatio > 0) {
            ctx.save();
            const tailGrad = ctx.createLinearGradient(
              fin.loserX,
              fin.loserY,
              fin.coinX,
              fin.coinY
            );
            tailGrad.addColorStop(0, 'rgba(250, 204, 21, 0)');
            tailGrad.addColorStop(0.65, `${fin.coinColor}66`);
            tailGrad.addColorStop(1, '#fde047');
            ctx.strokeStyle = tailGrad;
            ctx.lineWidth = 10 * (1 - flyRatio * 0.35);
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(
              fin.coinX - (fin.coinX - fin.loserX) * 0.35,
              fin.coinY - (fin.coinY - fin.loserY) * 0.35
            );
            ctx.lineTo(fin.coinX, fin.coinY);
            ctx.stroke();
            ctx.restore();
          }

          ctx.save();
          ctx.translate(fin.coinX, fin.coinY);
          const spinScaleX = 0.72 + Math.abs(Math.cos(fin.elapsed * 12)) * 0.28;
          ctx.scale(popScale * spinScaleX, popScale);
          ctx.shadowColor = fin.coinColor;
          ctx.shadowBlur = 22;

          // Vành đồng tiền ánh vàng rực bên ngoài
          ctx.fillStyle = '#facc15';
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.arc(0, 0, 17, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Lõi đồng tiền mang màu tương ứng bên thắng (Đỏ cho PLAYER, Xanh cho BOT)
          const coinFaceGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, 13.5);
          coinFaceGrad.addColorStop(0, fin.coinBorderColor);
          coinFaceGrad.addColorStop(0.5, fin.coinColor);
          coinFaceGrad.addColorStop(1, '#18181b');
          ctx.fillStyle = coinFaceGrad;
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(0, 0, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Ký hiệu đồng tiền B ở chính giữa
          ctx.font = '900 14px "Chakra Petch", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#09090b';
          ctx.strokeText('B', 0, 1);
          ctx.fillStyle = '#fef9c3';
          ctx.fillText('B', 0, 1);
          ctx.restore();
        }
      }

      // Viền khung đấu trường
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, ARENA_SIZE - 4, ARENA_SIZE - 4);

      ctx.restore();
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [simRef]);

  return (
    <canvas
      ref={canvasRef}
      width={ARENA_SIZE}
      height={ARENA_SIZE}
      data-testid="battle-arena-canvas"
      className="w-full h-full aspect-square bg-[#091120] border-4 border-black shadow-[0_0_35px_rgba(220,38,38,0.28)]"
    />
  );
};
