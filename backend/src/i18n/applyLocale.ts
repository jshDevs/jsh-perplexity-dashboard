import { t, type Locale } from './index.js'

export interface RawInsight {
  type: string
  metric?: string
  pct?: number
  value?: number
  date?: string
  dimension?: string
  topN?: number
  field?: string
  algorithm?: string
  threshold?: number
  current?: number
  previous?: number
  delta?: number
}

export interface RawWarning {
  code: string
  field?: string
  pct?: number
  n?: number
  role?: string
}

export interface RawQuestion {
  field: string
  type: 'classify_field' | 'confirm_metric' | 'confirm_dimension' | 'confirm_time'
  options: string[]
}

/** Convert engine's raw insight objects → localised { text } objects */
export function localiseInsights(insights: RawInsight[], locale: Locale) {
  return insights.map((ins) => ({
    ...ins,
    text: t(locale, `insights.${ins.type}`, {
      metric:    ins.metric    ?? '',
      pct:       ins.pct       ?? '',
      value:     ins.value     ?? '',
      date:      ins.date      ?? '',
      dimension: ins.dimension ?? '',
      topN:      ins.topN      ?? '',
      field:     ins.field     ?? '',
      algorithm: ins.algorithm ?? '',
      threshold: ins.threshold ?? '',
      current:   ins.current   ?? '',
      previous:  ins.previous  ?? '',
      delta:     ins.delta     ?? '',
    }),
  }))
}

/** Convert engine's raw warning objects → localised { detail } objects */
export function localiseWarnings(warnings: RawWarning[], locale: Locale) {
  return warnings.map((w) => ({
    ...w,
    detail: t(locale, `warnings.${w.code}`, {
      field: w.field ?? '',
      pct:   w.pct   ?? '',
      n:     w.n     ?? '',
      role:  w.role  ?? '',
    }),
  }))
}

/** Convert engine's raw question objects → localised { question } objects */
export function localiseQuestions(questions: RawQuestion[], locale: Locale) {
  return questions.map((q) => ({
    ...q,
    question: t(locale, `questions.${q.type}`, { field: q.field }),
  }))
}
