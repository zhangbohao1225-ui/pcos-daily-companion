const store = require('../../utils/store.js')
const { formatDate, displayDate } = require('../../utils/date.js')
const CHECKIN_INTENT_KEY = 'suta-open-checkin-template'

const detailConfigs = {
  nutrition: { choiceLabel: '今日整体饮食状态', options: ['以抗炎清淡餐为主', '正常日常三餐', '吃了甜食或精制碳水', '吃了油炸或深加工食品'], needsValue: false, valueLabel: '', unit: '' },
  movement: { choiceLabel: '今天的活动类型', options: ['散步', '拉伸或瑜伽', '力量训练', '有氧运动', '其他活动'], needsValue: true, valueLabel: '今天活动了多久？', unit: '分钟' },
  mood: { choiceLabel: '此刻的心情更接近', options: ['有能量', '平静', '有点累', '低落', '焦虑'], needsValue: false, valueLabel: '', unit: '' },
  sleep: { choiceLabel: '昨晚的睡眠感受', options: ['睡得很好', '整体安稳', '容易醒', '入睡困难'], needsValue: true, valueLabel: '昨晚睡了多久？', unit: '小时' }
}

function detailSummary(item, detail) {
  if (!item.completed) return item.caption
  if (!detail) return '今天已完成，点击可以补充具体记录'
  if (detail.value) return `${detail.choice} · ${detail.value}${detail.unit}`
  return detail.choice || '今天已完成'
}

Page({
  data: {
    date: '', displayDate: '', dashboard: null, note: '',
    painOptions: ['无', '轻微', '明显', '较强'], painIndex: 0,
    moodOptions: ['平稳', '轻松', '低落', '焦虑'], moodIndex: 0,
    energyOptions: ['充足', '一般', '偏低'], energyIndex: 1,
    activeTask: null, editorValue: '', editorChoiceIndex: 0, editorNote: '', editorOptions: [], editorChoiceLabel: '', editorNeedsValue: false, editorValueLabel: '', editorUnit: '', celebration: null
  },
  onShow() {
    this.load(() => {
      const templateId = wx.getStorageSync(CHECKIN_INTENT_KEY)
      if (!templateId) return
      wx.removeStorageSync(CHECKIN_INTENT_KEY)
      this.openEditorById(templateId)
    })
  },
  load(callback) {
    const date = formatDate()
    const dashboard = store.dashboard(date)
    const painIndex = Math.max(0, this.data.painOptions.indexOf(dashboard.symptoms.pain))
    const moodIndex = Math.max(0, this.data.moodOptions.indexOf(dashboard.symptoms.mood))
    const energyIndex = Math.max(0, this.data.energyOptions.indexOf(dashboard.symptoms.energy))
    dashboard.templates = dashboard.templates.map(item => ({ ...item, detailSummary: detailSummary(item, dashboard.details[item.id]) }))
    this.setData({ date, displayDate: displayDate(date), dashboard, note: dashboard.note, painIndex, moodIndex, energyIndex }, callback)
  },
  openEditor(event) {
    this.openEditorById(event.currentTarget.dataset.id)
  },
  openEditorById(id) {
    if (id === 'nutrition') {
      wx.navigateTo({ url: `/pages/nutrition/index?date=${this.data.date}` })
      return
    }
    const item = this.data.dashboard.templates.find(entry => entry.id === id)
    if (!item) return
    const config = detailConfigs[id]
    const detail = this.data.dashboard.details[id] || {}
    const editorChoiceIndex = Math.max(0, config.options.indexOf(detail.choice))
    this.setData({ activeTask: item, editorValue: detail.value === undefined ? '' : String(detail.value), editorChoiceIndex, editorNote: detail.note || '', editorOptions: config.options, editorChoiceLabel: config.choiceLabel, editorNeedsValue: config.needsValue, editorValueLabel: config.valueLabel, editorUnit: config.unit })
  },
  setEditorValue(event) { this.setData({ editorValue: event.detail.value }) },
  setEditorChoice(event) { this.setData({ editorChoiceIndex: Number(event.detail.value) }) },
  setEditorNote(event) { this.setData({ editorNote: event.detail.value }) },
  closeEditor() { this.setData({ activeTask: null }) },
  noop() {},
  completeTask() {
    if (this.data.editorNeedsValue && !String(this.data.editorValue).trim()) return wx.showToast({ title: `请填写${this.data.editorUnit === '小时' ? '睡眠时长' : '活动时长'}`, icon: 'none' })
    const item = this.data.activeTask
    const wasCompleted = item.completed
    store.saveCheckinDetails(this.data.date, item.id, { value: this.data.editorNeedsValue ? Number(this.data.editorValue) : '', unit: this.data.editorUnit, choice: this.data.editorOptions[this.data.editorChoiceIndex], note: this.data.editorNote.trim() })
    const completed = Math.min(this.data.dashboard.total, this.data.dashboard.completed + (wasCompleted ? 0 : 1))
    const allCompleted = completed === this.data.dashboard.total
    this.setData({ activeTask: null, celebration: { completed, total: this.data.dashboard.total, percent: Math.round(completed / this.data.dashboard.total * 100), title: allCompleted ? '今天的关照都完成啦！' : '这一笔真实记录，已经完成', message: allCompleted ? '四件小事都被看见了。不是标准答案，只是今天的一次特别庆祝。' : `今天已经关照了自己 ${completed} 件小事，慢慢来就很好。` } })
    this.load()
  },
  removeTask() {
    const id = this.data.activeTask.id
    store.update(state => {
      if (state.checkins[this.data.date]) state.checkins[this.data.date][id] = false
      if (state.checkinDetails[this.data.date]) delete state.checkinDetails[this.data.date][id]
    })
    this.setData({ activeTask: null })
    this.load()
    wx.showToast({ title: '已取消本项记录', icon: 'none' })
  },
  goTeam() { this.setData({ celebration: null }); wx.navigateTo({ url: '/pages/team/index' }) },
  closeCelebration() { this.setData({ celebration: null }) },
  setNote(event) { this.setData({ note: event.detail.value }) },
  setPain(event) { this.setData({ painIndex: Number(event.detail.value) }) },
  setMood(event) { this.setData({ moodIndex: Number(event.detail.value) }) },
  setEnergy(event) { this.setData({ energyIndex: Number(event.detail.value) }) },
  saveDetails() {
    store.saveDailyDetails(this.data.date, {
      note: this.data.note,
      symptoms: { pain: this.data.painOptions[this.data.painIndex], mood: this.data.moodOptions[this.data.moodIndex], energy: this.data.energyOptions[this.data.energyIndex] }
    })
    wx.showToast({ title: '今天的记录已保存' })
  }
})
