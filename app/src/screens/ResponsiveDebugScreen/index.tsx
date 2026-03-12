import React from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useResponsiveDebug } from '../../contexts/ResponsiveDebugContext'
import { useResponsive } from '../../contexts/ResponsiveContext'
import { useScreenDimensions } from '../../hooks/useScreenDimensions'

// Preset device dimensions
const DEVICE_PRESETS = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 14', width: 390, height: 844 },
  { name: 'iPhone 14 Pro Max', width: 430, height: 932 },
  { name: 'iPad Mini', width: 744, height: 1133 },
  { name: 'iPad Pro 11"', width: 834, height: 1194 },
  { name: 'iPad Pro 12.9"', width: 1024, height: 1366 },
  { name: 'Small (s) break', width: 400, height: 839 },
  { name: 'Medium (m) break', width: 400, height: 840 },
]

type ResponsiveDebugScreenProps = {
  onClose?: () => void
}

export default function ResponsiveDebugScreen({ onClose }: ResponsiveDebugScreenProps) {
  const { testDimensions, setTestDimensions, isEnabled, setEnabled } = useResponsiveDebug()
  const actualDimensions = useScreenDimensions()
  const { size: breakpoint } = useResponsive()

  const [inputWidth, setInputWidth] = React.useState(String(testDimensions?.width ?? actualDimensions.width))
  const [inputHeight, setInputHeight] = React.useState(String(testDimensions?.height ?? actualDimensions.height))

  const handleApply = () => {
    const width = parseInt(inputWidth, 10)
    const height = parseInt(inputHeight, 10)
    if (!isNaN(width) && !isNaN(height)) {
      setTestDimensions({ width, height })
    }
  }

  const handleReset = () => {
    setEnabled(false)
    setInputWidth(String(actualDimensions.width))
    setInputHeight(String(actualDimensions.height))
  }

  const handlePreset = (preset: (typeof DEVICE_PRESETS)[0]) => {
    setInputWidth(String(preset.width))
    setInputHeight(String(preset.height))
    setTestDimensions({ width: preset.width, height: preset.height })
  }

  const adjustDimension = (dimension: 'width' | 'height', delta: number) => {
    const currentValue = parseInt(dimension === 'width' ? inputWidth : inputHeight, 10) || 0
    const newValue = Math.max(100, currentValue + delta)
    if (dimension === 'width') {
      setInputWidth(String(newValue))
    } else {
      setInputHeight(String(newValue))
    }
    const otherValue = parseInt(dimension === 'width' ? inputHeight : inputWidth, 10) || 0
    setTestDimensions({
      width: dimension === 'width' ? newValue : otherValue,
      height: dimension === 'height' ? newValue : otherValue,
    })
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header with close button */}
          <View style={styles.header}>
            <Text style={styles.title}>Responsive Debug</Text>
            {onClose && (
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Status */}
          <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}>Status:</Text>
            <Text style={[styles.statusValue, isEnabled ? styles.enabled : styles.disabled]}>
              {isEnabled ? 'OVERRIDE ACTIVE' : 'Using actual dimensions'}
            </Text>
          </View>

          {/* Current Breakpoint */}
          <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}>Current Breakpoint:</Text>
            <Text style={styles.breakpointValue}>{breakpoint.toUpperCase()}</Text>
            <Text style={styles.breakpointHint}>(threshold: 840px height)</Text>
          </View>

          {/* Current Dimensions Display */}
          <View style={styles.currentDimensions}>
            <Text style={styles.sectionTitle}>Effective Dimensions:</Text>
            <Text style={styles.dimensionsText}>
              {actualDimensions.width} x {actualDimensions.height}
            </Text>
          </View>

          {/* Manual Input */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Set Custom Dimensions:</Text>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Width:</Text>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => adjustDimension('width', -50)}
              >
                <Text style={styles.adjustButtonText}>-50</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => adjustDimension('width', -10)}
              >
                <Text style={styles.adjustButtonText}>-10</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={inputWidth}
                onChangeText={setInputWidth}
                keyboardType="number-pad"
                selectTextOnFocus
              />
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => adjustDimension('width', 10)}
              >
                <Text style={styles.adjustButtonText}>+10</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => adjustDimension('width', 50)}
              >
                <Text style={styles.adjustButtonText}>+50</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Height:</Text>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => adjustDimension('height', -50)}
              >
                <Text style={styles.adjustButtonText}>-50</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => adjustDimension('height', -10)}
              >
                <Text style={styles.adjustButtonText}>-10</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={inputHeight}
                onChangeText={setInputHeight}
                keyboardType="number-pad"
                selectTextOnFocus
              />
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => adjustDimension('height', 10)}
              >
                <Text style={styles.adjustButtonText}>+10</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => adjustDimension('height', 50)}
              >
                <Text style={styles.adjustButtonText}>+50</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Device Presets */}
          <View style={styles.presetsSection}>
            <Text style={styles.sectionTitle}>Device Presets:</Text>
            <View style={styles.presetsGrid}>
              {DEVICE_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.name}
                  style={[
                    styles.presetButton,
                    testDimensions?.width === preset.width &&
                      testDimensions?.height === preset.height &&
                      styles.presetButtonActive,
                  ]}
                  onPress={() => handlePreset(preset)}
                >
                  <Text style={styles.presetName}>{preset.name}</Text>
                  <Text style={styles.presetDims}>
                    {preset.width}x{preset.height}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>How to use:</Text>
            <Text style={styles.instructionText}>
              1. Set custom width/height or tap a preset{'\n'}
              2. Navigate to any screen to see the effect{'\n'}
              3. The breakpoint changes at 840px height{'\n'}
              4. Tap Reset to use actual device dimensions
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  closeButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    color: '#888',
    fontSize: 14,
    marginRight: 8,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  enabled: {
    color: '#4ade80',
  },
  disabled: {
    color: '#888',
  },
  breakpointValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#60a5fa',
  },
  breakpointHint: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  currentDimensions: {
    backgroundColor: '#2d2d44',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  dimensionsText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  inputSection: {
    backgroundColor: '#2d2d44',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 14,
    width: 60,
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 6,
    padding: 10,
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 8,
    minWidth: 80,
  },
  adjustButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    marginHorizontal: 2,
  },
  adjustButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#6b7280',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  presetsSection: {
    marginBottom: 20,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    backgroundColor: '#2d2d44',
    borderRadius: 8,
    padding: 12,
    minWidth: '47%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetButtonActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e3a5f',
  },
  presetName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  presetDims: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  instructions: {
    backgroundColor: '#2d2d44',
    borderRadius: 8,
    padding: 16,
    marginBottom: 40,
  },
  instructionsTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  instructionText: {
    color: '#888',
    fontSize: 13,
    lineHeight: 20,
  },
})
