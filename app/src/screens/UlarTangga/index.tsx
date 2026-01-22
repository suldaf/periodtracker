import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
  Animated,
  Easing,
  TextInput,
  Image,
  ImageBackground,
  ScrollView,
  // ImageSourcePropType,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Audio } from 'expo-av'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { assets } from '../../resources/assets'
import { ScreenComponent } from '../../navigation/RootNavigator'
import { AVATAR_SVG_REGISTRY } from './avatarRegistry'
import { useColor } from '../../hooks/useColor'
import { IS_IOS } from '../../services/device'

// Import GameModeSelector component and bot logic from engine
import {
  GameModeSelector,
  GameModeSelection,
} from '../../features/edufun-snakes-ladders/components/GameModeSelector'
import {
  GameMode,
  Difficulty,
  BotConfig,
  Emoticon,
  rollDice,
  executeBotTurn,
  determineBotReaction,
  calculateBotActionDelays,
  getBotMessage,
} from '../../features/edufun-snakes-ladders/engine'

// Import SVG files directly
import Ular1Animated from '../../resources/assets/images/ular_tangga/Ular1Animated'
import Ular2Svg from '../../resources/assets/images/ular_tangga/ular_2.svg'
import Ular3Svg from '../../resources/assets/images/ular_tangga/ular_3.svg'
import Ular4Svg from '../../resources/assets/images/ular_tangga/ular_4.svg'
import Ular5Svg from '../../resources/assets/images/ular_tangga/ular_5.svg'
import Tangga1Svg from '../../resources/assets/images/ular_tangga/tangga_1.svg'
import Tangga2Svg from '../../resources/assets/images/ular_tangga/tangga_2.svg'
import Tangga3Svg from '../../resources/assets/images/ular_tangga/tangga_3.svg'
import DaunTangga1Svg from '../../resources/assets/images/ular_tangga/daun_tangga_1.svg'
import DaunTangga2Svg from '../../resources/assets/images/ular_tangga/daun_tangga_2.svg'
import DaunTangga3Svg from '../../resources/assets/images/ular_tangga/daun_tangga_3.svg'
import FooterSvg from '../../resources/assets/images/ular_tangga/bottom_page_ular_tangga.svg'
import LogoSvg from '../../resources/assets/images/ular_tangga/EduFun_ular_tangga.svg'
import BgLandmarkSvg from '../../resources/assets/images/ular_tangga/bg-landmark.svg'
import BgCloudSvg from '../../resources/assets/images/ular_tangga/bg-cloud.svg'
import BgFinishSvg from '../../resources/assets/images/ular_tangga/bg-finish.svg'
import InfoIconSvg from '../../resources/assets/images/ular_tangga/info.svg'
import NewGameIconSvg from '../../resources/assets/images/ular_tangga/new-game.svg'
import SoundIconSvg from '../../resources/assets/images/ular_tangga/sound.svg'

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
  isBot?: boolean
}

type SetupTab = 'skin' | 'hair' | 'clothes' | 'accessory'

type Phase = 'choose' | 'setup' | 'play'

// Extended phase type to include mode selection
type GamePhase = 'select_mode' | Phase

const TOTAL_SQUARES = 54
const COLS = 6
const PLAYABLE_SQUARES = 54

const DEFAULT_SNAKES: Record<number, number> = {
  17: 6,
  26: 13,
  41: 21,
  51: 39,
  49: 47,
}

// Map Board Index -> Asset Array Index
// Map Board Index -> Asset Array Index
// Urutan dari bawah (17) ke atas (51) pakai ular_1 s/d ular_5
const SNAKE_ASSET_MAP: Record<number, number> = {
  17: 0, // ular_1
  26: 1, // ular_2
  41: 2, // ular_3
  49: 3, // ular_4
  51: 4, // ular_5
}

// Array of snake SVG components
const SNAKE_SVG_COMPONENTS = [Ular1Animated, Ular2Svg, Ular3Svg, Ular4Svg, Ular5Svg]

// Rotation Offsets per Snake Image
const SNAKE_ROTATION_OFFSETS: Record<number, number> = {
  0: 0,
  1: 0,
  2: 0,
  3: 0,
  4: 0,
}

// Position Offsets per Snake Image (X-axis shift in pixels)
const SNAKE_POSITION_OFFSETS: Record<number, number> = {
  0: 30,   // ular_1
  1: -30, // ular_2 (Adjusted per user request for tile 26)
  2: -10,   // ular_3
  3: 30,   // ular_4
  4: 20,   // ular_5
}

const DEFAULT_LADDERS: Record<number, number> = {
  2: 11,
  15: 34,
  19: 42,
  25: 37,
  33: 40,
}

// Map Board Index -> Ladder Asset Array Index
// tangga_1 (0) = pendek, tangga_2 (1) = sedang/panjang
const LADDER_ASSET_MAP: Record<number, number> = {
  2: 0,  // Short (2->11)
  15: 2, // Long (15->34)
  19: 2, // Long (19->42)
  25: 1, // Medium (25->37)
  33: 0, // Short (33->40)
}

// Array of ladder SVG components
const LADDER_SVG_COMPONENTS = [Tangga1Svg, Tangga2Svg, Tangga3Svg]

// Array of leaf SVG components (for animated overlays)
const LEAF_SVG_COMPONENTS = [DaunTangga1Svg, DaunTangga2Svg, DaunTangga3Svg]

// Rotation Offsets per Ladder Image
const LADDER_ROTATION_OFFSETS: Record<number, number> = {
  0: -90, // tangga_1 - lurus ke atas
  1: -90, // tangga_2 - lurus ke atas
  2: -90, // tangga_3 - lurus ke atas
}

// Horizontal Position Offsets per Ladder Image
const LADDER_POSITION_OFFSETS: Record<number, number> = {
  0: 0, // tangga_1
  1: 0, // tangga_2
  2: 0, // tangga_3 (more right)
}

// Height Factors per Ladder Image (multiplier for cell size)
const LADDER_HEIGHT_FACTORS: Record<number, number> = {
  0: 2.7, // tangga_1
  1: 2.7, // tangga_2
  2: 3.5, // tangga_3
}

// Width Factors per Ladder Image (multiplier for cell size)
const LADDER_WIDTH_FACTORS: Record<number, number> = {
  0: 0.38, // tangga_1
  1: 0.35, // tangga_2
  2: 0.5,  // tangga_3
}

// Vertical Position Offsets per Ladder Image (pixels)
const LADDER_VERTICAL_OFFSETS: Record<number, number> = {
  0: 50, // tangga_1
  1: 30, // tangga_2
  2: 20, // tangga_3
}

const SKIN_TONES: SkinTone[] = ['LIGHT', 'MEDIUM', 'DARK']

const TOKEN_COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#22c55e', '#8b5cf6']

// Quiz questions about menstruation
const QUIZ_QUESTIONS = [
  {
    question: 'Berapa lama rata-rata siklus menstruasi normal?',
    options: ['21-35 hari', '7-14 hari', '40-50 hari', '60-70 hari'],
    correctIndex: 0,
  },
  {
    question: 'Apa yang menyebabkan menstruasi?',
    options: ['Makan makanan pedas', 'Luruhnya dinding rahim', 'Kurang minum air', 'Terlalu banyak olahraga'],
    correctIndex: 1,
  },
  {
    question: 'Berapa hari rata-rata durasi menstruasi?',
    options: ['1-2 hari', '3-7 hari', '10-14 hari', '15-20 hari'],
    correctIndex: 1,
  },
  {
    question: 'Apa yang sebaiknya dilakukan saat kram menstruasi?',
    options: ['Tidak boleh bergerak', 'Kompres hangat', 'Minum es', 'Tidak makan'],
    correctIndex: 1,
  },
  {
    question: 'Kapan sebaiknya mengganti pembalut?',
    options: ['Sehari sekali', 'Setiap 4-6 jam', 'Seminggu sekali', 'Sebulan sekali'],
    correctIndex: 1,
  },
]

// Available avatar set combinations (based on actual folders)
const AVAILABLE_SETS = {
  Female: [
    'F-DARK-BRAID-BASIC-FLOWER',
    'F-DARK-BRAID-BASIC-NONE',
    'F-DARK-PONYTAIL-BASIC-FLOWER',
    'F-LIGHT-BRAID-BASIC-FLOWER',
    'F-LIGHT-BRAID-BASIC-NONE',
    'F-LIGHT-PONYTAIL-BASIC-FLOWER',
    'F-MEDIUM-BOB-BASIC-FLOWER',
    'F-MEDIUM-BRAID-BASIC-FLOWER',
    'F-MEDIUM-BRAID-BASIC-NONE',
    'F-MEDIUM-BUN-BASIC-FLOWER',
    'F-MEDIUM-PONYTAIL-BASIC-FLOWER',
  ],
  Male: [
    'M-DARK-HAIR1-BASIC-NONE',
    'M-LIGHT-HAIR1-BASIC-NONE',
    'M-LIGHT-HAIR2-BASIC-NONE',
    'M-LIGHT-HAIR3-BASIC-NONE',
    'M-MEDIUM-HAIR1-BASIC-NONE',
  ],
}

// Helper function to check if combination is available
const isSetAvailable = (avatar: AvatarSpec): boolean => {
  const { gender, skinTone, hair, clothes, accessory } = avatar
  if (!hair || !clothes) return false

  const accessoryPart = accessory || 'NONE'
  const prefix = gender === 'Female' ? 'F' : 'M'
  const setName = `${prefix}-${skinTone}-${hair}-${clothes}-${accessoryPart}`

  return AVAILABLE_SETS[gender].includes(setName)
}

// Helper function to get skin tone color
const getSkinToneColor = (skinTone: SkinTone): string => {
  switch (skinTone) {
    case 'LIGHT':
      return '#FFCEB2'
    case 'MEDIUM':
      return '#FFB988'
    case 'DARK':
      return '#D37444'
    default:
      return '#FFCEB2'
  }
}

