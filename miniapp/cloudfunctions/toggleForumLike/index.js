const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const command = db.command

exports.main = async event => {
  const { OPENID } = cloud.getWXContext()
  const postId = String(event.postId || '').trim()
  if (!postId) return { ok: false, message: '缺少帖子 ID' }

  const post = await db.collection('forum_posts').doc(postId).get()
  if (!post.data) return { ok: false, message: '帖子不存在' }

  const existing = await db.collection('forum_likes')
    .where({ postId, _openid: OPENID })
    .limit(1)
    .get()

  if (existing.data.length) {
    await db.collection('forum_likes').doc(existing.data[0]._id).remove()
    await db.collection('forum_posts').doc(postId).update({
      data: { likeCount: command.inc(-1) }
    })
    return { ok: true, liked: false }
  }

  await db.collection('forum_likes').add({
    data: { postId, _openid: OPENID, createdAt: db.serverDate() }
  })
  await db.collection('forum_posts').doc(postId).update({
    data: { likeCount: command.inc(1) }
  })
  if (post.data._openid && post.data._openid !== OPENID) {
    let actor = null
    try { actor = (await db.collection('user_profiles').doc(OPENID).get()).data } catch (error) {}
    await db.collection('forum_notifications').add({ data: {
      ownerId: post.data._openid,
      actorId: OPENID,
      actorName: (actor && actor.displayName) || 'SUTA 同伴',
      actorAvatar: (actor && actor.avatarUrl) || '',
      type: 'like',
      postId,
      preview: String(post.data.content || '').slice(0, 36),
      read: false,
      createdAt: db.serverDate()
    } })
  }
  return { ok: true, liked: true }
}
