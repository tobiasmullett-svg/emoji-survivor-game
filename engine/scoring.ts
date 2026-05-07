export interface RunScoreInput {
  wave: number;
  kills: number;
  time: number;
}

export function calculateRunScore({ wave, kills, time }: RunScoreInput): number {
  const safeWave = Math.max(0, Math.floor(wave));
  const safeKills = Math.max(0, Math.floor(kills));
  const safeTime = Math.max(0, Math.floor(time));
  const bossClears = Math.floor(safeWave / 5);
  const victoryBonus = safeWave >= 20 ? 3000 : 0;

  return safeWave * 1000 + bossClears * 500 + safeKills * 12 + safeTime + victoryBonus;
}
