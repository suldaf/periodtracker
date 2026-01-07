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
  // ImageSourcePropType,
} from 'react-native'
import { Audio } from 'expo-av'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { assets } from '../../resources/assets'
import { ScreenComponent } from '../../navigation/RootNavigator'

// Import SVG files directly
import Ular2Svg from '../../resources/assets/images/ular_tangga/ular_2.svg'
import Ular5Svg from '../../resources/assets/images/ular_tangga/ular_5.svg'
import Ular7Svg from '../../resources/assets/images/ular_tangga/ular_7.svg'
import Ular8Svg from '../../resources/assets/images/ular_tangga/ular_8.svg'
import Tangga1Svg from '../../resources/assets/images/ular_tangga/tangga_1.svg'
import Tangga2Svg from '../../resources/assets/images/ular_tangga/tangga_2.svg'
import Tangga3Svg from '../../resources/assets/images/ular_tangga/tangga_3.svg'
import Tangga4Svg from '../../resources/assets/images/ular_tangga/tangga_4.svg'
import FooterSvg from '../../resources/assets/images/ular_tangga/bottom_page_ular_tangga.svg'
import LogoSvg from '../../resources/assets/images/ular_tangga/EduFun_ular_tangga.svg'

type Gender = 'Female' | 'Male'
type SkinTone = 'LIGHT' | 'MEDIUM' | 'DARK'

