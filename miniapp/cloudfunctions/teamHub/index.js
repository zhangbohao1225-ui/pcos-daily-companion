const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const command = db.command

function cleanText(value, max) { return String(value || '').trim().slice(0, max) }
function code() { return `${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase() }

async function teamDetails(userId) {
  const memberships = (await db.collection('team_members').where({ userId }).limit(50).get()).data || []
  if (!memberships.length) return []
  const teamIds = memberships.map(item => item.teamId)
  const [teamResult, memberResult, encouragementResult] = await Promise.all([
    db.collection('teams').where({ _id: command.in(teamIds) }).limit(50).get(),
    db.collection('team_members').where({ teamId: command.in(teamIds) }).limit(200).get(),
    db.collection('team_encouragements').where({ teamId: command.in(teamIds) }).limit(200).get()
  ])
  const teams = teamResult.data || []; const members = memberResult.data || []; const encouragements = encouragementResult.data || []
  return teams.map(team => ({
    id: team._id, name: team.name, inviteCode: team.inviteCode, owner: team.ownerId === userId,
    members: members.filter(item => item.teamId === team._id).map(item => ({ id: item.userId, name: item.displayName || 'SUTA 同伴', avatarUrl: item.avatarUrl || '', completed: Number(item.completed) || 0, total: Number(item.total) || 4, sharing: Boolean(item.sharing) })),
    encouragements: encouragements.filter(item => item.teamId === team._id).sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt)).map(item => ({ id: item._id, userId: item.userId, author: item.author || 'SUTA 同伴', content: item.content, updatedAt: item.updatedAt }))
  }))
}

exports.main = async event => {
  const { OPENID } = cloud.getWXContext(); const action = event.action
  try {
    if (action === 'list') return { ok: true, openid: OPENID, teams: await teamDetails(OPENID) }
    if (action === 'create') {
      const name = cleanText(event.name, 24); if (!name) return { ok: false, message: '请填写队伍名称' }
      let inviteCode = code()
      for (let i = 0; i < 4; i += 1) { const found = await db.collection('teams').where({ inviteCode }).limit(1).get(); if (!found.data.length) break; inviteCode = code() }
      const team = await db.collection('teams').add({ data: { name, inviteCode, ownerId: OPENID, createdAt: Date.now() } })
      await db.collection('team_members').add({ data: { teamId: team._id, userId: OPENID, displayName: cleanText(event.displayName, 20) || '我', avatarUrl: cleanText(event.avatarUrl, 500), completed: 0, total: 4, sharing: false, joinedAt: Date.now() } })
      return { ok: true, openid: OPENID, teams: await teamDetails(OPENID) }
    }
    if (action === 'join') {
      const inviteCode = cleanText(event.inviteCode, 12).toUpperCase(); if (!inviteCode) return { ok: false, message: '请输入邀请码' }
      const found = await db.collection('teams').where({ inviteCode }).limit(1).get(); if (!found.data.length) return { ok: false, message: '没有找到这个队伍，请检查邀请码' }
      const teamId = found.data[0]._id; const existing = await db.collection('team_members').where({ teamId, userId: OPENID }).limit(1).get()
      if (!existing.data.length) await db.collection('team_members').add({ data: { teamId, userId: OPENID, displayName: cleanText(event.displayName, 20) || 'SUTA 同伴', avatarUrl: cleanText(event.avatarUrl, 500), completed: 0, total: 4, sharing: false, joinedAt: Date.now() } })
      return { ok: true, openid: OPENID, teams: await teamDetails(OPENID), alreadyJoined: Boolean(existing.data.length) }
    }
    if (action === 'share') {
      const teamId = cleanText(event.teamId, 64); const member = await db.collection('team_members').where({ teamId, userId: OPENID }).limit(1).get(); if (!member.data.length) return { ok: false, message: '你还不是该队成员' }
      await db.collection('team_members').doc(member.data[0]._id).update({ data: { sharing: Boolean(event.sharing), completed: Math.max(0, Math.min(4, Number(event.completed) || 0)), total: 4, displayName: cleanText(event.displayName, 20) || member.data[0].displayName, avatarUrl: cleanText(event.avatarUrl, 500) || member.data[0].avatarUrl, updatedAt: Date.now() } })
      return { ok: true }
    }
    if (action === 'encouragement') {
      const teamId = cleanText(event.teamId, 64); const content = cleanText(event.content, 200); if (!content) return { ok: false, message: '请写一句鼓励' }
      const member = await db.collection('team_members').where({ teamId, userId: OPENID }).limit(1).get(); if (!member.data.length) return { ok: false, message: '你还不是该队成员' }
      const existing = await db.collection('team_encouragements').where({ teamId, userId: OPENID }).limit(1).get(); const data = { teamId, userId: OPENID, author: cleanText(event.author, 20) || 'SUTA 同伴', content, updatedAt: Date.now() }
      if (existing.data.length) await db.collection('team_encouragements').doc(existing.data[0]._id).update({ data })
      else await db.collection('team_encouragements').add({ data })
      return { ok: true }
    }
    return { ok: false, message: '不支持的操作' }
  } catch (error) { console.error(error); return { ok: false, message: error.message || '组队服务暂时不可用' } }
}
