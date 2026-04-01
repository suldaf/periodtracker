import * as React from 'react'
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native'
import { useScreenDimensions } from '../../hooks/useScreenDimensions'
import { SafeScreen } from '../../components/Screen'
import { Button } from '../../components/Button'
import { Text } from '../../components/Text'
import { useSelector } from '../../redux/useSelector'
import { customAvatarConfigSelector } from '../../redux/selectors'
import { useTranslate } from '../../hooks/useTranslate'
import { useDispatch } from 'react-redux'
import { setAvatar, setCustomAvatarConfig } from '../../redux/actions'
import { globalStyles } from '../../config/theme'
import { useColor } from '../../hooks/useColor'
import { useNavigation } from '@react-navigation/native'
import { SvgProps } from 'react-native-svg'
import {
    CustomAvatarConfig,
    SkinTone,
    HairStyle,
    ClothesStyle,
    AccessoryStyle,
    skinToneOptions,
    hairStyleOptions,
    clothesStyleOptions,
    accessoryStyleOptions,
    defaultCustomAvatarConfig,
} from '../../core/types/customAvatar'
import { getCustomAvatarImage } from '../../resources/assets/customAvatarAssets'

// Import attribute icons
import AriHair from '../../resources/assets/images/attributes/hair-set/ari.svg'
import DianHair from '../../resources/assets/images/attributes/hair-set/dian.svg'
import GayatriHair from '../../resources/assets/images/attributes/hair-set/gayatri.svg'
import NabireHair from '../../resources/assets/images/attributes/hair-set/nabire.svg'
import NurHair from '../../resources/assets/images/attributes/hair-set/nur.svg'

import BlackClothes from '../../resources/assets/images/attributes/clothes-set/black.svg'
import BlueClothes from '../../resources/assets/images/attributes/clothes-set/blue.svg'
import OrangeClothes from '../../resources/assets/images/attributes/clothes-set/orange.svg'
import PurpleClothes from '../../resources/assets/images/attributes/clothes-set/purple.svg'
import YellowClothes from '../../resources/assets/images/attributes/clothes-set/yellow.svg'

import FlowerAccessory from '../../resources/assets/images/attributes/accessories-set/flower.svg'
import HairpinAccessory from '../../resources/assets/images/attributes/accessories-set/hairpin.svg'

import DarkSkin from '../../resources/assets/images/attributes/skin-set/dark.svg'
import LightSkin from '../../resources/assets/images/attributes/skin-set/light.svg'
import MediumSkin from '../../resources/assets/images/attributes/skin-set/medium.svg'

// SVG Component type
type SvgComponent = React.FC<SvgProps>

// Tab definitions
type TabKey = 'skin' | 'hair' | 'clothes' | 'accessory'

// Mapping for SVG components
const hairIcons: Record<HairStyle, SvgComponent> = {
    ari: AriHair,
    dian: DianHair,
    gayatri: GayatriHair,
    nabire: NabireHair,
    nur: NurHair,
}

const clothesIcons: Record<ClothesStyle, SvgComponent> = {
    black: BlackClothes,
    blue: BlueClothes,
    orange: OrangeClothes,
    purple: PurpleClothes,
    yellow: YellowClothes,
}

const accessoryIcons: Record<AccessoryStyle, SvgComponent | null> = {
    flower: FlowerAccessory,
    hairpin: HairpinAccessory,
    none: null,
}

const skinIcons: Record<SkinTone, SvgComponent> = {
    dark: DarkSkin,
    light: LightSkin,
    medium: MediumSkin,
}

