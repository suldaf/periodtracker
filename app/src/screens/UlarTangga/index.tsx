import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
  Animated,
  TextInput,
  Image,
  ImageBackground,
  ScrollView,
  ImageSourcePropType,
} from 'react-native'
import { SvgUri } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { assets } from '../../resources/assets'
import { ScreenComponent } from '../../navigation/RootNavigator'

// Import all game engine modules from centralized location
import {
  // Configuration
  BOARD_CONFIG_42,
  DEFAULT_SNAKES_42,
  DEFAULT_LADDERS_42,
  SNAKE_ASSET_MAP,
  SNAKE_ROTATION_OFFSETS,
  SKIN_TONES,
  TOKEN_COLORS,
  THEME_COLORS,
  buildAvatarPath,
  createInitialAvatars,
  createInitialNames,
  calculateBoardDimensions,
  // Types
  SkinTone,
  Gender,
  AvatarSpec,
  Player,
  SetupTab,
  Phase,
  // Grid Systems
  squareToXY,
  calculateTokenPosition,
  // Rules
  rollDice,
  calculateMove,
  getNextPlayerIndex,
  updateSnakeHitCounter,
  GameMode,
  Difficulty,
  // Bot Logic
  BotConfig,
  createBotConfigs,
  executeBotTurn,
  determineBotReaction,
  calculateBotActionDelays,
  getBotMessage,
  isBotTurn,
  calculateHumanDiceRoll,
  Emoticon,
} from '../../features/edufun-snakes-ladders/engine'

// Import GameModeSelector component
import {
  GameModeSelector,
  GameModeSelection,
} from '../../features/edufun-snakes-ladders/components/GameModeSelector'

// Extended phase type to include mode selection
type GamePhase = 'select_mode' | Phase

// Use board configuration from engine
const { TOTAL_SQUARES, COLS, PLAYABLE_SQUARES } = BOARD_CONFIG_42

// Use theme colors from engine
const themeColors = THEME_COLORS

