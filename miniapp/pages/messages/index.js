const cloudStore = require('../../utils/cloud-store.js')

function timeText(value) {
  const raw = value && value.$date ? value.$date : value
  const date = new Date(raw || Date.now())
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

Page({
  data: { threads: [], loading: true, failed: false },
  onShow() { this.load() },
  async load() {
    this.setData({ loading: true, failed: false })
    try {
      const result = await cloudStore.socialHub('listThreads')
      this.setData({ threads: (result.threads || []).map(item => ({ ...item, timeText: timeText(item.lastAt) })), loading: false })
    } catch (error) {
      console.error('私信列表加载失败', error)
      this.setData({ loading: false, failed: true })
    }
  },
  open(event) { wx.navigateTo({ url: `/pages/chat/index?threadId=${encodeURIComponent(event.currentTarget.dataset.id)}` }) },
  goForum() { wx.switchTab({ url: '/pages/forum/index' }) }
})
