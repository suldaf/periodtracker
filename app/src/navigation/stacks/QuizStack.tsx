import * as React from 'react'

import NavigationStack, { StackConfig } from '../components/NavigationStack'

let QuizListScreen: React.ComponentType<any> = () => null
let QuizWebViewScreen: React.ComponentType<any> = () => null
export let QUIZ_ENABLED = false

try {
  const mod = require('../../screens/QuizListScreen/optional')
  QuizListScreen = mod.QuizListScreen
  QuizWebViewScreen = mod.QuizWebViewScreen
  QUIZ_ENABLED = true
} catch (e) {
  console.warn('Quiz module not available. Pull the optional submodule to enable.')
}

export type QuizStackParamList = {
  QuizList: undefined
  QuizWebView: {
    title: string
    url: string
    quizId: string
  }
}

const config = {
  initialRouteName: 'QuizList',
  screens: {
    QuizList: {
      title: 'remaja_sehat',
      component: QuizListScreen,
    },
    QuizWebView: {
      title: '',
      component: QuizWebViewScreen,
    },
  },
} as StackConfig<keyof QuizStackParamList>

const QuizStack = () => <NavigationStack config={config} />
export default QuizStack
