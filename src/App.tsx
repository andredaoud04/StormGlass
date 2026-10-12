import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AgeId,
  BattleSessionStats,
  BattleUnit,
  CardDef,
  DungeonType,
  FloatingText,
  Particle,
  PlayerProfile,
  Projectile,
  UnitDef,
} from './types/game';
import {
  AGES,
  CARDS,
  HEROES,
  RUNES,
  SKILLS,
  getAgeByIndex,
  getAgeDef,
  getAgeIndex,
  getBaseFoodRate,
} from './data/gameData';
import { loadProfile, saveProfile } from './services/storage';
import { campaignGoldPayout, dungeonEntryKeyCost, settleLegendsFirstClear } from './logic/rules';
import { sound } from './services/sound';
import { BACKGROUNDS, getBattleBackgroundImage } from './assets/images';
import { Battlefield } from './components/Battlefield';
import { BattleHeader } from './components/BattleHeader';
import { BaseOutpostSprite } from './components/PixelSprites';
import { ThemedWall, EnvironmentTheme } from './components/ThemedWall';
import { UpgradesView } from './components/UpgradesView';
import { DungeonsView } from './components/DungeonsView';
import { CardsView } from './components/CardsView';
import { ShopView } from './components/ShopView';
import { HomeBaseModal } from './components/HomeBaseModal';
import { VictoryDefeatModal } from './components/VictoryDefeatModal';
import { RPGModalContainer, RPGButton } from './components/RPGModalFrame';
import { MissionsModal, SpinWheelModal, SettingsModal } from './components/SideMenuModals';
import {
  Settings,
  Swords,
  Scroll,
  Shield,
  ShoppingBag,
  Map as MapIcon,
  Tent,
} from 'lucide-react';

