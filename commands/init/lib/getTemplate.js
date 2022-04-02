const request = require('@lwd-cli/request')

module.exports = function () {
  return request({
    url: '/project/template'
  })
}