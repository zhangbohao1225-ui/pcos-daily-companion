const store = require('../../utils/store.js')
const { formatDate, displayDate } = require('../../utils/date.js')

const CHECKIN_INTENT_KEY = 'suta-open-checkin-template'

Page({
  data: { dashboard: null, displayDate: '', greeting: '', profile: null },

  onShow() {
    const hour = new Date().getHours()
    const greeting = hour < 11 ? '早上好' : hour < 18 ? '下午好' : '晚上好'
    const state = store.ensureState()
    this.setData({
      dashboard: store.dashboard(formatDate()),
      displayDate: displayDate(formatDate()),
      greeting,
      profile: state.profile
    })
  },

  go(event) {
    wx.navigateTo({ url: event.currentTarget.dataset.url })
  },

  goTab(event) {
    wx.switchTab({ url: event.currentTarget.dataset.url })
  },

  goCheckinItem(event) {
    wx.setStorageSync(CHECKIN_INTENT_KEY, event.currentTarget.dataset.id)
    wx.switchTab({ url: '/pages/checkin/index' })
  }
})
