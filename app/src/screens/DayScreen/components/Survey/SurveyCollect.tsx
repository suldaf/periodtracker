import React from 'react'
import { Checkbox } from '../../../../components/Checkbox'
import { Input } from '../../../../components/Input'
import { getSurveyQuestionOptions, useSurvey } from './SurveyContext'

export const SurveyCollect = () => {
  const { state, dispatch } = useSurvey()

  const onCheckboxPress = (value: number, text: string) => {
    dispatch({ type: 'answerIndex', value })
    dispatch({ type: 'answerDraft', value: text })
  }

  const setAnswerDraft = (value: string) => {
    dispatch({ type: 'answerDraft', value })
  }

  if (!state.survey) {
    return null
  }

  const currentQuestion = state.survey.questions[state.questionIndex]

  const options = getSurveyQuestionOptions(currentQuestion)

  const isMultiple = currentQuestion?.is_multiple

  return (
    <>
      {isMultiple ? (
        <>
          {options.map((option, i) => {
            const checked = state.answerIndex === i
            const onPress = () => {
              onCheckboxPress(i, option)
            }

            return (
              <Checkbox
                key={`survey-${i}`}
                label={option}
                onPress={onPress}
                checked={checked}
                checkedStatus={'danger'}
                checkedTextStatus={'danger'}
                enableTranslate={false}
              />
            )
          })}
        </>
      ) : (
        <Input
          value={state.answerDraft}
          onChangeText={setAnswerDraft}
          placeholder={'type_answer_placeholder'}
          multiline={true}
        />
      )}
    </>
  )
}
