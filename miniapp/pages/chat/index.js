const cloudStore = require('../../utils/cloud-store.js')

function timeText(value) {
  const raw = value && value.$date ? value.$date : value
  const date = new Date(raw || Date.now())
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

Page({
  data: { threadId: '', other: null, messages: [], draft: '', loading: true, failed: false, sending: false, scrollId: '' },
  onLoad(options) { const threadId = decodeURIComponent(options.threadId || ''); this.setData({ threadId }); this.load() },
  async load() {
    if (!this.data.threadId) return this.setData({ loading: false, failed: true })
    try {
      const result = await cloudStore.socialHub('listMessages', { threadId: this.data.threadId })
      const messages = (result.messages || []).map(item => ({ ...item, timeText: timeText(item.createdAt) }))
      this.setData({ other: result.other, messages, loading: false, failed: false, scrollId: messages.length ? `message-${messages[messages.length - 1].id}` : '' })
      wx.setNavigationBarTitle({ title: result.other && result.other.displayName ? result.other.displayName : '私信' })
    } catch (error) {
      console.error('私信加载失败', error)
      this.setData({ loading: false, failed: true })
    }
  },
  input(event) { this.setData({ draft: event.detail.value }) },
  async send() {
    const content = this.data.draft.trim()
    if (!content || this.data.sending) return
    this.setData({ sending: true })
    try {
      await cloudStore.socialHub('sendMessage', { threadId: this.data.threadId, content })
      this.setData({ draft: '' })
      await this.load()
    } catch (error) { wx.showToast({ title: error.message || '发送失败', icon: 'none' }) }
    finally { this.setData({ sending: false }) }
  },
  more() {
    wx.showActionSheet({ itemList: ['举报该用户'], success: () => this.chooseReportReason() })
  },
  chooseReportReason() {
    const reasons = ['骚扰或不友善内容', '广告或诈骗', '不当健康建议', '其他问题']
    wx.showActionSheet({ itemList: reasons, success: async result => {
      try {
        await cloudStore.socialHub('report', { threadId: this.data.threadId, targetId: this.data.other.ownerId, reason: reasons[result.tapIndex] })
        wx.showToast({ title: '已提交，管理员会处理', icon: 'none' })
      } catch (error) { wx.showToast({ title: error.message || '提交失败', icon: 'none' }) }
    } })
  }
})
