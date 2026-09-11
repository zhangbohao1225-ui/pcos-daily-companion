const store = require('../../utils/store.js')
const cloudStore = require('../../utils/cloud-store.js')

function formatDateTime(timestamp) {
  const date = new Date(Number(timestamp) || Date.now())
  const pad = value => String(value).padStart(2, '0')
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatTime(timestamp) {
  const date = new Date(Number(timestamp) || Date.now())
  const pad = value => String(value).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

Page({
  data: {
    categories: ['全部', '日常分享', '饮食照顾', '温和运动', '情绪停靠', '睡眠记录', '经验交流'],
    postCategories: ['日常分享', '饮食照顾', '温和运动', '情绪停靠', '睡眠记录', '经验交流'],
    activeCategory: '全部',
    categoryIndex: 0,
    posts: [],
    draft: '',
    postImages: [],
    commentDrafts: {},
    expandedPosts: {},
    editingPostId: '',
    loading: false,
    cloudError: ''
  },

  onShow() {
    this.load()
  },

  profile() {
    return store.ensureState().profile || {}
  },

  renderPosts(posts) {
    const profile = this.profile()
    this.setData({
      posts: posts.map(post => {
        const isMine = Boolean(this.currentOpenId && post.ownerId === this.currentOpenId)
        return {
          ...post,
          isMine,
          avatarUrl: isMine ? (profile.cloudAvatarUrl || profile.avatarUrl || post.avatarUrl) : post.avatarUrl,
          edited: Boolean(post.editedAt),
          editedTime: post.editedAt ? formatTime(post.editedAt) : '',
          initial: (post.author || 'S').slice(0, 1),
          sharedAt: formatDateTime(post.createdAt),
          commentCount: (post.comments || []).length,
          comments: (post.comments || []).map(comment => ({
            ...comment,
            avatarUrl: this.currentOpenId && comment.ownerId === this.currentOpenId ? (profile.cloudAvatarUrl || profile.avatarUrl || comment.avatarUrl) : comment.avatarUrl,
            initial: (comment.author || 'S').slice(0, 1),
            sharedAt: formatDateTime(comment.createdAt)
          }))
        }
      })
    })
  },

  async load() {
    if (this.data.loading) return
    this.setData({ loading: true, cloudError: '' })
    try {
      const currentProfile = this.profile()
      const profileSignature = `${currentProfile.displayName || ''}|${currentProfile.cloudAvatarUrl || ''}`
      if (this.syncedProfileSignature !== profileSignature) {
        try {
          const synced = await cloudStore.bootstrapUser({ displayName: currentProfile.displayName, avatarUrl: currentProfile.cloudAvatarUrl || '' })
          this.currentOpenId = synced.openid || this.currentOpenId || ''
          this.syncedProfileSignature = profileSignature
        } catch (syncError) {
          console.warn('论坛头像同步暂未完成', syncError)
        }
      }
      if (!this.currentOpenId) {
        try {
          const identity = await cloudStore.getForumIdentity()
          this.currentOpenId = identity.openid || ''
        } catch (identityError) {
          console.warn('论坛身份服务尚未部署', identityError)
        }
      }
      const posts = await cloudStore.listForumPosts(this.currentOpenId || '', this.data.activeCategory)
      this.renderPosts(posts)
    } catch (error) {
      console.error('加载云端论坛失败', error)
      this.setData({ posts: [], cloudError: '论坛云服务尚未连接成功，请完成云数据库部署后重试。' })
    } finally {
      this.setData({ loading: false })
    }
  },

  retry() {
    this.load()
  },

  setDraft(event) {
    this.setData({ draft: event.detail.value })
  },

  setCategory(event) { this.setData({ categoryIndex: Number(event.detail.value) }) },
  filterCategory(event) { this.setData({ activeCategory: event.currentTarget.dataset.category }, () => this.load()) },
  chooseImages() {
    const count = 3 - this.data.postImages.length
    if (count <= 0) return wx.showToast({ title: '最多添加 3 张图片', icon: 'none' })
    wx.chooseMedia({ count, mediaType: ['image'], sizeType: ['compressed'], sourceType: ['album', 'camera'], success: result => {
      this.setData({ postImages: [...this.data.postImages, ...result.tempFiles.map(item => item.tempFilePath)].slice(0, 3) })
    } })
  },
  removeImage(event) { this.setData({ postImages: this.data.postImages.filter((_, index) => index !== Number(event.currentTarget.dataset.index)) }) },
  previewImage(event) { wx.previewImage({ current: event.currentTarget.dataset.src, urls: event.currentTarget.dataset.urls || this.data.postImages }) },
  async uploadImages(images) {
    const output = []
    for (let index = 0; index < images.length; index += 1) {
      const filePath = images[index]
      if (/^cloud:\/\//.test(filePath) || /^https?:\/\//.test(filePath)) { output.push(filePath); continue }
      const extension = (filePath.match(/\.([a-zA-Z0-9]+)(?:\?|$)/) || [])[1] || 'jpg'
      const result = await wx.cloud.uploadFile({ cloudPath: `forum/${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}.${extension}`, filePath })
      output.push(result.fileID)
    }
    return output
  },

  setCommentDraft(event) {
    const postId = event.currentTarget.dataset.id
    this.setData({ commentDrafts: { ...this.data.commentDrafts, [postId]: event.detail.value } })
  },

  toggleComments(event) {
    const postId = event.currentTarget.dataset.id
    this.setData({ expandedPosts: { ...this.data.expandedPosts, [postId]: !this.data.expandedPosts[postId] } })
  },

  async publish() {
    const content = this.data.draft.trim()
    if (!content) return wx.showToast({ title: '先写一点想分享的内容吧', icon: 'none' })
    const profile = this.profile()
    const editingPostId = this.data.editingPostId
    wx.showLoading({ title: editingPostId ? '保存中' : '发布中' })
    try {
      const images = await this.uploadImages(this.data.postImages)
      const category = this.data.postCategories[this.data.categoryIndex] || '日常分享'
      if (editingPostId) {
        await cloudStore.updateForumPost(editingPostId, content, category, images)
      } else {
        await cloudStore.createForumPost({
          content,
          authorName: profile.displayName,
          authorAvatar: profile.cloudAvatarUrl || profile.avatarUrl,
          category,
          images
        })
      }
      this.setData({ draft: '', postImages: [], categoryIndex: 0, editingPostId: '', cloudError: '' })
      await this.load()
      wx.hideLoading()
      wx.showToast({ title: editingPostId ? '修改已保存' : '已发布' })
    } catch (error) {
      wx.hideLoading()
      console.error(editingPostId ? '修改失败' : '发布失败', error)
      this.setData({ cloudError: editingPostId ? '修改失败，请部署 forumPostManager 云函数后重试。' : '发布失败，请检查论坛集合权限和云环境配置。' })
    }
  },

  cancelEdit() {
    this.setData({ editingPostId: '', draft: '', postImages: [], categoryIndex: 0 })
  },

  postMenu(event) {
    const post = this.data.posts.find(item => item.id === event.currentTarget.dataset.id)
    if (!post) return
    if (!post.isMine) return this.report()
    wx.showActionSheet({
      itemList: ['编辑帖子', '删除帖子'],
      success: result => {
        if (result.tapIndex === 0) this.startEdit(post)
        if (result.tapIndex === 1) this.confirmDelete(post)
      }
    })
  },

  startEdit(post) {
    this.setData({ editingPostId: post.id, draft: post.content, postImages: post.images || [], categoryIndex: Math.max(0, this.data.postCategories.indexOf(post.category)) })
    wx.pageScrollTo({ scrollTop: 0, duration: 300 })
  },

  confirmDelete(post) {
    wx.showModal({
      title: '删除这条帖子？',
      content: '帖子、点赞和讨论将一并删除，删除后无法恢复。',
      confirmText: '删除',
      confirmColor: '#d65f66',
      success: async result => {
        if (!result.confirm) return
        wx.showLoading({ title: '删除中' })
        try {
          await cloudStore.deleteForumPost(post.id)
          if (this.data.editingPostId === post.id) this.cancelEdit()
          await this.load()
          wx.hideLoading()
          wx.showToast({ title: '已删除' })
        } catch (error) {
          wx.hideLoading()
          console.error('删除失败', error)
          this.setData({ cloudError: '删除失败，请部署 forumPostManager 云函数后重试。' })
        }
      }
    })
  },

  async like(event) {
    const postId = event.currentTarget.dataset.id
    const before = this.data.posts.find(item => item.id === postId)
    if (before) this.setData({ posts: this.data.posts.map(item => item.id === postId ? { ...item, liked: !item.liked, likes: Math.max(0, item.likes + (item.liked ? -1 : 1)) } : item) })
    try {
      const result = await cloudStore.toggleForumLike(postId)
      this.setData({ posts: this.data.posts.map(item => item.id === postId ? { ...item, liked: result.liked } : item) })
      await this.load()
    } catch (error) {
      console.error('点赞失败', error)
      this.setData({ cloudError: '点赞服务尚未部署，请部署 toggleForumLike 云函数。' })
    }
  },

  async submitComment(event) {
    const postId = event.currentTarget.dataset.id
    const content = (this.data.commentDrafts[postId] || '').trim()
    if (!content) return wx.showToast({ title: '先写一点评论内容吧', icon: 'none' })
    const profile = this.profile()
    try {
      await cloudStore.createForumComment({
        postId,
        content,
        authorName: profile.displayName,
        authorAvatar: profile.cloudAvatarUrl || profile.avatarUrl
      })
      this.setData({
        cloudError: '',
        commentDrafts: { ...this.data.commentDrafts, [postId]: '' },
        expandedPosts: { ...this.data.expandedPosts, [postId]: true }
      })
      await this.load()
      wx.showToast({ title: '评论已发布' })
    } catch (error) {
      console.error('评论失败', error)
      this.setData({ cloudError: '评论发布失败，请检查评论集合权限。' })
    }
  },

  openUserProfile(event) {
    const ownerId = event.currentTarget.dataset.owner
    if (ownerId) wx.navigateTo({ url: `/pages/user-profile/index?ownerId=${encodeURIComponent(ownerId)}` })
  },

  report() {
    wx.showActionSheet({
      itemList: ['不友善内容', '广告或虚假信息', '可能造成健康伤害'],
      success: () => wx.showToast({ title: '感谢反馈，我们会核查', icon: 'none' })
    })
  }
})