// Dice Face Component
const DiceFace = ({ value, isRolling }: { value: number; isRolling: boolean }) => {
  const spinValue = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (isRolling) {
      spinValue.setValue(0)
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        })
      ).start()
    } else {
      spinValue.stopAnimation()
      spinValue.setValue(0)
    }
  }, [isRolling, spinValue])

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const renderDots = () => {
    const dots = []
    const dotStyle = {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#000',
    }

    // Dice face patterns
    switch (value) {
      case 1:
        dots.push(<View key="center" style={[dotStyle, { position: 'absolute' }]} />)
        break
      case 2:
        dots.push(
          <View key="tl" style={[dotStyle, { position: 'absolute', top: 6, left: 6 }]} />,
          <View key="br" style={[dotStyle, { position: 'absolute', bottom: 6, right: 6 }]} />
        )
        break
      case 3:
        dots.push(
          <View key="tl" style={[dotStyle, { position: 'absolute', top: 6, left: 6 }]} />,
          <View key="center" style={[dotStyle, { position: 'absolute' }]} />,
          <View key="br" style={[dotStyle, { position: 'absolute', bottom: 6, right: 6 }]} />
        )
        break
      case 4:
        dots.push(
          <View key="tl" style={[dotStyle, { position: 'absolute', top: 6, left: 6 }]} />,
          <View key="tr" style={[dotStyle, { position: 'absolute', top: 6, right: 6 }]} />,
          <View key="bl" style={[dotStyle, { position: 'absolute', bottom: 6, left: 6 }]} />,
          <View key="br" style={[dotStyle, { position: 'absolute', bottom: 6, right: 6 }]} />
        )
        break
      case 5:
        dots.push(
          <View key="tl" style={[dotStyle, { position: 'absolute', top: 6, left: 6 }]} />,
          <View key="tr" style={[dotStyle, { position: 'absolute', top: 6, right: 6 }]} />,
          <View key="center" style={[dotStyle, { position: 'absolute' }]} />,
          <View key="bl" style={[dotStyle, { position: 'absolute', bottom: 6, left: 6 }]} />,
          <View key="br" style={[dotStyle, { position: 'absolute', bottom: 6, right: 6 }]} />
        )
        break
      case 6:
        dots.push(
          <View key="tl" style={[dotStyle, { position: 'absolute', top: 6, left: 6 }]} />,
          <View key="tr" style={[dotStyle, { position: 'absolute', top: 6, right: 6 }]} />,
          <View key="ml" style={[dotStyle, { position: 'absolute', left: 6 }]} />,
          <View key="mr" style={[dotStyle, { position: 'absolute', right: 6 }]} />,
          <View key="bl" style={[dotStyle, { position: 'absolute', bottom: 6, left: 6 }]} />,
          <View key="br" style={[dotStyle, { position: 'absolute', bottom: 6, right: 6 }]} />
        )
        break
    }

    return dots
  }

  return (
    <Animated.View
      style={{
        width: 60,
        height: 60,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
        borderWidth: 2,
        borderColor: '#000',
        transform: [{ rotate: spin }],
      }}
    >
      {renderDots()}
    </Animated.View>
  )
}

// Bouncing Victory Image Component
const BouncingVictoryImage = ({ source }: { source: any }) => {
  const bounceValue = useRef(new Animated.Value(0)).current
  const scaleValue = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(bounceValue, {
            toValue: -15,
            duration: 400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleValue, {
            toValue: 1.08,
            duration: 400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(bounceValue, {
            toValue: 0,
            duration: 400,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleValue, {
            toValue: 1,
            duration: 400,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    )
    bounceAnimation.start()

    return () => bounceAnimation.stop()
  }, [bounceValue, scaleValue])

  return (
    <Animated.Image
      source={source}
      style={[
        styles.victoryImage,
        {
          transform: [
            { translateY: bounceValue },
            { scale: scaleValue },
          ],
        },
      ]}
      resizeMode="contain"
    />
  )
}

// Bouncing Avatar Component for Player Info
const BouncingAvatar = ({ children }: { children: React.ReactNode }) => {
  const bounceValue = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceValue, {
          toValue: -8,
          duration: 600,
          easing: Easing.out(Easing.ease), // Tambah easing biar smooth
          useNativeDriver: true,
        }),
        Animated.timing(bounceValue, {
          toValue: 0,
          duration: 600,
          easing: Easing.in(Easing.ease), // Tambah easing biar smooth
          useNativeDriver: true,
        }),
      ])
    )
    bounceAnimation.start()

    return () => bounceAnimation.stop()
  }, [bounceValue])

  return (
    <Animated.View
      style={{
        transform: [{ translateY: bounceValue }],
      }}
    >
      {children}
    </Animated.View>
  )
}

// Swaying Element Component for Ladders and Snakes
const SwayingElement = ({ children, intensity = 2, duration = 2000 }: { children: React.ReactNode; intensity?: number; duration?: number }) => {
  const swayValue = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const swayAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(swayValue, {
          toValue: 1,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(swayValue, {
          toValue: -1,
          duration: duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(swayValue, {
          toValue: 0,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    )
    swayAnimation.start()

    return () => swayAnimation.stop()
  }, [swayValue, duration])

  const rotateInterpolate = swayValue.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [`-${intensity}deg`, '0deg', `${intensity}deg`],
  })

  return (
    <Animated.View
      style={{
        transform: [{ rotate: rotateInterpolate }],
      }}
    >
      {children}
    </Animated.View>
  )
}

// Event Notification Component
const EventNotification = ({ message, type }: { message: string; type: 'bonus' | 'ladder' | 'snake' | 'quiz-correct' | 'quiz-wrong' }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.5)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start()

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start()
    }, 2000)

    return () => clearTimeout(timer)
  }, [fadeAnim, scaleAnim])

  const getBackgroundColor = () => {
    switch (type) {
      case 'bonus': return '#F59E0B'
      case 'ladder': return '#10B981'
      case 'snake': return '#EF4444'
      case 'quiz-correct': return '#10B981'
      case 'quiz-wrong': return '#EF4444'
      default: return '#6366F1'
    }
  }

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        marginTop: -40,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: scaleAnim }],
        opacity: fadeAnim,
        zIndex: 100,
        pointerEvents: 'none',
      }}
    >
      <View style={{
        backgroundColor: getBackgroundColor(),
        paddingVertical: 20,
        paddingHorizontal: 30,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10,
        minWidth: 300,
        maxWidth: '90%',
        alignItems: 'center',
      }}>
        <Text style={{
          color: '#ffffff',
          fontSize: 22,
          fontWeight: '900',
          textAlign: 'center',
          textShadowColor: 'rgba(0, 0, 0, 0.3)',
          textShadowOffset: { width: 0, height: 2 },
          textShadowRadius: 4,
        }}>
          {message}
        </Text>
      </View>
    </Animated.View>
  )
}

