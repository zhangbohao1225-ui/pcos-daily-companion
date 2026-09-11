const cloudStore = require('../../utils/cloud-store.js')

function stamp(value) {
  const raw = value && value.$date ? value.$date : value
  const date = new Date(raw || Date.now())
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

Page({
  data: { profile: null, posts: [], loading: true, unavailable: false, followingCount: 0, followerCount: 0, isFollowing: false, isSelf: false, socialLoading: false },
  onLoad(options) { this.ownerId = decodeURIComponent(options.ownerId || ''); this.load() },
  async load() {
    if (!this.ownerId) return this.setData({ loading: false, unavailable: true })
    this.setData({ loading: true, unavailable: false })
    try {
      const [result, social] = await Promise.all([cloudStore.getPublicProfile(this.ownerId), cloudStore.socialHub('stats', { targetId: this.ownerId })])
      const posts = (result.posts || []).map(post => ({ ...post, id: post._id, createdText: stamp(post.createdAt), images: Array.isArray(post.images) ? post.images : [] }))
      this.setData({ profile: result.profile || null, posts, followingCount: social.followingCount || 0, followerCount: social.followerCount || 0, isFollowing: !!social.isFollowing, isSelf: !!social.isSelf, loading: false, unavailable: !result.profile })
    } catch (error) {
      console.error('同伴主页加载失败', error)
      this.setData({ profile: null, posts: [], loading: false, unavailable: true })
    }
  },
  async toggleFollow() {
    if (this.data.socialLoading || this.data.isSelf) return
    this.setData({ socialLoading: true })
    try {
      const result = await cloudStore.socialHub('toggleFollow', { targetId: this.ownerId })
      this.setData({ isFollowing: !!result.isFollowing, followingCount: result.followingCount || 0, followerCount: result.followerCount || 0 })
      wx.showToast({ title: result.isFollowing ? '已关注' : '已取消关注', icon: 'none' })
    } catch (error) { wx.showToast({ title: error.message || '操作失败', icon: 'none' }) }
    finally { this.setData({ socialLoading: false }) }
  },
  async message() {
    if (!this.data.isFollowing) return wx.showToast({ title: '关注对方后才能发私信', icon: 'none' })
    if (this.data.socialLoading) return
    this.setData({ socialLoading: true })
    try {
      const result = await cloudStore.socialHub('openThread', { targetId: this.ownerId })
      wx.navigateTo({ url: `/pages/chat/index?threadId=${encodeURIComponent(result.threadId)}` })
    } catch (error) { wx.showToast({ title: error.message || '暂时无法发起私信', icon: 'none' }) }
    finally { this.setData({ socialLoading: false }) }
  },
  preview(event) { wx.previewImage({ current: event.currentTarget.dataset.src, urls: event.currentTarget.dataset.urls || [event.currentTarget.dataset.src] }) },
  goForum() { wx.switchTab({ url: '/pages/forum/index' }) }
})
