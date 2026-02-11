/**
 * Ular Tangga Game - Optional Submodule Wrapper
 * 
 * This is a wrapper for the Ular Tangga game which is implemented as an optional submodule.
 * If the submodule is not present (e.g., regional team chose not to include it),
 * the app will gracefully handle the missing module.
 * 
 * Submodule repo: https://gitlab.com/digitala-oky/periodtracker_ular-tangga-indonesia.git
 * Submodule path: app/src/screens/UlarTangga/optional/
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { ScreenComponent } from '../../navigation/RootNavigator'

// Try to import the game from the optional submodule
let UlarTanggaScreen: ScreenComponent | null = null

try {
  // Import from submodule
  const gameModule = require('./optional/index')
  UlarTanggaScreen = gameModule.default || gameModule.UlarTanggaScreen
} catch (error) {
  // Submodule not available
  console.warn('Ular Tangga game module not available. This is expected if the optional submodule was not pulled.')
}

// Fallback component if game is not available
const UnavailableScreen: ScreenComponent = () => (
  <View style={styles.container}>
    <Text style={styles.text}>Game Ular Tangga tidak tersedia</Text>
    <Text style={styles.subtext}>Optional module belum di-install</Text>
  </View>
)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    color: '#666',
  },
})

// Export the game if available, otherwise export fallback
export default (UlarTanggaScreen || UnavailableScreen) as ScreenComponent