const UlarTangga: ScreenComponent<'Ludo' | 'game'> = () => {
  const navigation = useNavigation()
  const { width: w, height: h } = Dimensions.get('window')
  const insets = useSafeAreaInsets()
  const { navColor } = useColor()


  const rows = Math.ceil(TOTAL_SQUARES / COLS)
  const aspectRatio = rows / COLS
  const maxBoardWidth = Math.min((w - 16) * 0.85, 510)  // Reduced by ~15%
  const maxBoardHeight = Math.min((h - 150) * 0.85, 680) // Reduced by ~15%

  let boardSize = Math.min(maxBoardWidth, maxBoardHeight / aspectRatio)
  boardSize = Math.max(255, boardSize) // Min size 255

  const cell = boardSize / COLS
  const boardHeight = cell * rows

  // Start with mode selection phase
  const [phase, setPhase] = useState<GamePhase>('select_mode')

  // Manage Bottom Tab Bar visibility
  useEffect(() => {
    // Hide tab bar only during actual gameplay
    const isGameplay = phase === 'play'

    // Explicitly define default style to restore it correctly
    const defaultTabBarStyle = {
      minHeight: 60,
      padding: IS_IOS ? 8 : 0,
      backgroundColor: navColor,
      paddingBottom: insets.bottom,
      display: 'flex'
    }

    navigation.setOptions({
      tabBarStyle: isGameplay ? { display: 'none' } : defaultTabBarStyle
    })

    // Restore on unmount
    return () => {
      navigation.setOptions({
        tabBarStyle: defaultTabBarStyle
      })
    }
  }, [phase, navigation, navColor, insets.bottom])
  const [playerCount, setPlayerCount] = useState(2)
  const [players, setPlayers] = useState<Player[]>([])
  const [turnIdx, setTurnIdx] = useState(0)
  const [dice, setDice] = useState(1)
  const [info, setInfo] = useState('Pilih jumlah pemain (2-5)')
  const [isAnimating, setIsAnimating] = useState(false)
  const [gameEnded, setGameEnded] = useState(false)
  // Force re-render after initialization
  const [initialized, setInitialized] = useState(false)
  const [showVictoryModal, setShowVictoryModal] = useState(false)
  const [winner, setWinner] = useState<Player | null>(null)

  // Quiz and star tiles
  const [starTiles, setStarTiles] = useState<number[]>([])
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [currentQuiz, setCurrentQuiz] = useState<{ question: string; options: string[]; correctIndex: number } | null>(null)
  const [quizPlayerTile, setQuizPlayerTile] = useState<number>(0)
  const [quizFeedback, setQuizFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null)

  // UI modals
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false)
  const settingsAnim = useRef(new Animated.Value(0)).current // 0 = collapsed, 1 = expanded
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  // Event notification
  const [eventNotification, setEventNotification] = useState<{ message: string; type: 'bonus' | 'ladder' | 'snake' | 'quiz-correct' | 'quiz-wrong' } | null>(null)

  // Dice animation
  const [isDiceRolling, setIsDiceRolling] = useState(false)

  const [currentPlayerSetup, setCurrentPlayerSetup] = useState(0)
  const [setupTab, setSetupTab] = useState<SetupTab>('skin')
  const [tempAvatars, setTempAvatars] = useState<AvatarSpec[]>([])
  const [tempNames, setTempNames] = useState<string[]>([])

  // Dev mode for testing
  const [isDevMode, setIsDevMode] = useState(false)
  const devDiceValue = useRef<number | null>(null)

  // Animation state tracking for each player
  const [playerAnimStates, setPlayerAnimStates] = useState<Record<number, string>>({})

  // Track which player is currently moving
  const [movingPlayerId, setMovingPlayerId] = useState<number | null>(null)

  // Game mode and bot states
  const [gameMode, setGameMode] = useState<GameMode>('multiplayer')
  const [difficulty, setDifficulty] = useState<Difficulty>('santai')
  const [bots, setBots] = useState<BotConfig[]>([])
  const [botReaction, setBotReaction] = useState<{ message: string; emoticon: Emoticon } | null>(
    null,
  )
  const [consecutiveSnakeHits, setConsecutiveSnakeHits] = useState<Record<number, number>>({})

  const snakes = useRef(DEFAULT_SNAKES)
  const ladders = useRef(DEFAULT_LADDERS)
  const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const botTurnTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animPos = useRef<Record<number, Animated.ValueXY>>({})
  const animScale = useRef<Record<number, Animated.Value>>({})

  // Audio refs
  const bgMusic = useRef<Audio.Sound | null>(null)
  const diceSound = useRef<Audio.Sound | null>(null)
  const bonusDiceSound = useRef<Audio.Sound | null>(null)
  const movementSound = useRef<Audio.Sound | null>(null)
  const finishGameSound = useRef<Audio.Sound | null>(null)
  const snakeSound = useRef<Audio.Sound | null>(null)
  const ladderSound = useRef<Audio.Sound | null>(null)

  const avatarAssets = assets.ular_tangga

  // Sync refs with constants (Hot fix for HMR/Updates)
  useEffect(() => {
    snakes.current = DEFAULT_SNAKES
    ladders.current = DEFAULT_LADDERS
  }, [])

  const themeColors = useMemo(
    () => ({
      light: {
        bg: '#ACECF9',
        primary: '#E07A5F',
        secondary: '#81B29A',
        text: '#3D405B',
        neutral: '#D4A373',
        square1: '#899B5B',
        square2: '#D8E1D5',
        start: '#2E411E',
        finish: '#2E411E',
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
    }),
    [],
  )

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
          const { sound: bg } = await Audio.Sound.createAsync(audioAssets.main_bg, {
            shouldPlay: false,
            isLooping: true,
            volume: 0.2,
          })
          bgMusic.current = bg
        }

        // Load dice sound
        if (audioAssets.dice) {
          const { sound: dice } = await Audio.Sound.createAsync(audioAssets.dice, {
            shouldPlay: false,
            volume: 0.5,
          })
          diceSound.current = dice
        }

        // Load bonus dice sound
        if (audioAssets.bonus_dice) {
          const { sound: bonus } = await Audio.Sound.createAsync(audioAssets.bonus_dice, {
            shouldPlay: false,
            volume: 0.6,
          })
          bonusDiceSound.current = bonus
        }

        // Load movement sound
        if (audioAssets.movement_bounces) {
          const { sound: movement } = await Audio.Sound.createAsync(audioAssets.movement_bounces, {
            shouldPlay: false,
            volume: 0.4,
          })
          movementSound.current = movement
        }

        // Load finish game sound
        if (audioAssets.finish_game) {
          const { sound: finish } = await Audio.Sound.createAsync(audioAssets.finish_game, {
            shouldPlay: false,
            volume: 0.7,
          })
          finishGameSound.current = finish
        }

        // Load snake sound (Drop)
        if (audioAssets.drop) {
          const { sound: drop } = await Audio.Sound.createAsync(audioAssets.drop, {
            shouldPlay: false,
            volume: 0.6,
          })
          snakeSound.current = drop
        }

        // Load ladder sound (Up)
        if (audioAssets.up) {
          const { sound: up } = await Audio.Sound.createAsync(audioAssets.up, {
            shouldPlay: false,
            volume: 0.6,
          })
          ladderSound.current = up
        }
      } catch (error) {
        // Silently handle audio loading errors
      }
    }

    loadAudio()

    return () => {
      if (moveTimer.current) clearTimeout(moveTimer.current)
      if (botTurnTimer.current) clearTimeout(botTurnTimer.current)

      // Stop background music when leaving screen
      bgMusic.current?.stopAsync().catch(() => { })

      // Cleanup audio
      bgMusic.current?.unloadAsync()
      diceSound.current?.unloadAsync()
      bonusDiceSound.current?.unloadAsync()
      movementSound.current?.unloadAsync()
      finishGameSound.current?.unloadAsync()
      snakeSound.current?.unloadAsync()
      ladderSound.current?.unloadAsync()
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

  const showEventNotification = (message: string, type: 'bonus' | 'ladder' | 'snake' | 'quiz-correct' | 'quiz-wrong') => {
    setEventNotification({ message, type })
    setTimeout(() => {
      setEventNotification(null)
    }, 2300) // Match animation duration
  }

  const generateStarTiles = () => {
    // STATIC star positions - sesuai request user (Visual Image)
    const staticStars = [
      4, 10, 14, 16, 18, 28, 38, 43, 45, 53
    ]

    setStarTiles(staticStars)
  }

  const triggerQuiz = (tile: number, playerId: number) => {
    const randomQuiz = QUIZ_QUESTIONS[Math.floor(Math.random() * QUIZ_QUESTIONS.length)]
    setCurrentQuiz(randomQuiz)
    setQuizPlayerTile(tile)
    setShowQuizModal(true)
    setInfo(`⭐ ${players.find(p => p.id === playerId)?.name} mendapat pertanyaan bonus!`)

    // Play bonus dice sound for star collection
    try {
      if (!isMuted) {
        bonusDiceSound.current?.replayAsync()
      }
    } catch (error) {
      // Silently handle audio error
    }
  }

  const handleQuizAnswer = (selectedIndex: number) => {
    if (!currentQuiz) return

    const current = players[turnIdx]
    const isCorrect = selectedIndex === currentQuiz.correctIndex
    const correctAnswer = currentQuiz.options[currentQuiz.correctIndex]

    if (isCorrect) {
      setQuizFeedback({ isCorrect: true, message: `✅ Benar! ${current.name} dapat giliran tambahan!` })

      setTimeout(() => {
        setShowQuizModal(false)
        setQuizFeedback(null)
        setInfo(`✅ Benar! ${current.name} dapat giliran tambahan!`)
        setCurrentQuiz(null)
        // Show notification after modal closes
        showEventNotification('⭐ Jawaban Benar! Giliran Tambahan! 🎉', 'quiz-correct')
      }, 2000)
      // Don't advance turn - player gets extra turn
    } else {
      // Show correct answer in the modal
      setQuizFeedback({ isCorrect: false, message: `❌ Salah! Jawaban yang benar: "${correctAnswer}"` })

      setTimeout(() => {
        setShowQuizModal(false)
        setQuizFeedback(null)
        setInfo(`${current.name} mundur 1 langkah`)

        // Show notification after modal closes
        showEventNotification('❌ Jawaban Salah! Mundur 1 Langkah', 'quiz-wrong')

        // Move player back 1 step
        setPlayers((ps) =>
          ps.map((pl) =>
            pl.id === current.id ? { ...pl, pos: Math.max(0, pl.pos - 1) } : pl
          )
        )

        // Advance to next player
        const nextTurnIdx = getNextActiveTurnIdx(turnIdx)
        setTurnIdx(nextTurnIdx)

        setTimeout(() => {
          setInfo(`Giliran ${players[nextTurnIdx]?.name}`)
        }, 500)

      }, 3000) // 3 seconds delay to show correct answer
    }
  }

  const startGame = async () => {
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
        pos: 1,
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
          { gender: 'Female', skinTone: 'DARK', hair: 'BRAID', clothes: 'BASIC' },
          { gender: 'Male', skinTone: 'LIGHT', hair: 'HAIR2', clothes: 'BASIC' },
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
          pos: 1,
          isBot: true,
        }
      })
      allPlayers = [...humanPlayers, ...botPlayers]
    }

    setPlayers(allPlayers)
    setTurnIdx(0)
    setInfo(`Game dimulai! Giliran ${allPlayers[0].name}`)
    setPhase('play')

    // Generate random star tiles (5-8 stars on empty squares)
    generateStarTiles()

    // Initialize all players with IDLE animation state
    const initialAnimStates: Record<number, string> = {}
    allPlayers.forEach((p) => {
      initialAnimStates[p.id] = 'IDLE'
    })
    setPlayerAnimStates(initialAnimStates)

    // Start background music
    try {
      if (!isMuted) {
        await bgMusic.current?.replayAsync()
      }
    } catch (error) {
      // Silently handle audio playback errors
    }
  }

  // Quick start game with default avatars
  const quickStartGame = async (count: number) => {
    // Create default avatar configurations
    const defaultAvatarConfigs: Array<{
      gender: Gender
      skinTone: SkinTone
      hair: string
      clothes: string
    }> = [
        { gender: 'Female', skinTone: 'LIGHT', hair: 'BRAID', clothes: 'BASIC' },
        { gender: 'Male', skinTone: 'MEDIUM', hair: 'HAIR1', clothes: 'BASIC' },
        { gender: 'Female', skinTone: 'DARK', hair: 'PONYTAIL', clothes: 'BASIC' },
        { gender: 'Male', skinTone: 'LIGHT', hair: 'HAIR2', clothes: 'BASIC' },
        { gender: 'Female', skinTone: 'MEDIUM', hair: 'BRAID', clothes: 'BASIC' },
      ]

    // Create players with default avatars
    const quickPlayers: Player[] = Array.from({ length: count }, (_, i) => {
      const avatarConfig = defaultAvatarConfigs[i % defaultAvatarConfigs.length]
      return {
        id: i,
        name: `Pemain ${i + 1}`,
        avatar: {
          gender: avatarConfig.gender,
          skinTone: avatarConfig.skinTone,
          hair: avatarConfig.hair,
          clothes: avatarConfig.clothes,
          color: TOKEN_COLORS[i % TOKEN_COLORS.length] || '#6b7280',
        },
        pos: 1,
        isBot: false,
      }
    })

    setPlayers(quickPlayers)
    setTurnIdx(0)
    setInfo(`Game dimulai! Giliran ${quickPlayers[0].name}`)
    setPhase('play')

    // Generate random star tiles
    generateStarTiles()

    // Initialize all players with IDLE animation state
    const initialAnimStates: Record<number, string> = {}
    quickPlayers.forEach((p) => {
      initialAnimStates[p.id] = 'IDLE'
    })
    setPlayerAnimStates(initialAnimStates)

    // Start background music
    try {
      if (!isMuted) {
        await bgMusic.current?.replayAsync()
      }
    } catch (error) {
      // Silently handle audio playback errors
    }
  }

  const resetGame = async () => {
    // Close settings modal
    setShowSettingsModal(false)

    setPlayers([])
    setPhase('select_mode')
    setInfo('Pilih jumlah pemain (2-5)')
    setTurnIdx(0)
    setGameEnded(false)
    setGameMode('multiplayer')
    setBots([])
    setBotReaction(null)
    setConsecutiveSnakeHits({})

    // Reset snakes and ladders to default
    snakes.current = DEFAULT_SNAKES
    ladders.current = DEFAULT_LADDERS

    // Stop background music
    try {
      await bgMusic.current?.stopAsync()
    } catch (error) {
      // Silently handle audio stop errors
    }
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

  // Helper function to trigger bot turn
  const triggerBotTurnIfNeeded = useCallback(
    (playerIdx: number) => {
      // Clear any existing bot turn timer
      if (botTurnTimer.current) {
        clearTimeout(botTurnTimer.current)
        botTurnTimer.current = null
      }

      if (gameMode === 'solo' && players.length > 0) {
        const nextPlayer = players[playerIdx]
        if (nextPlayer?.isBot) {
          const bot = bots.find((b) => b.name === nextPlayer.name)
          if (bot) {
            const delays = calculateBotActionDelays(bot.personality)
            setInfo(getBotMessage(bot.name, bot.personality, 'thinking'))
            botTurnTimer.current = setTimeout(() => {
              botTurnTimer.current = null
              // Trigger roll for bot - we need to call this indirectly
              // by setting a flag or using a ref
            }, delays.beforeRoll)
          }
        }
      }
    },
    [gameMode, players, bots],
  )

  // Helper function to show bot reaction
  const showBotReaction = useCallback(
    (
      event:
        | 'player_snake'
        | 'player_ladder'
        | 'bot_snake'
        | 'bot_ladder'
        | 'bot_win'
        | 'player_win',
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
    },
    [bots],
  )

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

  const restartGame = async () => {
    // Close settings modal
    setShowSettingsModal(false)

    // Stop background music
    try {
      await bgMusic.current?.stopAsync()
    } catch (error) {
      // Silently handle error
    }

    // Reset all game states
    setShowVictoryModal(false)
    setWinner(null)
    setGameEnded(false)
    setPlayers([])
    setTurnIdx(0)
    setDice(1)
    setInfo('Pilih jumlah pemain (2-5)')
    setIsAnimating(false)
    setPlayerAnimStates({})
    setPhase('setup')

    // Reset snakes and ladders to default
    snakes.current = DEFAULT_SNAKES
    ladders.current = DEFAULT_LADDERS
  }

  const backToHome = async () => {
    // Close settings modal
    setShowSettingsModal(false)

    // Stop background music
    try {
      await bgMusic.current?.stopAsync()
    } catch (error) {
      // Silently handle error
    }

    // Reset everything and go back to mode selection
    setShowVictoryModal(false)
    setWinner(null)
    setGameEnded(false)
    setPlayers([])
    setTurnIdx(0)
    setDice(1)
    setInfo('Pilih jumlah pemain (2-5)')
    setIsAnimating(false)
    setPlayerAnimStates({})
    setPhase('select_mode')

    // Reset snakes and ladders to default
    snakes.current = DEFAULT_SNAKES
    ladders.current = DEFAULT_LADDERS
  }

  const toggleMute = async () => {
    const newMutedState = !isMuted
    setIsMuted(newMutedState)

    try {
      if (newMutedState) {
        // Mute: pause background music
        await bgMusic.current?.pauseAsync()
      } else {
        // Unmute: play background music
        // Only play if we are in 'play' phase
        if (phase === 'play') {
          await bgMusic.current?.playAsync()
        }
      }
    } catch (error) {
      // Silently handle audio errors
    }
  }

  const getActivePlayers = () => players.filter((p) => p.pos < PLAYABLE_SQUARES)

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

  const toggleSettings = () => {
    const toValue = isSettingsExpanded ? 0 : 1
    Animated.spring(settingsAnim, {
      toValue,
      useNativeDriver: false,
      friction: 12, // Increased friction to reduce overshoot
      tension: 40,
    }).start()
    setIsSettingsExpanded(!isSettingsExpanded)
  }

  const roll = async () => {
    if (phase !== 'play' || isAnimating || players.length === 0 || showQuizModal) return

    const activePlayers = getActivePlayers()
    if (activePlayers.length === 0) {
      setInfo('Semua pemain telah selesai! 🎉')
      return
    }

    const current = players[turnIdx]
    if (!current) return // Safety check

    const currentId = current.id // Store the ID to ensure we always update the correct player
    const isCurrentBot = current.isBot

    // Use bot dice logic for bot players, regular dice for human players
    let d: number
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
        d = botAction.diceValue
        setInfo(getBotMessage(bot.name, bot.personality, 'rolling'))
      } else {
        // Dev mode: use controlled dice value if set
        if (isDevMode && devDiceValue.current !== null) {
          d = devDiceValue.current
          devDiceValue.current = null // Reset after use
        } else {
          d = Math.floor(Math.random() * 6) + 1
        }
      }
    } else {
      // Dev mode: use controlled dice value if set
      if (isDevMode && devDiceValue.current !== null) {
        d = devDiceValue.current
        devDiceValue.current = null // Reset after use
      } else {
        d = Math.floor(Math.random() * 6) + 1
      }
    }

    // Play dice sound effect immediately when clicked
    try {
      if (!isMuted) {
        await diceSound.current?.replayAsync()
      }
    } catch (error) {
      // Silently handle audio playback errors
    }

    // Start dice rolling animation after sound
    setIsDiceRolling(true)

    // Delay to show rolling animation
    await new Promise((resolve) => setTimeout(resolve, 800))

    setDice(d)
    setIsDiceRolling(false)

    // No bonus for rolling 6 anymore

    // Special handling for starting position (pos 0)
    // When at pos 0, player needs to land on square 1 (Start) first, then continue
    // So for dice value d, they should end at square 1 + d (not 0 + d)
    const target = current.pos === 0 ? 1 + d : current.pos + d

    if (target > PLAYABLE_SQUARES) {
      setInfo(
        `${current.name} rolled ${d} → but needs exact ${PLAYABLE_SQUARES - current.pos
        } to finish. Giliran lanjut.`,
      )
      setTurnIdx((s) => getNextActiveTurnIdx(s))
      return
    }

    setIsAnimating(true)
    setInfo(`${current.name} rolled ${d} → moving...`)

    // Mark this player as moving to keep them centered during animation
    setMovingPlayerId(current.id)

    // Step 1: Center and enlarge the avatar before moving
    const { x: startX, y: startY } = squareToXY(current.pos)
    const centerLeft = startX * cell + cell / 2 - (cell * 0.15) // Center horizontally
    const centerTop = startY * cell + cell / 2 - (cell * 0.15) // Center vertically

    const centerAnim = animPos.current[current.id]
    const scaleAnim = animScale.current[current.id]

    if (centerAnim && scaleAnim) {
      // Animate to center and scale up
      Animated.parallel([
        Animated.timing(centerAnim, {
          toValue: { x: centerLeft, y: centerTop },
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()

      // Wait for centering animation to complete
      await new Promise((resolve) => setTimeout(resolve, 250))
    }

    let step = current.pos
    let animationDelay = 0 // Track total animation time for ladder/snake

    const hop = () => {
      if (step >= target) {
        // First check for ladder/snake
        let final = step
        let hasLadder = false
        let hasSnake = false

        if (ladders.current[final]) {
          const to = ladders.current[final]
          setInfo((s) => `${s} | TANGGA ${final} → ${to}`)
          hasLadder = true

          // Show ladder notification
          showEventNotification(`🪜 Naik Tangga! ${final} → ${to}`, 'ladder')

          // Play ladder sound (Up)
          try {
            if (!isMuted) {
              ladderSound.current?.replayAsync()
            }
          } catch (error) {
            // Silently handle audio error
          }

          // Bot reaction to player ladder
          if (!isCurrentBot && gameMode === 'solo') {
            showBotReaction('player_ladder')
          }

          // Animate ladder climb: UL/UR alternating
          const climbSteps = Math.abs(to - final)
          animationDelay = climbSteps * 200 + 400 // Total climb time + BACK animation

          let climbCount = 0
          const climbInterval = setInterval(() => {
            if (climbCount >= climbSteps) {
              clearInterval(climbInterval)
              // After climbing, show BACK animation then IDLE
              setPlayerAnimStates((prev) => ({ ...prev, [current.id]: 'BACK' }))
              setTimeout(() => {
                setPlayerAnimStates((prev) => ({ ...prev, [current.id]: 'IDLE' }))
              }, 400)
              return
            }

            // Alternate between UL and UR for climbing effect
            const climbAnim = climbCount % 2 === 0 ? 'UL' : 'UR'
            setPlayerAnimStates((prev) => ({ ...prev, [current.id]: climbAnim }))
            climbCount++
          }, 200)

          final = to
        }

        if (snakes.current[final]) {
          const to = snakes.current[final]
          setInfo((s) => `${s} | ULAR ${final} → ${to}`)
          hasSnake = true
          animationDelay = 900 // Total slide time (600 + 300)

          // Show snake notification (without tile numbers)
          showEventNotification(`🐍 Kena Ular!`, 'snake')

          // Play snake sound (Drop)
          try {
            if (!isMuted) {
              snakeSound.current?.replayAsync()
            }
          } catch (error) {
            // Silently handle audio error
          }

          // Bot reaction to player snake
          if (!isCurrentBot && gameMode === 'solo') {
            showBotReaction('player_snake')
          }

          // Animate snake slide: SL/SR based on direction
          const slideDir = to < final ? 'SL' : 'SR'
          setPlayerAnimStates((prev) => ({ ...prev, [current.id]: slideDir }))

          setTimeout(() => {
            // After sliding, show STL/STR (steady) then IDLE
            const steadyAnim = slideDir === 'SL' ? 'STL' : 'STR'
            setPlayerAnimStates((prev) => ({ ...prev, [current.id]: steadyAnim }))
            setTimeout(() => {
              setPlayerAnimStates((prev) => ({ ...prev, [current.id]: 'IDLE' }))
            }, 300)
          }, 600)

          final = to
        }

        setPlayers((ps) => {
          const updatedPlayers = ps.map((pl) => (pl.id === current.id ? { ...pl, pos: final } : pl))

          // Check game end conditions with updated player data
          setIsAnimating(false)
          setMovingPlayerId(null) // Clear moving state

          if (hasLadder || hasSnake) triggerBounce(current.id)

          if (final === PLAYABLE_SQUARES) {
            triggerBounce(current.id)

            // Victory animation - jump!
            setPlayerAnimStates((prev) => ({ ...prev, [current.id]: 'JR' }))
            setTimeout(() => {
              setPlayerAnimStates((prev) => ({ ...prev, [current.id]: 'IDLE' }))
            }, 500)

            // Bot reaction to win/lose
            if (gameMode === 'solo') {
              showBotReaction(isCurrentBot ? 'bot_win' : 'player_win')
            }

            const finishedPlayers = updatedPlayers.filter((p) => p.pos >= PLAYABLE_SQUARES)
            const activePlayers = updatedPlayers.filter((p) => p.pos < PLAYABLE_SQUARES)

            // Game ends if only 1 active player remains
            if (activePlayers.length === 1) {
              const loser = activePlayers[0]
              setInfo(`${current.name} MENANG! 🎉 | ${loser.name} kalah (terakhir yang tersisa)`)
              setGameEnded(true)
              setWinner(current)
              setShowVictoryModal(true)

              // Play victory/lose sound based on winner
              if (!isMuted) {
                if (current.isBot) {
                  // Player lost to bot
                  const loseSound = assets.ular_tangga?.audio?.fail_game
                  if (loseSound) {
                    Audio.Sound.createAsync(loseSound, { shouldPlay: true, volume: 0.7 }).catch(() => { })
                  }
                } else {
                  // Human player won
                  finishGameSound.current?.replayAsync().catch(() => { })
                }
              }

              return updatedPlayers
            }

            // Game ends if 3+ total players AND 3 have finished
            if (updatedPlayers.length >= 3 && finishedPlayers.length >= 3) {
              const losers = activePlayers.map((p) => p.name).join(', ')
              setInfo(`${current.name} MENANG! 🎉 | Game berakhir! Yang kalah: ${losers}`)
              setGameEnded(true)
              setWinner(current)
              setShowVictoryModal(true)

              // Play victory/lose sound based on winner
              if (!isMuted) {
                if (current.isBot) {
                  // Player lost to bot
                  const loseSound = assets.ular_tangga?.audio?.fail_game
                  if (loseSound) {
                    Audio.Sound.createAsync(loseSound, { shouldPlay: true, volume: 0.7 }).catch(() => { })
                  }
                } else {
                  // Human player won
                  finishGameSound.current?.replayAsync().catch(() => { })
                }
              }

              return updatedPlayers
            }

            // Continue game - advance turn
            setInfo(
              `${current.name} MENANG! 🎉, tersisa ${activePlayers.length} pemain yang tersisa`,
            )

            // Play victory sound for this player
            if (!isMuted) {
              finishGameSound.current?.replayAsync().catch(() => { })
            }

            if (activePlayers.length > 0) {
              setTimeout(() => setTurnIdx((s) => getNextActiveTurnIdx(s)), 100)
            }
          }

          return updatedPlayers
        })

        if (final !== PLAYABLE_SQUARES) {
          setIsAnimating(false)
          if (hasLadder || hasSnake) triggerBounce(current.id)

          // Reset animation state to IDLE after movement completes (if no ladder/snake)
          if (!hasLadder && !hasSnake) {
            setTimeout(() => {
              setPlayerAnimStates((prev) => ({ ...prev, [current.id]: 'IDLE' }))
            }, 200)
          }

          // Check for star tile AFTER ladder/snake movement
          if (starTiles.includes(final)) {
            // Remove star from tiles after collecting
            setStarTiles(prev => prev.filter(s => s !== final))
            // Trigger quiz
            triggerQuiz(final, current.id)
          }
        }

        // Advance turn always (no dice 6 bonus)
        if (!starTiles.includes(final)) {
          // Delay turn change if there was ladder/snake animation
          if (animationDelay > 0) {
            setTimeout(() => {
              setTurnIdx((s) => getNextActiveTurnIdx(s))
            }, animationDelay + 200) // Extra 200ms buffer
          } else {
            setTurnIdx((s) => getNextActiveTurnIdx(s))
          }
        }
        return
      }

      // Moving animation
      step += 1
      const prevPos = squareToXY(step - 1)
      const currPos = squareToXY(step)

      // Play movement bounce sound for each hop
      try {
        if (!isMuted) {
          movementSound.current?.replayAsync()
        }
      } catch (error) {
        // Silently handle audio error
      }

      // Determine jump direction based on movement
      let jumpAnim = 'JR' // default jump right
      if (currPos.x < prevPos.x) {
        jumpAnim = 'JL' // jump left
      } else if (currPos.y > prevPos.y) {
        jumpAnim = 'JR' // jump right when going up
      } else if (currPos.y < prevPos.y) {
        jumpAnim = 'JL' // jump left when going down
      }

      setPlayerAnimStates((prev) => ({ ...prev, [current.id]: jumpAnim }))
      setPlayers((ps) => ps.map((pl) => (pl.id === current.id ? { ...pl, pos: step } : pl)))

      // Add bounce effect when hopping
      const scaleAnim = animScale.current[current.id]
      if (scaleAnim) {
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start()
      }

      moveTimer.current = setTimeout(hop, 300)
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

  const squareToPixel = (n: number, id: number, allPlayers: Player[] = players) => {
    const { x, y } = squareToXY(n)

    let offsetX = 0
    let offsetY = 0

    // If this player is currently moving, keep them centered
    if (movingPlayerId === id) {
      // Center for moving player (size 1.3 usually handles itself via scale, but base pos needs to be center)
      // Base padding 0.05 + 0.1 = 0.15.
      offsetX = cell * 0.1
      offsetY = cell * 0.1
    } else {
      // Find all players on the same tile
      const playersOnTile = allPlayers.filter(p => p.pos === n)
      const playerIndex = playersOnTile.findIndex(p => p.id === id)

      // Only apply formation if multiple players are on the same tile
      if (playersOnTile.length > 1 && playerIndex >= 0) {
        // Formation: 3 players on top row, 2 players on bottom row (centered)
        if (playerIndex <= 2) {
          // Top row: players 0, 1, 2
          const spacing = cell * 0.22
          offsetX = playerIndex * spacing
          offsetY = 0
        } else {
          // Bottom row: players 3, 4 (centered)
          const spacing = cell * 0.22
          const centerOffset = spacing * 0.5 // Shift right to center
          offsetX = (playerIndex - 3) * spacing + centerOffset
          offsetY = cell * 0.22
        }
      } else {
        // Single player on tile: centered position
        // Size is up to 0.7. We want center (0.15 margin).
        // Base padding is 0.05. So we need 0.1 offset.
        offsetX = cell * 0.1
        offsetY = cell * 0.1
      }
    }

    // Reduced base padding from 0.1 to 0.05 to prevent bottom cut-off
    const left = x * cell + cell * 0.05 + offsetX
    const top = y * cell + cell * 0.05 + offsetY
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
    // Don't initialize if cell size is not ready
    if (cell <= 0) return

    players.forEach((p) => {
      const { left, top } = squareToPixel(p.pos, p.id, players)

      if (!animPos.current[p.id]) {
        // Initialize new player
        animPos.current[p.id] = new Animated.ValueXY({ x: left, y: top })
      } else {
        // Update existing player position immediately when cell size changes
        animPos.current[p.id].setValue({ x: left, y: top })
      }

      if (!animScale.current[p.id]) animScale.current[p.id] = new Animated.Value(1)
    })

    // Force re-render to ensure avatars appear after initialization
    if (!initialized) {
      setInitialized(true)
    }
  }, [players, cell, movingPlayerId])

  useEffect(() => {
    // Don't animate if cell size is not ready
    if (cell <= 0) return

    players.forEach((p) => {
      const a = animPos.current[p.id]
      if (!a) return
      const { left, top } = squareToPixel(p.pos, p.id, players)
      Animated.timing(a, {
        toValue: { x: left, y: top },
        duration: 240,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start()
    })
  }, [players, cell, movingPlayerId])

  // Trigger bot turn when turnIdx changes and it's a bot's turn
  useEffect(() => {
    if (phase === 'play' && !isAnimating && players.length > 0 && !gameEnded && !showQuizModal) {
      const currentPlayer = players[turnIdx]
      // Explicit check: only auto-roll if current player is DEFINITELY a bot
      if (currentPlayer?.isBot === true && gameMode === 'solo') {
        const bot = bots.find((b) => b.name === currentPlayer.name)
        if (bot) {
          // Clear any existing bot turn timer
          if (botTurnTimer.current) {
            clearTimeout(botTurnTimer.current)
            botTurnTimer.current = null
          }

          const delays = calculateBotActionDelays(bot.personality)
          setInfo(getBotMessage(bot.name, bot.personality, 'thinking'))
          botTurnTimer.current = setTimeout(() => {
            botTurnTimer.current = null
            // Double-check before rolling: ensure it's still bot's turn
            const stillBotTurn = players[turnIdx]?.isBot === true
            if (stillBotTurn && !isAnimating) {
              roll()
            }
          }, delays.beforeRoll)
        }
      }
    }

    // Cleanup timer on unmount or when dependencies change
    return () => {
      if (botTurnTimer.current) {
        clearTimeout(botTurnTimer.current)
        botTurnTimer.current = null
      }
    }
  }, [turnIdx, phase, isAnimating, players.length, gameEnded, gameMode, showQuizModal])

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
                  { backgroundColor: getSkinToneColor(skinTone) },
                  currentAvatar.skinTone === skinTone && styles.selectedSkinColor,
                ]}
              >
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
    <View style={styles.screen}>
      <LinearGradient
        colors={['#ACECF9', '#FFFFFF']}
        style={[
          styles.gradientBg,
          { paddingTop: 4 + insets.top },
        ]}
      >
        <ImageBackground
          source={phase === 'setup' ? assets.ular_tangga?.['background-2'] : assets.ular_tangga?.background}
          style={styles.inner}
          imageStyle={{ resizeMode: 'cover', opacity: phase === 'setup' ? 1 : 0.08 }}
        >
          {/* --- 1. FOOTER (Place this FIRST) --- */}
          {/* Since it is rendered first, it sits at the back */}
          {phase !== 'setup' && (
            <View style={styles.footerContainer} pointerEvents="none">
              <FooterSvg width="100%" height={120} preserveAspectRatio="none" />
            </View>
          )}

          <View style={styles.contentWrapper}>
            {/* --- 2. MAIN CONTENT (Place this SECOND) --- */}
            {/* Since it is rendered second, it sits ON TOP of the footer */}
            {/* Only show logo for choose phase, not setup */}
            {phase === 'choose' && (
              <LogoSvg
                width={400}
                height={120}
                style={styles.logoImage}
                preserveAspectRatio="xMidYMid meet"
              />
            )}

            {phase === 'choose' && (
              <View style={[styles.phaseContainer, { backgroundColor: themeColors[theme].cardBg }]}>
                {/* Top Navigation Buttons Row */}
                <View style={styles.topNavButtonsRow}>
                  <Pressable
                    onPress={() => setPhase('select_mode')}
                    style={styles.topBackButton}
                  >
                    <Text style={styles.topBackButtonText}>← Kembali</Text>
                  </Pressable>
                </View>

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
                      onPress={() => {
                        setPlayerCount(n)
                        // Go directly to setup for all player counts
                        setPhase('setup')
                      }}
                      style={[
                        styles.playerCountButton,
                        playerCount === n && styles.playerCountButtonActive,
                      ]}
                    >
                      <Text style={styles.playerCountText}>{n} Pemain</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {phase === 'setup' && (
              <ScrollView
                style={styles.setupScrollView}
                contentContainerStyle={[styles.setupScrollContent, { paddingBottom: 160 }]}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.setupCard}>
                  {/* Top Navigation Buttons Row */}
                  <View style={styles.topNavButtonsRow}>
                    {/* Back Button - Always visible */}
                    <Pressable
                      onPress={() => {
                        if (currentPlayerSetup > 0) {
                          // Go to previous player
                          gotoPlayer(-1)
                        } else {
                          // Go back to player count selection
                          setPhase('choose')
                        }
                      }}
                      style={styles.topBackButton}
                    >
                      <Text style={styles.topBackButtonText}>← Kembali</Text>
                    </Pressable>

                    {/* Next/Start Button */}
                    <Pressable
                      onPress={() => {
                        if (currentPlayerSetup < playerCount - 1) {
                          // Go to next player
                          gotoPlayer(1)
                        } else {
                          // Start game
                          startGame()
                        }
                      }}
                      style={[
                        styles.topNavButton,
                        !canStart && currentPlayerSetup === playerCount - 1 && styles.topNavButtonDisabled,
                      ]}
                      disabled={!canStart && currentPlayerSetup === playerCount - 1}
                    >
                      <Text style={styles.topNavButtonText}>
                        {currentPlayerSetup < playerCount - 1 ? 'Pemain Berikutnya' : 'Mulai Bermain'}
                      </Text>
                    </Pressable>
                  </View>
                  {/* Name input with pencil icon */}
                  <View style={styles.nameInputRow}>
                    <TextInput
                      value={tempNames[currentPlayerSetup] || ''}
                      onChangeText={updateTempName}
                      placeholder={`Pemain ${currentPlayerSetup + 1}`}
                      placeholderTextColor="#94a3b8"
                      style={styles.nameInputFieldWithIcon}
                      maxLength={14}
                    />

                  </View>

                  {/* Gender selection - centered without label */}
                  <View style={styles.genderRowCentered}>
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
                          styles.genderButton,
                          (tempAvatars[currentPlayerSetup]?.gender || 'Female') === 'Male' &&
                          styles.genderButtonActive,
                        ]}
                      >
                        {assets.ular_tangga?.maleIcon && (
                          <Image
                            source={assets.ular_tangga.maleIcon}
                            style={styles.genderButtonIcon}
                            resizeMode="contain"
                          />
                        )}
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
                          styles.genderButton,
                          (tempAvatars[currentPlayerSetup]?.gender || 'Female') === 'Female' &&
                          styles.genderButtonActive,
                        ]}
                      >
                        {assets.ular_tangga?.femaleIcon && (
                          <Image
                            source={assets.ular_tangga.femaleIcon}
                            style={styles.genderButtonIcon}
                            resizeMode="contain"
                          />
                        )}
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.avatarStrip}>
                    <View style={styles.avatarCenterRow}>
                      {/* Arrow buttons removed - use top navigation buttons instead */}

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

                            const { gender, skinTone, hair, clothes, accessory } = currentAvatar
                            if (!hair || !clothes)
                              return <Text style={{ color: '#94a3b8' }}>Pilih lengkap</Text>

                            const accessoryPart = accessory || 'NONE'
                            const prefix = gender === 'Female' ? 'F' : 'M'
                            const setKey = `${prefix}-${skinTone}-${hair}-${clothes}-${accessoryPart}`

                            if (!isSetAvailable(currentAvatar)) {
                              return (
                                <Text style={{ color: '#ef4444', fontSize: 11, textAlign: 'center' }}>
                                  Set tidak tersedia
                                </Text>
                              )
                            }

                            // Get SVG component from registry
                            const avatarSvgSet = AVATAR_SVG_REGISTRY[setKey]
                            if (!avatarSvgSet) {
                              return (
                                <Text style={{ color: '#ef4444', fontSize: 11, textAlign: 'center' }}>
                                  Asset tidak ditemukan
                                </Text>
                              )
                            }

                            const AvatarSvgComponent = avatarSvgSet.IDLE
                            return <AvatarSvgComponent width="100%" height="100%" />
                          })()}
                        </View>
                      </View>

                      {/* Arrow buttons removed - use top navigation buttons instead */}
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
              </ScrollView>
            )}

            {phase === 'play' && players.length > 0 && (
              <ScrollView
                style={styles.setupScrollView}
                contentContainerStyle={[styles.setupScrollContent, { paddingBottom: 200 }]}
                showsVerticalScrollIndicator={false}
              >
                {/* Header with logo on left and expandable settings on right */}
                <View style={[styles.gameHeader, { paddingRight: 24 + insets.right, paddingLeft: 4 + insets.left, marginTop: 10 }]}>
                  {/* Left: Logo */}
                  <View style={styles.headerLeft}>
                    <LogoSvg
                      width={160}
                      height={54}
                      preserveAspectRatio="xMidYMid meet"
                    />
                  </View>

                  {/* Right: Expandable Settings */}
                  <View style={styles.headerRight}>
                    <Animated.View
                      pointerEvents={isSettingsExpanded ? 'auto' : 'none'}
                      style={[
                        styles.settingsPopup,
                        {
                          width: settingsAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 160], // 4 buttons * (32 + 8 margin)
                          }),
                          opacity: settingsAnim.interpolate({
                            inputRange: [0, 0.1, 1],
                            outputRange: [0, 0, 1],
                          }),
                        },
                      ]}
                    >
                      <Pressable onPress={() => { setShowInfoModal(true); if (isSettingsExpanded) toggleSettings(); }} style={styles.settingButton}>
                        <LinearGradient
                          colors={['#D4F1F5', '#17A4BF']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.settingButtonGradient}
                        >
                          <InfoIconSvg width={18} height={18} fill="#FFF" />
                        </LinearGradient>
                      </Pressable>
                      <Pressable onPress={() => { restartGame(); if (isSettingsExpanded) toggleSettings(); }} style={styles.settingButton}>
                        <LinearGradient
                          colors={['#F9D7C5', '#E2725B']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.settingButtonGradient}
                        >
                          <NewGameIconSvg width={18} height={18} fill="#FFF" />
                        </LinearGradient>
                      </Pressable>
                      <Pressable onPress={toggleMute} style={styles.settingButton}>
                        <LinearGradient
                          colors={isMuted ? ['#9CA3AF', '#4B5563'] : ['#FFEAB2', '#F5B101']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.settingButtonGradient}
                        >
                          <SoundIconSvg
                            width={18}
                            height={18}
                            fill={isMuted ? 'rgba(255,255,255,0.6)' : '#FFF'}
                          />
                          {isMuted && (
                            <View
                              style={{
                                position: 'absolute',
                                width: 20,
                                height: 2,
                                backgroundColor: '#FFF',
                                transform: [{ rotate: '45deg' }],
                                opacity: 0.8,
                              }}
                            />
                          )}
                        </LinearGradient>
                      </Pressable>
                      <Pressable onPress={() => { setPhase('select_mode'); if (isSettingsExpanded) toggleSettings(); }} style={styles.settingButton}>
                        <LinearGradient
                          colors={['#D8E1D5', '#899B5B']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.settingButtonGradient}
                        >
                          <Image
                            source={assets.ular_tangga?.home}
                            style={{ width: 18, height: 18, tintColor: '#FFF' }}
                            resizeMode="contain"
                          />
                        </LinearGradient>
                      </Pressable>
                    </Animated.View>

                    <Pressable onPress={toggleSettings} style={styles.settingButton}>
                      <LinearGradient
                        colors={['#6F5549', '#FDF2EC']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.settingButtonGradient}
                      >
                        <Image
                          source={assets.ular_tangga?.gearIcon}
                          style={{ width: 20, height: 20, tintColor: '#FFF' }}
                          resizeMode="contain"
                        />
                      </LinearGradient>
                    </Pressable>
                  </View>
                </View>

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

                        const displayNumber = n
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
                              borderWidth: 0,
                              borderColor: themeColors[theme].text,
                              backgroundColor: n % 2 === 0
                                ? themeColors[theme].square2 // Genap = Putih (Square 2)
                                : themeColors[theme].square1, // Ganjil = Hijau (Square 1)
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                            }}
                          >
                            {isStartSquare ? (
                              <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                                <Text
                                  style={{
                                    fontSize: Math.max(12, cell * 0.2),
                                    fontWeight: '900',
                                    color: '#FFFFFF',
                                    textAlign: 'center',
                                  }}
                                >
                                  MULAI
                                </Text>
                              </View>
                            ) : isFinishSquare ? (
                              <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                                <Image
                                  source={assets.ular_tangga?.bgFinishPng}
                                  style={{ position: 'absolute', width: '100%', height: '100%' }}
                                  resizeMode="contain"
                                />

                              </View>
                            ) : (
                              <>
                                {n === 5 && (
                                  <View style={{ position: 'absolute', bottom: 0, left: 0, width: '60%', height: '60%' }}>
                                    <BgLandmarkSvg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" />
                                  </View>
                                )}
                                {n === 35 && (
                                  <View style={{ position: 'absolute', bottom: 0, left: 0, width: '60%', height: '60%' }}>
                                    <BgCloudSvg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" />
                                  </View>
                                )}
                                <Text
                                  style={{
                                    position: 'absolute',
                                    top: 2,
                                    right: 2,
                                    fontSize: Math.max(8, cell * 0.15),
                                    color: n % 2 === 0 ? '#000000' : '#FFFFFF',
                                    fontWeight: '600',
                                    zIndex: 2,
                                  }}
                                >
                                  {displayNumber}
                                </Text>
                                {starTiles.includes(n) && (
                                  <Image
                                    source={assets.ular_tangga?.starIcon}
                                    style={{
                                      width: Math.max(20, cell * 0.4),
                                      height: Math.max(20, cell * 0.4),
                                      position: 'absolute',
                                    }}
                                    resizeMode="contain"
                                  />
                                )}
                              </>
                            )
                            }
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
                        const ladderImageIndex = LADDER_ASSET_MAP[fromNum] ?? 0
                        const LadderSvgComponent = LADDER_SVG_COMPONENTS[ladderImageIndex]

                        // Get rotation offset for this specific ladder (or default to 0)
                        const rotationOffset = LADDER_ROTATION_OFFSETS[ladderImageIndex] ?? 0

                        // Get horizontal position offset for this specific ladder (or default to -0.1)
                        const positionOffset = LADDER_POSITION_OFFSETS[ladderImageIndex] ?? -0.1

                        const distance = Math.sqrt(
                          Math.pow(path.tailX - path.headX, 2) + Math.pow(path.tailY - path.headY, 2),
                        )

                        // Add specific offset to path angle
                        const ladderRotation = path.angle + rotationOffset

                        // Use granular configuration for each ladder type
                        const normalizedHeight = cell * (LADDER_HEIGHT_FACTORS[ladderImageIndex] ?? 2.5)
                        const ladderHeight = normalizedHeight
                        const ladderWidth = cell * (LADDER_WIDTH_FACTORS[ladderImageIndex] ?? 0.5)

                        return (
                          <View key={`lad-${from}`} style={{ position: 'absolute' }}>
                            <View
                              style={{
                                position: 'absolute',
                                left: path.headX + cell * positionOffset,
                                top: (path.headY - (normalizedHeight - distance * 0.95) / 2) + (LADDER_VERTICAL_OFFSETS[ladderImageIndex] ?? 30),
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
                                <View
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    backgroundColor: themeColors[theme].ladder,
                                    borderRadius: ladderWidth * 0.2,
                                    opacity: 0.8,
                                  }}
                                />
                              )}
                            </View>

                            {/* Ladder label removed - keep system logic but don't display */}
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
                        const snakeImageIndex = SNAKE_ASSET_MAP[fromNum] ?? 0
                        const SnakeSvgComponent = SNAKE_SVG_COMPONENTS[snakeImageIndex]

                        // Get rotation offset for this specific snake (or default to 180)
                        const rotationOffset = SNAKE_ROTATION_OFFSETS[snakeImageIndex] ?? 180

                        const distance = Math.sqrt(
                          Math.pow(path.tailX - path.headX, 2) + Math.pow(path.tailY - path.headY, 2),
                        )

                        // "Jangan di rotate2" -> Force 0 rotation.
                        const snakeRotation = 0

                        const snakeHeight = distance

                        // "Ukuran asli" -> Give plenty of width so height (distance) drives the scale vs AR.
                        const snakeWidth = cell * 3.0

                        return (
                          <View key={`sna-${from}`} style={{ position: 'absolute' }}>
                            <View
                              style={{
                                position: 'absolute',
                                // Use granular offset per snake type (SNAKE_POSITION_OFFSETS)
                                left: path.headX + (SNAKE_POSITION_OFFSETS[snakeImageIndex] ?? 0),
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

                            {/* Snake label removed - keep system logic but don't display */}
                          </View>
                        )
                      })}

                      {players.map((pl) => {
                        const a = animPos.current[pl.id]
                        const s = animScale.current[pl.id] ?? new Animated.Value(1)

                        // Don't render until position is initialized
                        if (!a) return null

                        const transform = a.getTranslateTransform()

                        // Get avatar SVG component from registry
                        const { gender, skinTone, hair, clothes, accessory } = pl.avatar
                        const accessoryPart = accessory || 'NONE'
                        const prefix = gender === 'Female' ? 'F' : 'M'
                        const setKey = `${prefix}-${skinTone}-${hair}-${clothes}-${accessoryPart}`
                        const avatarSvgSet = AVATAR_SVG_REGISTRY[setKey]

                        // Get current animation state or default to IDLE
                        const currentAnimState = playerAnimStates[pl.id] || 'IDLE'
                        const validStates = [
                          'IDLE',
                          'JL',
                          'JR',
                          'SL',
                          'SR',
                          'STL',
                          'STR',
                          'UL',
                          'UR',
                          'BACK',
                        ]
                        const safeAnimState = validStates.includes(currentAnimState)
                          ? currentAnimState
                          : 'IDLE'
                        const AvatarSvgComponent = avatarSvgSet?.[safeAnimState] || avatarSvgSet?.IDLE

                        // Dynamic avatar size based on number of players
                        // 2 players: 0.7, 3 players: 0.6, 4 players: 0.45, 5 players: 0.5
                        const getAvatarSize = (playerCount: number) => {
                          if (playerCount <= 2) return 0.7
                          if (playerCount === 3) return 0.6
                          if (playerCount === 4) return 0.45
                          return 0.5 // 5 players
                        }
                        const avatarSize = getAvatarSize(players.length)

                        return (
                          <Animated.View
                            key={`pl-${pl.id}`}
                            style={{
                              position: 'absolute',
                              width: cell * avatarSize,
                              height: cell * avatarSize,
                              transform: [...transform, { scale: s }],
                              zIndex: 10,
                            }}
                          >
                            {AvatarSvgComponent ? (
                              <AvatarSvgComponent width="100%" height="100%" />
                            ) : (
                              <View
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  borderRadius: 10,
                                  backgroundColor: pl.avatar.color || '#6b7280',
                                }}
                              />
                            )}
                          </Animated.View>
                        )
                      })}
                    </View>
                  </ImageBackground>

                  {/* Event Notification Overlay */}
                  {eventNotification && (
                    <EventNotification message={eventNotification.message} type={eventNotification.type} />
                  )}
                </View>

                <View style={styles.gameControls}>
                  {/* Main Player Info - Split Layout */}
                  {getActivePlayers().length > 0 && (
                    <View style={styles.playerInfoRow}>
                      {/* Left: Player Name & Avatar */}
                      <View style={styles.playerInfoLeft}>

                        <Text style={[styles.playerName, { color: themeColors[theme].text }]}>
                          {players[turnIdx]?.name} {players[turnIdx]?.isBot ? '🤖' : ''}
                        </Text>

                        {/* Avatar Display */}
                        {players[turnIdx] && (() => {
                          const pl = players[turnIdx]
                          const { gender, skinTone, hair, clothes, accessory } = pl.avatar
                          const accessoryPart = accessory || 'NONE'
                          const prefix = gender === 'Female' ? 'F' : 'M'
                          const setKey = `${prefix}-${skinTone}-${hair}-${clothes}-${accessoryPart}`
                          const avatarSvgSet = AVATAR_SVG_REGISTRY[setKey]
                          const currentAnimState = playerAnimStates[pl.id] || 'IDLE'
                          const AvatarSvgComponent = avatarSvgSet?.[currentAnimState] || avatarSvgSet?.IDLE

                          return (
                            <BouncingAvatar>
                              <View style={styles.currentPlayerAvatar}>
                                {AvatarSvgComponent ? (
                                  <AvatarSvgComponent width="100%" height="100%" />
                                ) : (
                                  <View style={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: 10,
                                    backgroundColor: pl.avatar.color || '#6b7280'
                                  }} />
                                )}
                              </View>
                            </BouncingAvatar>
                          )
                        })()}
                      </View>

                      {/* Right: Dice & Button */}
                      <View style={styles.playerInfoRight}>
                        <View style={styles.diceDisplay}>
                          <DiceFace value={dice} isRolling={isDiceRolling} />
                        </View>

                        <Pressable
                          onPress={roll}
                          disabled={isAnimating || gameEnded || players[turnIdx]?.isBot || isDiceRolling}
                          style={[
                            styles.rollButton,
                            (isAnimating || gameEnded || players[turnIdx]?.isBot || isDiceRolling) &&
                            styles.rollButtonDisabled,
                          ]}
                        >
                          <Text style={styles.rollButtonText}>
                            {isDiceRolling
                              ? 'MELEMPAR...'
                              : isAnimating
                                ? 'BERGERAK...'
                                : gameEnded
                                  ? 'GAME BERAKHIR'
                                  : players[turnIdx]?.isBot
                                    ? 'GILIRAN BOT...'
                                    : 'Lempar Dadu'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  )}

                  {/* Bot reaction display */}
                  {botReaction && (
                    <View style={styles.botReactionContainer}>
                      <Text style={styles.botReactionText}>
                        {botReaction.emoticon} {botReaction.message}
                      </Text>
                    </View>
                  )}

                  {/* Dev Mode Toggle Button */}
                  <Pressable
                    onPress={() => setIsDevMode(!isDevMode)}
                    style={{
                      position: 'absolute',
                      bottom: 10,
                      left: 10,
                      padding: 8,
                      backgroundColor: isDevMode ? '#10b981' : '#6b7280',
                      borderRadius: 8,
                      opacity: 0.7,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                      DEV {isDevMode ? 'ON' : 'OFF'}
                    </Text>
                  </Pressable>

                  {/* Dev Dice Controls */}
                  {isDevMode && phase === 'play' && (
                    <View style={{
                      position: 'absolute',
                      bottom: 50,
                      left: 10,
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      padding: 12,
                      borderRadius: 8,
                      gap: 8,
                    }}>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Dice:</Text>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        {[1, 2, 3, 4, 5, 6].map(num => (
                          <Pressable
                            key={num}
                            onPress={() => {
                              devDiceValue.current = num;
                              if (!isAnimating && !gameEnded && !players[turnIdx]?.isBot) {
                                roll();
                              }
                            }}
                            style={{
                              backgroundColor: '#3b82f6',
                              padding: 8,
                              borderRadius: 4,
                              minWidth: 30,
                              alignItems: 'center',
                            }}
                          >
                            <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{num}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}

            {/* Victory Modal */}
            {showVictoryModal && winner && (
              <View style={styles.victoryOverlay}>
                <View style={[styles.victoryModal, { overflow: 'visible' }]}>
                  {/* Gambar tulisan MENANG/KALAH dengan animasi bouncing */}
                  <BouncingVictoryImage
                    source={winner.isBot ? assets.ular_tangga?.kalah : assets.ular_tangga?.menang}
                  />

                  {/* Spacer untuk memberi jarak dari gambar MENANG */}
                  <View style={{ height: 20 }} />

                  {/* Avatar pemenang menggantikan trophy */}
                  <View style={styles.victoryTrophyContainer}>
                    {(() => {
                      const { gender, skinTone, hair, clothes, accessory } = winner.avatar
                      const accessoryPart = accessory || 'NONE'
                      const prefix = gender === 'Female' ? 'F' : 'M'
                      const setKey = `${prefix}-${skinTone}-${hair}-${clothes}-${accessoryPart}`
                      const avatarSvgSet = AVATAR_SVG_REGISTRY[setKey]
                      const AvatarSvgComponent = avatarSvgSet?.IDLE

                      return AvatarSvgComponent ? (
                        <AvatarSvgComponent width={150} height={150} />
                      ) : (
                        <View style={{
                          width: 150,
                          height: 150,
                          borderRadius: 75,
                          backgroundColor: winner.avatar.color || '#6b7280'
                        }} />
                      )
                    })()}
                  </View>

                  <Text style={styles.victoryWinnerName}>{winner.name}</Text>

                  <View style={styles.victoryButtons}>
                    <Pressable
                      onPress={restartGame}
                      style={({ pressed }) => [
                        styles.victoryButton,
                        pressed && { transform: [{ scale: 0.9 }], opacity: 0.8 }
                      ]}
                    >
                      <Image
                        source={assets.ular_tangga?.ulang}
                        style={styles.victoryButtonIcon}
                        resizeMode="contain"
                      />
                    </Pressable>

                    <Pressable
                      onPress={backToHome}
                      style={({ pressed }) => [
                        styles.victoryButton,
                        pressed && { transform: [{ scale: 0.9 }], opacity: 0.8 }
                      ]}
                    >
                      <Image
                        source={assets.ular_tangga?.home}
                        style={styles.victoryButtonIcon}
                        resizeMode="contain"
                      />
                    </Pressable>
                  </View>
                </View>
              </View>
            )}

            {/* Quiz Modal */}
            {showQuizModal && currentQuiz && (
              <View style={styles.victoryOverlay}>
                <View style={styles.quizModal}>
                  <Text style={styles.quizTitle}>⭐ PERTANYAAN BONUS ⭐</Text>

                  <Text style={styles.quizQuestion}>{currentQuiz.question}</Text>

                  {quizFeedback ? (
                    <View style={styles.quizFeedbackContainer}>
                      <Text style={[
                        styles.quizFeedbackText,
                        quizFeedback.isCorrect ? styles.quizFeedbackCorrect : styles.quizFeedbackWrong
                      ]}>
                        {quizFeedback.message}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.quizOptions}>
                      {currentQuiz.options.map((option, index) => (
                        <Pressable
                          key={index}
                          onPress={() => handleQuizAnswer(index)}
                          style={styles.quizOptionButton}
                        >
                          <Text style={styles.quizOptionText}>{option}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Settings Modal */}
            {showSettingsModal && (
              <View style={styles.victoryOverlay}>
                <View style={styles.settingsModal}>
                  <Text style={styles.settingsTitle}>PENGATURAN</Text>

                  <Pressable onPress={resetGame} style={styles.settingsButton}>
                    <Text style={styles.settingsButtonText}>Game Baru</Text>
                  </Pressable>

                  <Pressable onPress={backToHome} style={styles.settingsButton}>
                    <Text style={styles.settingsButtonText}>Kembali ke Home</Text>
                  </Pressable>

                  <Pressable
                    onPress={toggleMute}
                    style={styles.settingsButton}
                  >
                    <Text style={styles.settingsButtonText}>{isMuted ? 'Unmute' : 'Mute'}</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setShowSettingsModal(false)}
                    style={[styles.settingsButton, styles.settingsCloseButton]}
                  >
                    <Text style={styles.settingsCloseButtonText}>Tutup</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Info Modal */}
            {showInfoModal && (
              <View style={styles.victoryOverlay}>
                <View style={styles.infoModal}>
                  <Text style={styles.infoTitle}>CARA BERMAIN</Text>

                  <View style={styles.infoSection}>
                    <Text style={styles.infoHeading}>Aturan Dasar:</Text>
                    <Text style={styles.infoText}>• Lempar dadu untuk bergerak</Text>
                    <Text style={styles.infoText}>• Dapat angka 6 = jalan lagi!</Text>
                    <Text style={styles.infoText}>• Pemain pertama mencapai SELESAI menang</Text>
                  </View>

                  <View style={styles.infoSection}>
                    <Text style={styles.infoHeading}>Event Spesial:</Text>
                    <Text style={styles.infoText}><Text style={styles.infoBold}>Tangga</Text>: Naik ke atas</Text>
                    <Text style={styles.infoText}> <Text style={styles.infoBold}>Ular</Text>: Turun ke bawah</Text>
                    <Text style={styles.infoText}><Text style={styles.infoBold}>Bintang</Text>: Quiz tentang menstruasi</Text>
                    <Text style={styles.infoText}>   • Benar = Giliran tambahan</Text>
                    <Text style={styles.infoText}>   • Salah = Mundur 1 langkah</Text>
                  </View>

                  <Pressable
                    onPress={() => setShowInfoModal(false)}
                    style={styles.infoCloseButton}
                  >
                    <Text style={styles.infoCloseButtonText}>Mengerti!</Text>
                  </Pressable>
                </View>
              </View>
            )}

          </View>
        </ImageBackground >
      </LinearGradient >
    </View >
  )
}

export default UlarTangga

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
  },
  gradientBg: {
    flex: 1,
    width: '100%',
  },
  inner: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
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
    backgroundColor: 'transparent',
    // Remove all shadow and border
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
  nameInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  nameInputFieldWithIcon: {
    backgroundColor: '#f8fbff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: '#1f2937',
    fontSize: 18,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#d8e5f0',
    textAlign: 'center',
    minWidth: 200,
  },
  pencilIcon: {
    fontSize: 20,
    marginLeft: 10,
  },
  nameInputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fbff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#d8e5f0',
    marginBottom: 20,
    marginTop: 20,
  },
  nameInputFieldInCard: {
    flex: 1,
    color: '#1f2937',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  pencilIconInCard: {
    fontSize: 20,
    marginLeft: 8,
  },
  genderRowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    marginTop: 10,
  },
  genderChipIcon: {
    color: '#1f2937',
    fontSize: 24,
    fontWeight: '700',
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
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: '#d8e5f0',
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderChipActive: {
    backgroundColor: 'rgba(154, 191, 68, 0.18)',
    borderColor: '#9abf44',
  },
  genderButton: {
    width: 60,
    height: 60,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 32,
    backgroundColor: '#FBF6EC',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(75, 84, 52, 0.1)',
  },
  genderButtonActive: {
    borderColor: '#9abf44',
    borderWidth: 3,
    backgroundColor: 'rgba(154, 191, 68, 0.08)',
  },
  genderButtonIcon: {
    width: '100%',
    height: '100%',
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
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarCenterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    width: 300,
    height: 350,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingTop: 15,
  },
  skinPreview: {
    width: 280,
    height: 330,
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
    marginTop: 16,
    backgroundColor: '#f8fbff',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
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
    paddingVertical: 8,
  },
  skinColorOption: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: 'transparent',
    shadowColor: '#b8cde1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
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
  topNavButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  topBackButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBackButtonText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '700',
  },
  topNavButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#9abf44',
    alignItems: 'center',
    shadowColor: '#9abf44',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  topNavButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  topNavButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
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
    marginTop: 0,
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
    marginTop: 10,
    gap: 16,
  },
  playerInfoRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    backgroundColor: '#f8fbff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2ecf5',
  },
  playerInfoLeft: {
    flex: 1,
    gap: 8,
    alignItems: 'center',
  },
  playerName: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  currentPlayerAvatar: {
    width: 80,
    height: 80,
    marginTop: 8,
  },
  playerInfoRight: {
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  diceDisplay: {
    alignItems: 'center',
    gap: 4,
  },
  diceNumber: {
    fontSize: 32,
    fontWeight: '900',
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
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 1,
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
    fontSize: 40,
    fontWeight: '600',
  },
  rollButton: {
    backgroundColor: '#9abf44',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#9abf44',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
    alignItems: 'center',
  },
  rollButtonDisabled: {
    opacity: 0.6,
  },
  rollButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  bottomControls: {
    gap: 16,
    marginBottom: 20,
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
    paddingBottom: 100,
  },
  victoryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  victoryModal: {
    backgroundColor: 'transparent', // Hilangkan card putih
    borderRadius: 24,
    padding: 32,
    paddingTop: 160, // Extra space di atas untuk gambar MENANG yang overflow + lebih tinggi
    alignItems: 'center',
    width: '90%',
    maxWidth: 450,
    minHeight: 600, // Tinggi-in agar content tidak mepet
  },
  victoryImage: {
    position: 'absolute',
    top: -60, // Posisi di atas card (keluar dari card)
    left: '60%', // Geser sedikit ke kanan
    width: 500,
    height: 280,
    marginLeft: -230, // Center horizontal (half of width)
    zIndex: 10,
  },
  victoryTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#F97316',
    textAlign: 'center',
    textShadowColor: 'rgba(249, 115, 22, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  victoryTrophyContainer: {
    marginVertical: 24,
  },
  victoryTrophy: {
    fontSize: 80,
  },
  victoryWinnerName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    marginBottom: 40,
  },
  victoryButtons: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
  },
  victoryButton: {
    width: 79,
    height: 79,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 32,
    backgroundColor: '#FBF6EC',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 8,
    // Inner shadow effect (will appear as subtle depth)
    borderWidth: 1,
    borderColor: 'rgba(75, 84, 52, 0.1)',
  },
  victoryButtonIcon: {
    width: '100%',
    height: '100%',
  },
  victoryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  gameTopButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  gameTopButton: {
    width: 40,
    height: 40,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  gameTopButtonText: {
    fontSize: 20,
  },
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
    marginBottom: 24,
    zIndex: 100,
  },
  headerLeft: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 50,
    minHeight: 50,
    position: 'relative', // Ensure absolute children position relative to this container
  },
  settingsPopup: {
    position: 'absolute',
    right: 40, // Gear button (32) + margin offset
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
    overflow: 'hidden', // Prevent buttons from leaking out during animation
  },
  settingButton: {
    width: 32,
    height: 32,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 1.2, height: 2.4 },
    shadowOpacity: 0.16,
    shadowRadius: 2.4,
    elevation: 3,
    zIndex: 10, // Ensure gear button stays on top of popup
  },
  settingButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: {
    fontSize: 20,
  },
  settingsModal: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    gap: 12,
  },
  settingsTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1f2937',
    marginBottom: 8,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
    gap: 12,
  },
  settingsButtonIcon: {
    fontSize: 24,
  },
  settingsButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  settingsCloseButton: {
    backgroundColor: '#9abf44',
    justifyContent: 'center',
    marginTop: 8,
  },
  settingsCloseButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  infoModal: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 450,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 20,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 24,
    marginBottom: 4,
  },
  infoBold: {
    fontWeight: '700',
    color: '#1f2937',
  },
  infoCloseButton: {
    backgroundColor: '#9abf44',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  infoCloseButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  quizModal: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '90%',
    maxWidth: 450,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  quizTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#F59E0B',
    textAlign: 'center',
    marginBottom: 20,
  },
  quizQuestion: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 26,
  },
  quizOptions: {
    width: '100%',
    gap: 12,
  },
  quizOptionButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  quizOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  quizFeedbackContainer: {
    width: '100%',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  quizFeedbackText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 26,
  },
  quizFeedbackCorrect: {
    color: '#10b981',
  },
  quizFeedbackWrong: {
    color: '#ef4444',
  },
})
