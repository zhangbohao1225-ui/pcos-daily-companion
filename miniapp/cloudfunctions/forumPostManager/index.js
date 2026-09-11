const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

async function ownedPost(postId, openid) {
  if (!postId) throw new Error('缺少帖子 ID')
  const result = await db.collection('forum_posts').doc(postId).get()
  if (!result.data) throw new Error('帖子不存在')
  if (result.data._openid !== openid) throw new Error('只能管理自己发布的帖子')
  return result.data
}

exports.main = async event => {
  const { OPENID } = cloud.getWXContext()
  const action = String(event.action || '').trim()

  try {
    if (action === 'identity') return { ok: true, openid: OPENID }

    const postId = String(event.postId || '').trim()
    await ownedPost(postId, OPENID)

    if (action === 'update') {
      const content = String(event.content || '').trim()
      if (!content) return { ok: false, message: '帖子内容不能为空' }
      if (content.length > 300) return { ok: false, message: '帖子内容不能超过 300 字' }
      const category = String(event.category || '日常分享').trim()
      const images = Array.isArray(event.images) ? event.images.slice(0, 3) : []
      await db.collection('forum_posts').doc(postId).update({ data: { content, category, images, editedAt: db.serverDate() } })
      return { ok: true, action: 'updated' }
    }

    if (action === 'delete') {
      await Promise.all([
        db.collection('forum_comments').where({ postId }).remove(),
        db.collection('forum_likes').where({ postId }).remove()
        ,db.collection('forum_notifications').where({ postId }).remove()
      ])
      await db.collection('forum_posts').doc(postId).remove()
      return { ok: true, action: 'deleted' }
    }

    return { ok: false, message: '不支持的操作' }
  } catch (error) {
    console.error('forumPostManager failed', error)
    return { ok: false, message: error.message || '帖子管理失败' }
  }
}
