const { nonzzz } = require('eslint-config-kagura')

module.exports = nonzzz({ ts: true }, { ignores: ['packages/**/output.js', 'packages/**/dist/*', 'packages/**/*.d.ts'] })
