import minimist from 'minimist'
import { blue, yellow, red, italic, bold } from 'chalk'
import { ensureDir, writeFile, readFile, remove } from 'fs-extra'
import globby from 'globby'

import { CliUserError, CliPluginError, addError, getFormattedErrors } from './services/errors'

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
import Roles from './resources/roles'
import Users from './resources/users'
import Policies from './resources/policies'
import Databases from './resources/databases'
import Secrets from './resources/secrets'

import { startServer } from './services/server'
import { startPlugins } from './services/plugins'

export async function cli (args: string[]) {
  const argv = minimist(args)
  const command = argv._.shift()
  if (command === undefined || command === 'sync') {
    await ensureDir('.cfs/')
    await writeFile('.cfs/.gitignore', `/*\n!/plugins/\n`)
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
      Streams.write(),
      Roles.write(),
      Users.write(),
      Policies.write(),
      Databases.write(),
      Secrets.write()
    ].map(operation => operation.catch(addError)))
    const duration = Math.ceil((Date.now() - started) / 1000)
    console.debug(`The operation took ${duration} ${duration === 1 ? 'second' : 'seconds'}.`)
    const formatted = getFormattedErrors()
    if (formatted.errors.length > 0) {
      await writeFile('.cfs/errors.log', JSON.stringify(formatted, null, 2))
      if (formatted.categories.NoInternetAccess) throw new CliUserError('The operation completed, but failed due to an issue with internet access. Please check your connection, proxy, or VPN settings.')
      if (formatted.categories.AuthenticationMissing) throw new CliUserError('The operation completed, but failed due to missing AWS credentials. Please login and retry.')
      if (formatted.categories.AuthenticationExpired) throw new CliUserError('The operation completed, but failed due to expired AWS credentials. Please login again and retry.')
      if (formatted.categories.InsufficientPermissions) throw new CliUserError('The operation completed, but failed due to insufficient permissions. Ignore this error, or login with a more privileged role and retry.')
      if (formatted.categories.SchemaValidationFailed) throw new CliUserError('The operation completed, but failed due to a schema validation issue. Please open a GitHub issue.')
      throw new CliUserError('The operation completed, but with some errors.')
    }
    console.log('Success')
  } else if (command === 'ls' || command === 'list') {
    const paths = await globby([ '.cfs/**/*', '!.cfs/.gitignore', '!.cfs/errors.log', '!.cfs/plugins/' ])
    paths.forEach(path => console.log(path))
  } else if (command === 'find') {
    const text = argv._.shift()
    if (text === undefined) throw new CliUserError('Please provide the text to search for, like `cfs find "m5.large"`.')
    if (!['string', 'number'].includes(typeof text)) throw new CliUserError('The text to search for must be a string or a number, like `cfs find "m5.large"`.')
    const textString = String(text).toLowerCase()
    const paths = await globby([ '.cfs/**/*', '!.cfs/.gitignore', '!.cfs/errors.log', '!.cfs/plugins/' ])
    if (paths.length === 0) throw new CliUserError('No resources found in the `.cfs/` directory. Make sure to run the `cfs` command before running `cfs find`.')
    const matched = await Promise.all(paths.map(async path => {
      if (path.toLowerCase().includes(textString)) return { path, found: true }
      const content = await readFile(path, 'utf-8')
      return { path, found: content.toLowerCase().includes(textString) }
    }))
    matched.filter(match => match.found === true).forEach(match => console.log(match.path))
  } else if (command === 'browse') {
    const open = argv['open'] === 'false' ? false : true
    const paths = await globby([ '.cfs/**/*', '!.cfs/.gitignore', '!.cfs/errors.log', '!.cfs/plugins/' ])
    if (paths.length === 0) throw new CliUserError('No resources found in the `.cfs/` directory. Make sure to run the `cfs` command before running `cfs browse`.')
    const resources = await Promise.all(paths.map(async (path, index) => ({ id: index, path, content: await readFile(path, 'utf-8') })))
    await startServer({ resources, open })
  } else if (command === 'plugins') {
    await startPlugins()
  } else if (command === 'errors') {
    const log = await readFile('.cfs/errors.log', 'utf-8') 
    const formatted = JSON.parse(log)
    Object.entries(formatted.categories).forEach(entry => {
      console.log(yellow(entry[1]), blue(entry[0]), 'errors')
    })
  } else if (command === 'clean') {
    const paths = await globby([ '.cfs/**/*', '.cfs/.gitignore', '!.cfs/plugins/' ], { deep: 1, onlyFiles: false })
    await Promise.all(paths.map(path => remove(path)))
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
    console.log(`  cfs ${blue('plugins')}      ${bold('Runs all configured plugins.')}`)
    console.log(`  cfs ${blue('errors')}       Outputs the categories of all errors encountered during discovery.`)
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
      if (error instanceof CliUserError) {
        console.error(red('Error:'), error.message, 'Check the .cfs/errors.log file for more information.')
      } else if (error instanceof CliPluginError) {
        console.error(red('Error:'), error.message)
      } else {
        console.error(red('Error:'), error)
      }
      process.exitCode = 1
    })
  }
}
