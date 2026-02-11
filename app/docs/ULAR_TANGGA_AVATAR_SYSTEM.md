# Ular Tangga Avatar Customization System

## Overview

Sistem kustomisasi avatar untuk game Ular Tangga menggunakan **pre-built avatar sets** yang di-export sebagai folder lengkap dengan berbagai pose animasi. Setiap kombinasi avatar (gender, skin tone, hair, clothes, accessories) memiliki folder sendiri yang berisi file SVG untuk berbagai state (IDLE, walk, jump, dll).

## Code Architecture (Refactored)

### Module Structure

```
src/screens/UlarTangga/optional/
├── index.tsx              # Main game component
├── characterSets.ts       # Character set definitions
├── avatarRegistry.ts      # Avatar SVG registry
├── assets/                # Game assets
├── utils/                 # Extracted utilities
│   ├── index.ts          # Barrel export
│   ├── types.ts          # Type definitions
│   ├── constants.ts      # Game constants
│   └── helpers.ts        # Helper functions
└── hooks/                 # Custom React hooks
    ├── index.ts          # Barrel export
    ├── useGameState.ts   # All game state management
    ├── useAnimations.ts  # Animation logic & refs
    └── useBotLogic.ts    # Bot AI and reactions
```

### Custom Hooks

#### useGameState

Manages all ~40 useState declarations:

- Core game state (phase, players, turnIdx, dice, etc.)
- Victory state (winner, showVictoryModal)
- Quiz state (starTiles, currentQuiz, quizFeedback)
- UI modals (settings, info, mute)
- Player setup (tempAvatars, tempNames, usedSets)
- Bot states (gameMode, difficulty, bots, botReaction)

#### useAnimations

Handles all animation logic:

- Animation refs (animPos, animScale, animJumpOffset)
- `triggerBounce()` - Token bounce effect
- `animateHop()` - Step-by-step movement
- `animateLadderClimb()` - Ladder climbing animation
- `animateSnakeSlide()` - Snake sliding animation
- `centerAndScale()` / `resetScale()` - Avatar focus effects

#### useBotLogic

Bot AI and reactions:

- `triggerBotTurnIfNeeded()` - Trigger bot's turn
- `showBotReaction()` - Display bot emotions
- `getBotDiceValue()` - Calculate bot dice based on AI

## System Architecture

### 1. Asset Structure

```
src/resources/assets/images/ular_tangga/
├── Female/
│   ├── hair/              # Preview images (.png)
│   │   ├── BRAID.png
│   │   ├── BOB.png
│   │   ├── BUN.png
│   │   ├── CURLY.png
│   │   ├── HIJAB.png
│   │   └── PONYTAIL.png
│   ├── clothes/           # Preview images (.png)
│   │   ├── BASIC.png
│   │   ├── DRESS.png
│   │   ├── BALI.png
│   │   ├── JATIM.png
│   │   └── PAPUA.png
│   ├── accessories/       # Preview images (.png)
│   │   ├── FLOWER.png
│   │   ├── GLASSES.png
│   │   ├── NECKLACE.png
│   │   ├── PAPUA.png
│   │   └── PROSTHETIC-LEG.png
│   └── set/              # Complete avatar sets
│       ├── F-LIGHT-BRAID-BASIC-NONE/
│       │   ├── IDLE.svg
│       │   ├── WALK.svg
│       │   └── ... (other animations)
│       ├── F-MEDIUM-BOB-BASIC-FLOWER/
│       └── ... (more combinations)
│
├── Male/
│   ├── hair/
│   ├── clothes/
│   ├── accessories/
│   └── set/
│
└── (board assets: logo, snakes, ladders, etc.)
```

### 2. Folder Naming Convention

**Format:** `{GENDER_PREFIX}-{SKIN_TONE}-{HAIR}-{CLOTHES}-{ACCESSORY}`

**Examples:**

- `F-LIGHT-BRAID-BASIC-NONE` → Female, Light skin, Braid hair, Basic clothes, No accessory
- `M-DARK-HAIR1-BASIC-NONE` → Male, Dark skin, Hair1, Basic clothes, No accessory
- `F-MEDIUM-BOB-BASIC-FLOWER` → Female, Medium skin, Bob hair, Basic clothes, Flower accessory

**Rules:**

- Gender prefix: `F` (Female) or `M` (Male)
- Skin tone: `LIGHT`, `MEDIUM`, `DARK`
- Hair/Clothes/Accessory: UPPERCASE names
- Accessory bisa `NONE` jika tidak ada

### 3. File Types

**Preview Assets** (untuk UI selection):

- Format: `.png`
- Location: `Female/hair/`, `Female/clothes/`, `Female/accessories/`
- Purpose: Ditampilkan di tab selection UI
- Size: ~80x80px recommended

**Avatar Sets** (untuk game):

- Format: `.svg`
- Location: `Female/set/{FOLDER_NAME}/`
- Files: `IDLE.svg`, `WALK.svg`, etc.
- Purpose: Rendered di game board dan setup preview

## Code Implementation

### 1. Type Definitions

