import * as React from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'

import { Screen } from '../../components/Screen'
import { Text } from '../../components/Text'
import { ScreenComponent } from '../../navigation/RootNavigator'
import { globalStyles } from '../../config/theme'
import { useColor } from '../../hooks/useColor'

type QuizMenuItem = {
  id: string
  title: string
  subtitle: string
  url: string
}

const quizMenus: QuizMenuItem[] = [
  {
    id: 'kespro',
    title: 'KesPro',
    subtitle: 'Kesehatan Reproduksi',
    url: 'https://www.remajasehat.com/kespro-responses/create',
  },
  {
    id: 'keswa',
    title: 'KesWa',
    subtitle: 'Kesehatan Jiwa',
    url: 'https://www.remajasehat.com/keswa-responses/create',
  },
  {
    id: 'who-5',
    title: 'WHO-5',
    subtitle: 'Indeks Kesejahteraan WHO-5',
    url: 'https://www.remajasehat.com/who5-responses/create',
  },
  {
    id: 'imt',
    title: 'Indeks Massa Tubuh',
    subtitle: 'Nilai Status Gizi',
    url: 'https://www.remajasehat.com/bmi-measurements/create',
  },
]

const QuizListScreen: ScreenComponent<'QuizList'> = ({ navigation }) => {
  const { backgroundColor, color } = useColor()

  const onMenuPress = (item: QuizMenuItem) => {
    navigation.navigate('QuizWebView', {
      title: item.title,
      url: item.url,
    })
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {quizMenus.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onMenuPress(item)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor, opacity: pressed ? 0.85 : 1 },
              globalStyles.shadow,
            ]}
          >
            <View style={styles.textContainer}>
              <Text style={styles.title} enableTranslate={false}>
                {item.title}
              </Text>
              <Text style={styles.subtitle} enableTranslate={false}>
                {item.subtitle}
              </Text>
            </View>
            <FontAwesome name={'arrow-right'} size={28} color={color} style={styles.arrow} />
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  )
}

export default QuizListScreen

const styles = StyleSheet.create({
  screen: {
    paddingTop: 8,
  },
  contentContainer: {
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 16,
  },
  card: {
    borderRadius: 22,
    minHeight: 120,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    opacity: 0.65,
  },
  arrow: {
    opacity: 0.45,
  },
})
