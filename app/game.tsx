import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, BackHandler, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import type { GameState, GamePhase, HudData, CharacterId } from '../engine/types';
import { Vec2 } from '../engine/math';
import {
  initGameState, updateGame, extractHudData,
  activateAbility, pauseGame, resumeGame,
  applyLevelUpChoice, startNextWave,
} from '../engine/GameEngine';
import { saveHighScore } from '../services/storage';
import { CHARACTERS, WEAPONS, EVOLVED_WEAPONS } from '../engine/data';
import { playSound, resumeAudio } from '../services/audio';
import { addRunToProgression, getProgression } from '../engine/progression';
import { checkAchievements, type Achievement } from '../engine/achievements';
import GameCanvas from '../components/game/GameCanvas';
import VirtualJoystick from '../components/game/VirtualJoystick';
import HUD from '../components/game/HUD';
import AbilityButton from '../components/game/AbilityButton';
import PauseOverlay from '../components/game/PauseOverlay';
import LevelUpModal from '../components/game/LevelUpModal';
import ShopOverlay from '../components/game/ShopOverlay';
import GameOverOverlay from '../components/game/GameOverOverlay';

const defaultHud: HudData = {
  hp: 100, maxHp: 100, armor: 0, waveNum: 1, waveTimer: 25, waveMaxTime: 25,
  materials: 0, level: 1, xp: 0, xpToNext: 10,
  abilityCd: 0, abilityMaxCd: 30, abilityEmoji: '\u2B50', phase: 'waveAnnounce',
  comboCount: 0, comboTimer: 0, bestCombo: 0,
  petCount: 0, resourceCount: 0,
  equippedWeapons: [],
};

const DEFAULT_CHARACTER: CharacterId = 'crab';

