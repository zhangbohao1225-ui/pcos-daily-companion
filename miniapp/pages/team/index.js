const store = require('../../utils/store.js')
const cloudStore = require('../../utils/cloud-store.js')

Page({
  data: { teams: [], teamName: '', inviteCode: '', draftByTeam: {}, activePanel: '', loading: false, cloudError: '' },
  onShow() { store.ensureState(); this.load() },
  profile() { return store.ensureState().profile || {} },
  progress() { const dashboard = store.dashboard(); return { completed: dashboard.completed, total: dashboard.total } },
  render(teams) {
    const draftByTeam = { ...this.data.draftByTeam }
    const rendered = teams.map(team => {
      const me = team.members.find(member => member.id === this.currentOpenId)
      const ownEncouragement = team.encouragements.find(item => item.userId === this.currentOpenId) || null
      if (draftByTeam[team.id] === undefined) draftByTeam[team.id] = ownEncouragement ? ownEncouragement.content : ''
      return { ...team, members: team.members.map(member => ({ ...member, initial: (member.name || 'S').slice(0, 1), displayName: member.id === this.currentOpenId ? `${member.name}（我）` : member.name, progressText: member.sharing ? `${member.completed}/${member.total} 项完成` : '成员选择保密' })), sharingCount: team.members.filter(member => member.sharing).length, completedCount: team.members.reduce((sum, member) => sum + (member.sharing ? member.completed || 0 : 0), 0), ownEncouragement, mySharing: Boolean(me && me.sharing) }
    })
    this.setData({ teams: rendered, draftByTeam })
  },
  async load() {
    if (this.data.loading) return
    this.setData({ loading: true, cloudError: '' })
    try {
      const result = await cloudStore.teamHub('list'); this.currentOpenId = result.openid || ''; this.render(result.teams || [])
    } catch (error) { console.error(error); this.setData({ teams: [], cloudError: '组队云服务尚未部署。部署 teamHub 后即可创建或加入真实队伍。' }) }
    finally { this.setData({ loading: false }) }
  },
  setName(event) { this.setData({ teamName: event.detail.value }) },
  setCode(event) { this.setData({ inviteCode: event.detail.value.toUpperCase() }) },
  setPanel(event) { this.setData({ activePanel: event.currentTarget.dataset.mode }) },
  closePanel() { this.setData({ activePanel: '' }) },
  goCheckin() { wx.switchTab({ url: '/pages/checkin/index' }) },
  setDraft(event) { const teamId = event.currentTarget.dataset.id; this.setData({ draftByTeam: { ...this.data.draftByTeam, [teamId]: event.detail.value } }) },
  async createTeam() {
    const name = this.data.teamName.trim(); if (!name) return wx.showToast({ title: '请填写队伍名称', icon: 'none' })
    const profile = this.profile(); wx.showLoading({ title: '创建中' })
    try { const result = await cloudStore.teamHub('create', { name, displayName: profile.displayName, avatarUrl: profile.cloudAvatarUrl || '' }); this.setData({ teamName: '', activePanel: '', cloudError: '' }); this.render(result.teams || []); wx.hideLoading(); wx.showToast({ title: '队伍已创建' }) }
    catch (error) { wx.hideLoading(); wx.showToast({ title: error.message || '创建失败', icon: 'none' }) }
  },
  async joinTeam() {
    const inviteCode = this.data.inviteCode.trim(); if (!inviteCode) return wx.showToast({ title: '请输入邀请码', icon: 'none' })
    const profile = this.profile(); wx.showLoading({ title: '加入中' })
    try { const result = await cloudStore.teamHub('join', { inviteCode, displayName: profile.displayName, avatarUrl: profile.cloudAvatarUrl || '' }); this.setData({ inviteCode: '', activePanel: '', cloudError: '' }); this.render(result.teams || []); wx.hideLoading(); wx.showToast({ title: result.alreadyJoined ? '你已在这个队伍中' : '已加入队伍', icon: 'none' }) }
    catch (error) { wx.hideLoading(); wx.showToast({ title: error.message || '加入失败', icon: 'none' }) }
  },
  async saveEncouragement(event) {
    const teamId = event.currentTarget.dataset.id; const content = (this.data.draftByTeam[teamId] || '').trim(); if (!content) return wx.showToast({ title: '请写一句鼓励', icon: 'none' })
    try { await cloudStore.teamHub('encouragement', { teamId, content, author: this.profile().displayName }); await this.load(); wx.showToast({ title: '鼓励已保存' }) } catch (error) { wx.showToast({ title: error.message || '保存失败', icon: 'none' }) }
  },
  copyCode(event) { wx.setClipboardData({ data: event.currentTarget.dataset.code }) },
  async toggleSharing(event) {
    const teamId = event.currentTarget.dataset.id; const sharing = Boolean(event.detail.value); const progress = this.progress(); const profile = this.profile()
    try { await cloudStore.teamHub('share', { teamId, sharing, ...progress, displayName: profile.displayName, avatarUrl: profile.cloudAvatarUrl || '' }); await this.load() } catch (error) { wx.showToast({ title: error.message || '设置失败', icon: 'none' }); await this.load() }
  }
})
