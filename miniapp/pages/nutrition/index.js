const store = require('../../utils/store.js')
const { formatDate, shiftDate } = require('../../utils/date.js')

const mealMeta = [
  { id: 'breakfast', name: '早餐', hint: '开启一天的温柔能量' },
  { id: 'lunch', name: '午餐', hint: '主食、蛋白质和蔬菜都照顾到' },
  { id: 'dinner', name: '晚餐', hint: '按自己的饥饿感真实记录' },
  { id: 'snack', name: '加餐', hint: '水果、坚果或喜欢的小点心' }
]

const commonFoods = [
  { name: '白米饭', calories: 116, protein: 2.6, fat: 0.3, carbs: 25.9 },
  { name: '糙米饭', calories: 111, protein: 2.6, fat: 0.9, carbs: 23 },
  { name: '杂粮饭', calories: 118, protein: 3, fat: 0.8, carbs: 24.8 },
  { name: '燕麦片', calories: 338, protein: 10.1, fat: 6.1, carbs: 61.6 },
  { name: '全麦面包', calories: 246, protein: 9.7, fat: 4.2, carbs: 43.1 },
  { name: '馒头', calories: 223, protein: 7, fat: 1.1, carbs: 47 },
  { name: '面条（熟）', calories: 137, protein: 4.5, fat: 0.8, carbs: 27.5 },
  { name: '玉米', calories: 112, protein: 4, fat: 1.2, carbs: 22.8 },
  { name: '红薯', calories: 86, protein: 1.6, fat: 0.1, carbs: 20.1 },
  { name: '土豆', calories: 77, protein: 2, fat: 0.1, carbs: 17.5 },
  { name: '南瓜', calories: 26, protein: 1, fat: 0.1, carbs: 6.5 },
  { name: '藜麦（熟）', calories: 120, protein: 4.4, fat: 1.9, carbs: 21.3 },
  { name: '鸡蛋', calories: 144, protein: 13.3, fat: 8.8, carbs: 2.8 },
  { name: '鸡胸肉', calories: 165, protein: 31, fat: 3.6, carbs: 0 },
  { name: '瘦牛肉', calories: 250, protein: 26, fat: 15, carbs: 0 },
  { name: '猪里脊', calories: 155, protein: 22, fat: 7, carbs: 0 },
  { name: '三文鱼', calories: 208, protein: 20, fat: 13, carbs: 0 },
  { name: '虾仁', calories: 99, protein: 24, fat: 0.3, carbs: 0.2 },
  { name: '鳕鱼', calories: 82, protein: 18, fat: 0.7, carbs: 0 },
  { name: '北豆腐', calories: 116, protein: 12.2, fat: 6.7, carbs: 2 },
  { name: '嫩豆腐', calories: 57, protein: 5.7, fat: 2.9, carbs: 2.1 },
  { name: '毛豆', calories: 121, protein: 11.9, fat: 5.2, carbs: 8.9 },
  { name: '无糖豆浆', calories: 31, protein: 3, fat: 1.6, carbs: 1.2 },
  { name: '纯牛奶', calories: 54, protein: 3, fat: 3.2, carbs: 3.4 },
  { name: '无糖酸奶', calories: 72, protein: 4.5, fat: 3, carbs: 6.5 },
  { name: '西兰花', calories: 34, protein: 2.8, fat: 0.4, carbs: 6.6 },
  { name: '菠菜', calories: 23, protein: 2.9, fat: 0.4, carbs: 3.6 },
  { name: '生菜', calories: 15, protein: 1.4, fat: 0.2, carbs: 2.9 },
  { name: '油菜', calories: 18, protein: 1.8, fat: 0.5, carbs: 2.7 },
  { name: '番茄', calories: 18, protein: 0.9, fat: 0.2, carbs: 3.9 },
  { name: '黄瓜', calories: 15, protein: 0.7, fat: 0.1, carbs: 3.6 },
  { name: '胡萝卜', calories: 41, protein: 0.9, fat: 0.2, carbs: 9.6 },
  { name: '彩椒', calories: 31, protein: 1, fat: 0.3, carbs: 6 },
  { name: '香菇', calories: 26, protein: 2.2, fat: 0.3, carbs: 5.2 },
  { name: '西葫芦', calories: 17, protein: 1.2, fat: 0.3, carbs: 3.1 },
  { name: '苹果', calories: 52, protein: 0.3, fat: 0.2, carbs: 13.8 },
  { name: '香蕉', calories: 89, protein: 1.1, fat: 0.3, carbs: 22.8 },
  { name: '橙子', calories: 47, protein: 0.9, fat: 0.1, carbs: 11.8 },
  { name: '草莓', calories: 32, protein: 0.7, fat: 0.3, carbs: 7.7 },
  { name: '蓝莓', calories: 57, protein: 0.7, fat: 0.3, carbs: 14.5 },
  { name: '猕猴桃', calories: 61, protein: 1.1, fat: 0.5, carbs: 14.7 },
  { name: '梨', calories: 57, protein: 0.4, fat: 0.1, carbs: 15.2 },
  { name: '葡萄', calories: 69, protein: 0.7, fat: 0.2, carbs: 18.1 },
  { name: '牛油果', calories: 160, protein: 2, fat: 14.7, carbs: 8.5 },
  { name: '杏仁', calories: 579, protein: 21.2, fat: 49.9, carbs: 21.6 },
  { name: '核桃', calories: 654, protein: 15.2, fat: 65.2, carbs: 13.7 },
  { name: '花生', calories: 567, protein: 25.8, fat: 49.2, carbs: 16.1 },
  { name: '黑豆（熟）', calories: 132, protein: 8.9, fat: 0.5, carbs: 23.7 },
  { name: '鹰嘴豆（熟）', calories: 164, protein: 8.9, fat: 2.6, carbs: 27.4 }
]