function getRouteCharacterId(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function resolvePlayableCharacterId(requestedId: string | undefined, unlockedCharacters: string[]): CharacterId {
  const requestedCharacter = CHARACTERS.find(c => c.id === requestedId)?.id;
  if (requestedCharacter && unlockedCharacters.includes(requestedCharacter)) return requestedCharacter;
  return DEFAULT_CHARACTER;
}

export default function GameScreen() {
  useKeepAwake();
  const router = useRouter();
  const { characterId } = useLocalSearchParams<{ characterId?: string | string[] }>();
  const gameRef = useRef<GameState | null>(null);
  const inputRef = useRef<Vec2>({ x: 0, y: 0 });
  const keysRef = useRef<Set<string>>(new Set());
  const phaseRef = useRef<GamePhase>('waveAnnounce');
  const [frame, setFrame] = useState(0);
  const [phase, setPhase] = useState<GamePhase>('waveAnnounce');
  const [hudData, setHudData] = useState<HudData>(defaultHud);
  const [achievementToast, setAchievementToast] = useState<Achievement[]>([]);
  const [runAchievements, setRunAchievements] = useState<Achievement[]>([]);
  const scoreSaved = useRef(false);
  const achievementsChecked = useRef(false);

  // Auto-hide achievement toast
  useEffect(() => {
    if (achievementToast.length === 0) return;
    const timer = setTimeout(() => setAchievementToast([]), 4000);
    return () => clearTimeout(timer);
  }, [achievementToast]);

  useEffect(() => {
    let cancelled = false;
    const { width, height } = Dimensions.get('window');
    const requestedCharacter = getRouteCharacterId(characterId);
    gameRef.current = null;
    phaseRef.current = 'waveAnnounce';
    setPhase('waveAnnounce');
    setHudData(defaultHud);
    scoreSaved.current = false;
    achievementsChecked.current = false;
    setAchievementToast([]);
    setRunAchievements([]);
    getProgression().then(prog => {
      if (cancelled) return;
      const selectedCharacter = resolvePlayableCharacterId(requestedCharacter, prog.unlockedCharacters);
      gameRef.current = initGameState(selectedCharacter, width, height, prog.startingBonuses);
      setHudData(extractHudData(gameRef.current));
    }).catch(() => {
      if (cancelled) return;
      const selectedCharacter = resolvePlayableCharacterId(requestedCharacter, [DEFAULT_CHARACTER]);
      gameRef.current = initGameState(selectedCharacter, width, height);
      setHudData(extractHudData(gameRef.current));
    });
    resumeAudio();
    let lastTs = 0;
    let renderCt = 0;
    let animationFrameId = 0;
    const loop = (ts: number) => {
      const dt = lastTs === 0 ? 0.016 : Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;
      const state = gameRef.current;
      if (state) {
        if (__DEV__ && Platform.OS === 'web') {
          (globalThis as any).__emojiState = state;
          (globalThis as any).__emojiTick = renderCt;
        }
        const ph = state.phase;
        if (ph === 'playing' || ph === 'waveAnnounce' || ph === 'collecting') {
          updateGame(state, dt, inputRef.current);
        }
        renderCt++;
        if (renderCt % 2 === 0) setFrame(f => f + 1);
        if (renderCt % 6 === 0) setHudData(extractHudData(state));
        if (state.phase !== phaseRef.current) {
          phaseRef.current = state.phase;
          setPhase(state.phase);
          setHudData(extractHudData(state));
          // Phase change sounds
          if (state.phase === 'waveAnnounce') {
            const wave = state.wave.number;
            if ([5, 10, 15, 20].includes(wave)) {
              playSound('bossWarning');
            } else {
              playSound('waveStart');
            }
          }
        }
      }
      animationFrameId = requestAnimationFrame(loop);
    };
    animationFrameId = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrameId);
    };
  }, [characterId]);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      const state = gameRef.current;
      if (!state) return;
      state.sw = window.width;
      state.sh = window.height;
    });
    return () => sub.remove();
  }, []);

  // Save high score + progression + achievements on game over
  useEffect(() => {
    if (phase === 'gameover' && !scoreSaved.current) {
      scoreSaved.current = true;
      const state = gameRef.current;
      if (state) {
        const cDef = CHARACTERS.find(c => c.id === state.player?.characterId);
        const elapsed = Math.round((Date.now() - (state.stats?.startTime ?? Date.now())) / 1000);
        const wave = state.wave?.number ?? 0;
        const kills = state.stats?.enemiesKilled ?? 0;
        
        saveHighScore({
          emoji: cDef?.emoji ?? '?', name: cDef?.name ?? 'Unknown',
          wave, kills,
          date: new Date().toLocaleDateString(), time: elapsed,
        }).catch(() => {});
        
        // Add to progression
        addRunToProgression(wave, kills, elapsed).catch(() => {});
        
        // Check achievements
        if (!achievementsChecked.current) {
          achievementsChecked.current = true;
          checkAchievements({
            wave, kills,
            damageDealt: state.stats.damageDealt,
            materials: state.materials,
            time: elapsed,
            comboBest: state.combo.best,
            elitesKilled: state.stats.elitesKilled,
            evolvedWeapons: state.stats.weaponsEvolved,
            noHitRun: !state.stats.wasHit,
          }).then(newOnes => {
            if (newOnes.length > 0) {
              setAchievementToast(newOnes);
              setRunAchievements(newOnes);
            }
          }).catch(() => {});
        }
        
        // Sound
        playSound(state.victory ? 'victory' : 'gameOver');
      }
    }
  }, [phase]);

  // Back button
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const state = gameRef.current;
      if (state && (state.phase === 'playing' || state.phase === 'waveAnnounce')) {
        pauseGame(state);
        phaseRef.current = 'paused';
        setPhase('paused');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  const handleInput = useCallback((v: Vec2) => { inputRef.current = v; }, []);

  const handlePause = useCallback(() => {
    const state = gameRef.current;
    if (state) { pauseGame(state); phaseRef.current = 'paused'; setPhase('paused'); }
  }, []);

  const handleResume = useCallback(() => {
    const state = gameRef.current;
    if (state) { resumeGame(state); phaseRef.current = state.phase; setPhase(state.phase); }
  }, []);

  const handleRestart = useCallback(() => {
    const { width, height } = Dimensions.get('window');
    const requestedCharacter = getRouteCharacterId(characterId);
    gameRef.current = null;
    phaseRef.current = 'waveAnnounce';
    setPhase('waveAnnounce');
    setHudData(defaultHud);
    scoreSaved.current = false;
    achievementsChecked.current = false;
    setAchievementToast([]);
    setRunAchievements([]);
    getProgression().then(prog => {
      const selectedCharacter = resolvePlayableCharacterId(requestedCharacter, prog.unlockedCharacters);
      gameRef.current = initGameState(selectedCharacter, width, height, prog.startingBonuses);
      setHudData(extractHudData(gameRef.current));
    }).catch(() => {
      const selectedCharacter = resolvePlayableCharacterId(requestedCharacter, [DEFAULT_CHARACTER]);
      gameRef.current = initGameState(selectedCharacter, width, height);
      setHudData(extractHudData(gameRef.current));
    });
  }, [characterId]);

  const handleAbility = useCallback(() => {
    const state = gameRef.current;
    if (state) activateAbility(state, inputRef.current);
  }, []);

  const handleLevelUp = useCallback((idx: number) => {
    const state = gameRef.current;
    if (state) {
      applyLevelUpChoice(state, idx);
      phaseRef.current = state.phase;
      setPhase(state.phase);
    }
  }, []);

  const handleNextWave = useCallback(() => {
    const state = gameRef.current;
    if (state) {
      startNextWave(state);
      phaseRef.current = state.phase;
      setPhase(state.phase);
      setHudData(extractHudData(state));
    }
  }, []);

  const handleRetry = useCallback(() => router.replace('/character-select'), [router]);
  const handleMenu = useCallback(() => router.replace('/'), [router]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const updateKeyboardInput = () => {
      let x = 0;
      let y = 0;
      const keys = keysRef.current;
      if (keys.has('arrowleft') || keys.has('a')) x -= 1;
      if (keys.has('arrowright') || keys.has('d')) x += 1;
      if (keys.has('arrowup') || keys.has('w')) y -= 1;
      if (keys.has('arrowdown') || keys.has('s')) y += 1;
      const l = Math.sqrt(x * x + y * y);
      inputRef.current = l > 0 ? { x: x / l, y: y / l } : { x: 0, y: 0 };
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's', ' '].includes(key)) {
        event.preventDefault();
      }
      if (key === ' ' && !event.repeat) {
        handleAbility();
        return;
      }
      if ((key === 'p' || key === 'escape') && !event.repeat) {
        const state = gameRef.current;
        if (state?.phase === 'paused') handleResume();
        else handlePause();
        return;
      }
      keysRef.current.add(key);
      updateKeyboardInput();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.key.toLowerCase());
      updateKeyboardInput();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      keysRef.current.clear();
      inputRef.current = { x: 0, y: 0 };
    };
  }, [handleAbility, handlePause, handleResume]);

  const isGameplay = phase === 'playing' || phase === 'waveAnnounce' || phase === 'collecting';
  const state = gameRef.current;

  return (
    <View style={s.container}>
      <GameCanvas gameState={gameRef} frame={frame} />
      {phase === 'waveAnnounce' && (
        <>
          {BOSS_WAVE_CHECK(hudData?.waveNum) && (
            <View style={s.bossDarken} pointerEvents="none" />
          )}
          <View style={s.announce} pointerEvents="none">
            <Text style={[s.announceText, BOSS_WAVE_CHECK(hudData?.waveNum) && s.bossAnnounceText]}>
              {BOSS_WAVE_CHECK(hudData?.waveNum) ? '\u26A0\uFE0F BOSS INCOMING' : `WAVE ${hudData?.waveNum ?? 1}`}
            </Text>
          </View>
        </>
      )}
      {phase === 'collecting' && (
        <View style={s.announce} pointerEvents="none">
          <Text style={[s.announceText, { color: '#22C55E' }]}>WAVE COMPLETE!</Text>
        </View>
      )}
      {isGameplay && (
        <>
          <HUD data={hudData} onPause={handlePause} />
          <VirtualJoystick onInput={handleInput} />
          <AbilityButton
            emoji={hudData?.abilityEmoji ?? '\u2B50'}
            cooldown={hudData?.abilityCd ?? 0}
            maxCooldown={hudData?.abilityMaxCd ?? 30}
            onPress={handleAbility}
          />
        </>
      )}
      {phase === 'paused' && (
        <PauseOverlay
          stats={state?.stats ?? null}
          waveNum={hudData?.waveNum ?? 1}
          onResume={handleResume}
          onRestart={handleRestart}
          onQuit={handleMenu}
        />
      )}
      {phase === 'levelup' && (
        <LevelUpModal
          options={state?.levelUpOptions ?? []}
          onChoose={handleLevelUp}
        />
      )}
      {phase === 'shopping' && (
        <ShopOverlay gameState={gameRef} onNextWave={handleNextWave} />
      )}
      {/* Achievement toasts */}
      {achievementToast.length > 0 && (
        <View style={s.achievementToast}>
          <Text style={s.achievementEmoji}>{achievementToast[0].emoji}</Text>
          <View>
            <Text style={s.achievementTitle}>ACHIEVEMENT UNLOCKED</Text>
            <Text style={s.achievementName}>{achievementToast[0].name}</Text>
            <Text style={s.achievementDesc}>{achievementToast[0].description}</Text>
          </View>
        </View>
      )}
      {phase === 'gameover' && (
        <GameOverOverlay
          stats={state?.stats ?? null}
          waveNum={state?.wave?.number ?? 1}
          materials={state?.materials ?? 0}
          playerEmoji={state?.player?.emoji ?? '🦀'}
          victory={state?.victory ?? false}
          weapons={(state?.player?.weapons ?? []).map(w => ({ 
            emoji: (w?.evolved ? EVOLVED_WEAPONS[w?.id] : WEAPONS[w?.id])?.emoji ?? '?' 
          }))}
          achievements={runAchievements}
          onRetry={handleRetry}
          onMenu={handleMenu}
        />
      )}
    </View>
  );
}

function BOSS_WAVE_CHECK(wave: number | undefined): boolean {
  return [5, 10, 15, 20].includes(wave ?? 0);
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050A15' },
  announce: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 30 },
  announceText: { fontSize: 36, fontWeight: '900', color: '#FFF', textShadowColor: 'rgba(99,102,241,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 16, letterSpacing: 4 },
  bossDarken: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 25 },
  bossAnnounceText: { color: '#F59E0B', textShadowColor: 'rgba(245,158,11,0.7)', fontSize: 40 },
  achievementToast: { position: 'absolute', top: 80, alignSelf: 'center', zIndex: 60, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15,25,60,0.95)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)', gap: 12 },
  achievementEmoji: { fontSize: 32 },
  achievementTitle: { color: '#F59E0B', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  achievementName: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  achievementDesc: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
});
