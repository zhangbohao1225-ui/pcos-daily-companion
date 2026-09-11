const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const command = db.command

function clean(value, max = 500) { return String(value || '').trim().slice(0, max) }
function threadIdFor(a, b) {
  const pair = [a, b].sort().join(':')
  return `dm-${crypto.createHash('sha256').update(pair).digest('hex').slice(0, 32)}`
}
function publicId(openid) {
  return `SUTA-${crypto.createHash('sha256').update(openid).digest('hex').slice(0, 12).toUpperCase()}`
}

async function profileOf(openid) {
  try {
    const profile = (await db.collection('user_profiles').doc(openid).get()).data
    if (profile) return { ownerId: openid, publicId: profile.publicId || publicId(openid), displayName: profile.displayName || 'SUTA 同伴', avatarUrl: profile.avatarUrl || '' }
  } catch (error) {}
  return { ownerId: openid, publicId: publicId(openid), displayName: 'SUTA 同伴', avatarUrl: '' }
}

async function followStats(viewerId, targetId) {
  const [following, followers, relation] = await Promise.all([
    db.collection('user_follows').where({ followerId: targetId }).count(),
    db.collection('user_follows').where({ followingId: targetId }).count(),
    viewerId === targetId
      ? Promise.resolve({ total: 0 })
      : db.collection('user_follows').where({ followerId: viewerId, followingId: targetId }).count()
  ])
  return {
    followingCount: following.total || 0,
    followerCount: followers.total || 0,
    isFollowing: (relation.total || 0) > 0,
    isSelf: viewerId === targetId
  }
}

async function requireThread(threadId, openid) {
  const thread = (await db.collection('direct_threads').doc(threadId).get()).data
  if (!thread || !Array.isArray(thread.participants) || !thread.participants.includes(openid)) throw new Error('你无权查看这段私信')
  return thread
}

