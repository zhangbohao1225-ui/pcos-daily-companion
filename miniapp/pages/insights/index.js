const store = require('../../utils/store.js')

const CONSENT_KEY = 'suta-ai-health-consent-v1'
const RATE_KEY = 'suta-ai-request-times-v3'

const modes = [
  { id: 'general', icon: '问', art: '/assets/tutu-doctor-painted.png', title: '健康问答', caption: '日常健康管理' },
  { id: 'nutrition', icon: '食', art: '/assets/tutu-eating-painted.png', title: '饮食建议', caption: '温和饮食思路' },
  { id: 'movement', icon: '动', art: '/assets/tutu-running-painted.png', title: '运动建议', caption: '循序渐进活动' },
  { id: 'trend', icon: '析', art: '/assets/tutu-teacher-painted.png', title: '趋势分析', caption: '参考近七天记录' }
]

const prompts = {
  general: ['根据我的近期记录，我最值得先关注什么？', '怎样建立更轻松、可持续的健康习惯？'],
  nutrition: ['根据我的目标，给我一些温和的饮食建议', '忙碌的时候怎样安排更均衡的一餐？'],
  movement: ['根据近期状态，帮我安排一份轻量运动计划', '状态一般时，可以做哪些温和活动？'],
  trend: ['帮我看看最近七天有哪些变化', '下周我可以优先记录和改善什么？']
}

function average(values) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0
}

function healthSummary(state) {
  const history = store.getHistory(7)
  const dimensions = (state.templates || []).map(template => {
    const completed = history.filter(day => (state.checkins[day.date] || {})[template.id]).length
    const completionRate = Math.round(completed / Math.max(1, history.length) * 100)
    return { key: template.id, label: template.name, score: completionRate, completionRate }
  })
  const daily = history.map(day => {
    const details = (state.checkinDetails && state.checkinDetails[day.date]) || {}
    const sleep = details.sleep && Number(details.sleep.value)
    const movement = details.movement && Number(details.movement.value)
    return {
      date: day.date,
      healthScore: day.score,
      completionRate: day.score,
      completedCount: day.completed,
      totalCount: day.total,
      sleepHours: Number.isFinite(sleep) ? sleep : null,
      movementMinutes: Number.isFinite(movement) ? movement : null
    }
  })
  return {
    healthScore: average(history.map(item => item.score)),
    completionRate: average(history.map(item => item.score)),
    dimensions,
    daily
  }
}

function advisorProfile(state) {
  const profile = state.profile || {}
  const customGoals = Array.isArray(profile.customGoals) ? profile.customGoals : []
  const goals = [
    profile.sleepTarget ? `每天睡眠目标 ${profile.sleepTarget} 小时` : '',
    profile.movementTarget ? `每天活动目标 ${profile.movementTarget} 分钟` : '',
    ...customGoals.map(goal => `${goal.name} ${goal.target}${goal.unit || ''}`)
  ].filter(Boolean)
  return { goals: goals.join('；') }
}