const CustomAvatarScreen = () => {
    const navigation = useNavigation()
    const dispatch = useDispatch()
    const savedConfig = useSelector(customAvatarConfigSelector)
    const { backgroundColor, palette } = useColor()
    const { width: screenWidth } = useScreenDimensions()
    const t = useTranslate()

    // Translated display names
    const skinToneDisplayNames: Record<SkinTone, string> = {
        light: t('custom_avatar_skin_light'),
        medium: t('custom_avatar_skin_medium'),
        dark: t('custom_avatar_skin_dark'),
    }
    const hairStyleDisplayNames: Record<HairStyle, string> = {
        ari: t('custom_avatar_hair_ari'),
        dian: t('custom_avatar_hair_dian'),
        gayatri: t('custom_avatar_hair_gayatri'),
        nabire: t('custom_avatar_hair_nabire'),
        nur: t('custom_avatar_hair_nur'),
    }
    const clothesStyleDisplayNames: Record<ClothesStyle, string> = {
        black: t('custom_avatar_clothes_black'),
        blue: t('custom_avatar_clothes_blue'),
        orange: t('custom_avatar_clothes_orange'),
        purple: t('custom_avatar_clothes_purple'),
        yellow: t('custom_avatar_clothes_yellow'),
    }
    const accessoryStyleDisplayNames: Record<AccessoryStyle, string> = {
        none: t('custom_avatar_accessory_none'),
        flower: t('custom_avatar_accessory_flower'),
        hairpin: t('custom_avatar_accessory_hairpin'),
    }

    // Tab config with translations
    const tabConfig: { key: TabKey; label: string }[] = [
        { key: 'skin', label: t('custom_avatar_skin') },
        { key: 'hair', label: t('custom_avatar_hair') },
        { key: 'clothes', label: t('custom_avatar_clothes') },
        { key: 'accessory', label: t('custom_avatar_accessory') },
    ]

    const [config, setConfig] = React.useState<CustomAvatarConfig>(
        savedConfig || defaultCustomAvatarConfig
    )
    const [activeTab, setActiveTab] = React.useState<TabKey>('skin')

    const updateConfig = <K extends keyof CustomAvatarConfig>(
        key: K,
        value: CustomAvatarConfig[K]
    ) => {
        setConfig((prev) => ({ ...prev, [key]: value }))
    }

    const handleSave = () => {
        dispatch(setCustomAvatarConfig(config))
        dispatch(setAvatar('custom'))
        navigation.goBack()
    }

    const previewImage = getCustomAvatarImage(config, 'colour')

    // Get current tab options
    const renderTabContent = () => {
        switch (activeTab) {
            case 'skin':
                return renderOptions(
                    skinToneOptions,
                    config.skinTone,
                    (v) => updateConfig('skinTone', v),
                    skinIcons,
                    skinToneDisplayNames,
                )
            case 'hair':
                return renderOptions(
                    hairStyleOptions,
                    config.hair,
                    (v) => updateConfig('hair', v),
                    hairIcons,
                    hairStyleDisplayNames,
                )
            case 'clothes':
                return renderOptions(
                    clothesStyleOptions,
                    config.clothes,
                    (v) => updateConfig('clothes', v),
                    clothesIcons,
                    clothesStyleDisplayNames,
                )
            case 'accessory':
                return renderOptions(
                    accessoryStyleOptions,
                    config.accessory,
                    (v) => updateConfig('accessory', v),
                    accessoryIcons,
                    accessoryStyleDisplayNames,
                )
        }
    }

    const renderOptions = <T extends string>(
        options: T[],
        selectedValue: T,
        onSelect: (value: T) => void,
        icons: Record<T, SvgComponent | null>,
        displayNames: Record<T, string>,
    ) => (
        <View style={styles.optionsRow}>
            {options.map((option) => {
                const IconComponent = icons[option]
                const isSelected = selectedValue === option

                return (
                    <TouchableOpacity
                        key={option}
                        onPress={() => onSelect(option)}
                        style={[
                            styles.optionButton,
                            {
                                backgroundColor,
                                borderColor: isSelected ? palette.primary.base : '#ddd',
                                borderWidth: isSelected ? 3 : 2,
                            },
                        ]}
                    >
                        {IconComponent ? (
                            <View style={styles.iconContainer}>
                                {React.createElement(IconComponent as React.FC<SvgProps>, {
                                    width: 44,
                                    height: 44,
                                })}
                            </View>
                        ) : (
                            <View style={[styles.iconContainer, styles.noneIcon]}>
                                <Text style={styles.noneText}>✕</Text>
                            </View>
                        )}
                        <Text
                            style={[
                                styles.optionLabel,
                                {
                                    color: isSelected
                                        ? palette.primary.base
                                        : palette.secondary.text,
                                    fontWeight: isSelected ? '700' : '500',
                                },
                            ]}
                            numberOfLines={1}
                        >
                            {displayNames[option]}
                        </Text>
                    </TouchableOpacity>
                )
            })}
        </View>
    )

    return (
        <SafeScreen style={styles.screen}>
            {/* Preview */}
            <View style={styles.previewSection}>
                {previewImage ? (
                    <Image source={previewImage} style={[styles.previewImage, { width: screenWidth * 0.55, height: screenWidth * 0.55 }]} />
                ) : (
                    <View style={styles.previewPlaceholder}>
                        <Text style={styles.loadingText}>{t('custom_avatar_loading')}</Text>
                    </View>
                )}
            </View>

            {/* Card Besar */}
            <View
                style={[
                    styles.card,
                    { backgroundColor },
                    globalStyles.shadow,
                    globalStyles.elevation,
                ]}
            >
                {/* Tab Bar */}
                <View style={styles.tabBar}>
                    {tabConfig.map((tab) => {
                        const isActive = activeTab === tab.key
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                onPress={() => setActiveTab(tab.key)}
                                style={[
                                    styles.tab,
                                    isActive && {
                                        borderBottomColor: palette.primary.base,
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.tabLabel,
                                        {
                                            color: isActive
                                                ? palette.primary.base
                                                : palette.secondary.text,
                                            fontWeight: isActive ? '700' : '500',
                                        },
                                    ]}
                                >
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        )
                    })}
                </View>

                {/* Options Content */}
                <View style={styles.optionsContent}>{renderTabContent()}</View>
            </View>

            {/* Save Button */}
            <View style={styles.buttonSection}>
                <Button onPress={handleSave} status="primary" style={styles.saveButton}>
                    {t('custom_avatar_save')}
                </Button>
            </View>
        </SafeScreen>
    )
}

export default CustomAvatarScreen

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 16,
    },
    // ===== Preview =====
    previewSection: {
        flex: 0.35,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    previewImage: {
        maxWidth: 260,
        maxHeight: 260,
        resizeMode: 'contain',
    },
    previewPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#999',
        fontSize: 14,
    },
    // ===== Card Besar =====
    card: {
        flex: 0.55,
        borderRadius: 20,
        marginVertical: 8,
        overflow: 'hidden',
        width: '100%',
    },
    // ===== Tab Bar =====
    tabBar: {
        flexDirection: 'row',
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    tabLabel: {
        fontSize: 13,
    },
    // ===== Options =====
    optionsContent: {
        flex: 1,
        paddingHorizontal: 12,
        paddingTop: 16,
        paddingBottom: 16,
    },
    optionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        gap: 10,
    },
    optionButton: {
        width: 64,
        paddingVertical: 6,
        paddingHorizontal: 4,
        borderRadius: 12,
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noneIcon: {
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
    },
    noneText: {
        fontSize: 18,
        color: '#999',
    },
    optionLabel: {
        fontSize: 10,
        marginTop: 2,
        textAlign: 'center',
    },
    // ===== Button =====
    buttonSection: {
        flex: 0.1,
        justifyContent: 'center',
        paddingTop: 8,
    },
    saveButton: {},
})