exports.main = async event => {
  const { OPENID } = cloud.getWXContext()
  const action = clean(event.action, 30)
  try {
    if (action === 'stats') {
      const targetId = clean(event.targetId, 100) || OPENID
      const stats = await followStats(OPENID, targetId)
      let unreadMessages = 0
      if (targetId === OPENID) {
        const unread = await db.collection('direct_messages').where({ receiverId: OPENID, read: false }).count()
        unreadMessages = unread.total || 0
      }
      return { ok: true, ...stats, unreadMessages }
    }

    if (action === 'listConnections') {
      const type = event.type === 'followers' ? 'followers' : 'following'
      const condition = type === 'followers' ? { followingId: OPENID } : { followerId: OPENID }
      const result = await db.collection('user_follows').where(condition).limit(100).get()
      const relations = (result.data || []).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
      const ids = [...new Set(relations.map(item => type === 'followers' ? item.followerId : item.followingId).filter(Boolean))]
      let followingSet = new Set()
      if (ids.length) {
        const mine = await db.collection('user_follows').where({ followerId: OPENID, followingId: command.in(ids) }).limit(100).get()
        followingSet = new Set((mine.data || []).map(item => item.followingId))
      }
      const connections = await Promise.all(ids.map(async ownerId => ({
        ...(await profileOf(ownerId)),
        isFollowing: followingSet.has(ownerId)
      })))
      return { ok: true, type, connections, ...(await followStats(OPENID, OPENID)) }
    }

    if (action === 'toggleFollow') {
      const targetId = clean(event.targetId, 100)
      if (!targetId || targetId === OPENID) return { ok: false, message: '不能关注自己' }
      const relation = await db.collection('user_follows').where({ followerId: OPENID, followingId: targetId }).get()
      let isFollowing = false
      if ((relation.data || []).length) {
        await Promise.all(relation.data.map(item => db.collection('user_follows').doc(item._id).remove()))
      } else {
        await db.collection('user_follows').add({ data: { followerId: OPENID, followingId: targetId, createdAt: Date.now() } })
        isFollowing = true
      }
      const stats = await followStats(OPENID, targetId)
      return { ok: true, ...stats, isFollowing }
    }

    if (action === 'openThread') {
      const targetId = clean(event.targetId, 100)
      if (!targetId || targetId === OPENID) return { ok: false, message: '不能给自己发私信' }
      const relation = await db.collection('user_follows').where({ followerId: OPENID, followingId: targetId }).count()
      if (!relation.total) return { ok: false, message: '关注对方后才能发私信' }
      const threadId = threadIdFor(OPENID, targetId)
      try {
        await db.collection('direct_threads').doc(threadId).get()
      } catch (error) {
        await db.collection('direct_threads').doc(threadId).set({ data: { participants: [OPENID, targetId].sort(), lastMessage: '', lastAt: Date.now(), createdAt: Date.now() } })
      }
      return { ok: true, threadId, other: await profileOf(targetId) }
    }

    if (action === 'listThreads') {
      const result = await db.collection('direct_threads').where({ participants: command.all([OPENID]) }).limit(50).get()
      const raw = (result.data || []).sort((a, b) => Number(b.lastAt || 0) - Number(a.lastAt || 0))
      const threads = await Promise.all(raw.map(async thread => {
        const otherId = (thread.participants || []).find(id => id !== OPENID) || ''
        const unread = await db.collection('direct_messages').where({ threadId: thread._id, receiverId: OPENID, read: false }).count()
        return { id: thread._id, other: await profileOf(otherId), lastMessage: thread.lastMessage || '开始一段温柔的对话', lastAt: thread.lastAt || thread.createdAt, unread: unread.total || 0 }
      }))
      return { ok: true, threads }
    }

    if (action === 'listMessages') {
      const threadId = clean(event.threadId, 100)
      const thread = await requireThread(threadId, OPENID)
      const messages = await db.collection('direct_messages').where({ threadId }).orderBy('createdAt', 'asc').limit(100).get()
      await db.collection('direct_messages').where({ threadId, receiverId: OPENID, read: false }).update({ data: { read: true, readAt: Date.now() } })
      const otherId = thread.participants.find(id => id !== OPENID) || ''
      return { ok: true, other: await profileOf(otherId), messages: (messages.data || []).map(item => ({ id: item._id, content: item.content, createdAt: item.createdAt, isMine: item.senderId === OPENID })) }
    }

    if (action === 'sendMessage') {
      const threadId = clean(event.threadId, 100)
      const content = clean(event.content, 500)
      if (!content) return { ok: false, message: '请输入私信内容' }
      const thread = await requireThread(threadId, OPENID)
      const recent = await db.collection('direct_messages').where({ senderId: OPENID, createdAt: command.gte(Date.now() - 60000) }).count()
      if ((recent.total || 0) >= 10) return { ok: false, message: '发送得有点快，请稍后再试' }
      const receiverId = thread.participants.find(id => id !== OPENID)
      await db.collection('direct_messages').add({ data: { threadId, senderId: OPENID, receiverId, content, read: false, createdAt: Date.now() } })
      await db.collection('direct_threads').doc(threadId).update({ data: { lastMessage: content, lastAt: Date.now() } })
      return { ok: true }
    }

    if (action === 'report') {
      const targetId = clean(event.targetId, 100)
      const reason = clean(event.reason, 120)
      const threadId = clean(event.threadId, 100)
      if (!targetId || !reason) return { ok: false, message: '请选择举报原因' }
      if (threadId) await requireThread(threadId, OPENID)
      await db.collection('feedback').add({ data: { _openid: OPENID, type: '私信举报', targetId, threadId, content: reason, status: '待处理', createdAt: db.serverDate() } })
      return { ok: true }
    }
    return { ok: false, message: '不支持的操作' }
  } catch (error) {
    console.error('socialHub failed', error)
    return { ok: false, message: error.message || '社交服务暂时不可用' }
  }
}
