function getDatabase() {
  if (!wx.cloud) throw new Error('当前微信基础库不支持云开发')
  return wx.cloud.database()
}

function timestampOf(value) {
  if (value instanceof Date) return value.getTime()
  if (value && typeof value.getTime === 'function') return value.getTime()
  const timestamp = new Date(value || Date.now()).getTime()
  return Number.isNaN(timestamp) ? Date.now() : timestamp
}

async function listForumPosts(openid = '', category = '全部') {
  const db = getDatabase()
  let query = db.collection('forum_posts')
  if (category && category !== '全部') query = query.where({ category })
  const postsResult = await query
    .orderBy('createdAt', 'desc')
    .limit(30)
    .get()
  const rawPosts = postsResult.data || []
  const postIds = rawPosts.map(item => item._id)

  if (!postIds.length) return []

  const command = db.command
  const [commentsResult, likesResult] = await Promise.all([
    db.collection('forum_comments')
      .where({ postId: command.in(postIds) })
      .orderBy('createdAt', 'asc')
      .limit(100)
      .get(),
    db.collection('forum_likes')
      .where(openid ? { postId: command.in(postIds), _openid: openid } : { postId: command.in(postIds), _openid: '__none__' })
      .limit(100)
      .get()
  ])

  const commentsByPost = (commentsResult.data || []).reduce((result, comment) => {
    result[comment.postId] = result[comment.postId] || []
    result[comment.postId].push({
      id: comment._id,
      author: comment.authorName || 'SUTA 同伴',
      avatarUrl: comment.authorAvatar || '',
      content: comment.content || '',
      ownerId: comment._openid || '',
      createdAt: timestampOf(comment.createdAt)
    })
    return result
  }, {})
  const likedPostIds = new Set((likesResult.data || []).map(item => item.postId))

  return rawPosts.map(post => ({
    id: post._id,
    ownerId: post._openid || '',
    author: post.authorName || 'SUTA 同伴',
    avatarUrl: post.authorAvatar || '',
    authorId: post.authorId || '',
    category: post.category || '日常分享',
    images: Array.isArray(post.images) ? post.images : [],
    content: post.content || '',
    likes: Number(post.likeCount) || 0,
    liked: likedPostIds.has(post._id),
    createdAt: timestampOf(post.createdAt),
    editedAt: post.editedAt ? timestampOf(post.editedAt) : null,
    comments: commentsByPost[post._id] || []
  }))
}

async function forumHub(action, data = {}) {
  const result = await wx.cloud.callFunction({ name: 'forumHub', data: { action, ...data } })
  if (!result.result || !result.result.ok) throw new Error((result.result && result.result.message) || '论坛服务暂时不可用')
  return result.result
}

async function createForumPost(data) {
  return forumHub('createPost', data)
}

async function createForumComment({ postId, content, authorName, authorAvatar }) {
  return forumHub('comment', { postId, content, authorName, authorAvatar })
}

async function toggleForumLike(postId) {
  const result = await wx.cloud.callFunction({
    name: 'toggleForumLike',
    data: { postId }
  })
  if (!result.result || !result.result.ok) {
    throw new Error((result.result && result.result.message) || '点赞失败')
  }
  return result.result
}

async function manageForumPost(action, data = {}) {
  const result = await wx.cloud.callFunction({
    name: 'forumPostManager',
    data: { action, ...data }
  })
  if (!result.result || !result.result.ok) {
    throw new Error((result.result && result.result.message) || '帖子管理失败')
  }
  return result.result
}

async function getForumIdentity() {
  return manageForumPost('identity')
}

async function updateForumPost(postId, content, category, images) {
  return manageForumPost('update', { postId, content, category, images })
}

async function deleteForumPost(postId) {
  return manageForumPost('delete', { postId })
}

async function bootstrapUser(profile = {}) { return forumHub('bootstrap', { profile }) }
async function getPublicProfile(ownerId) { return forumHub('publicProfile', { ownerId }) }
async function listMyForum() { return forumHub('myForum') }
async function markForumRead() { return forumHub('markRead') }
async function submitFeedback(content, contact = '') { return forumHub('feedback', { content, contact }) }
async function teamHub(action, data = {}) {
  const result = await wx.cloud.callFunction({ name: 'teamHub', data: { action, ...data } })
  if (!result.result || !result.result.ok) throw new Error((result.result && result.result.message) || '组队服务暂时不可用')
  return result.result
}

async function socialHub(action, data = {}) {
  const result = await wx.cloud.callFunction({ name: 'socialHub', data: { action, ...data } })
  if (!result.result || !result.result.ok) throw new Error((result.result && result.result.message) || '社交服务暂时不可用')
  return result.result
}

module.exports = {
  listForumPosts,
  createForumPost,
  createForumComment,
  toggleForumLike,
  getForumIdentity,
  updateForumPost,
  deleteForumPost
  ,bootstrapUser
  ,getPublicProfile
  ,listMyForum
  ,markForumRead
  ,submitFeedback
  ,teamHub
  ,socialHub
}
