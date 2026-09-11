const cloudStore = require('../../utils/cloud-store.js')

Page({
  data: { type: 'following', connections: [], followingCount: 0, followerCount: 0, loading: true, failed: false, actingId: '' },
  onLoad(options) { this.setData({ type: options.type === 'followers' ? 'followers' : 'following' }) },
  onShow() { this.load() },
  async load() {
    this.setData({ loading: true, failed: false })
    try {
      const result = await cloudStore.socialHub('listConnections', { type: this.data.type })
      this.setData({ connections: result.connections || [], followingCount: result.followingCount || 0, followerCount: result.followerCount || 0, loading: false })
    } catch (error) {
      console.error('关注关系列表加载失败', error)
      this.setData({ connections: [], loading: false, failed: true })
    }
  },
  changeType(event) {
    const type = event.currentTarget.dataset.type
    if (type === this.data.type) return
    this.setData({ type }, () => this.load())
  },
  openProfile(event) {
    const ownerId = event.currentTarget.dataset.id
    if (ownerId) wx.navigateTo({ url: `/pages/user-profile/index?ownerId=${encodeURIComponent(ownerId)}` })
  },
  async toggleFollow(event) {
    const ownerId = event.currentTarget.dataset.id
    if (!ownerId || this.data.actingId) return
    this.setData({ actingId: ownerId })
    try {
      const result = await cloudStore.socialHub('toggleFollow', { targetId: ownerId })
      let connections = this.data.connections.map(item => item.ownerId === ownerId ? { ...item, isFollowing: !!result.isFollowing } : item)
      if (this.data.type === 'following' && !result.isFollowing) connections = connections.filter(item => item.ownerId !== ownerId)
      this.setData({ connections, followingCount: Math.max(0, this.data.followingCount + (result.isFollowing ? 1 : -1)) })
      wx.showToast({ title: result.isFollowing ? '已关注' : '已取消关注', icon: 'none' })
    } catch (error) { wx.showToast({ title: error.message || '操作失败', icon: 'none' }) }
    finally { this.setData({ actingId: '' }) }
  }
})
