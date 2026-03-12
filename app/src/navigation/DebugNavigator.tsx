import * as React from 'react'
import { Modal, TouchableOpacity, Text, StyleSheet } from 'react-native'
import ResponsiveDebugScreen from '../screens/ResponsiveDebugScreen'

type DebugNavigatorProps = {
  children: React.ReactNode
}

export function DebugNavigator({ children }: DebugNavigatorProps) {
  const [showDebug, setShowDebug] = React.useState(false)

  // Only show debug button in development
  if (!__DEV__) {
    return <>{children}</>
  }

  return (
    <>
      {children}

      {/* Floating debug button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setShowDebug(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>RD</Text>
      </TouchableOpacity>

      {/* Debug Modal */}
      <Modal visible={showDebug} animationType="slide" presentationStyle="pageSheet">
        <ResponsiveDebugScreen onClose={() => setShowDebug(false)} />
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: '#3b82f6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
})