function emptyLog() { return { goal: 1800, meals: { breakfast: [], lunch: [], dinner: [], snack: [] } } }
function round(value) { return Math.round(Number(value || 0) * 10) / 10 }

Page({
  data: { date: '', dateText: '', log: emptyLog(), meals: [], calories: 0, remaining: 0, percentage: 0, protein: 0, fat: 0, carbs: 0, activeMeal: '', search: '', foodResults: commonFoods, selectedFood: null, foodGrams: '100', customName: '', customGrams: '', showAdd: false },
  onLoad(options) { this.setData({ date: options.date || formatDate() }); this.load() },
  onShow() { if (this.data.date) this.load() },
  load() { const state = store.ensureState(); const saved = state.nutritionLogs[this.data.date] || emptyLog(); const log = { ...emptyLog(), ...saved, meals: { ...emptyLog().meals, ...(saved.meals || {}) } }; this.render(log) },
  render(log) {
    const foods = Object.values(log.meals).reduce((all, list) => all.concat(list || []), [])
    const sum = key => round(foods.reduce((total, food) => total + Number(food[key] || 0), 0))
    const calories = Math.round(sum('calories'))
    this.setData({ log, dateText: this.data.date === formatDate() ? '今天' : this.data.date, calories, remaining: Math.max(0, Number(log.goal) - calories), percentage: Math.min(100, Math.round(calories / Math.max(1, Number(log.goal)) * 100)), protein: sum('protein'), fat: sum('fat'), carbs: sum('carbs'), meals: mealMeta.map(item => ({ ...item, foods: (log.meals[item.id] || []).map(food => ({ ...food, amountText: food.grams ? `${food.grams} 克` : '1 份' })), calories: Math.round((log.meals[item.id] || []).reduce((total, food) => total + Number(food.calories || 0), 0)) })) })
  },
  save(log) {
    store.update(state => { const foods = Object.values(log.meals).reduce((all, list) => all.concat(list || []), []); const count = Object.values(log.meals).filter(list => list.length).length; state.nutritionLogs[this.data.date] = log; state.checkins[this.data.date] = state.checkins[this.data.date] || {}; state.checkinDetails[this.data.date] = state.checkinDetails[this.data.date] || {}; state.checkins[this.data.date].nutrition = count > 0; state.checkinDetails[this.data.date].nutrition = { choice: count ? `已记录 ${count} 餐` : '', value: '', unit: '', note: `约 ${Math.round(foods.reduce((sum, food) => sum + Number(food.calories || 0), 0))} 千卡` } })
    this.render(log)
  },
  previous() { this.setData({ date: shiftDate(this.data.date, -1) }); this.load() },
  next() { if (this.data.date === formatDate()) return; this.setData({ date: shiftDate(this.data.date, 1) }); this.load() },
  setGoal() { wx.showModal({ title: '每日记录目标', editable: true, placeholderText: '例如 1800', content: String(this.data.log.goal), success: result => { const goal = Number(result.content); if (result.confirm && goal >= 500 && goal <= 5000) this.save({ ...this.data.log, goal }) } }) },
  openAdd(event) { this.setData({ activeMeal: event.currentTarget.dataset.meal, showAdd: true, search: '', foodResults: commonFoods, selectedFood: null, foodGrams: '100' }) },
  closeAdd() { this.setData({ showAdd: false, selectedFood: null }) },
  noop() {},
  search(event) { const search = event.detail.value.trim(); this.setData({ search, foodResults: commonFoods.filter(food => food.name.includes(search)) }) },
  selectFood(event) { this.setData({ selectedFood: this.data.foodResults[Number(event.currentTarget.dataset.index)], foodGrams: '100' }) },
  setFoodGrams(event) { this.setData({ foodGrams: event.detail.value }) },
  confirmFood() {
    const food = this.data.selectedFood; const grams = Number(this.data.foodGrams)
    if (!food || grams <= 0 || grams > 3000) return wx.showToast({ title: '请输入正确的克数', icon: 'none' })
    const factor = grams / 100
    this.insert({ id: `food-${Date.now()}`, name: food.name, grams, calories: round(food.calories * factor), protein: round(food.protein * factor), fat: round(food.fat * factor), carbs: round(food.carbs * factor) })
  },
  setCustomName(event) { this.setData({ customName: event.detail.value }) },
  setCustomGrams(event) { this.setData({ customGrams: event.detail.value }) },
  addCustom() { const name = this.data.customName.trim(); const grams = Number(this.data.customGrams); if (!name || grams <= 0 || grams > 3000) return wx.showToast({ title: '请填写食物名称和克数', icon: 'none' }); this.insert({ id: `food-${Date.now()}`, name, grams, calories: 0, protein: 0, fat: 0, carbs: 0, custom: true }) },
  insert(food) { const log = { ...this.data.log, meals: { ...this.data.log.meals, [this.data.activeMeal]: [...this.data.log.meals[this.data.activeMeal], food] } }; this.setData({ showAdd: false, selectedFood: null, customName: '', customGrams: '' }); this.save(log); wx.showToast({ title: '已记录' }) },
  removeFood(event) { const meal = event.currentTarget.dataset.meal; const id = event.currentTarget.dataset.id; const log = { ...this.data.log, meals: { ...this.data.log.meals, [meal]: this.data.log.meals[meal].filter(food => food.id !== id) } }; this.save(log) }
})