File: `src/core/types/assets.ts`

```typescript
type Gender = 'Female' | 'Male'
type SkinTone = 'LIGHT' | 'MEDIUM' | 'DARK'

type AvatarSpec = {
  gender: Gender
  skinTone: SkinTone
  hair?: string // e.g., 'BRAID', 'BOB'
  clothes?: string // e.g., 'BASIC', 'BALI'
  accessory?: string // e.g., 'FLOWER', undefined
  color?: string // Token color for player
}
```

### 2. Available Sets Registry

File: `src/screens/UlarTangga/index.tsx`

```typescript
const AVAILABLE_SETS = {
  Female: [
    'F-DARK-BRAID-BASIC-FLOWER',
    'F-DARK-BRAID-BASIC-NONE',
    // ... semua kombinasi yang ada foldernya
  ],
  Male: [
    'M-DARK-HAIR1-BASIC-NONE',
    // ... semua kombinasi yang ada foldernya
  ],
}
```

**⚠️ IMPORTANT:** Setiap kali tambah/hapus folder set, HARUS update list ini!

### 3. Path Building Logic

```typescript
const buildAvatarPath = (avatar: AvatarSpec): string | null => {
  const { gender, skinTone, hair, clothes, accessory } = avatar
  if (!hair || !clothes) return null

  // Validate combination exists
  if (!isSetAvailable(avatar)) return null

  const accessoryPart = accessory || 'NONE'
  const prefix = gender === 'Female' ? 'F' : 'M'
  const folderName = `${prefix}-${skinTone}-${hair}-${clothes}-${accessoryPart}`

  if (gender === 'Male') {
    return `Male/set/${folderName}/IDLE.svg`
  } else {
    return `Female/set/${folderName}/IDLE.svg`
  }
}
```

### 4. Asset Registration

File: `src/resources/assets/index.ts`

```typescript
ular_tangga: {
  background: require('./images/ular_tangga/background.png'),
  logo: require('./images/ular_tangga/EduFun_ular_tangga.svg'),
  footer: require('./images/ular_tangga/bottom_page_ular_tangga.svg'),

  female: {
    hair: {
      BRAID: require('./images/ular_tangga/Female/hair/BRAID.png'),
      // ... all hair options
    },
    clothes: {
      BASIC: require('./images/ular_tangga/Female/clothes/BASIC.png'),
      // ... all clothes options
    },
    accessories: {
      FLOWER: require('./images/ular_tangga/Female/accessories/FLOWER.png'),
      // ... all accessory options
    },
  },

  male: { /* same structure */ },
}
```

**Note:** SVG set files TIDAK perlu di-register di sini. Mereka di-load dynamically pakai `SvgUri`.

## How to Add New Assets

### Step 1: Create Preview Images

1. Design preview images untuk UI selection
2. Export sebagai `.png` (recommended ~80x80px)
3. Naming: UPPERCASE, e.g., `KEBAYA.png`
4. Save ke folder yang sesuai:
   - Hair: `Female/hair/KEBAYA.png`
   - Clothes: `Female/clothes/KEBAYA.png`
   - Accessories: `Female/accessories/KEBAYA.png`

### Step 2: Create Avatar Set Folder

1. Design full avatar dengan kombinasi lengkap
2. Export animations sebagai SVG files
3. Create folder dengan naming convention:
   ```
   Female/set/F-MEDIUM-KEBAYA-BALI-FLOWER/
   ├── IDLE.svg
   ├── WALK.svg
   ├── JL.svg (Jump Left)
   ├── JR.svg (Jump Right)
   └── ... (other animations)
   ```

### Step 3: Register Preview Assets

Edit `src/resources/assets/index.ts`:

```typescript
female: {
  clothes: {
    BASIC: require('./images/ular_tangga/Female/clothes/BASIC.png'),
    KEBAYA: require('./images/ular_tangga/Female/clothes/KEBAYA.png'), // ADD THIS
  },
}
```

### Step 4: Update Available Sets List

Edit `src/screens/UlarTangga/index.tsx`:

```typescript
const AVAILABLE_SETS = {
  Female: [
    'F-DARK-BRAID-BASIC-FLOWER',
    'F-MEDIUM-KEBAYA-BALI-FLOWER', // ADD THIS
    // ... existing sets
  ],
}
```

### Step 5: Test

1. Clear cache: `yarn start --clear`
2. Rebuild iOS: `yarn ios`
3. Test di app:
   - Pilih gender → Female
   - Pilih skin → MEDIUM
   - Pilih hair → BRAID (atau yang compatible)
   - Pilih clothes → KEBAYA
   - Pilih accessories → FLOWER
   - Avatar preview harus muncul!

## Design Guidelines

### Preview Images (.png)

**Requirements:**

- Format: PNG with transparency
- Size: 80x80px to 100x100px
- Clear, recognizable design
- Consistent style across all options
- Works on light and dark backgrounds

**Best Practices:**

- Use simple, iconic representations
- Focus on distinctive features
- Maintain consistent lighting/shading
- Test readability at small sizes

