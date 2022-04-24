import minimist from 'minimist'
import { blue, yellow, red, italic, bold } from 'chalk'
import { ensureDir, writeFile, readFile, remove } from 'fs-extra'
import globby from 'globby'
import { serializeError } from 'serialize-error'

import { ZodError, CliUserError, addError, getErrors } from './errors'

import Regions from './resources/regions'
import Vpcs from './resources/vpcs'
import Buckets from './resources/buckets'
import Tables from './resources/tables'
import Domains from './resources/domains'
import Certificates from './resources/certificates'
import Functions from './resources/functions'
import Queues from './resources/queues'
import Topics from './resources/topics'
import Distributions from './resources/distributions'
import Apis from './resources/apis'
import Stacks from './resources/stacks'
import Alarms from './resources/alarms'
import Canaries from './resources/canaries'
import Instances from './resources/instances'
import Parameters from './resources/parameters'
import Elbs from './resources/elbs'
import Pipelines from './resources/pipelines'
import Streams from './resources/streams'

import { startServer } from './services/server'

export async function cli (args: string[]) {
  const argv = minimist(args)
  const command = argv._.shift()
  if (command === undefined || command === 'sync') {
    await ensureDir('.cfs/')
    await writeFile('.cfs/.gitignore', '*\n')
    await remove('.cfs/errors.log')
    const region = typeof argv['region'] === 'string' ? argv['region'] : undefined
    Regions.set(region)
    const started = Date.now()
    console.debug('Downloading resource information ...')
    await Regions.write().catch(addError)
    await Promise.all([
      Vpcs.write(),
      Buckets.write(),
      Tables.write(),
      Domains.write(),
      Certificates.write(),
      Functions.write(),
      Queues.write(),
      Topics.write(),
      Distributions.write(),
      Apis.write(),
      Stacks.write(),
      Alarms.write(),
      Canaries.write(),
      Instances.write(),
      Parameters.write(),
      Elbs.write(),
      Pipelines.write(),
      Streams.write()
    ].map(operation => operation.catch(addError)))
    const duration = Math.ceil((Date.now() - started) / 1000)
    console.debug(`The operation took ${duration} ${duration === 1 ? 'second' : 'seconds'}.`)
    const errors = getErrors()
    if (errors.length > 0) {
      let authenticationMissing = false
      let authenticationExpired = false
      const log = JSON.stringify(errors.map((error: any) => {
        if (error.name = 'CredentialsProviderError' && error.message === 'Could not load credentials from any providers') {
          authenticationMissing = true
        } else if (error.Code === 'RequestExpired' || error.Code === 'ExpiredToken') {
          authenticationExpired = true
          if (error['Token-0']) {
            delete error['Token-0']
          }
        }
        return serializeError(error)
      }), null, 2)
      await writeFile('.cfs/errors.log', log)
      if (authenticationMissing) throw new CliUserError('The operation completed, but failed due to missing AWS credentials. Please login and retry.')
      if (authenticationExpired) throw new CliUserError('The operation completed, but failed due to expired AWS credentials. Please login again and retry.')
      throw new CliUserError('The operation completed, but with some errors. Check the .cfs/errors.log file for more information.')
    }
    console.log('Success')
  } else if (command === 'ls' || command === 'list') {
    const paths = await globby([ '.cfs/**/*', '!.cfs/.gitignore', '!.cfs/errors.log' ])
    paths.forEach(path => console.log(path))
  } else if (command === 'find') {
    const text = argv._.shift()
    if (text === undefined) throw new CliUserError('Please provide the text to search for, like `cfs find "m5.large"`.')
    if (!['string', 'number'].includes(typeof text)) throw new CliUserError('The text to search for must be a string or a number, like `cfs find "m5.large"`.')
    const textString = String(text).toLowerCase()
    const paths = await globby([ '.cfs/**/*', '!.cfs/.gitignore', '!.cfs/errors.log' ])
    if (paths.length === 0) throw new CliUserError('No resources found in the `.cfs/` directory. Make sure to run the `cfs` command before running `cfs find`.')
    const matched = await Promise.all(paths.map(async path => {
      if (path.toLowerCase().includes(textString)) return { path, found: true }
      const content = await readFile(path, 'utf-8')
      return { path, found: content.toLowerCase().includes(textString) }
    }))
    matched.filter(match => match.found === true).forEach(match => console.log(match.path))
  } else if (command === 'browse') {
    const paths = await globby([ '.cfs/**/*', '!.cfs/.gitignore', '!.cfs/errors.log' ])
    if (paths.length === 0) throw new CliUserError('No resources found in the `.cfs/` directory. Make sure to run the `cfs` command before running `cfs browse`.')
    const resources = await Promise.all(paths.map(async (path, index) => ({ id: index, path, content: await readFile(path, 'utf-8') })))
    await startServer(resources)
  } else if (command === 'clean') {
    await remove('.cfs/')
  } else if (command === 'help') {
    console.log(blue(logo()))
    console.log('version   ', yellow(`v${require('../package.json').version}`))
    console.log('repository', yellow('https://github.com/khalidx/cfs'))
    console.log()
    console.log(italic('commands'))
    console.log(`  cfs              ${bold('Outputs all discovered resources to `.cfs/` in the current directory.')}`)
    console.log(`  cfs ${blue('ls')}           ${bold('Lists the names of all resource files to the console.')}`)
    console.log(`  cfs ${blue('find')} ${yellow('<text>')}  ${bold('Search for text across all resource file names and contents.')}`)
    console.log(`  cfs ${blue('browse')}       ${bold('Opens the browser for exploring resources.')}`)
    console.log(`  cfs ${blue('clean')}        Deletes the \`.cfs/\` directory.`)
    console.log(`  cfs ${blue('help')}         Outputs this help message.`)
    console.log()
  } else {
    throw new CliUserError(`The provided command is invalid: "${command}"`)
  }
}

export function logo () {
  return '' +
`
┌─┐┌─┐┌─┐
│  ├┤ └─┐
└─┘└  └─┘
`
}

export function start (module: NodeModule) {
  if (require.main === module) {
    cli(process.argv.slice(2)).catch(error => {
      if (error instanceof ZodError) {
        error.issues.forEach(({ code, path, message, ...rest }) => {
          console.error(red('Error:'), code, path.join('/'), message, JSON.stringify(rest))
        })
        console.error('This is most likely a schema validation issue. Please open a Github issue.')
      } else if (error instanceof CliUserError) {
        console.error(red('Error:'), error.message)
      } else {
        console.error(red('Error:'), error)
      }
      process.exit(1)
    })
  }
}
