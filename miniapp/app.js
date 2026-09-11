const store = require('./utils/store.js')

const CLOUD_ENV_ID = 'suta-5678-suta-d6gz0kudfc88b8e25'

App({
  globalData: {
    appName: 'SUTA',
    apiBaseUrl: '',
    previewMode: false,
    cloudEnvId: CLOUD_ENV_ID,
    aiProvider: 'cloudbase',
    aiModel: 'hy3'
  },
  onLaunch() {
    if (!wx.cloud) {
      console.error('当前微信基础库不支持云开发，请切换到稳定版基础库')
    } else {
      wx.cloud.init({
        env: CLOUD_ENV_ID,
        traceUser: true
      })
    }
    const state = store.ensureState()
    const themes = { coral: ['#df7370', '#fff9f6'], iris: ['#7766a7', '#faf8ff'], sage: ['#668f7b', '#f7fbf8'] }
    const theme = themes[state.themeColor] || themes.coral
    wx.setTabBarStyle({ selectedColor: theme[0], backgroundColor: theme[1] })
  }
})
