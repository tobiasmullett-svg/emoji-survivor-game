import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, BackHandler, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useIsFocused } from '@react-navigation/native';
import type { GameState, GamePhase, HudData, CharacterId } from '../engine/types';
import { Vec2 } from '../engine/math';
import {
  initGameState, updateGame, extractHudData,
  activateAbility, pauseGame, resumeGame,
  applyLevelUpChoice, applyRelicChoice, startNextWave,
} from '../engine/GameEngine';
import { saveHighScore, getActiveProfile, updateProfile } from '../services/storage';
import { CHARACTERS, WEAPONS, EVOLVED_WEAPONS, ITEM_DEFS } from '../engine/data';
import { playSound, resumeAudio, setGameAmbient, stopGameAmbient } from '../services/audio';
import { addRunToProgression, getProgression } from '../engine/progression';
import {
  checkAchievements, checkAchievementsLive, persistUnlockedAchievements,
  getAchievementProgress, type Achievement,
} from '../engine/achievements';
import { calculateRunScore } from '../engine/scoring';
import { getDefaultSkinId, getSkinById, getSkinEmoji } from '../engine/skins';
import GameCanvas from '../components/game/GameCanvas';
import HUD from '../components/game/HUD';
import AbilityButton from '../components/game/AbilityButton';
import GameTouchControls from '../components/game/GameTouchControls';
import PauseOverlay from '../components/game/PauseOverlay';
import LevelUpModal from '../components/game/LevelUpModal';
import RelicModal from '../components/game/RelicModal';
import ShopOverlay from '../components/game/ShopOverlay';
import GameOverOverlay from '../components/game/GameOverOverlay';
import Minimap from '../components/game/Minimap';
import TutorialOverlay from '../components/game/TutorialOverlay';
import { BOSS_WAVES, WAVE_BASE_TIME } from '../engine/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const defaultHud: HudData = {
  hp: 100, maxHp: 100, armor: 0, waveNum: 1, waveTimer: WAVE_BASE_TIME, waveMaxTime: WAVE_BASE_TIME,
  materials: 0, level: 1, xp: 0, xpToNext: 10,
  abilityCd: 0, abilityMaxCd: 30, abilityEmoji: '\u2B50', phase: 'waveAnnounce',
  comboCount: 0, comboTimer: 0, comboMaxTime: 3.2, bestCombo: 0,
  petCount: 0, resourceCount: 0,
  equippedWeapons: [],
};

const DEFAULT_CHARACTER: CharacterId = 'crab';

interface PhaseState {
  runKey: string;
  phase: GamePhase;
}

