const cloudStore = require('../../utils/cloud-store.js')
function time(value) { const date = new Date(value && value.$date ? value.$date : value || Date.now()); const pad = n => String(n).padStart(2, '0'); return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}` }
Page({
  data: { tab: 'notice', notifications: [], posts: [], loading: true, error: '' },
  onShow() { this.load() },
  async load() { try { const result = await cloudStore.listMyForum(); this.setData({ notifications: (result.notifications || []).map(item => ({ ...item, id: item._id, timeText: time(item.createdAt), actionText: item.type === 'like' ? '赞了你的帖子' : '评论了你的帖子' })), posts: (result.posts || []).map(item => ({ ...item, id: item._id, timeText: time(item.createdAt) })), loading: false, error: '' }); await cloudStore.markForumRead() } catch (error) { this.setData({ loading: false, error: error.message || '加载失败' }) } },
  setTab(event) { this.setData({ tab: event.currentTarget.dataset.tab }) },
  goForum() { wx.switchTab({ url: '/pages/forum/index' }) },
  openActor(event) { const ownerId = event.currentTarget.dataset.owner; if (ownerId) wx.navigateTo({ url: `/pages/user-profile/index?ownerId=${encodeURIComponent(ownerId)}` }) }
})
