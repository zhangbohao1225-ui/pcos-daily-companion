const assert = require('assert')
const fs = require('fs')
const path = require('path')

function loadMiniModule(relativePath, dependencies = {}) {
  const filename = path.resolve(__dirname, relativePath)
  const source = fs.readFileSync(filename, 'utf8')
  const module = { exports: {} }
  const localRequire = request => dependencies[request] || require(request)
  new Function('require', 'module', 'exports', source)(localRequire, module, module.exports)
  return module.exports
}

const storage = {}
global.wx = {
  getStorageSync(key) { return storage[key] },
  setStorageSync(key, value) { storage[key] = value }
}

const dateUtils = loadMiniModule('../utils/date.js')
const store = loadMiniModule('../utils/store.js', { './date.js': dateUtils })
const { formatDate, shiftDate } = dateUtils

storage[store.KEY] = {
  profile: { displayName: '旧用户', sleepTarget: 8, movementTarget: 30 },
  templates: [
    { id: 'nutrition', name: '均衡饮食', caption: '饮食', icon: '🥗', score: 25 },
    { id: 'movement', name: '温和运动', caption: '运动', icon: '🌿', score: 25 },
    { id: 'mood', name: '情绪停靠', caption: '情绪', icon: '🌤️', score: 25 },
    { id: 'sleep', name: '睡眠记录', caption: '睡眠', icon: '🌙', score: 25 }
  ],
  checkins: {}, notes: {}, symptoms: {}, activePeriod: null, cycles: [], teams: [], forumPosts: [{ id: 'legacy-post', author: '旧用户', content: '旧帖子', likes: 0, liked: false, createdAt: Date.now() }]
}

const migrated = store.ensureState()
assert.strictEqual(migrated.profile.avatarUrl, '')
assert.deepStrictEqual(migrated.profile.customGoals, [])
assert.deepStrictEqual(migrated.checkinDetails, {})
assert.deepStrictEqual(migrated.forumPosts[0].comments, [])

const today = formatDate()
store.saveCheckinDetails(today, 'movement', { value: 30, unit: '分钟', choice: '散步', note: '' })
const dashboard = store.dashboard(today)
assert.strictEqual(dashboard.completed, 1)
assert.strictEqual(dashboard.details.movement.value, 30)

store.update(state => {
  state.cycles = [{ startDate: shiftDate(today, -28), endDate: shiftDate(today, -24) }]
})

let calendarPage
global.Page = definition => { calendarPage = definition }
loadMiniModule('../pages/calendar/index.js', { '../../utils/store.js': store, '../../utils/date.js': dateUtils })
calendarPage.setData = values => Object.assign(calendarPage.data, values)
calendarPage.onShow.call(calendarPage)
assert.strictEqual(calendarPage.data.prediction.length, 35)
assert.ok(calendarPage.data.prediction.every(item => item.phase && item.phaseName))

process.stdout.write('feature-verification=passed\n')
