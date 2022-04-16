#!/usr/bin/env node

if (require('path').relative('.', __filename) === 'bin/cli.js') {
  require('ts-node').register({ transpileOnly: true })
  require('../src/cli').start(module)
} else {
  require('../dist/cli').start(module)
}
