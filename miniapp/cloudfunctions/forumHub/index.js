const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function cleanText(value, max) { return String(value || '').trim().slice(0, max) }
function publicId(openid) { return `SUTA-${crypto.createHash('sha256').update(openid).digest('hex').slice(0, 12).toUpperCase()}` }
function cleanAvatar(value) {
  const avatar = cleanText(value, 500)
  return /^(cloud:\/\/|https:\/\/)/i.test(avatar) ? avatar : ''
}

async function ensureProfile(openid, input = {}) {
  let saved = null
  try { saved = (await db.collection('user_profiles').doc(openid).get()).data } catch (error) {}
  const inputAvatar = cleanAvatar(input.avatarUrl)
  const profile = {
    publicId: (saved && saved.publicId) || publicId(openid),
    displayName: cleanText(input.displayName || (saved && saved.displayName) || 'SUTA 用户', 20),
    avatarUrl: inputAvatar || cleanAvatar(saved && saved.avatarUrl),
    bio: cleanText(input.bio || (saved && saved.bio) || '慢慢照顾自己，也温柔回应别人。', 80),
    updatedAt: db.serverDate()
  }
  if (saved) await db.collection('user_profiles').doc(openid).update({ data: profile })
  else await db.collection('user_profiles').add({ data: { _id: openid, ...profile, createdAt: db.serverDate() } })
  return profile
}

async function syncForumIdentity(openid, profile) {
  const identity = { authorId: profile.publicId, authorName: profile.displayName, authorAvatar: profile.avatarUrl }
  const updates = [
    db.collection('forum_posts').where({ _openid: openid }).update({ data: identity }),
    db.collection('forum_comments').where({ _openid: openid }).update({ data: identity }),
    db.collection('forum_notifications').where({ actorId: openid }).update({ data: { actorName: profile.displayName, actorAvatar: profile.avatarUrl } })
  ]
  await Promise.all(updates.map(task => task.catch(error => console.warn('forum identity backfill skipped', error.message))))
}

exports.main = async event => {
  const { OPENID } = cloud.getWXContext()
  const action = cleanText(event.action, 30)
  try {
    if (action === 'bootstrap') {
      const profile = await ensureProfile(OPENID, event.profile || {})
      await syncForumIdentity(OPENID, profile)
      const unread = await db.collection('forum_notifications').where({ ownerId: OPENID, read: false }).count()
      return { ok: true, openid: OPENID, profile, unread: unread.total || 0 }
    }

    if (action === 'createPost') {
      const content = cleanText(event.content, 300)
      if (!content) return { ok: false, message: '帖子内容不能为空' }
      const profile = await ensureProfile(OPENID, { displayName: event.authorName, avatarUrl: event.authorAvatar })
      const result = await db.collection('forum_posts').add({ data: {
        _openid: OPENID,
        authorId: profile.publicId,
        authorName: profile.displayName,
        authorAvatar: profile.avatarUrl,
        content,
        category: cleanText(event.category || '日常分享', 12),
        images: Array.isArray(event.images) ? event.images.slice(0, 3) : [],
        likeCount: 0,
        createdAt: db.serverDate()
      } })
      return { ok: true, postId: result._id }
    }

    if (action === 'comment') {
      const postId = cleanText(event.postId, 80)
      const content = cleanText(event.content, 200)
      if (!postId || !content) return { ok: false, message: '评论内容不能为空' }
      const post = (await db.collection('forum_posts').doc(postId).get()).data
      if (!post) return { ok: false, message: '帖子不存在' }
      const profile = await ensureProfile(OPENID, { displayName: event.authorName, avatarUrl: event.authorAvatar })
      await db.collection('forum_comments').add({ data: { _openid: OPENID, postId, content, authorName: profile.displayName, authorAvatar: profile.avatarUrl, authorId: profile.publicId, createdAt: db.serverDate() } })
      if (post._openid && post._openid !== OPENID) await db.collection('forum_notifications').add({ data: {
        ownerId: post._openid, actorId: OPENID, actorName: profile.displayName, actorAvatar: profile.avatarUrl,
        type: 'comment', postId, preview: content, read: false, createdAt: db.serverDate()
      } })
      return { ok: true }
    }

    if (action === 'publicProfile') {
      const ownerId = cleanText(event.ownerId, 100)
      let profile = null
      try { profile = (await db.collection('user_profiles').doc(ownerId).get()).data } catch (error) {}
      const posts = await db.collection('forum_posts').where({ _openid: ownerId }).orderBy('createdAt', 'desc').limit(20).get()
      const firstPost = (posts.data || [])[0]
      const publicProfile = profile
        ? { publicId: profile.publicId, displayName: profile.displayName, avatarUrl: profile.avatarUrl, bio: profile.bio }
        : firstPost
          ? { publicId: firstPost.authorId || 'SUTA-同伴', displayName: firstPost.authorName || 'SUTA 同伴', avatarUrl: firstPost.authorAvatar || '', bio: '慢慢照顾自己，也温柔回应别人。' }
          : null
      return { ok: true, profile: publicProfile, posts: posts.data || [] }
    }

    if (action === 'myForum') {
      const [posts, notifications] = await Promise.all([
        db.collection('forum_posts').where({ _openid: OPENID }).orderBy('createdAt', 'desc').limit(30).get(),
        db.collection('forum_notifications').where({ ownerId: OPENID }).orderBy('createdAt', 'desc').limit(50).get()
      ])
      return { ok: true, posts: posts.data || [], notifications: notifications.data || [] }
    }

    if (action === 'markRead') {
      await db.collection('forum_notifications').where({ ownerId: OPENID, read: false }).update({ data: { read: true } })
      return { ok: true }
    }

    if (action === 'feedback') {
      const content = cleanText(event.content, 800)
      if (!content) return { ok: false, message: '请填写反馈内容' }
      const profile = await ensureProfile(OPENID)
      await db.collection('feedback').add({ data: { _openid: OPENID, publicId: profile.publicId, content, contact: cleanText(event.contact, 80), status: '待处理', createdAt: db.serverDate() } })
      return { ok: true }
    }
    return { ok: false, message: '不支持的操作' }
  } catch (error) {
    console.error('forumHub failed', error)
    return { ok: false, message: error.message || '云端服务暂时不可用' }
  }
}