const UlarTangga: ScreenComponent<'Ludo' | 'game'> = () => {
  const { width: w, height: h } = Dimensions.get('window')
  const insets = useSafeAreaInsets()

  // Use engine function for board dimensions
  const { boardSize, boardHeight, cellSize: cell, rows } = useMemo(
    () => calculateBoardDimensions(w, h, BOARD_CONFIG_42),
    [w, h],
  )

  // Start with mode selection phase
  const [phase, setPhase] = useState<GamePhase>('select_mode')
  const [playerCount, setPlayerCount] = useState(2)
  const [players, setPlayers] = useState<Player[]>([])
  const [turnIdx, setTurnIdx] = useState(0)
  const [dice, setDice] = useState(1)
  const [info, setInfo] = useState('Pilih jumlah pemain (2-5)')
  const [isAnimating, setIsAnimating] = useState(false)

  const [currentPlayerSetup, setCurrentPlayerSetup] = useState(0)
  const [setupTab, setSetupTab] = useState<SetupTab>('skin')
  const [tempAvatars, setTempAvatars] = useState<AvatarSpec[]>([])
  const [tempNames, setTempNames] = useState<string[]>([])

  // Game mode and bot states
  const [gameMode, setGameMode] = useState<GameMode>('multiplayer')
  const [difficulty, setDifficulty] = useState<Difficulty>('santai')
  const [bots, setBots] = useState<BotConfig[]>([])
  const [botReaction, setBotReaction] = useState<{ message: string; emoticon: Emoticon } | null>(
    null,
  )
  const [consecutiveSnakeHits, setConsecutiveSnakeHits] = useState<Record<number, number>>({})

  // Use engine's default snakes and ladders
  const snakes = useRef(DEFAULT_SNAKES_42)
  const ladders = useRef(DEFAULT_LADDERS_42)
  const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const botTurnTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animPos = useRef<Record<number, Animated.ValueXY>>({})
  const animScale = useRef<Record<number, Animated.Value>>({})

  const avatarAssets = assets.ular_tangga

  // Use theme from engine
  const [theme] = useState<'light'>('light')

  useEffect(() => {
    return () => {
      if (moveTimer.current) clearTimeout(moveTimer.current)
      if (botTurnTimer.current) clearTimeout(botTurnTimer.current)
    }
  }, [])

  useEffect(() => {
    if (phase === 'setup') {
      // In solo mode, only create avatars for the human player
      const humanCount = gameMode === 'solo' ? 1 : playerCount
      setTempAvatars(
        Array(humanCount)
          .fill(null)
          .map((_, i) => {
            // Alternate between Female and Male for variety, or all Female by default
            const gender: Gender = 'Female' // Change to i % 2 === 0 ? 'Female' : 'Male' for alternating

            return {
              gender,
              skinTone: 'LIGHT',
              hair: gender === 'Female' ? 'BRAID' : 'HAIR1',
              clothes: 'BASIC',
              accessory: undefined,
              color: TOKEN_COLORS[i % TOKEN_COLORS.length],
            }
          }),
      )
      setTempNames(
        Array(humanCount)
          .fill(null)
          .map((_, i) => (gameMode === 'solo' ? 'Kamu' : `Pemain ${i + 1}`)),
      )
      setCurrentPlayerSetup(0)
      setSetupTab('skin')
    }
  }, [phase, playerCount, gameMode])

  const startGame = () => {
    if (phase !== 'setup') return

    // Create human players from tempAvatars
    const humanPlayerCount = gameMode === 'solo' ? 1 : playerCount
    const humanPlayers: Player[] = tempAvatars.slice(0, humanPlayerCount).map((avatar, i) => {
      const genderAssets = avatar.gender === 'Female' ? avatarAssets?.female : avatarAssets?.male
      const hairOptions = Object.keys(genderAssets?.hair || {})
      const clothesOptions = Object.keys(genderAssets?.clothes || {})

      // Ensure we have valid hair and clothes for the selected gender
      let finalHair = avatar.hair
      let finalClothes = avatar.clothes

      // If hair is not valid for current gender, use first available option
      if (!finalHair || !hairOptions.includes(finalHair)) {
        finalHair = hairOptions[0] || (avatar.gender === 'Female' ? 'BRAID' : 'HAIR1')
      }

      // If clothes is not valid for current gender, use first available option
      if (!finalClothes || !clothesOptions.includes(finalClothes)) {
        finalClothes = clothesOptions[0] || 'BASIC'
      }

      return {
        id: i,
        name: (tempNames[i] || `Pemain ${i + 1}`).trim() || `Pemain ${i + 1}`,
        avatar: {
          ...avatar,
          hair: finalHair,
          clothes: finalClothes,
          accessory: avatar.accessory,
          color: TOKEN_COLORS[i % TOKEN_COLORS.length] || '#6b7280',
        },
        pos: 0,
        isBot: false,
      }
    })

    // Add bot players in solo mode
    let allPlayers: Player[] = [...humanPlayers]
    if (gameMode === 'solo' && bots.length > 0) {
      // Different avatar configurations for bots
      const botAvatarConfigs: Array<{
        gender: Gender
        skinTone: SkinTone
        hair: string
        clothes: string
      }> = [
        { gender: 'Male', skinTone: 'MEDIUM', hair: 'HAIR1', clothes: 'BASIC' },
        { gender: 'Female', skinTone: 'DARK', hair: 'PONYTAIL', clothes: 'DRESS' },
        { gender: 'Male', skinTone: 'LIGHT', hair: 'HAIR2', clothes: 'CASUAL' },
      ]

      const botPlayers: Player[] = bots.map((bot, i) => {
        const avatarConfig = botAvatarConfigs[i % botAvatarConfigs.length]
        return {
          id: humanPlayerCount + i,
          name: bot.name,
          avatar: {
            gender: avatarConfig.gender,
            skinTone: avatarConfig.skinTone,
            hair: avatarConfig.hair,
            clothes: avatarConfig.clothes,
            color: TOKEN_COLORS[(humanPlayerCount + i) % TOKEN_COLORS.length] || '#6b7280',
          },
          pos: 0,
          isBot: true,
        }
      })
      allPlayers = [...humanPlayers, ...botPlayers]
    }

    setPlayers(allPlayers)
    setTurnIdx(0)
    setInfo(`Game dimulai! Giliran ${allPlayers[0].name}`)
    setPhase('play')
  }

  const resetGame = () => {
    setPlayers([])
    setPhase('select_mode')
    setInfo('Pilih jumlah pemain (2-5)')
    setTurnIdx(0)
    setGameMode('multiplayer')
    setBots([])
    setBotReaction(null)
    setConsecutiveSnakeHits({})
  }

  // Handle game mode selection from GameModeSelector
  const handleModeSelected = (selection: GameModeSelection) => {
    setGameMode(selection.mode)
    setDifficulty(selection.difficulty)
    setBots(selection.bots)
    setPlayerCount(selection.playerCount)

    if (selection.mode === 'solo') {
      // Solo mode: 1 human player + bots
      setPhase('setup')
    } else {
      // Multiplayer mode: go to player count selection
      setPhase('choose')
    }
  }

  const updateTempAvatar = (updates: Partial<AvatarSpec>) => {
    setTempAvatars((prev) => {
      const next = [...prev]
      next[currentPlayerSetup] = {
        ...next[currentPlayerSetup],
        ...updates,
      }
      return next
    })
  }

  const updateTempName = (name: string) => {
    setTempNames((prev) => {
      const next = [...prev]
      next[currentPlayerSetup] = name
      return next
    })
  }

  const gotoPlayer = (dir: -1 | 1) => {
    setCurrentPlayerSetup((prev) => {
      const next = prev + dir
      if (next < 0) return playerCount - 1
      if (next >= playerCount) return 0
      return next
    })
  }

  const roll = () => {
    if (phase !== 'play' || isAnimating || players.length === 0) return

    const current = players[turnIdx]
    if (!current) return // Safety check

    const currentId = current.id // Store the ID to ensure we always update the correct player
    const isCurrentBot = current.isBot

    // Use bot dice logic for bot players, regular dice for human players
    let diceResult
    if (isCurrentBot && gameMode === 'solo') {
      const bot = bots.find((b) => b.name === current.name)
      if (bot) {
        const gameContext = {
          humanPosition: players.find((p) => !p.isBot)?.pos || 0,
          botPositions: players.filter((p) => p.isBot).map((p) => p.pos),
          consecutiveSnakeHits,
          snakes: snakes.current,
          ladders: ladders.current,
          totalSquares: TOTAL_SQUARES,
        }
        const botAction = executeBotTurn(bot, current.pos, gameContext)
        diceResult = { value: botAction.diceValue }
        setInfo(getBotMessage(bot.name, bot.personality, 'rolling'))
      } else {
        diceResult = rollDice()
      }
    } else {
      diceResult = rollDice()
    }

    const d = diceResult.value
    setDice(d)

    const target = current.pos + d

    if (target > PLAYABLE_SQUARES) {
      setInfo(`${current.name} rolled ${d} → but needs exact to finish. Giliran lanjut.`)
      if (d !== 6) {
        const nextIdx = (turnIdx + 1) % players.length
        setTurnIdx(nextIdx)
      }
      return
    }

    setIsAnimating(true)
    setInfo(`${current.name} rolled ${d} → moving...`)

    let step = current.pos
    const hop = () => {
      if (step >= target) {
        let final = step
        let hitSnake = false
        let hitLadder = false

        if (ladders.current[final]) {
          const to = ladders.current[final]
          setInfo((s) => `${s} | TANGGA ${final} → ${to}`)
          final = to
          hitLadder = true

          // Bot reaction to player ladder
          if (!isCurrentBot && gameMode === 'solo') {
            showBotReaction('player_ladder')
          }
        }
        if (snakes.current[final]) {
          const to = snakes.current[final]
          setInfo((s) => `${s} | ULAR ${final} → ${to}`)
          final = to
          hitSnake = true

          // Bot reaction to player snake
          if (!isCurrentBot && gameMode === 'solo') {
            showBotReaction('player_snake')
          }
        }

        setPlayers((ps) => ps.map((pl) => (pl.id === currentId ? { ...pl, pos: final } : pl)))
        setIsAnimating(false)

        if (hitSnake || hitLadder) triggerBounce(currentId)

        if (final === PLAYABLE_SQUARES) {
          setInfo(`${current.name} MENANG! 🎉`)
          triggerBounce(currentId)

          // Bot reaction to win/lose
          if (gameMode === 'solo') {
            showBotReaction(isCurrentBot ? 'bot_win' : 'player_win')
          }
          return
        }

        // Determine next turn (roll again if got 6)
        const canRollAgain = d === 6
        const nextIdx = getNextPlayerIndex(turnIdx, players.length, canRollAgain)
        setTurnIdx(nextIdx)
        return
      }

      step += 1
      setPlayers((ps) => ps.map((pl) => (pl.id === currentId ? { ...pl, pos: step } : pl)))
      moveTimer.current = setTimeout(hop, 140)
    }

    hop()
  }

  // Helper function to trigger bot turn
  const triggerBotTurnIfNeeded = (playerIdx: number) => {
    // Clear any existing bot turn timer
    if (botTurnTimer.current) {
      clearTimeout(botTurnTimer.current)
      botTurnTimer.current = null
    }

    if (gameMode === 'solo') {
      const nextPlayer = players[playerIdx]
      if (nextPlayer?.isBot) {
        const bot = bots.find((b) => b.name === nextPlayer.name)
        if (bot) {
          const delays = calculateBotActionDelays(bot.personality)
          setInfo(getBotMessage(bot.name, bot.personality, 'thinking'))
          botTurnTimer.current = setTimeout(() => {
            botTurnTimer.current = null
            roll()
          }, delays.beforeRoll)
        }
      }
    }
  }

  // Helper function to show bot reaction
  const showBotReaction = (
    event: 'player_snake' | 'player_ladder' | 'bot_snake' | 'bot_ladder' | 'bot_win' | 'player_win',
  ) => {
    if (bots.length > 0) {
      const bot = bots[0]
      const { reaction, emoticon } = determineBotReaction(bot.personality, event)
      if (reaction !== 'none') {
        setBotReaction({
          message: getBotMessage(
            bot.name,
            bot.personality,
            event === 'player_snake' ? 'snake' : 'landed',
          ),
          emoticon,
        })
        setTimeout(() => setBotReaction(null), 2500)
      }
    }
  }

  // Use engine's grid functions with local board config
  const getSquareXY = useCallback((n: number) => squareToXY(n, COLS, TOTAL_SQUARES), [])

  const getTokenPosition = useCallback(
    (n: number, id: number) => calculateTokenPosition(n, id, cell, COLS, TOTAL_SQUARES),
    [cell],
  )

  const calculateSnakePath = useCallback(
    (fromSquare: number, toSquare: number, cellSize: number) => {
      const from = getSquareXY(fromSquare)
      const to = getSquareXY(toSquare)

      // HEAD position (where player gets eaten)
      const headX = from.x * cellSize + cellSize / 2
      const headY = from.y * cellSize + cellSize / 2

      // TAIL position (where player lands)
      const tailX = to.x * cellSize + cellSize / 2
      const tailY = to.y * cellSize + cellSize / 2

      // Calculate angle for rotation
      const dx = tailX - headX
      const dy = tailY - headY
      const angle = Math.atan2(dy, dx) * (180 / Math.PI)

      // Calculate midpoint for curve
      const midX = (headX + tailX) / 2
      const midY = (headY + tailY) / 2

      return { headX, headY, tailX, tailY, midX, midY, angle, from, to }
    },
    [getSquareXY],
  )

  const triggerBounce = (id: number) => {
    const s = animScale.current[id]
    if (!s) return
    Animated.sequence([
      Animated.timing(s, { toValue: 1.35, duration: 160, useNativeDriver: true }),
      Animated.timing(s, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start()
  }

  useEffect(() => {
    players.forEach((p) => {
      if (!animPos.current[p.id]) {
        const { left, top } = getTokenPosition(p.pos, p.id)
        animPos.current[p.id] = new Animated.ValueXY({ x: left, y: top })
      }
      if (!animScale.current[p.id]) animScale.current[p.id] = new Animated.Value(1)
    })
  }, [players, getTokenPosition])

  useEffect(() => {
    players.forEach((p) => {
      const a = animPos.current[p.id]
      if (!a) return
      const { left, top } = getTokenPosition(p.pos, p.id)
      Animated.timing(a, {
        toValue: { x: left, y: top },
        duration: 240,
        useNativeDriver: true,
      }).start()
    })
  }, [players, cell, getTokenPosition])

  // Trigger bot turn when turnIdx changes and it's a bot's turn
  useEffect(() => {
    if (phase === 'play' && !isAnimating && players.length > 0) {
      triggerBotTurnIfNeeded(turnIdx)
    }
  }, [turnIdx, phase, isAnimating, players.length])

  const renderTabContent = () => {
    const currentAvatar = tempAvatars[currentPlayerSetup] || {
      gender: 'Female',
      skinTone: 'LIGHT',
      hair: 'BRAID',
      clothes: 'BASIC',
      accessory: undefined,
    }
    const genderAssets =
      currentAvatar.gender === 'Female' ? avatarAssets?.female : avatarAssets?.male

    if (setupTab === 'skin') {
      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.skinScroll}>
          <View style={styles.skinColorsGrid}>
            {SKIN_TONES.map((skinTone, index) => (
              <Pressable
                key={index}
                onPress={() => updateTempAvatar({ skinTone })}
                style={[
                  styles.skinColorOption,
                  currentAvatar.skinTone === skinTone && styles.selectedSkinColor,
                ]}
              >
                <Text style={styles.skinToneLabel}>{skinTone}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )
    }

    if (setupTab === 'hair') {
      const hairOptions = Object.entries(genderAssets?.hair || {})

      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
          <View style={styles.optionsGrid}>
            {hairOptions.map(([key, imageSource]) => (
              <Pressable
                key={key}
                onPress={() => updateTempAvatar({ hair: key })}
                style={[styles.optionItem, currentAvatar.hair === key && styles.selectedOption]}
              >
                <Image source={imageSource} style={styles.optionImage} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )
    }

    if (setupTab === 'clothes') {
      const clothesOptions = Object.entries(genderAssets?.clothes || {})

      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
          <View style={styles.optionsGrid}>
            {clothesOptions.map(([key, imageSource]) => (
              <Pressable
                key={key}
                onPress={() => updateTempAvatar({ clothes: key })}
                style={[styles.optionItem, currentAvatar.clothes === key && styles.selectedOption]}
              >
                <Image source={imageSource} style={styles.optionImage} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )
    }

    const accessoryOptions = Object.entries(genderAssets?.accessories || {})

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
        <View style={styles.optionsGrid}>
          <Pressable
            onPress={() => updateTempAvatar({ accessory: undefined })}
            style={[styles.optionItem, !currentAvatar.accessory && styles.selectedOption]}
          >
            <View style={styles.skipContainer}>
              <Text style={styles.skipText}>Lewati</Text>
            </View>
          </Pressable>
          {accessoryOptions.map(([key, imageSource]) => (
            <Pressable
              key={key}
              onPress={() => updateTempAvatar({ accessory: key })}
              style={[styles.optionItem, currentAvatar.accessory === key && styles.selectedOption]}
            >
              <Image source={imageSource} style={styles.optionImage} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    )
  }

  const canStart = tempNames.every((n) => n && n.trim())

  // Render game mode selector first
  if (phase === 'select_mode') {
    return <GameModeSelector onModeSelected={handleModeSelected} />
  }

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: 24 + insets.top,
          paddingBottom: 16 + insets.bottom,
          backgroundColor: themeColors[theme].bg,
        },
      ]}
    >
      <ImageBackground
        source={assets.ular_tangga?.background}
        style={styles.inner}
        imageStyle={{ resizeMode: 'cover', opacity: 0.08 }}
      >
        <Image source={assets.ular_tangga?.logo} style={styles.logoImage} resizeMode="contain" />

        {phase === 'choose' && (
          <View style={[styles.phaseContainer, { backgroundColor: themeColors[theme].cardBg }]}>
            <Text style={[styles.phaseTitle, { color: themeColors[theme].text }]}>
              Mau main sama berapa orang?
            </Text>
            <Text style={[styles.phaseSubtitle, { color: themeColors[theme].text }]}>
              2-5 pemain
            </Text>
            <View style={styles.playerCountGrid}>
              {[2, 3, 4, 5].map((n) => (
                <Pressable
                  key={`player-count-${n}`}
                  onPress={() => setPlayerCount(n)}
                  style={[
                    styles.playerCountButton,
                    playerCount === n && styles.playerCountButtonActive,
                  ]}
                >
                  <Text style={styles.playerCountText}>{n} Pemain</Text>
                </Pressable>
              ))}
            </View>

            <Pressable onPress={() => setPhase('setup')} style={styles.nextButton}>
              <Text style={styles.nextButtonText}>Mulai Custom Pemain</Text>
            </Pressable>
          </View>
        )}

        {phase === 'setup' && (
          <ScrollView
            style={styles.setupScrollView}
            contentContainerStyle={styles.setupScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.setupCard, { backgroundColor: themeColors[theme].cardBg }]}>
              <View style={styles.topRow}>
                <View style={styles.nameBlock}>
                  <Text style={[styles.playerLabel, { color: themeColors[theme].text }]}>
                    Pemain {currentPlayerSetup + 1}
                  </Text>
                  <TextInput
                    value={tempNames[currentPlayerSetup] || ''}
                    onChangeText={updateTempName}
                    placeholder={`Pemain ${currentPlayerSetup + 1}`}
                    placeholderTextColor="#94a3b8"
                    style={styles.nameInputField}
                    maxLength={14}
                  />
                </View>
              </View>

              <View style={styles.genderRow}>
                <Text style={[styles.sectionLabel, { color: themeColors[theme].text }]}>
                  Gender
                </Text>
                <View style={styles.genderSwitch}>
                  <Pressable
                    onPress={() =>
                      updateTempAvatar({
                        gender: 'Male',
                        hair: 'HAIR1',
                        clothes: 'BASIC',
                        accessory: undefined,
                      })
                    }
                    style={[
                      styles.genderChip,
                      (tempAvatars[currentPlayerSetup]?.gender || 'Female') === 'Male' &&
                        styles.genderChipActive,
                    ]}
                  >
                    <Text style={styles.genderChipText}>Laki-laki</Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      updateTempAvatar({
                        gender: 'Female',
                        hair: 'BRAID',
                        clothes: 'BASIC',
                        accessory: undefined,
                      })
                    }
                    style={[
                      styles.genderChip,
                      (tempAvatars[currentPlayerSetup]?.gender || 'Female') === 'Female' &&
                        styles.genderChipActive,
                    ]}
                  >
                    <Text style={styles.genderChipText}>Perempuan</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.avatarStrip}>
                <View style={styles.avatarCenterRow}>
                  <Pressable style={styles.arrowCircle} onPress={() => gotoPlayer(-1)}>
                    <Text style={styles.arrowText}>‹</Text>
                  </Pressable>

                  <View
                    style={[
                      styles.avatarPreviewLarge,
                      { borderColor: TOKEN_COLORS[currentPlayerSetup % TOKEN_COLORS.length] },
                    ]}
                  >
                    <View style={styles.skinPreview}>
                      {(() => {
                        const currentAvatar = tempAvatars[currentPlayerSetup]
                        if (!currentAvatar) return null

                        const avatarPath = buildAvatarPath(currentAvatar)
                        if (!avatarPath)
                          return <Text style={{ color: '#94a3b8' }}>Pilih lengkap</Text>

                        // Build absolute path for avatar SVG
                        const avatarSource = assets.ular_tangga?.background // Use this to get base path
                        const resolvedPath = avatarSource
                          ? Image.resolveAssetSource(avatarSource).uri.replace(
                              'background.png',
                              avatarPath,
                            )
                          : null

                        return resolvedPath ? (
                          <SvgUri uri={resolvedPath} width={160} height={180} />
                        ) : null
                      })()}
                    </View>
                  </View>

                  <Pressable style={styles.arrowCircle} onPress={() => gotoPlayer(1)}>
                    <Text style={styles.arrowText}>›</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.tabCard}>
                <View style={styles.tabRow}>
                  {(['skin', 'hair', 'clothes', 'accessory'] as SetupTab[]).map((tab) => (
                    <Pressable
                      key={tab}
                      onPress={() => setSetupTab(tab)}
                      style={[styles.tabButton, setupTab === tab && styles.tabButtonActive]}
                    >
                      <Text style={[styles.tabText, setupTab === tab && styles.tabTextActive]}>
                        {tab === 'skin'
                          ? 'Skin'
                          : tab === 'hair'
                          ? 'Rambut'
                          : tab === 'clothes'
                          ? 'Pakaian'
                          : 'Aksesoris'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.tabContent}>{renderTabContent()}</View>
              </View>
            </View>

            <Pressable
              onPress={startGame}
              style={[styles.startFloating, !canStart && styles.startFloatingDisabled]}
              disabled={!canStart}
            >
              <Text style={styles.startFloatingText}>Mulai Main</Text>
            </Pressable>
          </ScrollView>
        )}

        {phase === 'play' && players.length > 0 && (
          <ScrollView
            style={styles.setupScrollView}
            contentContainerStyle={styles.setupScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Logo above the board */}
            <Image
              source={assets.ular_tangga?.logo}
              style={[styles.logoImage, { marginBottom: 16 }]}
              resizeMode="contain"
            />

            <View style={[styles.boardWrap, { width: boardSize, height: boardHeight }]}>
              <ImageBackground
                source={assets.ular_tangga?.background}
                style={{ width: boardSize, height: boardHeight }}
                imageStyle={{ resizeMode: 'cover', opacity: 0.95 }}
              >
                <View style={{ width: boardSize, height: boardHeight }}>
                  {Array.from({ length: TOTAL_SQUARES }).map((_, i) => {
                    const n = i + 1
                    const { x, y } = getSquareXY(n)

                    // Display actual square numbers (1 to TOTAL_SQUARES)
                    const displayNumber = n === 1 ? null : n === TOTAL_SQUARES ? null : n
                    const isStartSquare = n === 1
                    const isFinishSquare = n === TOTAL_SQUARES

                    return (
                      <View
                        key={`sq-${n}`}
                        style={{
                          position: 'absolute',
                          left: x * cell,
                          top: y * cell,
                          width: cell,
                          height: cell,
                          borderWidth: 0.5,
                          borderColor: themeColors[theme].text,
                          backgroundColor: isStartSquare
                            ? themeColors[theme].start
                            : isFinishSquare
                            ? themeColors[theme].finish
                            : (x + y) % 2 === 0
                            ? themeColors[theme].square1
                            : themeColors[theme].square2,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isStartSquare ? (
                          <Text
                            style={{
                              fontSize: Math.max(10, cell * 0.18),
                              fontWeight: '700',
                              color: '#FFFFFF',
                              textAlign: 'center',
                            }}
                          >
                            MULAI
                          </Text>
                        ) : isFinishSquare ? (
                          <Text
                            style={{
                              fontSize: Math.max(10, cell * 0.18),
                              fontWeight: '700',
                              color: '#FFFFFF',
                              textAlign: 'center',
                            }}
                          >
                            SELESAI
                          </Text>
                        ) : (
                          <Text
                            style={{
                              fontSize: Math.max(8, cell * 0.15),
                              color: themeColors[theme].text,
                              fontWeight: '600',
                            }}
                          >
                            {displayNumber}
                          </Text>
                        )}
                      </View>
                    )
                  })}

                  {Object.entries(ladders.current).map(([from, to]) => {
                    const f = Number(from)
                    const t = Number(to)
                    const p1 = getSquareXY(f)
                    return (
                      <View
                        key={`lad-${from}`}
                        style={{
                          position: 'absolute',
                          left: (p1.x + 0.15) * cell,
                          top: (p1.y + 0.15) * cell,
                        }}
                      >
                        <Text style={{ color: themeColors[theme].ladder, fontWeight: '700' }}>
                          🔼
                        </Text>
                        <Text style={{ fontSize: 9, color: themeColors[theme].ladder }}>
                          {f}→{t}
                        </Text>
                      </View>
                    )
                  })}

                  {Object.entries(snakes.current).map(([from, to]) => {
                    const fromNum = Number(from)
                    const toNum = Number(to)
                    const path = calculateSnakePath(fromNum, toNum, cell)

                    // Use specific snake asset if defined in map, otherwise default to 0
                    const snakeImageIndex = SNAKE_ASSET_MAP[fromNum] ?? 0
                    const snakeImage = assets.ular_tangga?.snakes?.[snakeImageIndex]

                    // Get rotation offset for this specific snake (or default to 180)
                    const rotationOffset = SNAKE_ROTATION_OFFSETS[snakeImageIndex] ?? 180

                    const distance = Math.sqrt(
                      Math.pow(path.tailX - path.headX, 2) + Math.pow(path.tailY - path.headY, 2),
                    )

                    // Add specific offset to path angle
                    const snakeRotation = path.angle + rotationOffset

                    const snakeHeight = distance
                    const snakeWidth = snakeHeight * 0.8

                    return (
                      <View key={`sna-${from}`} style={{ position: 'absolute' }}>
                        <View
                          style={{
                            position: 'absolute',
                            // Added offset to the right (20% of a cell width)
                            left: path.headX + cell * 0.5,
                            top: path.headY,
                            width: snakeWidth,
                            height: snakeHeight,
                            transform: [
                              { translateX: -snakeWidth / 2 },
                              { translateY: 0 },
                              { rotate: `${snakeRotation}deg` },
                            ],
                            transformOrigin: '50% 0%',
                            zIndex: 5,
                          }}
                        >
                          {snakeImage ? (
                            <SvgUri
                              uri={Image.resolveAssetSource(snakeImage).uri}
                              width={snakeWidth}
                              height={snakeHeight}
                              preserveAspectRatio="xMidYMin meet"
                            />
                          ) : (
                            <View
                              style={{
                                width: '100%',
                                height: '100%',
                                backgroundColor: themeColors[theme].snake,
                                borderRadius: snakeWidth * 0.3,
                                opacity: 0.8,
                              }}
                            />
                          )}
                        </View>

                        <View
                          style={{
                            position: 'absolute',
                            left: path.headX - cell * 0.2,
                            top: path.headY - cell * 0.35,
                            backgroundColor: 'rgba(255,255,255,0.95)',
                            paddingHorizontal: 5,
                            paddingVertical: 2,
                            borderRadius: 6,
                            borderWidth: 1.5,
                            borderColor: themeColors[theme].snake,
                            zIndex: 10,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: Math.max(8, cell * 0.13),
                              color: themeColors[theme].snake,
                              fontWeight: '800',
                              textAlign: 'center',
                            }}
                          >
                            🐍 {fromNum}→{toNum}
                          </Text>
                        </View>
                      </View>
                    )
                  })}

                  {players.map((pl) => {
                    const a = animPos.current[pl.id]
                    const s = animScale.current[pl.id] ?? new Animated.Value(1)
                    const transform = a
                      ? a.getTranslateTransform()
                      : [{ translateX: 0 }, { translateY: 0 }]

                    // Get avatar IDLE.svg path using buildAvatarPath
                    const avatarPath = buildAvatarPath(pl.avatar)
                    const avatarSource = assets.ular_tangga?.background
                    const resolvedUri =
                      avatarPath && avatarSource
                        ? Image.resolveAssetSource(avatarSource).uri.replace(
                            'background.png',
                            avatarPath,
                          )
                        : null

                    return (
                      <Animated.View
                        key={`pl-${pl.id}`}
                        style={{
                          position: 'absolute',
                          width: cell * 0.36,
                          height: cell * 0.36,
                          transform: [...transform, { scale: s }],
                        }}
                      >
                        <View style={styles.tokenContainer}>
                          <View
                            style={[
                              styles.tokenOuter,
                              { backgroundColor: pl.avatar.color || '#6b7280' },
                            ]}
                          >
                            <View style={styles.tokenInner}>
                              {resolvedUri ? (
                                <SvgUri uri={resolvedUri} width="100%" height="100%" />
                              ) : (
                                <View
                                  style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 10,
                                    backgroundColor: '#fff',
                                  }}
                                />
                              )}
                            </View>
                          </View>
                        </View>
                      </Animated.View>
                    )
                  })}
                </View>
              </ImageBackground>
            </View>

            <View style={styles.gameControls}>
              <View style={styles.gameInfo}>
                <Text style={[styles.turnInfo, { color: themeColors[theme].text }]}>
                  Giliran: {players[turnIdx]?.name} {players[turnIdx]?.isBot ? '🤖' : ''}
                </Text>
                <Text style={[styles.gameStatus, { color: themeColors[theme].text }]}>{info}</Text>

                {/* Bot reaction display */}
                {botReaction && (
                  <View style={styles.botReactionContainer}>
                    <Text style={styles.botReactionText}>
                      {botReaction.emoticon} {botReaction.message}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.diceSection}>
                <Text style={[styles.diceLabel, { color: themeColors[theme].text }]}>
                  Dadu: {dice}
                </Text>
                <Pressable
                  onPress={roll}
                  disabled={isAnimating || players[turnIdx]?.isBot}
                  style={[
                    styles.rollButton,
                    (isAnimating || players[turnIdx]?.isBot) && styles.rollButtonDisabled,
                  ]}
                >
                  <Text style={styles.rollButtonText}>
                    {isAnimating
                      ? 'BERGERAK...'
                      : players[turnIdx]?.isBot
                      ? 'GILIRAN BOT...'
                      : 'LEMPAR DADU'}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.bottomControls}>
                <Pressable onPress={resetGame} style={styles.resetButton}>
                  <Text style={styles.resetButtonText}>GAME BARU</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        )}

        {/* Background Footer Image */}
        {assets.ular_tangga?.background_footer && (
          <Image
            source={assets.ular_tangga.background_footer}
            style={styles.backgroundFooter}
            resizeMode="cover"
          />
        )}
      </ImageBackground>
    </View>
  )
}

export default UlarTangga

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  logoImage: {
    width: 200,
    height: 60,
    marginBottom: 12,
  },
  backgroundFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: 150,
    zIndex: -1,
  },
  phaseContainer: {
    width: '100%',
    maxWidth: 440,
    padding: 22,
    borderRadius: 18,
    marginTop: 12,
    shadowColor: '#8ea8c2',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
    elevation: 6,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2ecf5',
  },
  phaseTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  phaseSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 8,
  },
  playerCountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  playerCountButton: {
    width: '48%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#d8e5f0',
    shadowColor: '#b8cde1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  playerCountButtonActive: {
    borderColor: '#9abf44',
    shadowColor: '#9abf44',
    shadowOpacity: 0.35,
    transform: [{ scale: 1.01 }],
  },
  playerCountText: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '700',
  },
  nextButton: {
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: '#9abf44',
    shadowColor: '#9abf44',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  setupCard: {
    width: '100%',
    maxWidth: 480,
    padding: 18,
    borderRadius: 18,
    marginTop: 12,
    shadowColor: '#b8cde1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e2ecf5',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  arrowButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f7fb',
    borderWidth: 1,
    borderColor: '#d8e5f0',
  },
  arrowText: {
    color: '#6b7280',
    fontSize: 20,
    fontWeight: '800',
  },
  nameBlock: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#b8cde1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#e2ecf5',
  },
  playerLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
    color: '#6b7280',
  },
  nameInputField: {
    backgroundColor: '#f8fbff',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: '#1f2937',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#d8e5f0',
    textAlign: 'center',
  },
  genderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  genderSwitch: {
    flexDirection: 'row',
    gap: 8,
  },
  genderChip: {
    backgroundColor: '#f8fbff',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#d8e5f0',
  },
  genderChipActive: {
    backgroundColor: 'rgba(154, 191, 68, 0.18)',
    borderColor: '#9abf44',
  },
  genderChipDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    opacity: 0.5,
  },
  genderChipText: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '700',
  },
  genderChipTextDisabled: {
    color: '#94a3b8',
  },
  avatarStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  avatarCenterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  arrowCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f7fb',
    borderWidth: 1,
    borderColor: '#d8e5f0',
    shadowColor: '#b8cde1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  avatarPreviewLarge: {
    width: 220,
    height: 260,
    borderRadius: 30,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fbff',
  },
  skinPreview: {
    width: 190,
    height: 220,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: '#e2ecf5',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  layerFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  layerClothes: {
    position: 'absolute',
    width: 140,
    height: 100,
    top: 70,
    left: '50%',
    marginLeft: -70,
    resizeMode: 'contain',
  },
  layerHair: {
    position: 'absolute',
    width: 150,
    height: 60,
    top: 20,
    left: '50%',
    marginLeft: -75,
    resizeMode: 'contain',
  },
  layerAccessory: {
    position: 'absolute',
    width: 130,
    height: 80,
    top: 40,
    left: '50%',
    marginLeft: -65,
    resizeMode: 'contain',
  },
  previewHair: {
    position: 'absolute',
    width: 150,
    height: 80,
    top: 12,
    resizeMode: 'contain',
  },
  previewClothes: {
    width: 150,
    height: 130,
    resizeMode: 'contain',
  },
  previewAccessory: {
    position: 'absolute',
    width: 60,
    height: 60,
    right: 18,
    top: 18,
    resizeMode: 'contain',
  },
  tokenInfo: {
    flex: 1,
    marginLeft: 16,
    gap: 6,
  },
  tokenInfoText: {
    fontSize: 14,
    fontWeight: '700',
  },
  tokenInfoHint: {
    fontSize: 12,
    color: '#6b7280',
  },
  tokenSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#d8e5f0',
  },
  tabCard: {
    marginTop: 12,
    backgroundColor: '#f8fbff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#d8e5f0',
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d8e5f0',
  },
  tabButtonActive: {
    backgroundColor: '#f5faef',
    borderColor: '#9abf44',
  },
  tabText: {
    color: '#475569',
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#1f2937',
  },
  tabContent: {
    minHeight: 140,
  },
  skinScroll: {
    marginVertical: 6,
  },
  skinColorsGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 6,
  },
  skinColorOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: 'transparent',
    shadowColor: '#b8cde1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    backgroundColor: '#f8fbff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skinToneLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1f2937',
  },
  selectedSkinColor: {
    borderColor: '#9abf44',
    transform: [{ scale: 1.06 }],
    backgroundColor: 'rgba(154, 191, 68, 0.18)',
  },
  optionsScroll: {
    marginVertical: 6,
    maxHeight: 130,
  },
  optionsGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 6,
  },
  optionItem: {
    width: 88,
    height: 88,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: 'transparent',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#b8cde1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  selectedOption: {
    borderColor: '#9abf44',
    backgroundColor: 'rgba(154, 191, 68, 0.12)',
    transform: [{ scale: 1.05 }],
  },
  optionImage: {
    width: 74,
    height: 74,
    resizeMode: 'contain',
  },
  skipContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  startFloating: {
    marginTop: 16,
    width: '100%',
    maxWidth: 460,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#9abf44',
    alignItems: 'center',
    shadowColor: '#9abf44',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
  },
  startFloatingDisabled: {
    backgroundColor: '#cbd5e1',
  },
  startFloatingText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  boardWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e2ecf5',
    marginTop: 10,
    shadowColor: '#b8cde1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  tokenContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  tokenOuter: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  tokenInner: {
    width: '70%',
    height: '70%',
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#000',
    position: 'relative',
  },
  tokenClothes: {
    width: '80%',
    height: '60%',
    resizeMode: 'contain',
  },
  tokenHair: {
    position: 'absolute',
    width: '80%',
    height: '40%',
    top: '5%',
    resizeMode: 'contain',
  },
  tokenAccessory: {
    position: 'absolute',
    width: '30%',
    height: '30%',
    right: '5%',
    top: '5%',
    resizeMode: 'contain',
  },
  gameControls: {
    width: '100%',
    maxWidth: 400,
    marginTop: 20,
    gap: 16,
  },
  gameInfo: {
    gap: 8,
    backgroundColor: '#f8fbff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2ecf5',
  },
  turnInfo: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  gameStatus: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.9,
  },
  botReactionContainer: {
    marginTop: 8,
    padding: 10,
    backgroundColor: 'rgba(154, 191, 68, 0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#9abf44',
  },
  botReactionText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: '#3D405B',
  },
  diceSection: {
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fbff',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2ecf5',
  },
  diceLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  rollButton: {
    backgroundColor: '#9abf44',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#9abf44',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  rollButtonDisabled: {
    opacity: 0.6,
  },
  rollButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  bottomControls: {
    gap: 16,
  },
  resetButton: {
    backgroundColor: '#cbd5e1',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#b8cde1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  resetButtonText: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '700',
  },
  setupScrollView: {
    flex: 1,
    width: '100%',
  },
  setupScrollContent: {
    alignItems: 'center',
    paddingBottom: 20,
  },
})
