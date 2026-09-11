const articles = require('../../data/articles.js')
Page({ data: { articles }, open(event) { wx.navigateTo({ url: `/pages/education-detail/index?id=${event.currentTarget.dataset.id}` }) } })
