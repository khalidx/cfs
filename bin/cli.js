#!/usr/bin/env node

if (require('path').relative('.', __filename) === 'bin/cli.js') {
  const args = process.argv.slice(2)
  const browse = args.indexOf('browse')
  const dev = args.indexOf('--dev')
  if (browse > -1 && dev > -1) {
    args.splice(dev, 1, '--open', 'false')
    const { spawn } = require('child_process')
    const watcher = require('chokidar').watch('src/**/*.ts', { ignoreInitial: true })
    let child = undefined
    const start = () => {
      child = spawn('node', [ __filename, ...args ], { stdio: 'inherit' })
      watcher.once('all', (event, path) => {
        console.log('Restart event:', event, path)
        child.kill()
        start()
      })
    }
    start()
  } else {
    require('ts-node').register({ transpileOnly: true })
    require('../src/cli').start(module)
  }
} else {
  require('../dist/cli').start(module)
}
