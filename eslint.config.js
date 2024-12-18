const { nonzzz } = require('eslint-config-kagura')

module.exports = nonzzz({ tyescript: true }, { ignores: ['**/dist/', '**/lib/'] })
