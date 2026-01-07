import React, { useMemo, useState, useRef, useEffect } from 'react'
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

type Gender = 'boy' | 'girl'

type AvatarSpec = {
  gender: Gender
  skinColor: string
  hair?: ImageSourcePropType
  clothes?: ImageSourcePropType
  accessory?: ImageSourcePropType
  color?: string
}

type Player = {
  id: number
  name: string
  avatar: AvatarSpec
  pos: number
}

type SetupTab = 'skin' | 'hair' | 'clothes' | 'accessory'

type Phase = 'choose' | 'setup' | 'play'

const TOTAL_SQUARES = 42
const COLS = 6

const DEFAULT_SNAKES: Record<number, number> = {
  17: 5,
  21: 9,
  25: 13,
  33: 24,
  36: 30,
  39: 32,
  41: 31,
}

const DEFAULT_LADDERS: Record<number, number> = {
  2: 12,
  4: 14,
  7: 18,
  11: 23,
  15: 26,
  19: 29,
  22: 34,
  28: 38,
}

const SKIN_TONES = [
  '#F7C6A3', '#F4AA87', '#F29A7C', '#D67852'
]

const TOKEN_COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#22c55e', '#8b5cf6']

const UlarTangga: ScreenComponent<'Ludo' | 'game'> = () => {
  const { width: w, height: h } = Dimensions.get('window')
  const insets = useSafeAreaInsets()
  const boardSize = Math.max(260, Math.min(520, Math.min(w, h) - 120))
  const cell = boardSize / COLS

  const [phase, setPhase] = useState<Phase>('choose')
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

  const snakes = useRef(DEFAULT_SNAKES)
  const ladders = useRef(DEFAULT_LADDERS)
  const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animPos = useRef<Record<number, Animated.ValueXY>>({})
  const animScale = useRef<Record<number, Animated.Value>>({})

  const avatarAssets = assets.ular_tangga

  const themeColors = useMemo(() => ({
    light: {
      bg: '#dff3ff',
      square1: '#ffffff',
      square2: '#f1f5f9',
      text: '#1f2937',
      snake: '#b91c1c',
      ladder: '#0a8a5c',
      boardBg: '#e7f3ff',
      cardBg: '#ffffff',
      accent: '#9abf44',
      accentDark: '#7fa038',
      muted: '#6b7280',
      outline: '#d6e3ef',
    },
  }), [])

  const [theme] = useState<'light'>('light')

  useEffect(() => {
    return () => {
      if (moveTimer.current) clearTimeout(moveTimer.current)
    }
  }, [])

  useEffect(() => {
    if (phase === 'setup') {
      setTempAvatars(Array(playerCount).fill(null).map((_, i) => ({
        gender: 'girl',
        skinColor: SKIN_TONES[0],
        color: TOKEN_COLORS[i % TOKEN_COLORS.length],
      })))
      setTempNames(Array(playerCount).fill(null).map((_, i) => `Pemain ${i + 1}`))
      setCurrentPlayerSetup(0)
      setSetupTab('skin')
    }
  }, [phase, playerCount])

  const startGame = () => {
    if (phase !== 'setup') return

    const newPlayers = tempAvatars.map((avatar, i) => {
      const genderAssets = avatar.gender === 'boy' ? avatarAssets?.boy : avatarAssets?.girl
      return {
      id: i,
      name: (tempNames[i] || `Pemain ${i + 1}`).trim() || `Pemain ${i + 1}`,
      avatar: {
        ...avatar,
        hair: avatar.hair || genderAssets?.hair?.[0],
        clothes: avatar.clothes || genderAssets?.clothes?.[0],
        accessory: avatar.accessory,
        color: TOKEN_COLORS[i % TOKEN_COLORS.length] || '#6b7280',
      },
      pos: 0,
    }})

    setPlayers(newPlayers)
    setTurnIdx(0)
    setInfo(`Game dimulai! Giliran ${newPlayers[0].name}`)
    setPhase('play')
  }

  const resetGame = () => {
    setPlayers([])
    setPhase('choose')
    setInfo('Pilih jumlah pemain (2-5)')
    setTurnIdx(0)
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

    const d = Math.floor(Math.random() * 6) + 1
    setDice(d)

    const current = players[turnIdx]
    const target = current.pos + d

    if (target > TOTAL_SQUARES) {
      setInfo(`${current.name} rolled ${d} → but needs exact to finish. Giliran lanjut.`)
      if (d !== 6) setTurnIdx((s) => (s + 1) % players.length)
      return
    }

    setIsAnimating(true)
    setInfo(`${current.name} rolled ${d} → moving...`)

    let step = current.pos
    const hop = () => {
      if (step >= target) {
        let final = step
        let special = false

        if (ladders.current[final]) {
          const to = ladders.current[final]
          setInfo((s) => `${s} | TANGGA ${final} → ${to}`)
          final = to
          special = true
        }
        if (snakes.current[final]) {
          const to = snakes.current[final]
          setInfo((s) => `${s} | ULAR ${final} → ${to}`)
          final = to
          special = true
        }

        setPlayers((ps) => ps.map((pl) => (pl.id === current.id ? { ...pl, pos: final } : pl)))
        setIsAnimating(false)

        if (special) triggerBounce(current.id)

        if (final === TOTAL_SQUARES) {
          setInfo(`${current.name} MENANG! 🎉`)
          triggerBounce(current.id)
          return
        }

        if (d !== 6) setTurnIdx((s) => (s + 1) % players.length)
        return
      }

      step += 1
      setPlayers((ps) => ps.map((pl) => (pl.id === current.id ? { ...pl, pos: step } : pl)))
      moveTimer.current = setTimeout(hop, 140)
    }

    hop()
  }

  const squareToXY = (n: number) => {
    const rows = Math.ceil(TOTAL_SQUARES / COLS)
    if (n <= 0) return { x: 0, y: rows - 1 }

    const idx = n - 1
    const row = Math.floor(idx / COLS)
    let col = idx % COLS
    if (row % 2 === 1) col = COLS - 1 - col
    const y = rows - 1 - row
    const x = col
    return { x, y }
  }

  const squareToPixel = (n: number, id: number) => {
    const { x, y } = squareToXY(n)
    const cols = 3
    const col = id % cols
    const row = Math.floor(id / cols)
    const offsetX = col * (cell * 0.25)
    const offsetY = row * (cell * 0.25)
    const left = x * cell + cell * 0.1 + offsetX
    const top = y * cell + cell * 0.1 + offsetY
    return { left, top }
  }

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
        const { left, top } = squareToPixel(p.pos, p.id)
        animPos.current[p.id] = new Animated.ValueXY({ x: left, y: top })
      }
      if (!animScale.current[p.id]) animScale.current[p.id] = new Animated.Value(1)
    })
  }, [players])

  useEffect(() => {
    players.forEach((p) => {
      const a = animPos.current[p.id]
      if (!a) return
      const { left, top } = squareToPixel(p.pos, p.id)
      Animated.timing(a, { toValue: { x: left, y: top }, duration: 240, useNativeDriver: true }).start()
    })
  }, [players, cell])

  const renderTabContent = () => {
    const currentAvatar = tempAvatars[currentPlayerSetup] || { gender: 'girl', skinColor: SKIN_TONES[0] }
    const genderAssets = currentAvatar.gender === 'boy' ? avatarAssets?.boy : avatarAssets?.girl

    if (setupTab === 'skin') {
      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.skinScroll}>
          <View style={styles.skinColorsGrid}>
            {SKIN_TONES.map((color, index) => (
              <Pressable
                key={index}
                onPress={() => updateTempAvatar({ skinColor: color })}
                style={[
                  styles.skinColorOption,
                  { backgroundColor: color },
                  currentAvatar.skinColor === color && styles.selectedSkinColor
                ]}
              />
            ))}
          </View>
        </ScrollView>
      )
    }

    if (setupTab === 'hair') {
  const hairList = genderAssets?.hair as ImageSourcePropType[] | undefined

      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
          <View style={styles.optionsGrid}>
            {(hairList || []).map((hair: ImageSourcePropType, index: number) => (
              <Pressable
                key={index}
                onPress={() => updateTempAvatar({ hair })}
                style={[styles.optionItem, currentAvatar.hair === hair && styles.selectedOption]}
              >
                <Image source={hair} style={styles.optionImage} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )
    }

    if (setupTab === 'clothes') {
  const clothesList = genderAssets?.clothes as ImageSourcePropType[] | undefined

      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
          <View style={styles.optionsGrid}>
            {(clothesList || []).map((clothes: ImageSourcePropType, index: number) => (
              <Pressable
                key={index}
                onPress={() => updateTempAvatar({ clothes })}
                style={[styles.optionItem, currentAvatar.clothes === clothes && styles.selectedOption]}
              >
                <Image source={clothes} style={styles.optionImage} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )
    }

  const accessoryList = Object.values(genderAssets?.accessories || {}) as ImageSourcePropType[]

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
          {(accessoryList || []).map((accessory: ImageSourcePropType, index: number) => (
            <Pressable
              key={index}
              onPress={() => updateTempAvatar({ accessory })}
              style={[styles.optionItem, currentAvatar.accessory === accessory && styles.selectedOption]}
            >
              <Image source={accessory} style={styles.optionImage} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    )
  }

  const canStart = tempNames.every((n) => n && n.trim())

  return (
    <View style={[styles.screen, { paddingTop: 24 + insets.top, paddingBottom: 16 + insets.bottom, backgroundColor: themeColors[theme].bg }]}>
      <ImageBackground
        source={assets.ular_tangga?.background}
        style={styles.inner}
        imageStyle={{ resizeMode: 'cover', opacity: 0.08 }}
      >
      <Text style={[styles.title, { color: themeColors[theme].text }]}>ULAR TANGGA</Text>

      {phase === 'choose' && (
        <View style={[styles.phaseContainer, { backgroundColor: themeColors[theme].cardBg }]}> 
          <Text style={[styles.phaseTitle, { color: themeColors[theme].text }]}>Mau main sama berapa orang?</Text>
          <Text style={[styles.phaseSubtitle, { color: themeColors[theme].text }]}>2-5 pemain</Text>
          <View style={styles.playerCountGrid}>
            {[2, 3, 4, 5].map((n) => (
              <Pressable
                key={`player-count-${n}`}
                onPress={() => setPlayerCount(n)}
                style={[styles.playerCountButton, playerCount === n && styles.playerCountButtonActive]}
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
        <>
          <View style={[styles.setupCard, { backgroundColor: themeColors[theme].cardBg }]}> 
            <View style={styles.topRow}>
              <View style={styles.nameBlock}>
                <Text style={[styles.playerLabel, { color: themeColors[theme].text }]}>Pemain {currentPlayerSetup + 1}</Text>
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
              <Text style={[styles.sectionLabel, { color: themeColors[theme].text }]}>Gender</Text>
              <View style={styles.genderSwitch}>
                <Pressable
                  onPress={() => updateTempAvatar({ gender: 'boy', hair: undefined, clothes: undefined, accessory: undefined })}
                  style={[styles.genderChip, (tempAvatars[currentPlayerSetup]?.gender || 'girl') === 'boy' && styles.genderChipActive]}
                >
                  <Text style={styles.genderChipText}>Laki-laki</Text>
                </Pressable>
                <Pressable
                  onPress={() => updateTempAvatar({ gender: 'girl', hair: undefined, clothes: undefined, accessory: undefined })}
                  style={[styles.genderChip, (tempAvatars[currentPlayerSetup]?.gender || 'girl') === 'girl' && styles.genderChipActive]}
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

                <View style={[styles.avatarPreviewLarge, { borderColor: TOKEN_COLORS[currentPlayerSetup % TOKEN_COLORS.length] }]}>
                  <View style={styles.skinPreview}>
                    <View style={styles.layerFill}>
                      {(() => {
                        const genderAssets = (tempAvatars[currentPlayerSetup]?.gender === 'boy'
                          ? avatarAssets?.boy
                          : avatarAssets?.girl)
                        const baseUri = genderAssets?.base
                          ? Image.resolveAssetSource(genderAssets.base).uri
                          : undefined
                        const skinColor = tempAvatars[currentPlayerSetup]?.skinColor || SKIN_TONES[0]
                        return baseUri ? <SvgUri uri={baseUri} width={160} height={180} color={skinColor} /> : null
                      })()}
                    </View>
                    {tempAvatars[currentPlayerSetup]?.clothes && (
                      <Image source={tempAvatars[currentPlayerSetup]?.clothes} style={styles.layerClothes} />
                    )}
                    {tempAvatars[currentPlayerSetup]?.hair && (
                      <Image source={tempAvatars[currentPlayerSetup]?.hair} style={styles.layerHair} />
                    )}
                    {tempAvatars[currentPlayerSetup]?.accessory && (
                      <Image source={tempAvatars[currentPlayerSetup]?.accessory} style={styles.layerAccessory} />
                    )}
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
                      {tab === 'skin' ? 'Skin' : tab === 'hair' ? 'Rambut' : tab === 'clothes' ? 'Pakaian' : 'Aksesoris'}
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
        </>
      )}

      {phase === 'play' && players.length > 0 && (
        <>
          <View style={[styles.boardWrap, { width: boardSize, height: boardSize }]}> 
            <ImageBackground
              source={assets.ular_tangga?.background}
              style={{ width: boardSize, height: boardSize }}
              imageStyle={{ resizeMode: 'cover', opacity: 0.95 }}
            >
              <View style={{ width: boardSize, height: boardSize }}>
                {Array.from({ length: TOTAL_SQUARES }).map((_, i) => {
                  const n = i + 1
                  const { x, y } = squareToXY(n)
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
                        borderColor: '#111827',
                        backgroundColor: (x + y) % 2 === 0 ? themeColors[theme].square1 : themeColors[theme].square2,
                      }}
                    >
                      <Text style={{ fontSize: 10, color: themeColors[theme].text, padding: 2 }}>{n}</Text>
                      {n === 1 && (
                        <Text style={{ position: 'absolute', left: 4, bottom: 4, fontSize: 8, fontWeight: '700', color: themeColors[theme].text }}>START</Text>
                      )}
                      {n === TOTAL_SQUARES && (
                        <Text style={{ position: 'absolute', right: 4, bottom: 4, fontSize: 8, fontWeight: '700', color: themeColors[theme].text }}>FINISH</Text>
                      )}
                    </View>
                  )
                })}

                {Object.entries(ladders.current).map(([from, to]) => {
                  const f = Number(from)
                  const p1 = squareToXY(f)
                  return (
                    <View
                      key={`lad-${from}`}
                      style={{ position: 'absolute', left: (p1.x + 0.15) * cell, top: (p1.y + 0.15) * cell }}
                    >
                      <Text style={{ color: themeColors[theme].ladder, fontWeight: '700' }}>🔼</Text>
                      <Text style={{ fontSize: 9, color: themeColors[theme].ladder }}>{from}→{to}</Text>
                    </View>
                  )
                })}

                {Object.entries(snakes.current).map(([from, to]) => {
                  const f = Number(from)
                  const p1 = squareToXY(f)
                  return (
                    <View
                      key={`sna-${from}`}
                      style={{ position: 'absolute', left: (p1.x + 0.15) * cell, top: (p1.y + 0.15) * cell }}
                    >
                      <Text style={{ color: themeColors[theme].snake, fontWeight: '700' }}>🔽</Text>
                      <Text style={{ fontSize: 9, color: themeColors[theme].snake }}>{from}→{to}</Text>
                    </View>
                  )
                })}

                {players.map((pl) => {
                  const a = animPos.current[pl.id]
                  const s = animScale.current[pl.id] ?? new Animated.Value(1)
                  const transform = a ? a.getTranslateTransform() : [{ translateX: 0 }, { translateY: 0 }]
                  return (
                    <Animated.View
                      key={`pl-${pl.id}`}
                      style={{ position: 'absolute', width: cell * 0.36, height: cell * 0.36, transform: [...transform, { scale: s }] }}
                    >
                      <View style={styles.tokenContainer}>
                        <View style={[styles.tokenOuter, { backgroundColor: pl.avatar.color || '#6b7280' }]}>
                          <View style={[styles.tokenInner, { backgroundColor: pl.avatar.skinColor || SKIN_TONES[0] }]}> 
                            {pl.avatar.clothes && <Image source={pl.avatar.clothes} style={styles.tokenClothes} />}
                            {pl.avatar.hair && <Image source={pl.avatar.hair} style={styles.tokenHair} />}
                            {pl.avatar.accessory && <Image source={pl.avatar.accessory} style={styles.tokenAccessory} />}
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
              <Text style={[styles.turnInfo, { color: themeColors[theme].text }]}>Giliran: {players[turnIdx]?.name}</Text>
              <Text style={[styles.gameStatus, { color: themeColors[theme].text }]}>{info}</Text>
            </View>

            <View style={styles.diceSection}>
              <Text style={[styles.diceLabel, { color: themeColors[theme].text }]}>Dadu: {dice}</Text>
              <Pressable onPress={roll} disabled={isAnimating} style={[styles.rollButton, isAnimating && styles.rollButtonDisabled]}>
                <Text style={styles.rollButtonText}>{isAnimating ? 'BERGERAK...' : 'LEMPAR DADU'}</Text>
              </Pressable>
            </View>

            <View style={styles.bottomControls}>
              <Pressable onPress={resetGame} style={styles.resetButton}>
                <Text style={styles.resetButtonText}>GAME BARU</Text>
              </Pressable>
            </View>
          </View>
        </>
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
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: 0.4,
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
  genderChipText: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '700',
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
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: 'transparent',
    shadowColor: '#b8cde1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  selectedSkinColor: {
    borderColor: '#9abf44',
    transform: [{ scale: 1.06 }],
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
})