function cleanAssistantText(content) {
  return String(content || '')
    .replace(/^```(?:markdown|md)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
}

function systemPrompt(mode, profile, summary) {
  const instructions = {
    general: '回答日常健康管理问题，先给简短结论，再给风险说明和可以执行的小步骤。',
    nutrition: '聚焦均衡饮食、餐次安排和日常选择，不提供极端节食方案。',
    movement: '聚焦循序渐进的活动、运动和恢复建议，遇到疼痛或特殊阶段时提醒咨询专业人员。',
    trend: '结合最近七天摘要分析变化；数据不足时明确说明，不推断疾病。'
  }
  return [
    '你是 SUTA AI 健康顾问，面向女性日常健康管理。',
    instructions[mode] || instructions.general,
    '请用简洁、温和的中文回答，可以使用短标题和列表。',
    '你不能诊断疾病、开药、替代医生或承诺疗效，也不要制造焦虑。',
    '不要根据月经、体重或症状推断怀孕、疾病或心理诊断。',
    '如涉及胸痛、呼吸困难、意识异常、大量或持续异常出血、严重过敏、自伤风险等紧急情况，明确建议立即联系当地急救服务或就近就医。',
    `用户自行设置的目标：${JSON.stringify(profile)}`,
    `最近七天的最小化健康摘要：${JSON.stringify(summary)}`,
    '只参考已经提供的数据；没有的数据明确说不知道。'
  ].join('\n')
}

function urgentReply(content) {
  const pattern = /胸痛|呼吸困难|喘不上气|意识不清|昏厥|大量出血|止不住血|严重过敏|想自杀|自伤/
  if (!pattern.test(content)) return ''
  return '你描述的情况可能需要紧急处理。请不要只依赖在线建议：立即联系当地急救服务（中国大陆可拨打 120），或请身边的人陪同就近就医。如果你现在处于危险中，请先保证安全并尽快获得线下帮助。'
}

function canRequest() {
  const now = Date.now()
  const cutoff = now - 10 * 60 * 1000
  const recent = (wx.getStorageSync(RATE_KEY) || []).filter(value => Number(value) >= cutoff)
  if (recent.length >= 10) return false
  wx.setStorageSync(RATE_KEY, [...recent, now])
  return true
}

function friendlyError(error) {
  const message = String((error && (error.errMsg || error.message)) || '')
  if (/ModelNotEnabled|not enabled|model.*enable/i.test(message)) return '请先在云开发控制台启用 AI 模型'
  if (/model.*not found|invalid.*model/i.test(message)) return '当前 AI 模型不可用，请检查新环境中的模型名称和开关'
  if (/invalid.*env|environment.*not found|illegal.*env/i.test(message)) return '新云环境尚未正确关联当前小程序'
  if (/permission|unauthorized|forbidden|auth/i.test(message)) return 'AI 调用权限不足，请检查小程序与云环境的关联'
  if (/quota|token|package|balance|billing/i.test(message)) return 'AI Token 资源包暂不可用，请检查套餐'
  if (/extend\.AI|createModel|undefined/i.test(message)) return '请把小程序基础库升级到 3.15.1 或以上'
  if (/timeout|timed out/i.test(message)) return 'AI 响应超时，请稍后再试'
  if (/network|request:fail|connection/i.test(message)) return '网络连接失败，请检查网络后重试'
  return 'AI 暂时无法回应，请稍后再试'
}

Page({
  data: {
    modes,
    activeMode: 'general',
    activeModeTitle: '健康问答',
    suggestedPrompts: prompts.general,
    messages: [],
    draft: '',
    loading: false,
    summary: null,
    lastMessageId: '',
    hasConsent: false,
    aiError: '',
    pendingQuestion: ''
  },

  onShow() {
    const state = store.ensureState()
    this.setData({
      summary: healthSummary(state),
      hasConsent: Boolean(wx.getStorageSync(CONSENT_KEY))
    })
  },

  chooseMode(event) {
    if (this.data.loading) return
    const activeMode = event.currentTarget.dataset.id
    const selected = modes.find(item => item.id === activeMode) || modes[0]
    this.setData({
      activeMode,
      activeModeTitle: selected.title,
      suggestedPrompts: prompts[activeMode],
      messages: [],
      draft: '',
      lastMessageId: '',
      aiError: ''
    })
  },

  setDraft(event) {
    this.setData({ draft: event.detail.value })
  },

  onPresetTap(event) {
    if (this.data.loading) return
    const index = Number(event.currentTarget.dataset.index)
    const prompt = String(this.data.suggestedPrompts[index] || '').trim()
    if (!prompt) return
    this.setData({ draft: prompt, aiError: '' }, () => {
      this.onSend({ detail: { value: { question: prompt } } })
    })
  },

  onConfirm(event) {
    this.onSend({ detail: { value: { question: event.detail.value } } })
  },

  onSend(event) {
    if (this.data.loading) {
      wx.showToast({ title: '正在回答，请稍候', icon: 'none' })
      return
    }
    const formValue = event && event.detail && event.detail.value
    const submittedValue = formValue && typeof formValue === 'object'
      ? formValue.question
      : formValue
    const content = String(submittedValue || this.data.draft || '').trim()
    if (!content) return wx.showToast({ title: '先输入想咨询的问题', icon: 'none' })
    this.setData({ draft: content, aiError: '' })
    this.sendMessage(content)
  },

  clearChat() {
    if (this.data.loading) return
    this.setData({ messages: [], draft: '', lastMessageId: '', aiError: '' })
  },

  clearAiError() {
    this.setData({ aiError: '' })
  },

  grantConsentAndRetry() {
    if (this.data.loading) return
    const content = String(this.data.pendingQuestion || '').trim()
    if (!content) return
    wx.setStorageSync(CONSENT_KEY, true)
    const messages = this.data.messages.filter(item => item.action !== 'consent')
    this.setData({
      hasConsent: true,
      pendingQuestion: '',
      messages,
      aiError: ''
    }, () => this.sendMessage(content, { reuseLastUser: true }))
  },

  ensureConsent() {
    if (this.data.hasConsent) return Promise.resolve(true)
    return new Promise(resolve => {
      wx.showModal({
        title: '使用 AI 健康顾问',
        content: '咨询时会把你的问题、个人目标及近 7 天完成度摘要发送给 CloudBase AI。不会发送经期、症状、私密备注和头像。AI 建议不能替代医生诊断。',
        confirmText: '同意并继续',
        confirmColor: '#d96f71',
        success: result => {
          if (!result.confirm) return resolve(false)
          wx.setStorageSync(CONSENT_KEY, true)
          this.setData({ hasConsent: true })
          resolve(true)
        },
        fail: () => resolve(false)
      })
    })
  },

  async requestCloudBase(messages, assistantId) {
    if (!wx.cloud || !wx.cloud.extend || !wx.cloud.extend.AI) {
      throw new Error('wx.cloud.extend.AI is unavailable')
    }
    const state = store.ensureState()
    const aiConfig = getApp().globalData
    const model = wx.cloud.extend.AI.createModel(aiConfig.aiProvider)
    const cloudMessages = [
      {
        role: 'system',
        content: systemPrompt(this.data.activeMode, advisorProfile(state), healthSummary(state))
      },
      ...messages.map(item => ({ role: item.role, content: item.content }))
    ]

    if (typeof model.generateText === 'function') {
      const response = await model.generateText({
        model: aiConfig.aiModel,
        messages: cloudMessages
      })
      const choices = response && (response.choices || (response.data && response.data.choices))
      const result = choices && choices[0] && choices[0].message && choices[0].message.content
      const content = cleanAssistantText(result || (response && response.text) || '')
      if (!content) throw new Error('AI returned empty content')
      return content
    }

    if (typeof model.streamText !== 'function') {
      throw new Error('CloudBase AI text API is unavailable')
    }

    const response = await model.streamText({
      data: { model: aiConfig.aiModel, messages: cloudMessages }
    })

    let fullContent = ''
    for await (const fragment of response.textStream) {
      const text = typeof fragment === 'string'
        ? fragment
        : String((fragment && (fragment.text || fragment.content)) || '')
      fullContent += text
      const updated = this.data.messages.map(item => item.id === assistantId
        ? { ...item, content: cleanAssistantText(fullContent) }
        : item)
      this.setData({ messages: updated, lastMessageId: assistantId })
    }
    if (!fullContent.trim()) throw new Error('AI returned empty content')
    return cleanAssistantText(fullContent)
  },

  async sendMessage(value, options = {}) {
    const content = String(value || '').trim()
    if (!content || this.data.loading) return
    this.setData({ aiError: '' })
    if (content.length > 800) return wx.showToast({ title: '每次最多输入 800 个字', icon: 'none' })

    const startedAt = Date.now()
    const userMessage = { id: `message-${startedAt}-user`, role: 'user', content }
    const conversation = (options.reuseLastUser
      ? this.data.messages
      : [...this.data.messages, userMessage])
      .filter(item => item.content && item.action !== 'consent')
      .slice(-12)
    const visibleUserMessage = options.reuseLastUser
      ? conversation[conversation.length - 1]
      : userMessage
    this.setData({
      messages: conversation,
      draft: '',
      lastMessageId: visibleUserMessage ? visibleUserMessage.id : '',
      aiError: ''
    })
    wx.hideKeyboard()

    if (!(await this.ensureConsent())) {
      const consentMessage = {
        id: `message-${startedAt}-consent`,
        role: 'assistant',
        content: '需要同意 AI 健康顾问使用说明后才能发送。你的问题尚未传到云端。',
        model: 'SUTA 提示',
        action: 'consent'
      }
      this.setData({
        messages: [...conversation, consentMessage],
        lastMessageId: consentMessage.id,
        pendingQuestion: content
      })
      return
    }
    if (!canRequest()) {
      const rateMessage = {
        id: `message-${startedAt}-rate`,
        role: 'assistant',
        content: '刚才发送得有些频繁，请稍后再试。你的问题已经保留在对话框中。',
        model: 'SUTA 提示'
      }
      this.setData({ messages: [...conversation, rateMessage], lastMessageId: rateMessage.id })
      return
    }

    const immediate = urgentReply(content)
    if (immediate) {
      const assistantMessage = { id: `message-${Date.now()}-assistant`, role: 'assistant', content: immediate, model: 'SUTA 安全提示' }
      this.setData({ messages: [...conversation, assistantMessage], draft: '', lastMessageId: assistantMessage.id })
      return
    }

    const assistantId = `message-${Date.now()}-assistant`
    const assistantMessage = { id: assistantId, role: 'assistant', content: '', model: 'CloudBase AI' }
    this.setData({
      messages: [...conversation, assistantMessage],
      draft: '',
      loading: true,
      lastMessageId: assistantId
    })

    try {
      const result = await this.requestCloudBase(conversation, assistantId)
      this.setData({
        messages: this.data.messages.map(item => item.id === assistantId ? { ...item, content: result } : item)
      })
    } catch (error) {
      console.error('CloudBase AI 调用失败', error)
      const aiError = friendlyError(error)
      this.setData({
        messages: this.data.messages.map(item => item.id === assistantId
          ? { ...item, content: aiError, model: '连接提示' }
          : item),
        aiError,
        lastMessageId: assistantId
      })
      wx.showToast({ title: '发送失败，请查看提示', icon: 'none', duration: 2200 })
    } finally {
      this.setData({ loading: false })
    }
  }
})