type AvatarSpec = {
  gender: Gender
  skinTone: SkinTone
  hair?: string
  clothes?: string
  accessory?: string
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
const PLAYABLE_SQUARES = 42

const DEFAULT_SNAKES: Record<number, number> = {
  8: 6,
  28: 17,
  24: 14,
  39: 27,
}

// Map Board Index -> Asset Array Index
// Index 0 = ular 5, Index 1 = ular 7, Index 2 = ular 2, Index 3 = ular 8
const SNAKE_ASSET_MAP: Record<number, number> = {
  8: 3,   // ular 8
  28: 1,  // ular 7 (Custom Rotation)
  24: 0,  // ular 5
  39: 2,  // ular 2 (Custom Rotation)
}

// Array of snake SVG components
const SNAKE_SVG_COMPONENTS = [Ular5Svg, Ular7Svg, Ular2Svg, Ular8Svg]

// 3. CONFIGURATION: Rotation Offsets per Snake Image
// Key = Asset Index (0-3), Value = Degrees to add
const SNAKE_ROTATION_OFFSETS: Record<number, number> = {
  0: -45, // ular 5 (Standard)
  1: -57,  // ular 7 (Changed: Try 90 or 270 if 90 is upside down)
  2: -90,  // ular 2 (Changed: Try 90 or 270 if 90 is upside down)
  3: -45, // ular 8 (Standard)
}

const DEFAULT_LADDERS: Record<number, number> = {
  2: 11,
  10: 16,
  23: 38,
  30: 32,
}

// Map Board Index -> Ladder Asset Array Index
// Index 0 = tangga_1, Index 1 = tangga_2, Index 2 = tangga_3, Index 3 = tangga_4
const LADDER_ASSET_MAP: Record<number, number> = {
  2: 0,   // tangga_1
  10: 2,  // tangga_3
  23: 1,  // tangga_2
  30: 3,  // tangga_4
}

// Array of ladder SVG components
const LADDER_SVG_COMPONENTS = [Tangga1Svg, Tangga2Svg, Tangga3Svg, Tangga4Svg]

// Rotation Offsets per Ladder Image
// Key = Asset Index (0-3), Value = Degrees to add
const LADDER_ROTATION_OFFSETS: Record<number, number> = {
  0: -90,   // tangga_1
  1: -90,   // tangga_2
  2: -112,   // tangga_3
  3: -57,   // tangga_4
}

// Horizontal Position Offsets per Ladder Image
// Key = Asset Index (0-3), Value = Multiplier for cell offset
const LADDER_POSITION_OFFSETS: Record<number, number> = {
  0: 0,  // tangga_1 (default)
  1: 0,  // tangga_2 (default)
  2: 0.3,   // tangga_3 (more right)
  3: -0.5,  // tangga_4 (more left)
}

const SKIN_TONES: SkinTone[] = ['LIGHT', 'MEDIUM', 'DARK']

const TOKEN_COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#22c55e', '#8b5cf6']

// Skin tone colors for avatar preview
const SKIN_TONE_COLORS: Record<SkinTone, string> = {
  LIGHT: '#F5D5C3',
  MEDIUM: '#D4A574',
  DARK: '#8D5524',
}

const UlarTangga: ScreenComponent<'Ludo' | 'game'> = () => {
  const { width: w, height: h } = Dimensions.get('window')
  const insets = useSafeAreaInsets()
  
  const rows = Math.ceil(TOTAL_SQUARES / COLS)
  const aspectRatio = rows / COLS
  const maxBoardWidth = Math.min(w - 32, 400)
  const maxBoardHeight = Math.min(h - 200, 400)
  
  let boardSize = Math.min(maxBoardWidth, maxBoardHeight / aspectRatio)
  boardSize = Math.max(260, boardSize)
  
  const cell = boardSize / COLS
  const boardHeight = cell * rows

  const [phase, setPhase] = useState<Phase>('choose')
  const [playerCount, setPlayerCount] = useState(2)
  const [players, setPlayers] = useState<Player[]>([])
  const [turnIdx, setTurnIdx] = useState(0)
  const [dice, setDice] = useState(1)
  const [info, setInfo] = useState('Pilih jumlah pemain (2-5)')
  const [isAnimating, setIsAnimating] = useState(false)
  const [gameEnded, setGameEnded] = useState(false)

  const [currentPlayerSetup, setCurrentPlayerSetup] = useState(0)
  const [setupTab, setSetupTab] = useState<SetupTab>('skin')
  const [tempAvatars, setTempAvatars] = useState<AvatarSpec[]>([])
  const [tempNames, setTempNames] = useState<string[]>([])

  const snakes = useRef(DEFAULT_SNAKES)
  const ladders = useRef(DEFAULT_LADDERS)
  const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animPos = useRef<Record<number, Animated.ValueXY>>({})
  const animScale = useRef<Record<number, Animated.Value>>({})
  
  // Audio refs
  const bgMusic = useRef<Audio.Sound | null>(null)
  const diceSound = useRef<Audio.Sound | null>(null)
  const bonusDiceSound = useRef<Audio.Sound | null>(null)
  const movementSound = useRef<Audio.Sound | null>(null)
  const finishGameSound = useRef<Audio.Sound | null>(null)

  const avatarAssets = assets.ular_tangga

  const themeColors = useMemo(() => ({
    light: {
      bg: '#FDFCF0', 
      primary: '#E07A5F', 
      secondary: '#81B29A', 
      text: '#3D405B', 
      neutral: '#D4A373', 
      square1: '#899B5B', 
      square2: '#D8E1D5', 
      start: '#2E411E', 
      finish: '#D8E1D5', 
      cardBg: '#FFFFFF', 
      outline: '#D4A373', 
      shadow: '#3D405B', 
      snake: '#E07A5F', 
      ladder: '#81B29A', 
      accent: '#E07A5F', 
      accentDark: '#D4A373', 
      muted: '#3D405B', 
      boardBg: '#FDFCF0', 
    },
  }), [])

  const [theme] = useState<'light'>('light')

  useEffect(() => {
    // Load audio files
    const loadAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        })

        const audioAssets = assets.ular_tangga?.audio
        if (!audioAssets) return

        // Load background music
        if (audioAssets.main_bg) {
          const { sound: bg } = await Audio.Sound.createAsync(
            audioAssets.main_bg,
            { shouldPlay: false, isLooping: true, volume: 0.2 }
          )
          bgMusic.current = bg
        }

        // Load dice sound
        if (audioAssets.dice) {
          const { sound: dice } = await Audio.Sound.createAsync(
            audioAssets.dice,
            { shouldPlay: false, volume: 0.5 }
          )
          diceSound.current = dice
        }

        // Load bonus dice sound
        if (audioAssets.bonus_dice) {
          const { sound: bonus } = await Audio.Sound.createAsync(
            audioAssets.bonus_dice,
            { shouldPlay: false, volume: 0.6 }
          )
          bonusDiceSound.current = bonus
        }

        // Load movement sound
        if (audioAssets.movement_bounces) {
          const { sound: movement } = await Audio.Sound.createAsync(
            audioAssets.movement_bounces,
            { shouldPlay: false, volume: 0.4 }
          )
          movementSound.current = movement
        }

        // Load finish game sound
        if (audioAssets.finish_game) {
          const { sound: finish } = await Audio.Sound.createAsync(
            audioAssets.finish_game,
            { shouldPlay: false, volume: 0.7 }
          )
          finishGameSound.current = finish
        }
      } catch (error) {
        // Silently handle audio loading errors
      }
    }

    loadAudio()

    return () => {
      if (moveTimer.current) clearTimeout(moveTimer.current)
      
      // Stop background music when leaving screen
      bgMusic.current?.stopAsync().catch(() => {})
      
      // Cleanup audio
      bgMusic.current?.unloadAsync()
      diceSound.current?.unloadAsync()
      bonusDiceSound.current?.unloadAsync()
      movementSound.current?.unloadAsync()
      finishGameSound.current?.unloadAsync()
    }
  }, [])

  useEffect(() => {
    if (phase === 'setup') {
      setTempAvatars(Array(playerCount).fill(null).map((_, i) => {
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
      }))
      setTempNames(Array(playerCount).fill(null).map((_, i) => `Pemain ${i + 1}`))
      setCurrentPlayerSetup(0)
      setSetupTab('skin')
    }
  }, [phase, playerCount])

  const startGame = async () => {
    if (phase !== 'setup') return

    const newPlayers = tempAvatars.map((avatar, i) => {
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
      }
    })

    setPlayers(newPlayers)
    setTurnIdx(0)
    setInfo(`Game dimulai! Giliran ${newPlayers[0].name}`)
    setPhase('play')
    
    // Start background music
    try {
      await bgMusic.current?.replayAsync()
    } catch (error) {
      // Silently handle audio playback errors
    }
  }

  const resetGame = async () => {
    setPlayers([])
    setPhase('choose')
    setInfo('Pilih jumlah pemain (2-5)')
    setTurnIdx(0)
    setGameEnded(false)
    
    // Stop background music
    try {
      await bgMusic.current?.stopAsync()
    } catch (error) {
      // Silently handle audio stop errors
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

  const getActivePlayers = () => players.filter(p => p.pos < PLAYABLE_SQUARES)

  const getNextActiveTurnIdx = (currentIdx: number) => {
    const activePlayers = getActivePlayers()
    if (activePlayers.length === 0) return currentIdx
    
    let nextIdx = (currentIdx + 1) % players.length
    let attempts = 0
    
    while (players[nextIdx].pos >= PLAYABLE_SQUARES && attempts < players.length) {
      nextIdx = (nextIdx + 1) % players.length
      attempts++
    }
    
    return nextIdx
  }

  const roll = async () => {
    if (phase !== 'play' || isAnimating || players.length === 0) return

    const activePlayers = getActivePlayers()
    if (activePlayers.length === 0) {
      setInfo('Semua pemain telah selesai! 🎉')
      return
    }

    const d = Math.floor(Math.random() * 6) + 1
    setDice(d)
    
    // Play dice sound effect
    try {
      if (d === 6) {
        await bonusDiceSound.current?.replayAsync()
      } else {
        await diceSound.current?.replayAsync()
      }
    } catch (error) {
      // Silently handle audio playback errors
    }

    const current = players[turnIdx]
    const target = current.pos + d

    if (target > PLAYABLE_SQUARES) {
      setInfo(`${current.name} rolled ${d} → but needs exact ${PLAYABLE_SQUARES - current.pos} to finish. Giliran lanjut.`)
      if (d !== 6) setTurnIdx((s) => getNextActiveTurnIdx(s))
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

        setPlayers((ps) => {
          const updatedPlayers = ps.map((pl) => (pl.id === current.id ? { ...pl, pos: final } : pl))
          
          // Check game end conditions with updated player data
          setIsAnimating(false)
          
          if (special) triggerBounce(current.id)
          
          if (final === PLAYABLE_SQUARES) {
            triggerBounce(current.id)
            
            const finishedPlayers = updatedPlayers.filter(p => p.pos >= PLAYABLE_SQUARES)
            const activePlayers = updatedPlayers.filter(p => p.pos < PLAYABLE_SQUARES)
            
            // Game ends if only 1 active player remains
            if (activePlayers.length === 1) {
              const loser = activePlayers[0]
              setInfo(`${current.name} MENANG! 🎉 | ${loser.name} kalah (terakhir yang tersisa)`)
              setGameEnded(true)
              
              // Play victory sound
              finishGameSound.current?.replayAsync().catch(() => {})
              
              return updatedPlayers
            }
            
            // Game ends if 3+ total players AND 3 have finished
            if (updatedPlayers.length >= 3 && finishedPlayers.length >= 3) {
              const losers = activePlayers.map(p => p.name).join(', ')
              setInfo(`${current.name} MENANG! 🎉 | Game berakhir! Yang kalah: ${losers}`)
              setGameEnded(true)
              
              // Play victory sound
              finishGameSound.current?.replayAsync().catch(() => {})
              
              return updatedPlayers
            }
            
            // Continue game - advance turn
            setInfo(`${current.name} MENANG! 🎉, tersisa ${activePlayers.length} pemain yang tersisa`)
            
            // Play victory sound for this player
            finishGameSound.current?.replayAsync().catch(() => {})
            
            if (activePlayers.length > 0) {
              setTimeout(() => setTurnIdx((s) => getNextActiveTurnIdx(s)), 100)
            }
          }
          
          return updatedPlayers
        })
        
        if (final !== PLAYABLE_SQUARES) {
          setIsAnimating(false)
          if (special) triggerBounce(current.id)
        }

        if (d !== 6) setTurnIdx((s) => getNextActiveTurnIdx(s))
        return
      }

      step += 1
      setPlayers((ps) => ps.map((pl) => (pl.id === current.id ? { ...pl, pos: step } : pl)))
      moveTimer.current = setTimeout(hop, 140)
    }

    hop()
  }

  const squareToXY = (n: number) => {
    const rows = Math.ceil(TOTAL_SQUARES / COLS) // 42/6 = 7 rows
    if (n <= 0) return { x: 0, y: rows - 1 }

    const idx = n - 1
    const row = Math.floor(idx / COLS)
    let col = idx % COLS
    
    // Snake pattern: odd rows go right-to-left
    if (row % 2 === 1) col = COLS - 1 - col
    
    // Y coordinate: bottom row is y=0, top row is y=rows-1
    // But we want to flip it so tile 1 is at bottom-left
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

  const calculateSnakePath = (fromSquare: number, toSquare: number, cell: number) => {
    const from = squareToXY(fromSquare)
    const to = squareToXY(toSquare)
    
    // HEAD position (where player gets eaten)
    const headX = from.x * cell + cell / 2
    const headY = from.y * cell + cell / 2
    
    // TAIL position (where player lands)
    const tailX = to.x * cell + cell / 2
    const tailY = to.y * cell + cell / 2
    
    // Calculate angle for rotation
    const dx = tailX - headX
    const dy = tailY - headY
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)
    
    // Calculate midpoint for curve
    const midX = (headX + tailX) / 2
    const midY = (headY + tailY) / 2
    
    return { headX, headY, tailX, tailY, midX, midY, angle, from, to }
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
    const currentAvatar = tempAvatars[currentPlayerSetup] || { 
      gender: 'Female', 
      skinTone: 'LIGHT',
      hair: 'BRAID',
      clothes: 'BASIC',
      accessory: undefined
    }
    const genderAssets = currentAvatar.gender === 'Female' ? avatarAssets?.female : avatarAssets?.male

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
                  currentAvatar.skinTone === skinTone && styles.selectedSkinColor
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

  return (
    <View style={[styles.screen, { paddingTop: 24 + insets.top, paddingBottom: 16 + insets.bottom, backgroundColor: themeColors[theme].bg }]}>
      <ImageBackground
        source={assets.ular_tangga?.background}
        style={styles.inner}
        imageStyle={{ resizeMode: 'cover', opacity: 0.08 }}
      >

      {/* --- 1. FOOTER (Place this FIRST) --- */}
      {/* Since it is rendered first, it sits at the back */}
      <View style={styles.footerContainer} pointerEvents="none">
        <FooterSvg 
          width="100%"
          height={120}
          preserveAspectRatio="none"
        />
      </View>

      {/* --- 2. MAIN CONTENT (Place this SECOND) --- */}
      {/* Since it is rendered second, it sits ON TOP of the footer */}
      {(phase === 'choose' || phase === 'setup') && (
        <LogoSvg 
          width={400}
          height={120}
          style={styles.logoImage}
          preserveAspectRatio="xMidYMid meet"
        />
      )}

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
        <ScrollView 
          style={styles.setupScrollView} 
          contentContainerStyle={[styles.setupScrollContent, { paddingBottom: 160 }]}
          showsVerticalScrollIndicator={false}
        >
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
                  onPress={() => updateTempAvatar({ 
                    gender: 'Male', 
                    hair: 'HAIR1',
                    clothes: 'BASIC',
                    accessory: undefined 
                  })}
                  style={[styles.genderChip, (tempAvatars[currentPlayerSetup]?.gender || 'Female') === 'Male' && styles.genderChipActive]}
                >
                  <Text style={styles.genderChipText}>Laki-laki</Text>
                </Pressable>
                <Pressable
                  onPress={() => updateTempAvatar({ 
                    gender: 'Female', 
                    hair: 'BRAID',
                    clothes: 'BASIC',
                    accessory: undefined 
                  })}
                  style={[styles.genderChip, (tempAvatars[currentPlayerSetup]?.gender || 'Female') === 'Female' && styles.genderChipActive]}
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
                  <View style={[styles.skinPreview, { backgroundColor: SKIN_TONE_COLORS[tempAvatars[currentPlayerSetup]?.skinTone || 'LIGHT'] }]}>
                    {(() => {
                      const currentAvatar = tempAvatars[currentPlayerSetup]
                      if (!currentAvatar) return null
                      
                      const genderAssets = currentAvatar.gender === 'Female' ? avatarAssets?.female : avatarAssets?.male
                      const hairImage = currentAvatar.hair ? genderAssets?.hair[currentAvatar.hair] : null
                      const clothesImage = currentAvatar.clothes ? genderAssets?.clothes[currentAvatar.clothes] : null
                      const accessoryImage = currentAvatar.accessory ? genderAssets?.accessories[currentAvatar.accessory] : null
                      
                      return (
                        <>
                          {clothesImage && (
                            <Image source={clothesImage} style={styles.layerClothes} />
                          )}
                          {hairImage && (
                            <Image source={hairImage} style={styles.layerHair} />
                          )}
                          {accessoryImage && (
                            <Image source={accessoryImage} style={styles.layerAccessory} />
                          )}
                        </>
                      )
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
        </ScrollView>
      )}

      {phase === 'play' && players.length > 0 && (
        <ScrollView 
          style={styles.setupScrollView} 
          contentContainerStyle={[styles.setupScrollContent, { paddingBottom: 160 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo above the board */}
          <LogoSvg 
            width={400}
            height={120}
            style={[styles.logoImage, { marginBottom: 16 }]}
            preserveAspectRatio="xMidYMid meet"
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
                  const { x, y } = squareToXY(n)
                  
                  const displayNumber = n === 1 ? null : n === TOTAL_SQUARES ? null : n - 1
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
                        backgroundColor: isStartSquare ? themeColors[theme].start : 
                                         isFinishSquare ? themeColors[theme].finish :
                                         (x + y) % 2 === 0 ? themeColors[theme].square1 : themeColors[theme].square2,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isStartSquare ? (
                        <Text style={{ fontSize: Math.max(10, cell * 0.18), fontWeight: '700', color: '#FFFFFF', textAlign: 'center' }}>MULAI</Text>
                      ) : isFinishSquare ? (
                        <Text style={{ fontSize: Math.max(10, cell * 0.18), fontWeight: '700', color: '#FFFFFF', textAlign: 'center' }}>SELESAI</Text>
                      ) : (
                        <Text style={{ fontSize: Math.max(8, cell * 0.15), color: themeColors[theme].text, fontWeight: '600' }}>{displayNumber}</Text>
                      )}
                    </View>
                  )
                })}

                {Object.entries(ladders.current).map(([from, to]) => {
                  const fromNum = Number(from)
                  const toNum = Number(to)
                  const path = calculateSnakePath(fromNum, toNum, cell)
                  
                  const fromPlayable = fromNum - 1
                  const toPlayable = toNum - 1
                  
                  // Use specific ladder asset if defined in map, otherwise default to 0
                  const ladderImageIndex = LADDER_ASSET_MAP[fromNum] ?? 0;
                  const LadderSvgComponent = LADDER_SVG_COMPONENTS[ladderImageIndex]
                  
                  // Get rotation offset for this specific ladder (or default to 0)
                  const rotationOffset = LADDER_ROTATION_OFFSETS[ladderImageIndex] ?? 0;
                  
                  // Get horizontal position offset for this specific ladder (or default to -0.1)
                  const positionOffset = LADDER_POSITION_OFFSETS[ladderImageIndex] ?? -0.1;

                  const distance = Math.sqrt(
                    Math.pow(path.tailX - path.headX, 2) + 
                    Math.pow(path.tailY - path.headY, 2)
                  )
                  
                  // Add specific offset to path angle
                  const ladderRotation = path.angle + rotationOffset
                  
                  const ladderHeight = distance
                  const ladderWidth = ladderHeight * 0.6
                  
                  return (
                    <View key={`lad-${from}`} style={{ position: 'absolute' }}>
                      <View
                        style={{
                          position: 'absolute',
                          left: path.headX + (cell * positionOffset),
                          top: path.headY,
                          width: ladderWidth,
                          height: ladderHeight,
                          transform: [
                            { translateX: -ladderWidth / 2 },
                            { translateY: 0 },
                            { rotate: `${ladderRotation}deg` },
                          ],
                          transformOrigin: '50% 0%',
                          zIndex: 5,
                        }}
                      >
                        {LadderSvgComponent ? (
                          <LadderSvgComponent 
                            width={ladderWidth}
                            height={ladderHeight}
                            preserveAspectRatio="xMidYMin meet"
                          />
                        ) : (
                          <View style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: themeColors[theme].ladder,
                            borderRadius: ladderWidth * 0.2,
                            opacity: 0.8,
                          }} />
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
                          borderColor: themeColors[theme].ladder,
                          zIndex: 10,
                        }}
                      >
                        <Text style={{ 
                          fontSize: Math.max(8, cell * 0.13), 
                          color: themeColors[theme].ladder,
                          fontWeight: '800',
                          textAlign: 'center',
                        }}>
                          🪜 {fromPlayable}→{toPlayable}
                        </Text>
                      </View>
                    </View>
                  )
                })}

                {Object.entries(snakes.current).map(([from, to]) => {
                  const fromNum = Number(from)
                  const toNum = Number(to)
                  const path = calculateSnakePath(fromNum, toNum, cell)
                  
                  const fromPlayable = fromNum - 1
                  const toPlayable = toNum - 1
                  
                  // Use specific snake asset if defined in map, otherwise default to 0
                  const snakeImageIndex = SNAKE_ASSET_MAP[fromNum] ?? 0;
                  const SnakeSvgComponent = SNAKE_SVG_COMPONENTS[snakeImageIndex]
                  
                  // Get rotation offset for this specific snake (or default to 180)
                  const rotationOffset = SNAKE_ROTATION_OFFSETS[snakeImageIndex] ?? 180;

                  const distance = Math.sqrt(
                    Math.pow(path.tailX - path.headX, 2) + 
                    Math.pow(path.tailY - path.headY, 2)
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
                          // Added offset to the right (50% of a cell width)
                          left: path.headX + (cell * 0.5),
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
                        {SnakeSvgComponent ? (
                          <SnakeSvgComponent 
                            width={snakeWidth}
                            height={snakeHeight}
                            preserveAspectRatio="xMidYMin meet"
                          />
                        ) : (
                          <View style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: themeColors[theme].snake,
                            borderRadius: snakeWidth * 0.3,
                            opacity: 0.8,
                          }} />
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
                        <Text style={{ 
                          fontSize: Math.max(8, cell * 0.13), 
                          color: themeColors[theme].snake,
                          fontWeight: '800',
                          textAlign: 'center',
                        }}>
                          🐍 {fromPlayable}→{toPlayable}
                        </Text>
                      </View>
                    </View>
                  )
                })}

                {players.map((pl) => {
                  const a = animPos.current[pl.id]
                  const s = animScale.current[pl.id] ?? new Animated.Value(1)
                  const transform = a ? a.getTranslateTransform() : [{ translateX: 0 }, { translateY: 0 }]
                  
                  const genderAssets = pl.avatar.gender === 'Female' ? avatarAssets?.female : avatarAssets?.male
                  const hairImage = pl.avatar.hair ? genderAssets?.hair[pl.avatar.hair] : null
                  const clothesImage = pl.avatar.clothes ? genderAssets?.clothes[pl.avatar.clothes] : null
                  const accessoryImage = pl.avatar.accessory ? genderAssets?.accessories[pl.avatar.accessory] : null
                  const skinColor = SKIN_TONE_COLORS[pl.avatar.skinTone || 'LIGHT']
                  
                  return (
                    <Animated.View
                      key={`pl-${pl.id}`}
                      style={{ position: 'absolute', width: cell * 0.36, height: cell * 0.36, transform: [...transform, { scale: s }] }}
                    >
                      <View style={styles.tokenContainer}>
                        <View style={[styles.tokenOuter, { backgroundColor: pl.avatar.color || '#6b7280' }]}>
                          <View style={[styles.tokenInner, { backgroundColor: skinColor }]}>
                            {clothesImage && <Image source={clothesImage} style={styles.tokenClothes} />}
                            {hairImage && <Image source={hairImage} style={styles.tokenHair} />}
                            {accessoryImage && <Image source={accessoryImage} style={styles.tokenAccessory} />}
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
              {getActivePlayers().length > 0 && (
                <Text style={[styles.turnInfo, { color: themeColors[theme].text }]}>Giliran: {players[turnIdx]?.name}</Text>
              )}
              <Text style={[styles.gameStatus, { color: themeColors[theme].text }]}>{info}</Text>
            </View>

            <View style={styles.diceSection}>
              <Text style={[styles.diceLabel, { color: themeColors[theme].text }]}>Dadu: {dice}</Text>
              <Pressable onPress={roll} disabled={isAnimating || gameEnded} style={[styles.rollButton, (isAnimating || gameEnded) && styles.rollButtonDisabled]}>
                <Text style={styles.rollButtonText}>{isAnimating ? 'BERGERAK...' : gameEnded ? 'GAME BERAKHIR' : 'LEMPAR DADU'}</Text>
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

      </ImageBackground>
      

    </View>
    
  )
}

export default UlarTangga

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    
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
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: 120,
    zIndex: 0,
  },
  phaseContainer: {
    width: '100%',
    maxWidth: 440,
    padding: 22,
    borderRadius: 18,
    marginTop: 12,
    marginBottom: 150,
    shadowColor: '#8ea8c2',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
    elevation: 6,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2ecf5',
    zIndex: 10,
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