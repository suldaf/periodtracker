// Custom Avatar Types for Personalise Oky

export type SkinTone = 'dark' | 'light' | 'medium'
export type HairStyle = 'ari' | 'dian' | 'gayatri' | 'nabire' | 'nur'
export type ClothesStyle = 'black' | 'blue' | 'orange' | 'purple' | 'yellow'
export type AccessoryStyle = 'flower' | 'hairpin' | 'none' // glasses excluded for now

export interface CustomAvatarConfig {
    skinTone: SkinTone
    hair: HairStyle
    clothes: ClothesStyle
    accessory: AccessoryStyle
}

// Default config
export const defaultCustomAvatarConfig: CustomAvatarConfig = {
    skinTone: 'light',
    hair: 'ari',
    clothes: 'black',
    accessory: 'none',
}

// Available options for pickers
export const skinToneOptions: SkinTone[] = ['light', 'medium', 'dark']
export const hairStyleOptions: HairStyle[] = ['ari', 'dian', 'gayatri', 'nabire', 'nur']
export const clothesStyleOptions: ClothesStyle[] = ['black', 'blue', 'orange', 'purple', 'yellow']
export const accessoryStyleOptions: AccessoryStyle[] = ['none', 'flower', 'hairpin']

// Display names for UI
export const skinToneDisplayNames: Record<SkinTone, string> = {
    light: 'Light',
    medium: 'Medium',
    dark: 'Dark',
}

export const hairStyleDisplayNames: Record<HairStyle, string> = {
    ari: 'Ari',
    dian: 'Dian',
    gayatri: 'Gayatri',
    nabire: 'Nabire',
    nur: 'Nur',
}

export const clothesStyleDisplayNames: Record<ClothesStyle, string> = {
    black: 'Hitam',
    blue: 'Biru',
    orange: 'Oranye',
    purple: 'Ungu',
    yellow: 'Kuning',
}

export const accessoryStyleDisplayNames: Record<AccessoryStyle, string> = {
    none: 'Tanpa Aksesoris',
    flower: 'Bunga',
    hairpin: 'Jepit Rambut',
}

/**
 * Get the filename for a custom avatar PNG based on config
 * Format: icn_avatar_{hair}_{clothes}_{accessory}.png
 */
export function getCustomAvatarFilename(config: CustomAvatarConfig): string {
    return `icn_avatar_${config.hair}_${config.clothes}_${config.accessory}.png`
}

/**
 * Get the path for a custom avatar image
 * @param config The avatar configuration
 * @param variant 'colour' for stationary display, 'theme' for icon/selection
 */
export function getCustomAvatarPath(
    config: CustomAvatarConfig,
    variant: 'colour' | 'theme'
): string {
    const filename = getCustomAvatarFilename(config)
    return `./images/custom_avatars/${variant}/${config.skinTone}/${filename}`
}
