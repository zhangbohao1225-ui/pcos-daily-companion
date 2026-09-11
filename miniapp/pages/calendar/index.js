const store = require('../../utils/store.js')
const { formatDate, shiftDate, displayDate } = require('../../utils/date.js')

function daysBetween(start, end) {
  return Math.round((new Date(`${end}T12:00:00`) - new Date(`${start}T12:00:00`)) / 86400000)
}

function roundedAverage(values, fallback) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : fallback
}

function buildPrediction() {
  const state = store.ensureState()
  const today = formatDate()
  const cycles = state.cycles || []
  const starts = cycles.map(item => item.startDate).filter(Boolean)
  if (state.activePeriod) starts.push(state.activePeriod)
  const uniqueStarts = Array.from(new Set(starts)).sort()
  if (!uniqueStarts.length) return { days: [], cycleLength: 28, periodLength: 5, basedOn: '' }

  const intervals = []
  for (let index = 1; index < uniqueStarts.length; index += 1) {
    const interval = daysBetween(uniqueStarts[index - 1], uniqueStarts[index])
    if (interval >= 21 && interval <= 45) intervals.push(interval)
  }
  const recordedLengths = cycles.map(item => daysBetween(item.startDate, item.endDate) + 1).filter(value => value >= 2 && value <= 10)
  const cycleLength = roundedAverage(intervals.slice(-6), 28)
  const periodLength = roundedAverage(recordedLengths.slice(-6), 5)
  const latestStart = uniqueStarts[uniqueStarts.length - 1]
  const phaseNames = { menstrual: '经期', follicular: '卵泡', ovulation: '排卵', luteal: '黄体' }
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']

  const days = Array.from({ length: 35 }, (_, offset) => {
    const date = shiftDate(today, offset)
    const elapsed = daysBetween(latestStart, date)
    const cycleDay = ((elapsed % cycleLength) + cycleLength) % cycleLength + 1
    const ovulationDay = Math.max(periodLength + 3, cycleLength - 14)
    let phase = 'luteal'
    if (cycleDay <= periodLength) phase = 'menstrual'
    else if (Math.abs(cycleDay - ovulationDay) <= 2) phase = 'ovulation'
    else if (cycleDay < ovulationDay - 2) phase = 'follicular'
    const dateValue = new Date(`${date}T12:00:00`)
    return { date, day: dateValue.getDate(), weekday: weekdays[dateValue.getDay()], label: displayDate(date), phase, phaseName: phaseNames[phase], isToday: offset === 0 }
  })
  return { days, cycleLength, periodLength, basedOn: displayDate(latestStart) }
}

Page({
  data: { history: [], average: 0, completedDays: 0, prediction: [], cycleLength: 28, periodLength: 5, predictionBasedOn: '', activePeriod: null },
  onShow() {
    const state = store.ensureState()
    const history = store.getHistory(30).map(item => ({ ...item, label: displayDate(item.date), level: item.score >= 75 ? 'high' : item.score >= 25 ? 'mid' : 'low' }))
    const average = Math.round(history.reduce((sum, item) => sum + item.score, 0) / history.length)
    const prediction = buildPrediction()
    this.setData({ history, average, completedDays: history.filter(item => item.completed > 0).length, prediction: prediction.days, cycleLength: prediction.cycleLength, periodLength: prediction.periodLength, predictionBasedOn: prediction.basedOn, activePeriod: state.activePeriod })
  },
  togglePeriod() {
    const today = formatDate()
    store.update(state => {
      if (state.activePeriod) {
        state.cycles.unshift({ startDate: state.activePeriod, endDate: today })
        state.activePeriod = null
      } else state.activePeriod = today
    })
    this.onShow()
    wx.showToast({ title: this.data.activePeriod ? '已开始记录' : '本次经期已结束', icon: 'none' })
  }
})