function getRouteCharacterId(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function resolvePlayableCharacterId(requestedId: string | undefined, unlockedCharacters: string[]): CharacterId {
  const requestedCharacter = CHARACTERS.find(c => c.id === requestedId)?.id;
  if (requestedCharacter && unlockedCharacters.includes(requestedCharacter)) return requestedCharacter;
  return DEFAULT_CHARACTER;
}

function resolvePlayableSkinId(requestedSkinId: string | undefined, characterId: CharacterId, unlockedSkins: Record<string, string[]>, selectedSkins: Record<string, string>): string {
  const requestedSkin = getSkinById(requestedSkinId);
  if (requestedSkin?.characterId === characterId && (unlockedSkins[characterId] ?? []).includes(requestedSkin.id)) {
    return requestedSkin.id;
  }
  const selectedSkinId = selectedSkins[characterId];
  const selectedSkin = getSkinById(selectedSkinId);
  if (selectedSkin?.characterId === characterId && (unlockedSkins[characterId] ?? []).includes(selectedSkin.id)) {
    return selectedSkin.id;
  }
  return getDefaultSkinId(characterId);
}

export default function GameScreen() {
  useKeepAwake();
  const router = useRouter();
  const navFocused = useIsFocused();
  const isFocused = Platform.OS === 'web' ? true : navFocused;
  const { characterId, skinId, runId } = useLocalSearchParams<{ characterId?: string | string[]; skinId?: string | string[]; runId?: string | string[] }>();
  const routeCharacterId = getRouteCharacterId(characterId);
  const routeSkinId = getRouteCharacterId(skinId);
  const routeRunId = getRouteCharacterId(runId);
  const currentRunKey = `${routeCharacterId ?? ''}:${routeSkinId ?? ''}:${routeRunId ?? 'legacy'}`;
  const gameRef = useRef<GameState | null>(null);
  const emptyGameRef = useRef<GameState | null>(null);
  const movementInputRef = useRef<Vec2>({ x: 0, y: 0 });
  const aimInputRef = useRef<Vec2 | undefined>(undefined);
  const keysRef = useRef<Set<string>>(new Set());
  const phaseRef = useRef<GamePhase>('waveAnnounce');
  const [frame, setFrame] = useState(0);
  const [phaseState, setPhaseState] = useState<PhaseState>({ runKey: currentRunKey, phase: 'waveAnnounce' });
  const [hudData, setHudData] = useState<HudData>(defaultHud);
  const [achievementToast, setAchievementToast] = useState<Achievement[]>([]);
  const [runAchievements, setRunAchievements] = useState<Achievement[]>([]);
  const [initializedRunKey, setInitializedRunKey] = useState<string | null>(null);
  const [showControlsHint, setShowControlsHint] = useState<boolean>(Platform.OS === 'web');
  const [showTutorial, setShowTutorial] = useState(false);
  const showTutorialRef = useRef(false);
  const inputEnabledRef = useRef(false);
  const scoreSaved = useRef(false);
  const achievementsChecked = useRef(false);
  const isFocusedRef = useRef(isFocused);
  const isCurrentRunInitialized = initializedRunKey === currentRunKey && gameRef.current !== null;
  const phase = phaseState.runKey === currentRunKey ? phaseState.phase : 'waveAnnounce';
  const unlockedSetRef = useRef<Set<string>>(new Set());
  const canRenderActiveRun = isFocused && isCurrentRunInitialized;
  const activePhase = canRenderActiveRun ? phase : isFocused ? 'waveAnnounce' : null;
  const activeHudData = canRenderActiveRun ? hudData : defaultHud;
  const activeGameRef = canRenderActiveRun ? gameRef : emptyGameRef;
  const isGameplay = activePhase === 'playing' || activePhase === 'waveAnnounce' || activePhase === 'collecting';
  const inputEnabled = canRenderActiveRun && isGameplay && !showTutorial;
  const state = canRenderActiveRun ? gameRef.current : null;

  useEffect(() => {
    showTutorialRef.current = showTutorial;
  }, [showTutorial]);

  // Global web listeners are outside the React Native overlay stack, so they
  // must explicitly stop retaining a manual aim when gameplay is blocked.
  useEffect(() => {
    inputEnabledRef.current = inputEnabled;
    if (!inputEnabled) {
      movementInputRef.current = { x: 0, y: 0 };
      aimInputRef.current = undefined;
    }
  }, [inputEnabled]);

  // Auto-dismiss controls hint after 5 seconds
  useEffect(() => {
    if (!showControlsHint) return;
    const timer = setTimeout(() => setShowControlsHint(false), 5000);
    return () => clearTimeout(timer);
  }, [showControlsHint]);

  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  // Show one achievement toast at a time, queued.
  useEffect(() => {
    if (achievementToast.length === 0) return;
    const timer = setTimeout(() => setAchievementToast(prev => prev.slice(1)), 4000);
    return () => clearTimeout(timer);
  }, [achievementToast]);

  useEffect(() => {
    if (!isFocused) return;
    let cancelled = false;
    const { width, height } = Dimensions.get('window');
    const requestedCharacter = routeCharacterId;
    const requestedSkin = routeSkinId;
    setInitializedRunKey(null);
    gameRef.current = null;
    movementInputRef.current = { x: 0, y: 0 };
    aimInputRef.current = undefined;
    phaseRef.current = 'waveAnnounce';
    setPhaseState({ runKey: currentRunKey, phase: 'waveAnnounce' });
    setHudData(defaultHud);
    scoreSaved.current = false;
    achievementsChecked.current = false;
    setAchievementToast([]);
    setRunAchievements([]);
    unlockedSetRef.current = new Set();
    getAchievementProgress().then(progress => {
      if (cancelled) return;
      unlockedSetRef.current = new Set(
        Object.keys(progress).filter(id => progress[id]?.unlocked)
      );
    }).catch(() => {});
    AsyncStorage.getItem('emoji_survivor_tutorial_seen').then(seen => {
      if (!seen && !cancelled) setShowTutorial(true);
    }).catch(() => {});
    getProgression().then(prog => {
      if (cancelled) return;
      const selectedCharacter = resolvePlayableCharacterId(requestedCharacter, prog.unlockedCharacters);
      const selectedSkin = resolvePlayableSkinId(requestedSkin, selectedCharacter, prog.unlockedSkins, prog.selectedSkins);
      gameRef.current = initGameState(selectedCharacter, width, height, prog.startingBonuses);
      gameRef.current.player.emoji = getSkinEmoji(selectedCharacter, selectedSkin);
      setHudData(extractHudData(gameRef.current));
      setInitializedRunKey(currentRunKey);
    }).catch(() => {
      if (cancelled) return;
      const selectedCharacter = resolvePlayableCharacterId(requestedCharacter, [DEFAULT_CHARACTER]);
      gameRef.current = initGameState(selectedCharacter, width, height);
      setHudData(extractHudData(gameRef.current));
      setInitializedRunKey(currentRunKey);
    });
    resumeAudio();
    let lastTs = 0;
    let lastRenderTs = 0;
    let lastHudTs = 0;
    let lastAchievementTs = 0;
    let renderCt = 0;
    let animationFrameId = 0;
    const loop = (ts: number) => {
      const dt = lastTs === 0 ? 0.016 : Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;
      const state = gameRef.current;
      if (state && isFocusedRef.current) {
        if (__DEV__ && Platform.OS === 'web') {
          (globalThis as any).__emojiState = state;
          (globalThis as any).__emojiTick = renderCt;
        }
        const ph = state.phase;
        if (!showTutorialRef.current && (ph === 'playing' || ph === 'waveAnnounce' || ph === 'collecting')) {
          updateGame(state, dt, {
            movement: movementInputRef.current,
            aim: aimInputRef.current,
          });
        }
        const p = state.player;
        const activeGameplay = ph === 'playing' || ph === 'waveAnnounce' || ph === 'collecting';
        if (p?.maxOxygen != null && p.maxOxygen > 0) {
          setGameAmbient({
            inWater: activeGameplay && state.inWater,
            oxygen01: Math.max(0, Math.min(1, p.oxygen / p.maxOxygen)),
          });
        }
        renderCt++;
        let aliveEnemies = 0;
        for (const enemy of state.enemies) if (enemy.alive) aliveEnemies++;
        const sceneLoad = aliveEnemies + state.projectiles.length + state.effects.length + state.dmgNums.length;
        // Throttle rendering by actual entity load, not wave number — late
        // waves on capable devices should still render at full rate.
        const crowdedScene = sceneLoad > 95;
        const renderIntervalMs = activeGameplay ? (crowdedScene ? 33 : 16) : 120;
        const hudIntervalMs = crowdedScene ? 160 : 100;
        if (ts - lastRenderTs >= renderIntervalMs) {
          lastRenderTs = ts;
          setFrame(f => (f + 1) % 1000000);
        }
        if (ts - lastHudTs >= hudIntervalMs) {
          lastHudTs = ts;
          setHudData(extractHudData(state));
        }
        // Live achievement check, throttled to once per ~1s of frames.
        if (ts - lastAchievementTs >= 1000 && (ph === 'playing' || ph === 'collecting')) {
          lastAchievementTs = ts;
          const elapsed = Math.round((Date.now() - state.stats.startTime) / 1000);
          const newlyUnlocked = checkAchievementsLive({
            wave: state.wave.number,
            kills: state.stats.enemiesKilled,
            damageDealt: state.stats.damageDealt,
            materials: state.materials,
            time: elapsed,
            comboBest: state.combo.best,
            elitesKilled: state.stats.elitesKilled,
            evolvedWeapons: state.stats.weaponsEvolved,
            noHitRun: !state.stats.wasHit,
          }, unlockedSetRef.current);
          if (newlyUnlocked.length > 0) {
            persistUnlockedAchievements(newlyUnlocked).catch(() => {});
            setAchievementToast(prev => [...prev, ...newlyUnlocked]);
            setRunAchievements(prev => [...prev, ...newlyUnlocked]);
          }
        }
        if (state.phase !== phaseRef.current) {
          phaseRef.current = state.phase;
          setPhaseState({ runKey: currentRunKey, phase: state.phase });
          setHudData(extractHudData(state));
          // Phase change sounds
          if (state.phase === 'waveAnnounce') {
            const wave = state.wave.number;
            if (BOSS_WAVES.includes(wave)) {
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
      stopGameAmbient();
    };
  }, [currentRunKey, isFocused]);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      const state = gameRef.current;
      if (!state) return;
      state.sw = window.width;
      state.sh = window.height;
    });
    return () => sub.remove();
  }, [currentRunKey]);

  // Save high score + progression + achievements on game over
  useEffect(() => {
    if (!isFocused) return;
    if (!isCurrentRunInitialized) return;
    if (phase === 'gameover' && !scoreSaved.current) {
      scoreSaved.current = true;
      const state = gameRef.current;
      if (state) {
        const cDef = CHARACTERS.find(c => c.id === state.player?.characterId);
        const elapsed = Math.round((Date.now() - (state.stats?.startTime ?? Date.now())) / 1000);
        const wave = state.wave?.number ?? 0;
        const kills = state.stats?.enemiesKilled ?? 0;
        const score = calculateRunScore({ wave, kills, time: elapsed });
        
        // Fetch active profile, then save high score with profile data
        getActiveProfile().then(activeProfile => {
          saveHighScore({
            emoji: state.player?.emoji ?? cDef?.emoji ?? '?', name: cDef?.name ?? 'Unknown',
            wave, kills, score,
            date: new Date().toLocaleDateString(), time: elapsed,
            ...(activeProfile ? { profileName: activeProfile.name, profileEmoji: activeProfile.emoji } : {}),
          }).catch(() => {});

          // Update profile lastPlayedAt
          if (activeProfile) {
            updateProfile(activeProfile.id, { lastPlayedAt: new Date().toISOString() }).catch(() => {});
          }
        }).catch(() => {
          // Fallback: save without profile data
          saveHighScore({
            emoji: state.player?.emoji ?? cDef?.emoji ?? '?', name: cDef?.name ?? 'Unknown',
            wave, kills, score,
            date: new Date().toLocaleDateString(), time: elapsed,
          }).catch(() => {});
        });
        
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
              // Merge with any already-toasted-during-run achievements so
              // the game-over screen lists them all.
              setAchievementToast(prev => [...prev, ...newOnes]);
              setRunAchievements(prev => [...prev, ...newOnes]);
            }
          }).catch(() => {});
        }
        
        // Sound
        playSound(state.victory ? 'victory' : 'gameOver');
      }
    }
  }, [phase, isFocused, isCurrentRunInitialized, currentRunKey, initializedRunKey]);

  // Back button
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const state = gameRef.current;
      if (state && (state.phase === 'playing' || state.phase === 'waveAnnounce')) {
        pauseGame(state);
        phaseRef.current = 'paused';
        setPhaseState({ runKey: currentRunKey, phase: 'paused' });
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [currentRunKey]);

  const handleMovementInput = useCallback((v: Vec2) => { movementInputRef.current = v; }, []);
  const handleAimInput = useCallback((v: Vec2 | undefined) => { aimInputRef.current = v; }, []);

  const handlePause = useCallback(() => {
    const state = gameRef.current;
    if (state) { pauseGame(state); phaseRef.current = 'paused'; setPhaseState({ runKey: currentRunKey, phase: 'paused' }); }
  }, [currentRunKey]);

  const handleResume = useCallback(() => {
    const state = gameRef.current;
    if (state) { resumeGame(state); phaseRef.current = state.phase; setPhaseState({ runKey: currentRunKey, phase: state.phase }); }
  }, [currentRunKey]);

  const handleRestart = useCallback(() => {
    const { width, height } = Dimensions.get('window');
    const requestedCharacter = routeCharacterId;
    const requestedSkin = routeSkinId;
    setInitializedRunKey(null);
    gameRef.current = null;
    movementInputRef.current = { x: 0, y: 0 };
    aimInputRef.current = undefined;
    phaseRef.current = 'waveAnnounce';
    setPhaseState({ runKey: currentRunKey, phase: 'waveAnnounce' });
    setHudData(defaultHud);
    scoreSaved.current = false;
    achievementsChecked.current = false;
    setAchievementToast([]);
    setRunAchievements([]);
    getProgression().then(prog => {
      const selectedCharacter = resolvePlayableCharacterId(requestedCharacter, prog.unlockedCharacters);
      const selectedSkin = resolvePlayableSkinId(requestedSkin, selectedCharacter, prog.unlockedSkins, prog.selectedSkins);
      gameRef.current = initGameState(selectedCharacter, width, height, prog.startingBonuses);
      gameRef.current.player.emoji = getSkinEmoji(selectedCharacter, selectedSkin);
      setHudData(extractHudData(gameRef.current));
      setInitializedRunKey(currentRunKey);
    }).catch(() => {
      const selectedCharacter = resolvePlayableCharacterId(requestedCharacter, [DEFAULT_CHARACTER]);
      gameRef.current = initGameState(selectedCharacter, width, height);
      setHudData(extractHudData(gameRef.current));
      setInitializedRunKey(currentRunKey);
    });
  }, [currentRunKey, routeCharacterId, routeSkinId]);

  const handleAbility = useCallback(() => {
    const state = gameRef.current;
    if (state) {
      activateAbility(state, {
        movement: movementInputRef.current,
        aim: aimInputRef.current,
      });
    }
  }, []);

  const handleLevelUp = useCallback((idx: number) => {
    const state = gameRef.current;
    if (state) {
      applyLevelUpChoice(state, idx);
      phaseRef.current = state.phase;
      setPhaseState({ runKey: currentRunKey, phase: state.phase });
    }
  }, [currentRunKey]);

  const handleRelicChoice = useCallback((idx: number) => {
    const state = gameRef.current;
    if (state && applyRelicChoice(state, idx)) {
      phaseRef.current = state.phase;
      setPhaseState({ runKey: currentRunKey, phase: state.phase });
      setHudData(extractHudData(state));
    }
  }, [currentRunKey]);

  const handleNextWave = useCallback(() => {
    const state = gameRef.current;
    if (state) {
      startNextWave(state);
      phaseRef.current = state.phase;
      setPhaseState({ runKey: currentRunKey, phase: state.phase });
      setHudData(extractHudData(state));
    }
  }, [currentRunKey]);

  const handleRetry = useCallback(() => {
    // addRunToProgression is already called in the gameover phase effect — no duplicate here
    router.replace('/character-select');
  }, [router]);

  const handleMenu = useCallback(() => {
    // addRunToProgression is already called in the gameover phase effect — no duplicate here
    router.replace('/');
  }, [router]);

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
      movementInputRef.current = l > 0 ? { x: x / l, y: y / l } : { x: 0, y: 0 };
    };

    const clearMouseAim = () => {
      aimInputRef.current = undefined;
    };

    const updateMouseAim = (clientX: number, clientY: number) => {
      if (!inputEnabledRef.current) {
        clearMouseAim();
        return;
      }
      const state = gameRef.current;
      const player = state?.player;
      if (!state || !player) return;

      const playerScreen = {
        x: player.x - state.camera.x + state.sw / 2,
        y: player.y - state.camera.y + state.sh / 2,
      };
      const x = clientX - playerScreen.x;
      const y = clientY - playerScreen.y;
      const length = Math.sqrt(x * x + y * y);
      aimInputRef.current = length > 0 ? { x: x / length, y: y / length } : undefined;
      setShowControlsHint(false);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      updateMouseAim(event.clientX, event.clientY);
    };

    const onPointerOut = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' && !event.relatedTarget) clearMouseAim();
    };

    const onMouseMove = (event: MouseEvent) => {
      updateMouseAim(event.clientX, event.clientY);
    };

    const supportsPointerEvents = typeof window.PointerEvent !== 'undefined';

    const onKeyDown = (event: KeyboardEvent) => {
      // Let modal controls receive their normal keyboard activation rather
      // than hijacking Space/Escape while gameplay input is unavailable.
      if (!inputEnabledRef.current) return;
      const key = event.key.toLowerCase();
      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's', ' '].includes(key)) {
        event.preventDefault();
        setShowControlsHint(false);
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

    const onWindowBlur = () => {
      clearMouseAim();
      keysRef.current.clear();
      movementInputRef.current = { x: 0, y: 0 };
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    if (supportsPointerEvents) {
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerout', onPointerOut);
    } else {
      window.addEventListener('mousemove', onMouseMove);
    }
    window.addEventListener('mouseleave', clearMouseAim);
    window.addEventListener('blur', onWindowBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (supportsPointerEvents) {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerout', onPointerOut);
      } else {
        window.removeEventListener('mousemove', onMouseMove);
      }
      window.removeEventListener('mouseleave', clearMouseAim);
      window.removeEventListener('blur', onWindowBlur);
      keysRef.current.clear();
      movementInputRef.current = { x: 0, y: 0 };
      aimInputRef.current = undefined;
    };
  }, [handleAbility, handlePause, handleResume]);

  return (
    <View style={s.container}>
      <GameCanvas gameState={activeGameRef} frame={frame} />
      {activePhase === 'waveAnnounce' && (() => {
        const isBoss = BOSS_WAVES.includes(activeHudData?.waveNum ?? 0);
        return (
          <>
            {isBoss && <View style={s.bossDarken} pointerEvents="none" />}
            <View style={s.announce} pointerEvents="none">
              <Text style={[s.announceText, isBoss && s.bossAnnounceText]}>
                {isBoss ? '\u26A0\uFE0F BOSS INCOMING' : `WAVE ${activeHudData?.waveNum ?? 1}`}
              </Text>
            </View>
          </>
        );
      })()}
      {activePhase === 'collecting' && (
        <View style={s.announce} pointerEvents="none">
          <Text style={[s.announceText, { color: '#22C55E' }]}>WAVE COMPLETE!</Text>
        </View>
      )}
      {isGameplay && (
        <>
          <HUD data={activeHudData} onPause={handlePause} />
          {inputEnabled && (
            <>
              {Platform.OS === 'web' ? (
                <AbilityButton
                  emoji={activeHudData?.abilityEmoji ?? '\u2B50'}
                  cooldown={activeHudData?.abilityCd ?? 0}
                  maxCooldown={activeHudData?.abilityMaxCd ?? 30}
                  onPress={handleAbility}
                />
              ) : (
                <GameTouchControls
                  emoji={activeHudData?.abilityEmoji ?? '\u2B50'}
                  cooldown={activeHudData?.abilityCd ?? 0}
                  maxCooldown={activeHudData?.abilityMaxCd ?? 30}
                  onMovementInput={handleMovementInput}
                  onAimInput={handleAimInput}
                  onActivateAbility={handleAbility}
                />
              )}
            </>
          )}
          {Platform.OS === 'web' && showControlsHint && (
            <View style={s.controlsHint} pointerEvents="none">
              <Text style={s.controlsText}>WASD / Arrows move · Mouse / right aim pad fires · Space ability · Keyboard-only auto-targets</Text>
            </View>
          )}
        </>
      )}
      {activePhase === 'paused' && (
        <PauseOverlay
          stats={state?.stats ?? null}
          waveNum={activeHudData?.waveNum ?? 1}
          onResume={handleResume}
          onRestart={handleRestart}
          onQuit={handleMenu}
        />
      )}
      {activePhase === 'levelup' && (
        <LevelUpModal
          options={state?.levelUpOptions ?? []}
          onChoose={handleLevelUp}
        />
      )}
      {activePhase === 'relic' && (
        <RelicModal
          options={state?.relicChoices ?? []}
          onChoose={handleRelicChoice}
        />
      )}
      {activePhase === 'shopping' && (
        <ShopOverlay gameState={gameRef} onNextWave={handleNextWave} />
      )}
      {/* Tutorial Overlay */}
      {showTutorial && (
        <TutorialOverlay
          onDismiss={() => {
            setShowTutorial(false);
            AsyncStorage.setItem('emoji_survivor_tutorial_seen', 'true').catch(() => {});
          }}
        />
      )}
      {/* Minimap */}
      <Minimap gameState={gameRef} />
      {/* Achievement toasts */}
      {canRenderActiveRun && achievementToast.length > 0 && (
        <View style={s.achievementToast}>
          <Text style={s.achievementEmoji}>{achievementToast[0].emoji}</Text>
          <View>
            <Text style={s.achievementTitle}>ACHIEVEMENT UNLOCKED</Text>
            <Text style={s.achievementName}>{achievementToast[0].name}</Text>
            <Text style={s.achievementDesc}>{achievementToast[0].description}</Text>
          </View>
        </View>
      )}
      {activePhase === 'gameover' && (
        <GameOverOverlay
          stats={state?.stats ?? null}
          waveNum={state?.wave?.number ?? 1}
          materials={state?.materials ?? 0}
          playerEmoji={state?.player?.emoji ?? '🦀'}
          victory={state?.victory ?? false}
          weapons={(state?.player?.weapons ?? []).map(w => ({
            id: w?.id,
            evolved: w?.evolved,
            emoji: (w?.evolved ? EVOLVED_WEAPONS[w?.id] : WEAPONS[w?.id])?.emoji ?? '?'
          }))}
          items={(state?.player?.items ?? []).map(it => ({
            emoji: ITEM_DEFS.find(d => d.id === it?.id)?.emoji ?? '?',
          }))}
          relics={(state?.relics ?? []).map(relic => ({
            emoji: relic.emoji,
            name: relic.name,
          }))}
          achievements={runAchievements}
          onRetry={handleRetry}
          onMenu={handleMenu}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050A15' },
  announce: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 30 },
  announceText: { fontSize: 36, fontWeight: '900', color: '#FFF', textShadowColor: 'rgba(99,102,241,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 16, letterSpacing: 4 },
  bossDarken: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 25 },
  bossAnnounceText: { color: '#F59E0B', textShadowColor: 'rgba(245,158,11,0.7)', fontSize: 40 },
  controlsHint: { position: 'absolute', bottom: 12, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(15,25,60,0.65)', borderWidth: 1, borderColor: 'rgba(148,163,184,0.18)', zIndex: 11 },
  controlsText: { color: '#94A3B8', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  achievementToast: { position: 'absolute', top: 80, alignSelf: 'center', zIndex: 60, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15,25,60,0.95)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)', gap: 12 },
  achievementEmoji: { fontSize: 32 },
  achievementTitle: { color: '#F59E0B', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  achievementName: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  achievementDesc: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
});
