const app = () => getApp()

function request(path, options = {}) {
  const baseUrl = app().globalData.apiBaseUrl
  if (!baseUrl) return Promise.reject(new Error('SUTA_API_BASE_URL_NOT_CONFIGURED'))
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseUrl}${path}`,
      method: options.method || 'GET',
      data: options.data,
      header: { 'content-type': 'application/json', ...(options.header || {}) },
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) resolve(response.data)
        else reject(new Error(`请求失败：${response.statusCode}`))
      },
      fail: reject
    })
  })
}

function loginWithWechat() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(result) {
        if (!result.code) return reject(new Error('微信登录凭证获取失败'))
        request('/api/wechat/login', { method: 'POST', data: { code: result.code } }).then(resolve).catch(reject)
      },
      fail: reject
    })
  })
}

module.exports = { request, loginWithWechat }