### Avatar Sets (.svg)

**Requirements:**

- Format: SVG (vector)
- Clean, optimized code (remove unnecessary elements)
- Consistent dimensions across all animations
- Proper layering (skin → clothes → hair → accessories)
- All elements grouped logically

**Animation Files Needed:**

- `IDLE.svg` - Static pose (REQUIRED)
- `WALK.svg` - Walking animation (optional)
- `JL.svg`, `JR.svg` - Jump animations (optional)
- `SL.svg`, `SR.svg` - Slide animations (optional)
- `UL.svg`, `UR.svg` - Climb animations (optional)

**Best Practices:**

- Keep file sizes small (<100KB per SVG)
- Use consistent anchor points
- Test all poses before exporting
- Ensure accessories don't clip through clothes/hair

## Current Assets Summary

### Female Options

- **Hair (6)**: BRAID, CURLY, HIJAB, BOB, BUN, PONYTAIL
- **Clothes (5)**: BASIC, DRESS, BALI, JATIM, PAPUA
- **Accessories (5)**: FLOWER, GLASSES, NECKLACE, PAPUA, PROSTHETIC-LEG
- **Skin Tones (3)**: LIGHT, MEDIUM, DARK

### Male Options

- **Hair (3)**: HAIR1, HAIR2, HAIR3
- **Clothes (2)**: BASIC, JATIM
- **Accessories (2)**: MADURA-HAT, PAPUA
- **Skin Tones (3)**: LIGHT, MEDIUM, DARK

### Available Combinations

**Female:** 11 combinations (mostly BASIC clothes with various hair/accessories)
**Male:** 5 combinations (all BASIC clothes, NONE accessories)

### Board Assets

- Logo: `EduFun_ular_tangga.svg`
- Footer: `bottom_page_ular_tangga.svg`
- Ladders (4): `tangga_1.svg` - `tangga_4.svg`
- Snakes (4): `ular_2.svg`, `ular_5.svg`, `ular_7.svg`, `ular_8.svg`

## Troubleshooting

### Issue: Avatar preview tidak muncul

**Possible causes:**

1. Kombinasi tidak ada di `AVAILABLE_SETS` list
2. Folder set tidak sesuai naming convention
3. File `IDLE.svg` tidak ada di folder
4. SVG corrupt atau format salah

**Solutions:**

1. Check folder name matches convention exactly
2. Verify folder ada di `Female/set/` atau `Male/set/`
3. Update `AVAILABLE_SETS` list
4. Test SVG bisa dibuka di browser/editor

### Issue: Preview image tidak tampil di tab

**Possible causes:**

1. File tidak ter-register di `assets/index.ts`
2. File path salah
3. File name case-sensitive tidak match

**Solutions:**

1. Check `assets/index.ts` registration
2. Verify file path dan naming (UPPERCASE)
3. Clear cache dan rebuild: `yarn start --clear`

### Issue: Cache issue / old assets masih muncul

**Solution:**

```bash
# Kill all Metro processes
pkill -f "expo start"
pkill -f "metro"

# Clear caches
rm -rf node_modules/.cache
rm -rf /tmp/metro-*
rm -rf ios/build
rm -rf ios/Pods

# Reinstall
cd ios && pod install && cd ..

# Start fresh
yarn start --clear

# In new terminal
yarn ios
```

## Performance Considerations

### SVG Loading

- SVG files di-load on-demand via `SvgUri`
- Not bundled with app (dynamically resolved)
- Trade-off: Flexibility vs. bundle size

### Optimization Tips

1. Keep SVG files optimized (<100KB each)
2. Use SVGO or similar tools to minify
3. Remove unnecessary layers/groups
4. Consider limiting total combinations (<50)
5. Lazy load preview images if list grows large

## Future Improvements

### Planned Features

- [ ] Auto-disable invalid option combinations in UI
- [ ] Visual indicator for disabled options
- [ ] Preview multiple angles/poses in setup
- [ ] Animation preview in customization
- [ ] Save/load favorite combinations
- [ ] Random avatar generator

### Scalability Considerations

- Consider dynamic option loading for 100+ combinations
- Implement virtual scrolling for large option lists
- Add search/filter for accessories
- Group options by theme/region

## Development History

### Version 1.0 (Current)

- Basic Female/Male avatar system
- Pre-built set architecture
- 6 Female hair options
- 5 Female clothes options
- Regional Indonesian themes (Bali, Jatim, Papua)
- Accessibility option (Prosthetic Leg)

### Previous Versions

- v0.1: Manual overlay system (deprecated)
  - Individual PNG layers stacked
  - Manual positioning required
  - Inconsistent proportions
  - Hard to maintain animations

## References

- Main implementation: `src/screens/UlarTangga/index.tsx`
- Asset definitions: `src/resources/assets/index.ts`
- Type definitions: `src/core/types/assets.ts`
- Asset folder: `src/resources/assets/images/ular_tangga/`

---

**Last Updated:** January 7, 2026  
**Maintainer:** Development Team  
**Related Systems:** Ular Tangga Game, Asset Management
