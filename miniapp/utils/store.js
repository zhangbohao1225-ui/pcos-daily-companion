const { formatDate, shiftDate } = require('./date.js')

const KEY = 'suta-mini-state-v1'

const templates = [
  { id: 'nutrition', name: '均衡饮食', caption: '吃一顿让身体舒服的饭', icon: '餐', art: '/assets/tutu-eating-painted.png', score: 25 },
  { id: 'movement', name: '温和运动', caption: '散步或做喜欢的轻运动', icon: '动', art: '/assets/tutu-running-painted.png', score: 25 },
  { id: 'mood', name: '情绪停靠', caption: '给此刻的感受一个空间', icon: '心', art: '/assets/tutu-music-painted.png', score: 25 },
  { id: 'sleep', name: '睡眠记录', caption: '记录睡眠与休息状态', icon: '眠', art: '/assets/tutu-sleeping-painted.png', score: 25 }
]

function seedState() {
  const today = formatDate()
  const checkins = {}
  for (let offset = -6; offset <= 0; offset += 1) {
    const date = shiftDate(today, offset)
    checkins[date] = templates.reduce((result, item, index) => {
      result[item.id] = offset < 0 ? index < (Math.abs(offset) % 4) + 1 : false
      return result
    }, {})
  }
  return {
    profile: { displayName: 'SUTA 用户', avatarUrl: '', cloudAvatarUrl: '', publicId: '', sleepTarget: 8, movementTarget: 30, customGoals: [] },
    wallet: { balance: 0, isPro: false, proExpiresAt: null },
    themeColor: 'coral',
    nutritionLogs: {},
    templates,
    checkins,
    checkinDetails: {},
    notes: {},
    symptoms: {},
    activePeriod: null,
    cycles: [],
    teams: [],
    forumPosts: []
  }
}

function normalizeState(input) {
  const state = input && typeof input === 'object' ? input : seedState()
  state.profile = {
    displayName: 'SUTA 用户', avatarUrl: '', cloudAvatarUrl: '', publicId: '',
    sleepTarget: 8, movementTarget: 30, customGoals: [], ...(state.profile || {})
  }
  state.profile.customGoals = Array.isArray(state.profile.customGoals) ? state.profile.customGoals : []
  state.wallet = { balance: 0, isPro: false, proExpiresAt: null, ...(state.wallet || {}) }
  state.themeColor = state.themeColor || 'coral'
  state.nutritionLogs = state.nutritionLogs || {}
  state.templates = templates.map(clean => {
    const saved = Array.isArray(state.templates) ? state.templates.find(item => item.id === clean.id) : null
    return { ...(saved || {}), ...clean }
  })
  state.checkins = state.checkins || {}
  state.checkinDetails = state.checkinDetails || {}
  state.notes = state.notes || {}
  state.symptoms = state.symptoms || {}
  state.cycles = Array.isArray(state.cycles) ? state.cycles : []
  state.teams = (Array.isArray(state.teams) ? state.teams : []).filter(team => team.id !== 'team-gentle' && team.inviteCode !== 'SUTA2026')
  state.forumPosts = Array.isArray(state.forumPosts) ? state.forumPosts : []
  return state
}

function ensureState() {
  const state = normalizeState(wx.getStorageSync(KEY) || seedState())
  wx.setStorageSync(KEY, state)
  return state
}

function getState() { return normalizeState(wx.getStorageSync(KEY) || seedState()) }
function setState(state) { const normalized = normalizeState(state); wx.setStorageSync(KEY, normalized); return normalized }
function update(updater) { const state = ensureState(); updater(state); return setState(state) }

function dashboard(date = formatDate()) {
  const state = ensureState()
  const entries = state.checkins[date] || {}
  const completed = state.templates.filter(item => entries[item.id]).length
  return {
    date,
    templates: state.templates.map(item => ({ ...item, completed: Boolean(entries[item.id]) })),
    completed,
    total: state.templates.length,
    score: state.templates.length ? Math.round(completed / state.templates.length * 100) : 0,
    note: state.notes[date] || '',
    details: state.checkinDetails[date] || {},
    symptoms: state.symptoms[date] || { pain: '轻', mood: '平稳', energy: '一般' },
    activePeriod: state.activePeriod
  }
}

function saveCheckin(date, templateId, completed) {
  update(state => { state.checkins[date] = state.checkins[date] || {}; state.checkins[date][templateId] = completed })
}

function saveCheckinDetails(date, templateId, details) {
  update(state => {
    state.checkins[date] = state.checkins[date] || {}
    state.checkinDetails[date] = state.checkinDetails[date] || {}
    state.checkins[date][templateId] = true
    state.checkinDetails[date][templateId] = details
  })
}

function saveDailyDetails(date, details) {
  update(state => { state.notes[date] = details.note || ''; state.symptoms[date] = details.symptoms })
}

function getHistory(days = 30) {
  const state = ensureState(); const today = formatDate()
  return Array.from({ length: days }, (_, index) => {
    const date = shiftDate(today, index - days + 1); const entries = state.checkins[date] || {}
    const completed = state.templates.filter(item => entries[item.id]).length
    return { date, completed, total: state.templates.length, score: state.templates.length ? Math.round(completed / state.templates.length * 100) : 0 }
  })
}

module.exports = { KEY, ensureState, getState, setState, update, dashboard, saveCheckin, saveCheckinDetails, saveDailyDetails, getHistory }
