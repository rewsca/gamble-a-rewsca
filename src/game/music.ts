import { GameScreenState } from './types';

export type MusicTrackKey = 'lobby' | 'battle';

export interface MusicTrackConfig {
  key: MusicTrackKey;
  title: string;
  youtubeUrl: string;
  videoId: string;
  playlistId: string;
}

export const MUSIC_TRACKS: Record<MusicTrackKey, MusicTrackConfig> = {
  lobby: {
    key: 'lobby',
    title: 'Nhạc Nền Sảnh',
    youtubeUrl:
      'https://www.youtube.com/watch?v=NGP-IukPLEo&list=RDNGP-IukPLEo&start_radio=1',
    videoId: 'NGP-IukPLEo',
    playlistId: 'RDNGP-IukPLEo',
  },
  battle: {
    key: 'battle',
    title: 'Nhạc Trong Trận',
    youtubeUrl:
      'https://www.youtube.com/watch?v=ulHcNwK1q_U&list=RDulHcNwK1q_U&start_radio=1',
    videoId: 'ulHcNwK1q_U',
    playlistId: 'RDulHcNwK1q_U',
  },
};

export function extractYoutubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const vParam = parsed.searchParams.get('v');
    if (vParam && vParam.trim().length > 0) {
      return vParam.trim();
    }
    if (parsed.hostname.includes('youtu.be')) {
      const seg = parsed.pathname.replace(/^\/+/, '').split('/')[0];
      return seg ? seg.trim() : null;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Xác định bản nhạc cần phát dựa theo màn hình hiện tại và trạng thái giao chiến của trận đấu:
 * - Ở sảnh, cửa hàng, bộ sưu tập, chọn bóng, kết thúc chung cuộc hoặc chuẩn bị trước khi vào ván 1: phát Nhạc Nền Sảnh.
 * - Khi trận đấu bước vào giao chiến (và xuyên suốt các ván trong trận tới khi kết thúc): phát Nhạc Trong Trận.
 */
export function resolveMusicTrackForState(
  screen: GameScreenState,
  matchBattleActive: boolean
): MusicTrackKey {
  if (
    matchBattleActive &&
    (screen === 'PREPARATION' || screen === 'BATTLE' || screen === 'ROUND_RESULT')
  ) {
    return 'battle';
  }
  return 'lobby';
}

export function computeEffectiveMusicVolume(
  soundEnabled: boolean,
  musicEnabled: boolean,
  musicVolume: number
): number {
  if (!soundEnabled || !musicEnabled) return 0;
  if (!Number.isFinite(musicVolume)) return 0;
  return Math.max(0, Math.min(1, musicVolume));
}
