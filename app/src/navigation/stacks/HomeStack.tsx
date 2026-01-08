import * as React from 'react'
import NavigationStack, { StackConfig } from '../components/NavigationStack'
import MainScreen from '../../screens/MainScreen'
import DayScreen from '../../screens/DayScreen'
import CalendarScreen from '../../screens/CalendarScreen'
import moment from 'moment'
import { Tutorial } from '../../screens/MainScreen/TutorialContext'
import LudoScreen from '../../screens/LudoScreen'
import UlarTangga from '../../screens/UlarTangga/index bot'
import LudoScreenL5 from '../../screens/LudoScreen/index copy'

export type HomeStackParamList = {
  Home: {
    tutorial: Tutorial
  }
  Calendar: undefined
  Day: {
    date: moment.Moment
  }
  Ludo: undefined
}

const config: StackConfig<keyof HomeStackParamList> = {
  initialRouteName: 'Home',
  screens: {
    Home: {
      title: '',
      component: MainScreen,
    },
    Day: {
      title: 'Day',
      component: DayScreen,
    },
    Calendar: {
      title: 'calendar',
      component: CalendarScreen,
    },
    Ludo: {
      title: 'ludo',
      component: UlarTangga,
    },
  },
}

const HomeStack = () => <NavigationStack config={config} />

export default HomeStack