export default function App() {
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const [activeTab, setActiveTab] = useState<'battle' | 'upgrades' | 'dungeons' | 'cards' | 'shop'>('battle');
  const [showHomeModal, setShowHomeModal] = useState(false);
  const [showMissionsModal, setShowMissionsModal] = useState(false);
  const [showSpinModal, setShowSpinModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [recentChestPulls, setRecentChestPulls] = useState<CardDef[] | null>(null);

  // Sound state
  const [soundOn, setSoundOn] = useState(profile.soundEnabled);

  // Active Combat State
  const [inBattle, setInBattle] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showRetreatConfirm, setShowRetreatConfirm] = useState(false);
  const pausedBeforeRetreatRef = useRef(false);
  const [battleType, setBattleType] = useState<'campaign' | 'rush' | 'legends' | 'bosses' | 'survival' | 'hell'>('campaign');
  const [enemyAgeId, setEnemyAgeId] = useState<AgeId>('stone');
  const [playerBaseHp, setPlayerBaseHp] = useState(420);
  const [playerBaseMaxHp, setPlayerBaseMaxHp] = useState(420);
  const [enemyBaseHp, setEnemyBaseHp] = useState(420);
  const [enemyBaseMaxHp, setEnemyBaseMaxHp] = useState(420);
  const [food, setFood] = useState(0);
  const [units, setUnits] = useState<BattleUnit[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);

  // Battle session tracking
  const [sessionStats, setSessionStats] = useState<BattleSessionStats>({
    battleType: 'campaign',
    rushTimerRemaining: 45,
    rushDurationTotal: 45,
    survivalWave: 1,
    survivalPendingRewards: { gems: 0, runePoints: 0 },
    goldEarnedInBattle: 0,
    normalKills: 0,
    tankKills: 0,
    enemyBaseMaxHp: 420,
    enemyBaseHpRemovedMilestone: 0,
    heroUsed: false,
    skillCooldowns: { stasis: 0, volley: 0, rally: 0 },
  });

  // End of Battle Results Modal
  const [battleResult, setBattleResult] = useState<'victory' | 'defeat' | null>(null);
  const battleActiveRef = useRef(false);
  const battleSettledRef = useRef(false);
  const unitsForVictoryRef = useRef<BattleUnit[]>([]);
  const heroUsedThisBattleRef = useRef(false);
  const skillLockUntilRef = useRef<Record<'stasis' | 'volley' | 'rally', number>>({ stasis: 0, volley: 0, rally: 0 });

  // Passive Card bonuses
  const cardDmgBonus = Object.entries(profile.cards).reduce((acc, [cId, state]) => {
    const card = CARDS.find((c) => c.id === cId);
    return card?.type === 'damage' ? acc + (state.level * card.valuePerLevel) / 100 : acc;
  }, 0);

  const cardHpBonus = Object.entries(profile.cards).reduce((acc, [cId, state]) => {
    const card = CARDS.find((c) => c.id === cId);
    return card?.type === 'health' ? acc + (state.level * card.valuePerLevel) / 100 : acc;
  }, 0);

  const cardFoodBonus = Object.entries(profile.cards).reduce((acc, [cId, state]) => {
    const card = CARDS.find((c) => c.id === cId);
    return card?.type === 'food' ? acc + (state.level * card.valuePerLevel) / 100 : acc;
  }, 0);

  const cardBaseBonus = Object.entries(profile.cards).reduce((acc, [cId, state]) => {
    const card = CARDS.find((c) => c.id === cId);
    return card?.type === 'base_hp' ? acc + (state.level * card.valuePerLevel) / 100 : acc;
  }, 0);

  const cardCoinBonus = Object.entries(profile.cards).reduce((acc, [cId, state]) => {
    const card = CARDS.find((c) => c.id === cId);
    return card?.type === 'coin_bonus' ? acc + (state.level * card.valuePerLevel) / 100 : acc;
  }, 0);

  // Rune bonuses
  const runeDmgBonus = ((profile.runes['might'] || 0) * 5 + (profile.runes['discipline'] || 0) * 4) / 100;
  const runeHpBonus = ((profile.runes['vitality'] || 0) * 5 + (profile.runes['mastery'] || 0) * 4) / 100;
  const runeFoodBonus = ((profile.runes['harvest'] || 0) * 5) / 100;
  const runeBaseBonus = ((profile.runes['fortify'] || 0) * 7) / 100;
  const runeCoinBonus = ((profile.runes['fortune'] || 0) * 5) / 100;

  // Final Food Generation Rate per sec
  const foodRate = getBaseFoodRate(profile.foodLevel) * (1 + cardFoodBonus + runeFoodBonus);

  // Save profile on change
  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  // Pause on browser/tab suspension so time and wave spawns cannot run invisibly.
  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.visibilityState === 'hidden' && battleActiveRef.current) setIsPaused(true);
    };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden);
  }, []);

  // Audio mute toggle
  const toggleSound = () => {
    const newState = sound.toggleMute();
    setSoundOn(newState);
    setProfile((prev) => ({ ...prev, soundEnabled: newState }));
  };

  // Environment theme matching the 4 visual styles in Image 1
  const getCombatTheme = (enemyAge: AgeId, bType: string): EnvironmentTheme => {
    if (bType === 'hell') return 'hell';
    switch (enemyAge) {
      case 'stone':
      case 'crusader':
        return 'medieval';
      case 'ancient':
        return 'desert';
      case 'gunpowder':
      case 'industrial':
        return 'ice';
      case 'future':
      default:
        return 'hell';
    }
  };

  // --- START BATTLE ---
  const startBattle = useCallback(
    (
      type: 'campaign' | 'rush' | 'legends' | 'bosses' | 'survival' | 'hell' = 'campaign',
      options?: {
        chapterId?: number;
        carriedBaseHp?: number;
        survivalWave?: number;
        freeLegendsRetry?: boolean;
      }
    ) => {
      if (battleActiveRef.current && !battleResult) return;
      const needsKey = dungeonEntryKeyCost(type, options) === 1;
      if (needsKey && profile.keys < 1) return;
      if (needsKey) setProfile((prev) => prev.keys > 0 ? { ...prev, keys: prev.keys - 1 } : prev);
      battleActiveRef.current = true;
      battleSettledRef.current = false;
      bossSpawnedRef.current = false;
      heroUsedThisBattleRef.current = false;
      skillLockUntilRef.current = { stasis: 0, volley: 0, rally: 0 };
      lastEnemySpawnRef.current = Date.now();
      const playerAgeDef = getAgeDef(profile.armyAge);
      let targetEnemyAgeDef = getAgeByIndex(profile.opponentStage - 1);

      if (type === 'rush') {
        targetEnemyAgeDef = playerAgeDef;
      } else if (type === 'legends') {
        targetEnemyAgeDef = getAgeDef('crusader');
      } else if (type === 'bosses') {
        targetEnemyAgeDef = getAgeDef('ancient');
      } else if (type === 'hell') {
        targetEnemyAgeDef = getAgeDef('future');
      }

      setBattleType(type);
      setEnemyAgeId(targetEnemyAgeDef.id);

      // Player Base HP
      const pMaxHp = Math.round(
        playerAgeDef.baseHp * (1 + cardBaseBonus + runeBaseBonus + (profile.baseLevel - 1) * 0.12)
      );
      setPlayerBaseMaxHp(pMaxHp);
      setPlayerBaseHp(options?.carriedBaseHp !== undefined ? options.carriedBaseHp : pMaxHp);

      // Enemy Base HP
      let eMaxHp = targetEnemyAgeDef.baseHp;
      if (type === 'rush') {
        eMaxHp = targetEnemyAgeDef.baseHp * 1000;
      } else if (type === 'bosses') {
        eMaxHp = Math.round(targetEnemyAgeDef.baseHp * 1.8);
      } else if (type === 'hell') {
        eMaxHp = Math.round(targetEnemyAgeDef.baseHp * 2.2);
      }

      eMaxHp = Math.round(eMaxHp * (1 + (profile.timeline - 1) * 0.16));
      if (type === 'survival') eMaxHp = Math.round(eMaxHp * (1 + ((options?.survivalWave || 1) - 1) * 0.18));
      setEnemyBaseMaxHp(eMaxHp);
      setEnemyBaseHp(eMaxHp);

      setFood(0);
      setUnits([]);
      setProjectiles([]);
      setFloatingTexts([]);
      setParticles([]);
      setIsPaused(false);
      setBattleResult(null);

      setSessionStats({
        battleType: type,
        rushTimerRemaining: 45,
        rushDurationTotal: 45,
        legendsChapterId: options?.chapterId,
        survivalWave: options?.survivalWave || 1,
        survivalPendingRewards: { gems: 0, runePoints: 0 },
        goldEarnedInBattle: 0,
        normalKills: 0,
        tankKills: 0,
        enemyBaseMaxHp: eMaxHp,
        enemyBaseHpRemovedMilestone: 0,
        heroUsed: false,
        skillCooldowns: { stasis: 0, volley: 0, rally: 0 },
      });

      setInBattle(true);
      sound.playDeploy();
    },
    [profile, cardBaseBonus, runeBaseBonus, battleResult]
  );

  // --- DEPLOY TROOP ---
  const foodSpendLockRef = useRef(0);
  useEffect(() => { foodSpendLockRef.current = food; }, [food]);
  const handleDeployUnit = useCallback(
    (unitDef: UnitDef) => {
      const ageIndex = getAgeIndex(profile.armyAge);
      const legalAge = unitDef.ageId === profile.armyAge || (ageIndex > 0 && unitDef.ageId === AGES[ageIndex - 1].id);
      const unlocked = profile.unlockedTroopIds.includes(unitDef.id) || (unitDef.ageId === profile.armyAge && unitDef.unlockCostGold === 0);
      if (!inBattle || isPaused || battleResult || !legalAge || !unlocked || foodSpendLockRef.current < unitDef.cost) return;
      foodSpendLockRef.current -= unitDef.cost;
      setFood((prev) => Math.max(0, prev - unitDef.cost));
      sound.playDeploy();

      const finalDmg = Math.round(unitDef.damage * (1 + cardDmgBonus + runeDmgBonus));
      const finalHp = Math.round(unitDef.hp * (1 + cardHpBonus + runeHpBonus + (profile.baseLevel - 1) * 0.05));

      const newUnit: BattleUnit = {
        uid: `p-${Date.now()}-${Math.random()}`,
        unitDefId: unitDef.id,
        name: unitDef.name,
        side: 'player',
        role: unitDef.role,
        x: 8,
        hp: finalHp,
        maxHp: finalHp,
        damage: finalDmg,
        speed: unitDef.speed,
        range: unitDef.range,
        attackSpeed: unitDef.attackSpeed,
        attackCooldown: 0.2,
        isAttacking: false,
        isWalking: true,
        hitFlash: 0,
        stasisFrozenRemaining: 0,
        rallyBuffRemaining: 0,
        projectileType: unitDef.projectileType,
      };

      setUnits((prev) => [...prev, newUnit]);
    },
    [inBattle, isPaused, battleResult, profile.armyAge, profile.unlockedTroopIds, cardDmgBonus, runeDmgBonus, cardHpBonus, runeHpBonus, profile.baseLevel]
  );

  // --- DEPLOY HERO ---
  const handleDeployHero = useCallback(() => {
    if (!inBattle || isPaused || battleResult || heroUsedThisBattleRef.current || sessionStats.heroUsed || !profile.equippedHeroId || !profile.heroesUnlocked.includes(profile.equippedHeroId)) return;

    const heroDef = HEROES.find((h) => h.id === profile.equippedHeroId);
    if (!heroDef) return;

    heroUsedThisBattleRef.current = true;
    sound.playHeroDeploy();
    setSessionStats((prev) => ({ ...prev, heroUsed: true }));

    const playerAgeDef = getAgeDef(profile.armyAge);
    const baseTroop = playerAgeDef.units[0];

    const heroHp = Math.round(baseTroop.hp * heroDef.baseMultiplierHp * 2.5 * (1 + cardHpBonus + runeHpBonus));
    const heroDmg = Math.round(baseTroop.damage * heroDef.baseMultiplierDmg * 2.2 * (1 + cardDmgBonus + runeDmgBonus));

    const heroUnit: BattleUnit = {
      uid: `hero-${Date.now()}`,
      unitDefId: heroDef.id,
      name: heroDef.name,
      side: 'player',
      role: 'hero',
      x: 8,
      hp: heroHp,
      maxHp: heroHp,
      damage: heroDmg,
      speed: 8.0,
      range: 5.5,
      attackSpeed: 0.9,
      attackCooldown: 0.2,
      isAttacking: false,
      isWalking: true,
      hitFlash: 0,
      stasisFrozenRemaining: 0,
      rallyBuffRemaining: 0,
      projectileType: 'slash',
    };

    setUnits((prev) => [...prev, heroUnit]);
  }, [inBattle, isPaused, battleResult, sessionStats.heroUsed, profile.equippedHeroId, profile.heroesUnlocked, profile.armyAge, cardHpBonus, runeHpBonus, cardDmgBonus, runeDmgBonus]);

  // --- SKILL ACTIVATION ---
  const handleActivateSkill = useCallback(
    (skillId: 'stasis' | 'volley' | 'rally') => {
      if (!inBattle || isPaused || battleResult || !profile.equippedSkills.includes(skillId) || !profile.skills[skillId]?.unlocked || sessionStats.skillCooldowns[skillId] > 0 || Date.now() < skillLockUntilRef.current[skillId]) return;
      skillLockUntilRef.current[skillId] = Date.now() + (skillId === 'stasis' ? 12000 : skillId === 'volley' ? 10000 : 16000);

      const skillState = profile.skills[skillId];
      const level = skillState?.level || 1;

      if (skillId === 'stasis') {
        sound.playSkillStasis();
        const duration = 3.0 + (level - 1) * 0.35;
        setUnits((prev) =>
          prev.map((u) => (u.side === 'enemy' ? { ...u, stasisFrozenRemaining: duration } : u))
        );
        setSessionStats((prev) => ({
          ...prev,
          skillCooldowns: { ...prev.skillCooldowns, stasis: 12 },
        }));
      } else if (skillId === 'volley') {
        sound.playSkillVolley();
        const dmg = 80 + getAgeIndex(profile.armyAge) * 16 + (level - 1) * 24;

        setUnits((prev) =>
          prev.map((u) => {
            if (u.side === 'enemy') {
              const newHp = Math.max(0, u.hp - dmg);
              return { ...u, hp: newHp, hitFlash: 0.15 };
            }
            return u;
          })
        );

        setFloatingTexts((prev) => [
          ...prev,
          {
            id: `v-${Date.now()}`,
            text: `VOLLEY -${dmg}`,
            x: 55,
            y: 40,
            color: '#f97316',
            opacity: 1,
            life: 1.2,
          },
        ]);

        setSessionStats((prev) => ({
          ...prev,
          skillCooldowns: { ...prev.skillCooldowns, volley: 10 },
        }));
      } else if (skillId === 'rally') {
        sound.playSkillRally();
        const duration = 6.0 + (level - 1) * 0.4;
        setUnits((prev) =>
          prev.map((u) => (u.side === 'player' ? { ...u, rallyBuffRemaining: duration } : u))
        );
        setSessionStats((prev) => ({
          ...prev,
          skillCooldowns: { ...prev.skillCooldowns, rally: 16 },
        }));
      }
    },
    [inBattle, isPaused, battleResult, sessionStats.skillCooldowns, profile.equippedSkills, profile.skills, profile.armyAge]
  );

  // --- ENEMY SPAWNER ---
  const lastEnemySpawnRef = useRef<number>(0);
  const bossSpawnedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!inBattle) {
      bossSpawnedRef.current = false;
      return;
    }

    const enemyAgeDef = getAgeDef(enemyAgeId);
    let spawnInterval = 3500 / (1 + (profile.timeline - 1) * 0.12);
    if (battleType === 'rush') spawnInterval = 1400;

    const timer = setInterval(() => {
      if (isPaused || battleResult) return;

      const now = Date.now();
      if (now - lastEnemySpawnRef.current < spawnInterval) return;
      lastEnemySpawnRef.current = now;

      // Bosses mode: spawn Gate Colossus once
      if (battleType === 'bosses' && !bossSpawnedRef.current) {
        bossSpawnedRef.current = true;
        const bossUnit: BattleUnit = {
          uid: `boss-colossus-${now}`,
          unitDefId: 'gate_colossus',
          name: 'Gate Colossus',
          side: 'enemy',
          role: 'boss',
          x: 92,
          hp: 850,
          maxHp: 850,
          damage: 55,
          speed: 3.5,
          range: 6.0,
          attackSpeed: 1.4,
          attackCooldown: 0.4,
          isAttacking: false,
          isWalking: true,
          hitFlash: 0,
          stasisFrozenRemaining: 0,
          rallyBuffRemaining: 0,
          projectileType: 'none',
          isBoss: true,
        };
        setUnits((prev) => [...prev, bossUnit]);
        return;
      }

      // Pick enemy unit
      const roll = Math.random();
      let chosenUnit = enemyAgeDef.units[0];
      if (roll > 0.65) chosenUnit = enemyAgeDef.units[1];
      if (roll > 0.88) chosenUnit = enemyAgeDef.units[2];

      const eUnit: BattleUnit = {
        uid: `e-${now}-${Math.random()}`,
        unitDefId: chosenUnit.id,
        name: chosenUnit.name,
        side: 'enemy',
        role: chosenUnit.role,
        x: 92,
        hp: chosenUnit.hp,
        maxHp: chosenUnit.hp,
        damage: chosenUnit.damage,
        speed: chosenUnit.speed,
        range: chosenUnit.range,
        attackSpeed: chosenUnit.attackSpeed,
        attackCooldown: 0.3,
        isAttacking: false,
        isWalking: true,
        hitFlash: 0,
        stasisFrozenRemaining: 0,
        rallyBuffRemaining: 0,
        projectileType: chosenUnit.projectileType,
      };

      setUnits((prev) => [...prev, eUnit]);
    }, 400);

    return () => clearInterval(timer);
  }, [inBattle, isPaused, battleResult, enemyAgeId, battleType, profile.timeline]);

  useEffect(() => { unitsForVictoryRef.current = units; }, [units]);

  // --- COMBAT TICK LOOP ---
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    if (!inBattle) return;
    lastTimeRef.current = performance.now();

    let animId: number;

    const gameTick = (currentTime: number) => {
      const delta = Math.min(0.1, (currentTime - lastTimeRef.current) / 1000);
      lastTimeRef.current = currentTime;

      if (!isPaused && !battleResult) {
        // Food flow
        setFood((prev) => prev + foodRate * delta);

        // Rush timer
        if (battleType === 'rush') {
          setSessionStats((prev) => {
            const nextTimer = Math.max(0, prev.rushTimerRemaining - delta);
            if (nextTimer <= 0 && !battleResult) {
              sound.playVictory();
              setBattleResult('victory');
            }
            return { ...prev, rushTimerRemaining: nextTimer };
          });
        }

        // Skill cooldowns
        setSessionStats((prev) => ({
          ...prev,
          skillCooldowns: {
            stasis: Math.max(0, prev.skillCooldowns.stasis - delta),
            volley: Math.max(0, prev.skillCooldowns.volley - delta),
            rally: Math.max(0, prev.skillCooldowns.rally - delta),
          },
        }));

        // Units update
        setUnits((prevUnits) => {
          // An attack is authorized only on the precise frame its cooldown reaches zero.
          // Previously checking cooldown >= attackSpeed - 0.05 repeatedly landed 2-4 hits per swing.
          const attacksReady = new Set<string>();
          let updated = prevUnits.map((unit) => {
            const isFrozen = unit.stasisFrozenRemaining > 0;
            const newFrozen = Math.max(0, unit.stasisFrozenRemaining - delta);
            const newRally = Math.max(0, unit.rallyBuffRemaining - delta);
            const newHitFlash = Math.max(0, unit.hitFlash - delta);

            if (isFrozen) {
              return {
                ...unit,
                isWalking: false,
                isAttacking: false,
                stasisFrozenRemaining: newFrozen,
                rallyBuffRemaining: newRally,
                hitFlash: newHitFlash,
              };
            }

            const isPlayer = unit.side === 'player';
            const newCd = Math.max(0, unit.attackCooldown - delta);

            const targets = prevUnits.filter((u) => u.side !== unit.side && u.hp > 0);
            let closestDist = 999;
            let targetUnit: BattleUnit | null = null;

            for (const t of targets) {
              const dist = isPlayer ? t.x - unit.x : unit.x - t.x;
              if (dist >= 0 && dist < closestDist) {
                closestDist = dist;
                targetUnit = t;
              }
            }

            const baseDist = isPlayer ? 92 - unit.x : unit.x - 8;
            const isTargetUnitInRange = targetUnit && closestDist <= unit.range;
            const isBaseInRange = baseDist <= unit.range;

            if (isTargetUnitInRange || isBaseInRange) {
              const willSwing = newCd <= 0;
              if (willSwing) attacksReady.add(unit.uid);

              return {
                ...unit,
                isWalking: false,
                isAttacking: true,
                attackCooldown: willSwing ? unit.attackSpeed : newCd,
                stasisFrozenRemaining: newFrozen,
                rallyBuffRemaining: newRally,
                hitFlash: newHitFlash,
              };
            } else {
              const moveDist = unit.speed * delta * (isPlayer ? 1 : -1);
              const nextX = Math.max(8, Math.min(92, unit.x + moveDist));

              return {
                ...unit,
                x: nextX,
                isWalking: true,
                isAttacking: false,
                attackCooldown: newCd,
                stasisFrozenRemaining: newFrozen,
                rallyBuffRemaining: newRally,
                hitFlash: newHitFlash,
              };
            }
          });

          // Resolve attacks
          for (const unit of updated) {
            if (attacksReady.has(unit.uid)) {
              const isPlayer = unit.side === 'player';
              const rallyMult = unit.rallyBuffRemaining > 0 ? 1.45 : 1.0;
              const dmg = Math.round(unit.damage * rallyMult);

              const targets = updated.filter((u) => u.side !== unit.side && u.hp > 0);
              let closestDist = 999;
              let targetUnit: BattleUnit | null = null;
              for (const t of targets) {
                const dist = isPlayer ? t.x - unit.x : unit.x - t.x;
                if (dist >= 0 && dist < closestDist) {
                  closestDist = dist;
                  targetUnit = t;
                }
              }

              const targetBaseDist = isPlayer ? 92 - unit.x : unit.x - 8;

              if (targetUnit && closestDist <= unit.range) {
                if (unit.projectileType && unit.projectileType !== 'none') {
                  sound.playRangedAttack();
                  const pType: Projectile['type'] = unit.projectileType;

                  setProjectiles((p) => [
                    ...p,
                    {
                      id: `proj-${Date.now()}-${Math.random()}`,
                      type: pType,
                      startX: unit.x,
                      targetX: targetUnit!.x,
                      currentX: unit.x,
                      y: 20,
                      side: unit.side,
                      damage: dmg,
                      targetUid: targetUnit!.uid,
                      progress: 0,
                    },
                  ]);
                } else {
                  sound.playMeleeAttack();
                  targetUnit.hp = Math.max(0, targetUnit.hp - dmg);
                  targetUnit.hitFlash = 0.15;

                  setFloatingTexts((ft) => [
                    ...ft,
                    {
                      id: `ft-${Date.now()}-${Math.random()}`,
                      text: `-${dmg}`,
                      x: targetUnit!.x,
                      y: 28,
                      color: isPlayer ? '#60a5fa' : '#f87171',
                      opacity: 1,
                      life: 0.8,
                    },
                  ]);
                }
              } else if (targetBaseDist <= unit.range) {
                if (unit.projectileType && unit.projectileType !== 'none') {
                  sound.playRangedAttack();
                  const pType: Projectile['type'] = unit.projectileType;

                  setProjectiles((p) => [
                    ...p,
                    {
                      id: `proj-base-${Date.now()}-${Math.random()}`,
                      type: pType,
                      startX: unit.x,
                      targetX: isPlayer ? 92 : 8,
                      currentX: unit.x,
                      y: 20,
                      side: unit.side,
                      damage: dmg,
                      progress: 0,
                    },
                  ]);
                } else {
                  sound.playMeleeAttack();
                  if (isPlayer) {
                    setEnemyBaseHp((eHp) => Math.max(0, eHp - dmg));
                  } else {
                    setPlayerBaseHp((pHp) => Math.max(0, pHp - dmg));
                  }

                  setFloatingTexts((ft) => [
                    ...ft,
                    {
                      id: `ft-base-${Date.now()}-${Math.random()}`,
                      text: `-${dmg}`,
                      x: isPlayer ? 92 : 8,
                      y: 40,
                      color: isPlayer ? '#38bdf8' : '#ef4444',
                      opacity: 1,
                      life: 0.9,
                    },
                  ]);
                }
              }
            }
          }

          // Kill coins & death
          const living: BattleUnit[] = [];
          for (const u of updated) {
            if (u.hp <= 0) {
              sound.playHit();
              if (u.side === 'enemy') {
                const earned = battleType === 'campaign' ? (u.role === 'tank' ? 5 : 1) : 0;
                setSessionStats((prev) => ({
                  ...prev,
                  goldEarnedInBattle: prev.goldEarnedInBattle + earned,
                  normalKills: prev.normalKills + (u.role !== 'tank' ? 1 : 0),
                  tankKills: prev.tankKills + (u.role === 'tank' ? 1 : 0),
                }));
                if (battleType === 'campaign') {
                  sound.playCoin();
                  setFloatingTexts((ft) => [
                  ...ft,
                  {
                    id: `coin-${Date.now()}-${Math.random()}`,
                    text: `+${earned}G`,
                    x: u.x,
                    y: 35,
                    color: '#fbbf24',
                    opacity: 1,
                    life: 0.8,
                  },
                  ]);
                }
              }
            } else {
              living.push(u);
            }
          }

          return living;
        });

        // Projectiles update
        setProjectiles((prevProj) => {
          const activeProj: Projectile[] = [];

          for (const p of prevProj) {
            const nextProgress = p.progress + delta * 2.8;
            if (nextProgress >= 1) {
              sound.playHit();
              const isPlayer = p.side === 'player';

              if (p.targetUid) {
                setUnits((uList) =>
                  uList.map((u) => {
                    if (u.uid === p.targetUid) {
                      const nextHp = Math.max(0, u.hp - p.damage);
                      return { ...u, hp: nextHp, hitFlash: 0.15 };
                    }
                    return u;
                  })
                );
              } else {
                if (isPlayer) {
                  setEnemyBaseHp((eHp) => Math.max(0, eHp - p.damage));
                } else {
                  setPlayerBaseHp((pHp) => Math.max(0, pHp - p.damage));
                }
              }

              setParticles((parts) => [
                ...parts,
                {
                  id: `spark-${Date.now()}-${Math.random()}`,
                  x: p.targetX,
                  y: 20,
                  vx: (Math.random() - 0.5) * 8,
                  vy: Math.random() * 8,
                  color: '#fbbf24',
                  size: 3,
                  alpha: 1,
                  life: 0.3,
                },
              ]);

              setFloatingTexts((ft) => [
                ...ft,
                {
                  id: `ft-proj-${Date.now()}-${Math.random()}`,
                  text: `-${p.damage}`,
                  x: p.targetX,
                  y: 30,
                  color: isPlayer ? '#60a5fa' : '#f87171',
                  opacity: 1,
                  life: 0.7,
                },
              ]);
            } else {
              const currentX = p.startX + (p.targetX - p.startX) * nextProgress;
              activeProj.push({ ...p, progress: nextProgress, currentX });
            }
          }

          return activeProj;
        });

        // Floating texts & particles
        setFloatingTexts((ftList) =>
          ftList
            .map((t) => ({ ...t, y: t.y + delta * 12, opacity: t.opacity - delta * 1.1, life: t.life - delta }))
            .filter((t) => t.life > 0 && t.opacity > 0)
        );

        setParticles((pList) =>
          pList
            .map((p) => ({ ...p, x: p.x + p.vx * delta, y: p.y + p.vy * delta, alpha: p.alpha - delta * 2.5, life: p.life - delta }))
            .filter((p) => p.life > 0 && p.alpha > 0)
        );

        // Result check
        const bossCleared = battleType !== 'bosses' || (bossSpawnedRef.current && !unitsForVictoryRef.current.some((u) => u.side === 'enemy' && u.role === 'boss' && u.hp > 0));
        if (enemyBaseHp <= 0 && !battleResult && battleType !== 'rush' && bossCleared) {
          sound.playVictory();
          setBattleResult('victory');
        } else if (playerBaseHp <= 0 && !battleResult) {
          sound.playDefeat();
          setBattleResult('defeat');
        }
      }

      animId = requestAnimationFrame(gameTick);
    };

    animId = requestAnimationFrame(gameTick);
    return () => cancelAnimationFrame(animId);
  }, [inBattle, isPaused, battleResult, foodRate, battleType, enemyBaseHp, playerBaseHp]);

  // --- VICTORY CLAIM ---
  const handleVictoryClaim = useCallback(() => {
    if (battleSettledRef.current || battleResult !== 'victory') return;
    battleSettledRef.current = true;
    battleActiveRef.current = false;
    const earnedGold = battleType === 'campaign' ? campaignGoldPayout(sessionStats.goldEarnedInBattle, cardCoinBonus + runeCoinBonus, true) : 0;

    if (battleType === 'campaign') {
      setProfile((prev) => {
        const defeatedStage = prev.opponentStage;
        const cleared = prev.clearedEnemyStages.includes(defeatedStage)
          ? prev.clearedEnemyStages
          : [...prev.clearedEnemyStages, defeatedStage];

        return {
          ...prev,
          gold: prev.gold + earnedGold,
          opponentStage: Math.min(6, prev.opponentStage + 1),
          clearedEnemyStages: cleared,
        };
      });
    } else if (battleType === 'rush') {
      setProfile((prev) => ({
        ...prev,
        gems: prev.gems + 35,
        rushHighWins: prev.rushHighWins + 1,

      }));
    } else if (battleType === 'legends') {
      setProfile((prev) => settleLegendsFirstClear(prev, sessionStats.legendsChapterId || prev.legendsChapter));
    } else if (battleType === 'bosses') {
      setProfile((prev) => {
        const skillKeys: ('stasis' | 'volley' | 'rally')[] = ['stasis', 'volley', 'rally'];
        const randomSkill = skillKeys[Math.floor(Math.random() * skillKeys.length)];
        const currentCopies = prev.skills[randomSkill]?.copies || 0;

        return {
          ...prev,
          bossStage: prev.bossStage + 1,

          skills: {
            ...prev.skills,
            [randomSkill]: {
              ...prev.skills[randomSkill],
              copies: currentCopies + 1,
            },
          },
        };
      });
    } else if (battleType === 'hell') {
      setProfile((prev) => ({
        ...prev,
        gems: prev.gems + 75,
        runePoints: prev.runePoints + 1,
      }));
    }

    setInBattle(false);
    setBattleResult(null);
  }, [battleType, battleResult, sessionStats.goldEarnedInBattle, sessionStats.legendsChapterId, cardCoinBonus, runeCoinBonus]);

  // --- SURVIVAL CONTINUE / CASHOUT ---
  const handleContinueSurvival = useCallback(() => {
    if (battleResult !== 'victory' || battleType !== 'survival') return;
    const nextWave = sessionStats.survivalWave + 1;
    startBattle('survival', { carriedBaseHp: playerBaseHp, survivalWave: nextWave });
  }, [battleResult, battleType, sessionStats.survivalWave, playerBaseHp, startBattle]);

  const handleCashoutSurvival = useCallback(() => {
    if (battleSettledRef.current || battleResult !== 'victory' || battleType !== 'survival') return;
    battleSettledRef.current = true;
    battleActiveRef.current = false;
    const wavesWon = sessionStats.survivalWave;
    const gemsAwarded = wavesWon * 20;
    const runesAwarded = Math.floor(wavesWon / 2);

    setProfile((prev) => ({
      ...prev,
      gems: prev.gems + gemsAwarded,
      runePoints: prev.runePoints + runesAwarded,
      survivalBestStreak: Math.max(prev.survivalBestStreak, wavesWon),

    }));

    setInBattle(false);
    setBattleResult(null);
  }, [sessionStats.survivalWave, battleResult, battleType]);

  // --- DEFEAT ACKNOWLEDGE ---
  const handleDefeatAcknowledge = useCallback(() => {
    if (battleSettledRef.current || battleResult !== 'defeat') return;
    battleSettledRef.current = true;
    battleActiveRef.current = false;
    const earnedGold = battleType === 'campaign' ? campaignGoldPayout(sessionStats.goldEarnedInBattle, cardCoinBonus + runeCoinBonus) : 0;
    if (earnedGold > 0) {
      setProfile((prev) => ({ ...prev, gold: prev.gold + earnedGold }));
    }
    setInBattle(false);
    setBattleResult(null);
  }, [sessionStats.goldEarnedInBattle, battleResult, battleType, cardCoinBonus, runeCoinBonus]);

  const cancelRetreat = () => {
    setShowRetreatConfirm(false);
    setIsPaused(pausedBeforeRetreatRef.current);
  };

  // --- RETREAT / SURRENDER ---
  const handleRetreat = useCallback(() => {
    if (battleSettledRef.current || !battleActiveRef.current) return;
    battleSettledRef.current = true;
    battleActiveRef.current = false;
    sound.playDefeat();
    const earnedGold = battleType === 'campaign' ? campaignGoldPayout(sessionStats.goldEarnedInBattle, cardCoinBonus + runeCoinBonus) : 0;
    if (earnedGold > 0) {
      setProfile((prev) => ({ ...prev, gold: prev.gold + earnedGold }));
    }
    setInBattle(false);
    setIsPaused(false);
    setShowRetreatConfirm(false);
    setBattleResult(null);
  }, [sessionStats.goldEarnedInBattle, battleType, cardCoinBonus, runeCoinBonus]);

  // --- UPGRADES ---
  const handleUpgradeFood = () => {
    const cost = Math.round(12 * Math.pow(1.35, profile.foodLevel - 1));
    if (profile.gold < cost) return;
    sound.playUpgrade();
    setProfile((prev) => {
      const price = Math.round(12 * Math.pow(1.35, prev.foodLevel - 1));
      return prev.gold >= price ? { ...prev, gold: prev.gold - price, foodLevel: prev.foodLevel + 1 } : prev;
    });
  };

  const handleUpgradeBase = () => {
    const cost = Math.round(15 * Math.pow(1.35, profile.baseLevel - 1));
    if (profile.gold < cost) return;
    sound.playUpgrade();
    setProfile((prev) => {
      const price = Math.round(15 * Math.pow(1.35, prev.baseLevel - 1));
      return prev.gold >= price ? { ...prev, gold: prev.gold - price, baseLevel: prev.baseLevel + 1 } : prev;
    });
  };

  const handleUnlockTroop = (unit: UnitDef) => {
    if (profile.gold < unit.unlockCostGold) return;
    sound.playUpgrade();
    setProfile((prev) => {
      if (prev.gold < unit.unlockCostGold || prev.unlockedTroopIds.includes(unit.id) || prev.armyAge !== unit.ageId) return prev;
      return { ...prev, gold: prev.gold - unit.unlockCostGold, unlockedTroopIds: [...prev.unlockedTroopIds, unit.id] };
    });
  };

  const handleEvolveAge = () => {
    const currentAgeIdx = getAgeIndex(profile.armyAge);
    if (currentAgeIdx >= AGES.length - 1) return;
    const nextAge = AGES[currentAgeIdx + 1];
    const hasCleared = profile.clearedEnemyStages.includes(getAgeDef(profile.armyAge).eraNumber);
    const cost = hasCleared ? 0 : getAgeDef(profile.armyAge).evolveCostGold;
    if (profile.gold < cost) return;

    sound.playVictory();
    setProfile((prev) => {
      const idx = getAgeIndex(prev.armyAge);
      if (idx >= AGES.length - 1) return prev;
      const next = AGES[idx + 1];
      const price = prev.clearedEnemyStages.includes(AGES[idx].eraNumber) ? 0 : AGES[idx].evolveCostGold;
      if (prev.gold < price) return prev;
      return {
        ...prev, gold: prev.gold - price, armyAge: next.id,
        opponentStage: Math.max(prev.opponentStage, next.eraNumber),
        foodLevel: 1, baseLevel: 1,
        unlockedTroopIds: Array.from(new Set([...prev.unlockedTroopIds, next.units[0].id])),
      };
    });
  };

  const handlePrestige = () => {
    if (profile.armyAge !== 'future' || !profile.clearedEnemyStages.includes(6)) return;
    sound.playVictory();
    setProfile((prev) => (prev.armyAge !== 'future' || !prev.clearedEnemyStages.includes(6)) ? prev : ({
      ...prev,
      timeline: prev.timeline + 1,
      gold: 0, // Campaign-local currency resets on Prestige; permanent collections are preserved.
      armyAge: 'stone',
      opponentStage: 1,
      clearedEnemyStages: [],
      foodLevel: 1,
      baseLevel: 1,
      gems: prev.gems + 100,
      runePoints: prev.runePoints + 2,
      heroesUnlocked: Array.from(new Set([...prev.heroesUnlocked, 'crusader_champion'])),
      equippedHeroId: prev.equippedHeroId || 'crusader_champion',
    }));
  };

  // --- CARDS & SKILLS ---
  const handleUpgradeCard = (cardId: string) => {
    const current = profile.cards[cardId];
    if (!current) return;
    const needed = current.level * 3;
    if (current.copies < needed) return;
    sound.playUpgrade();
    setProfile((prev) => {
      const owned = prev.cards[cardId];
      const price = owned ? owned.level * 3 : Infinity;
      if (!owned || owned.copies < price) return prev;
      return { ...prev, cards: { ...prev.cards, [cardId]: { ...owned, level: owned.level + 1, copies: owned.copies - price } } };
    });
  };

  const handleDiscoverSkill = () => {
    if (profile.gems < 80) return;
    sound.playChestOpen();
    const skillList: ('stasis' | 'volley' | 'rally')[] = ['stasis', 'volley', 'rally'];
    const chosen = skillList[Math.floor(Math.random() * skillList.length)];
    setProfile((prev) => {
      if (prev.gems < 80) return prev;
      const existing = prev.skills[chosen] || { skillId: chosen, level: 1, copies: 0, unlocked: false };
      return {
        ...prev,
        gems: prev.gems - 80,
        skills: {
          ...prev.skills,
          [chosen]: { ...existing, unlocked: true, copies: existing.copies + 1 },
        },
      };
    });
  };

  const handleUpgradeSkill = (skillId: 'stasis' | 'volley' | 'rally') => {
    const existing = profile.skills[skillId];
    if (!existing) return;
    const needed = Math.max(2, existing.level * 2);
    if (existing.copies < needed) return;
    sound.playUpgrade();
    setProfile((prev) => {
      const skill = prev.skills[skillId];
      const price = skill ? Math.max(2, skill.level * 2) : Infinity;
      if (!skill?.unlocked || skill.copies < price) return prev;
      return { ...prev, skills: { ...prev.skills, [skillId]: { ...skill, level: skill.level + 1, copies: skill.copies - price } } };
    });
  };

  const handleEquipSkill = (skillId: 'stasis' | 'volley' | 'rally', slotIndex: number) => {
    setProfile((prev) => {
      if (!prev.skills[skillId]?.unlocked || slotIndex < 0 || slotIndex >= 3) return prev;
      const slots = [...prev.equippedSkills];
      const existingIdx = slots.indexOf(skillId);
      if (existingIdx !== -1) slots[existingIdx] = null;
      slots[slotIndex] = skillId;
      return { ...prev, equippedSkills: slots };
    });
  };

  const handleUpgradeRune = (nodeId: string) => {
    if (profile.runePoints < 1) return;
    sound.playUpgrade();
    setProfile((prev) => {
      const rune = RUNES.find((it) => it.id === nodeId);
      if (!rune || prev.runePoints < 1 || (prev.runes[nodeId] || 0) >= rune.maxRank || (rune.parentId && !prev.runes[rune.parentId])) return prev;
      return { ...prev, runePoints: prev.runePoints - 1, runes: { ...prev.runes, [nodeId]: (prev.runes[nodeId] || 0) + 1 } };
    });
  };

  const handleEquipHero = (heroId: string) => {
    setProfile((prev) => ({
      ...prev,
      equippedHeroId: !prev.heroesUnlocked.includes(heroId) ? prev.equippedHeroId : (prev.equippedHeroId === heroId ? null : heroId),
    }));
  };

  // --- CHESTS & DAILY ---
  const handleOpenChest = (count: number, costGems: number) => {
    if (profile.gems < costGems) return;
    sound.playChestOpen();
    const pulls: CardDef[] = [];
    const updatedCards = { ...profile.cards };

    for (let i = 0; i < count; i++) {
      const totalWeight = CARDS.reduce((sum, c) => sum + c.pullWeight, 0);
      let rand = Math.random() * totalWeight;
      let drawnCard = CARDS[0];

      for (const c of CARDS) {
        if (rand < c.pullWeight) {
          drawnCard = c;
          break;
        }
        rand -= c.pullWeight;
      }

      pulls.push(drawnCard);

      if (!updatedCards[drawnCard.id]) {
        updatedCards[drawnCard.id] = { cardId: drawnCard.id, level: 1, copies: 1 };
      } else {
        updatedCards[drawnCard.id] = {
          ...updatedCards[drawnCard.id],
          copies: updatedCards[drawnCard.id].copies + 1,
        };
      }
    }

    setRecentChestPulls(pulls);
    setProfile((prev) => {
      if (prev.gems < costGems) return prev;
      const cards = { ...prev.cards };
      for (const draw of pulls) {
        const owned = cards[draw.id];
        cards[draw.id] = owned ? { ...owned, copies: owned.copies + 1 } : { cardId: draw.id, level: 1, copies: 1 };
      }
      return { ...prev, gems: prev.gems - costGems, cards };
    });
  };

  const handleClaimDaily = () => {
    const todayUtc = new Date().toISOString().slice(0, 10);
    if (profile.lastDailyClaimDate === todayUtc) return;
    sound.playCoin();
    setProfile((prev) => prev.lastDailyClaimDate === todayUtc ? prev : ({
      ...prev,
      gems: prev.gems + 25,
      keys: prev.keys + 1,
      lastDailyClaimDate: todayUtc,
    }));
  };

  const currentAgeDef = getAgeDef(profile.armyAge);
  const availableTroopsInCombat = [
    ...currentAgeDef.units,
    ...(getAgeIndex(profile.armyAge) > 0 ? AGES[getAgeIndex(profile.armyAge) - 1].units : []),
  ].filter((u) => profile.unlockedTroopIds.includes(u.id) || (u.ageId === profile.armyAge && u.unlockCostGold === 0)).slice(0, 3);

  const combatTheme = getCombatTheme(enemyAgeId, battleType);
  const currentStageEnemyAgeId = getAgeByIndex(profile.opponentStage - 1).id;
  const currentBattleBackground = getBattleBackgroundImage(currentStageEnemyAgeId);
  return (
    <div className="flex justify-center h-[100dvh] min-h-0 bg-black text-slate-100 font-sans">
      {/* Mobile-first portrait viewport matching user's design */}
      <div className="w-full max-w-[420px] h-[100dvh] min-h-0 flex flex-col bg-stone-950 border-x-2 border-stone-800 shadow-2xl relative overflow-hidden">
        {/* --- GLOBAL IDLE HEADER (Single line, strictly no wrapping, compact) --- */}
        {!inBattle && (
          <header className="flex items-center justify-between px-2.5 py-1.5 bg-stone-950 border-b-2 border-stone-800 select-none z-30 shrink-0">
            {/* Gold Pill on Left: [🪙 9 +] */}
            <div className="shrink-0 flex items-center gap-1 bg-stone-900 border-2 border-amber-600/90 rounded-md px-2 py-0.5 shadow-md">
              <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 border border-amber-300 flex items-center justify-center shadow-inner shrink-0">
                <span className="text-[9px] font-pixel text-amber-950 font-black">$</span>
              </div>
              <span className="font-pixel text-[11px] text-white font-bold tabular-nums whitespace-nowrap">
                {profile.gold}
              </span>
              
            </div>

            {/* Center Battle Stage Banner matching reference image */}
            <div className="shrink-0 px-3 py-1 bg-gradient-to-b from-stone-800 via-stone-900 to-stone-950 border-2 border-stone-600 rounded-md shadow-[0_2px_4px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.15)] flex items-center justify-center">
              <span className="font-pixel text-xs sm:text-sm text-white font-black tracking-wider whitespace-nowrap drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                Battle {profile.opponentStage}
              </span>
            </div>

            {/* Right side: Gem Pill [💎 185 +] + Gear Settings Button */}
            <div className="shrink-0 flex items-center gap-1.5">
              <div className="flex items-center gap-1 bg-stone-900 border-2 border-blue-500/90 rounded-md px-2 py-0.5 shadow-md">
                <div className="w-3 h-3 rotate-45 bg-gradient-to-br from-cyan-300 via-blue-500 to-indigo-700 border border-cyan-200 shadow-[0_0_6px_#38bdf8] shrink-0" />
                <span className="font-pixel text-[11px] text-white font-bold tabular-nums whitespace-nowrap">
                  {profile.gems}
                </span>
                
              </div>

              {/* Square Settings Gear Button */}
              <button
                onClick={() => setShowSettingsModal(true)}
                className="w-7 h-7 rounded-md bg-stone-900 border-2 border-stone-700 hover:border-stone-500 flex items-center justify-center text-stone-300 shadow-md active:scale-95 transition-all shrink-0"
                title="Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </header>
        )}

        {/* --- MAIN CONTENT AREA --- */}
        {inBattle ? (
          /* ACTIVE COMBAT VIEW: Top Header -> Expansive Battlefield -> Bottom ThemedWall */
          <div className="flex-1 flex flex-col justify-between h-full overflow-hidden select-none">
            {/* 1. In-Battle Top Header */}
            <BattleHeader
              battleStageNumber={profile.opponentStage}
              goldEarnedThisBattle={sessionStats.goldEarnedInBattle}
              totalGems={profile.gems}
              isPaused={isPaused}
              onTogglePause={() => setIsPaused(!isPaused)}
              onRetreatClick={() => {
                pausedBeforeRetreatRef.current = isPaused;
                setIsPaused(true);
                setShowRetreatConfirm(true);
              }}
              rushTimer={battleType === 'rush' ? sessionStats.rushTimerRemaining : undefined}
            />

            {/* 2. Expansive Battlefield (Takes remaining vertical space, side-view) */}
            <div className="flex-1 min-h-0 w-full relative overflow-hidden flex flex-col justify-end">
              <Battlefield
                playerAge={profile.armyAge}
                enemyAge={enemyAgeId}
                playerBaseHp={playerBaseHp}
                playerBaseMaxHp={playerBaseMaxHp}
                enemyBaseHp={enemyBaseHp}
                enemyBaseMaxHp={enemyBaseMaxHp}
                units={units}
                projectiles={projectiles}
                floatingTexts={floatingTexts}
                particles={particles}
                stasisActive={sessionStats.skillCooldowns.stasis > 8}
                rallyActive={sessionStats.skillCooldowns.rally > 10}
                isPaused={isPaused}
              />
            </div>

            {/* 3. Themed Fortress Barricade Wall Controls (Docked at bottom) */}
            <ThemedWall
              theme={combatTheme}
              food={food}
              foodRate={foodRate}
              availableUnits={availableTroopsInCombat}
              onDeployUnit={handleDeployUnit}
              equippedHero={
                profile.equippedHeroId ? HEROES.find((h) => h.id === profile.equippedHeroId) || null : null
              }
              heroUsed={sessionStats.heroUsed}
              onDeployHero={handleDeployHero}
              equippedSkills={profile.equippedSkills.map((id) => (id ? SKILLS.find((s) => s.id === id) || null : null))}
              skillCooldowns={sessionStats.skillCooldowns}
              onActivateSkill={handleActivateSkill}
            />
          </div>
        ) : (
          /* IDLE / MENU SCREENS */
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
            {activeTab === 'battle' && (
              /* IDLE HOME SCREEN (Matches battlefield environment) */
              <div
                className="relative flex-1 min-h-0 flex flex-col justify-between overflow-hidden select-none bg-slate-950"
                style={{
                  backgroundImage: `url(${currentBattleBackground})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'bottom',
                }}
              >
                {/* 16-Bit Battle Environment Background matching battlefield */}
                <img
                  src={currentBattleBackground}
                  alt="Battlefield Environment"
                  className="absolute inset-0 w-full h-full object-cover object-bottom pixelated pointer-events-none brightness-95"
                />

                {/* Subtle vignette and contrast gradient overlay matching battlefield */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/30 pointer-events-none" />

                {/* Bases Outposts on the Battlefield (Player on Left, Enemy on Right) matching battle scene */}
                <div className="absolute inset-0 pointer-events-none z-10 flex justify-between items-end px-1 sm:px-2 pb-3 sm:pb-4">
                  <BaseOutpostSprite
                    side="player"
                    hpText={`Lvl ${profile.baseLevel}`}
                    hpPercent={1}
                  />
                  <BaseOutpostSprite
                    side="enemy"
                    hpText={`Stage ${profile.opponentStage}`}
                    hpPercent={1}
                  />
                </div>

                {/* --- FLOATING SIDE MENU BUTTONS (Left & Right columns) --- */}
                <div className="relative z-10 w-full flex justify-between p-2.5 sm:p-3 pt-3 pointer-events-none">
                  {/* Left Column Buttons */}
                  <div className="flex flex-col gap-2 sm:gap-2.5 pointer-events-auto">
                    {/* Missions Button */}
                    <button
                      onClick={() => setShowMissionsModal(true)}
                      className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-b from-stone-800 to-stone-950 border-2 border-stone-600 shadow-xl flex items-center justify-center text-amber-300 hover:scale-105 active:scale-95 transition-all"
                    >
                      <Scroll className="w-5 h-5 sm:w-6 sm:h-6 text-amber-200" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border border-white" />
                      <div className="absolute -bottom-3.5 font-pixel text-[7.5px] sm:text-[8px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                        Missions
                      </div>
                    </button>

                    {/* Citadel Home Base Shortcut */}
                    <button
                      onClick={() => setShowHomeModal(true)}
                      className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-b from-amber-950 to-stone-950 border-2 border-amber-600 shadow-xl flex items-center justify-center text-amber-400 hover:scale-105 active:scale-95 transition-all mt-2.5"
                    >
                      <Tent className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                      <div className="absolute -bottom-3.5 font-pixel text-[7.5px] sm:text-[8px] text-amber-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] whitespace-nowrap">
                        Citadel
                      </div>
                    </button>
                  </div>

                  {/* Right Column Buttons */}
                  <div className="flex flex-col gap-2 sm:gap-2.5 pointer-events-auto items-end">
                    {/* Lucky Spin Wheel (Free!) */}
                    <button
                      onClick={() => setShowSpinModal(true)}
                      className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-b from-stone-800 to-stone-950 border-2 border-amber-600 shadow-xl flex items-center justify-center text-amber-400 hover:scale-105 active:scale-95 transition-all mt-2.5"
                    >
                      <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border border-white" />
                      <div className="absolute -bottom-3.5 font-pixel text-[7.5px] sm:text-[8px] text-emerald-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] whitespace-nowrap font-bold">
                        Free!
                      </div>
                    </button>

                  </div>
                </div>

                {/* --- LARGE BATTLE CTA BUTTON (Matches Image 2 exactly) --- */}
                <div className="relative z-20 flex flex-col items-center mb-3 px-6">
                  <button
                    onClick={() => startBattle('campaign')}
                    className="relative w-56 sm:w-64 h-14 sm:h-16 rounded-2xl bg-gradient-to-b from-blue-400 via-blue-600 to-blue-700 border-4 border-stone-950 shadow-[0_5px_0_#1e3a8a,0_10px_20px_rgba(0,0,0,0.7)] hover:brightness-110 active:translate-y-1 active:shadow-[0_2px_0_#1e3a8a] transition-all flex items-center justify-center gap-2.5 sm:gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/30 flex items-center justify-center shrink-0">
                      <Swords className="w-6 h-6 text-white drop-shadow" />
                    </div>
                    <span className="font-pixel text-lg sm:text-xl text-white font-black tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      Battle
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* UPGRADES / HEROES TAB */}
            {activeTab === 'upgrades' && (
              <UpgradesView
                profile={profile}
                onUpgradeFood={handleUpgradeFood}
                onUpgradeBase={handleUpgradeBase}
                onUnlockTroop={handleUnlockTroop}
                onEvolveAge={handleEvolveAge}
                onPrestige={handlePrestige}
              />
            )}

            {/* DUNGEONS / MAP TAB */}
            {activeTab === 'dungeons' && (
              <DungeonsView
                profile={profile}
                onStartDungeon={(type, extra) => startBattle(type, extra)}
                onDeductKeyAndStart={(type, extra) => startBattle(type, extra)}
              />
            )}

            {/* CARDS TAB */}
            {activeTab === 'cards' && (
              <CardsView
                profile={profile}
                onUpgradeCard={handleUpgradeCard}
                onDiscoverSkill={handleDiscoverSkill}
                onUpgradeSkill={handleUpgradeSkill}
                onEquipSkill={handleEquipSkill}
                onUpgradeRune={handleUpgradeRune}
                onEquipHero={handleEquipHero}
                onSummonCards={handleOpenChest}
                recentPulls={recentChestPulls}
                onClosePulls={() => setRecentChestPulls(null)}
              />
            )}

            {/* SHOP TAB */}
            {activeTab === 'shop' && (
              <ShopView
                profile={profile}
                onUpdateProfile={setProfile}
              />
            )}
          </div>
        )}

        {/* --- BOTTOM NAVIGATION BAR --- */}
        {!inBattle && (
          <nav className="relative z-30 flex items-center justify-around py-2 px-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-stone-950 border-t-4 border-stone-800 select-none shadow-2xl shrink-0">
            {/* Dungeons: visible at all times; individual mode unlocks are handled in DungeonsView. */}
              <button
                onClick={() => setActiveTab('dungeons')}
                className={`flex flex-col items-center gap-0.5 transition-all ${
                  activeTab === 'dungeons' ? 'scale-105 text-amber-400' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  <MapIcon className="w-5 h-5 text-amber-200" />
                </div>
                <span className="font-pixel text-[8px] font-bold">Dungeons</span>
              </button>

            {/* 2. Upgrades (Renamed from Heroes: immediately to the left of Battle) */}
            <button
              onClick={() => setActiveTab('upgrades')}
              className={`flex flex-col items-center gap-0.5 transition-all ${
                activeTab === 'upgrades' ? 'scale-105 text-amber-400' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <div className="relative w-6 h-6 flex items-center justify-center">
                <Shield className="w-5 h-5" />
                <div className="absolute -top-1 -right-1 text-emerald-400 font-black text-[10px]">▲</div>
              </div>
              <span className="font-pixel text-[8px] font-bold">Upgrades</span>
            </button>

            {/* 3. Battle (Large highlighted central tab with golden crossed swords) */}
            <button
              onClick={() => setActiveTab('battle')}
              className={`relative -top-2 flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl border-2 transition-all ${
                activeTab === 'battle'
                  ? 'bg-amber-600/30 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                  : 'bg-stone-900 border-stone-700 text-stone-400'
              }`}
            >
              <Swords className="w-6 h-6 text-amber-400" />
              <span className="font-pixel text-[8px] font-black">Battle</span>
            </button>

            {/* 4. Cards (Playing cards with red badge) */}
            <button
              onClick={() => setActiveTab('cards')}
              className={`flex flex-col items-center gap-0.5 transition-all ${
                activeTab === 'cards' ? 'scale-105 text-amber-400' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <div className="relative w-6 h-6 flex items-center justify-center">
                <span className="text-lg">🎴</span>
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-600 rounded-full" />
              </div>
              <span className="font-pixel text-[8px] font-bold">Cards</span>
            </button>

            {/* 5. Shop (Swapped with Dungeons: Far right position, dedicated solely to currency & rewarded ads) */}
            <button
              onClick={() => setActiveTab('shop')}
              className={`flex flex-col items-center gap-0.5 transition-all ${
                activeTab === 'shop' ? 'scale-105 text-amber-400' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <span className="font-pixel text-[8px] font-bold">Shop</span>
            </button>
          </nav>
        )}

        {/* --- MODALS --- */}
        {showRetreatConfirm && (
          <RPGModalContainer
            isOpen={true}
            onClose={cancelRetreat}
            title="RETREAT?"
            subtitle="Leave the current encounter"
            maxWidth="max-w-xs"
            icon={<Swords className="w-5 h-5 text-amber-300" />}
          >
            <p className="font-pixel text-xs text-stone-300 mb-4">
              End this battle without advancing the enemy stage. Campaign Gold earned so far is kept.
            </p>
            <div className="flex gap-2">
              <RPGButton variant="dark" size="md" className="flex-1" onClick={cancelRetreat}>
                CONTINUE
              </RPGButton>
              <RPGButton variant="gold" size="md" className="flex-1" onClick={handleRetreat}>
                RETREAT
              </RPGButton>
            </div>
          </RPGModalContainer>
        )}
        {showHomeModal && (
          <HomeBaseModal
            profile={profile}
            onClose={() => setShowHomeModal(false)}
            onStartHellSiege={() => { /* Unapproved high-stakes mechanics are disabled until capped and tested. */ }}
          />
        )}

        {showMissionsModal && (
          <MissionsModal
            profile={profile}
            onClose={() => setShowMissionsModal(false)}
            onUpdateProfile={setProfile}
          />
        )}

        {showSpinModal && (
          <SpinWheelModal
            profile={profile}
            onClose={() => setShowSpinModal(false)}
            onUpdateProfile={setProfile}
          />
        )}

        {showSettingsModal && (
          <SettingsModal
            profile={profile}
            onClose={() => setShowSettingsModal(false)}
            soundOn={soundOn}
            onToggleSound={toggleSound}
          />
        )}

        {battleResult && (
          <VictoryDefeatModal
            isVictory={battleResult === 'victory'}
            battleType={battleType}
            sessionStats={{ ...sessionStats, goldEarnedInBattle: battleType === 'campaign'
              ? campaignGoldPayout(sessionStats.goldEarnedInBattle, cardCoinBonus + runeCoinBonus, battleResult === 'victory')
              : 0 }}
            onRetry={() => {
                if (battleResult !== 'defeat') return;
                if (battleType !== 'campaign' && battleType !== 'hell' && battleType !== 'legends' && profile.keys < 1) {
                  handleDefeatAcknowledge();
                  setActiveTab('dungeons');
                  return;
                }
                handleDefeatAcknowledge();
                startBattle(battleType, { chapterId: sessionStats.legendsChapterId, freeLegendsRetry: battleType === 'legends' });
              }}
            onContinue={battleType === 'survival' ? handleContinueSurvival : handleVictoryClaim}
            onOpenUpgrades={() => {
              handleDefeatAcknowledge();
              setActiveTab('upgrades');
            }}
            onExit={handleDefeatAcknowledge}
            onCashoutSurvival={battleType === 'survival' ? handleCashoutSurvival : undefined}
            carriedBaseHp={playerBaseHp}
          />
        )}
      </div>
    </div>
  );
}
