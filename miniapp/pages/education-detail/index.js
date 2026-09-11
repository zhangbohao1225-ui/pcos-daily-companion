const articles = require('../../data/articles.js')
Page({ data: { article: null }, onLoad(options) { this.setData({ article: articles.find(item => item.id === options.id) || articles[0] }) } })
