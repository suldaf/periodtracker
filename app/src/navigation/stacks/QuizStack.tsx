import * as React from 'react'

import NavigationStack, { StackConfig } from '../components/NavigationStack'
import QuizListScreen from '../../screens/QuizListScreen'
import QuizWebViewScreen from '../../screens/QuizWebViewScreen'

export type QuizStackParamList = {
  QuizList: undefined
  QuizWebView: {
    title: string
    url: string
    quizId: string
  }
}

const config: StackConfig<keyof QuizStackParamList> = {
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
}

const QuizStack = () => <NavigationStack config={config} />

export default QuizStack
