import minimist from 'minimist'
import { blue, yellow, italic, bold } from 'chalk'
import { ensureDir, writeFile, remove } from 'fs-extra'
import globby from 'globby'

import { ZodError, CliUserError, addError, getErrors, getSerializedErrors } from './errors'

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

export async function cli (args: string[]) {
  const argv = minimist(args)
  const command = argv._.shift()
  const region = typeof argv['region'] === 'string' ? argv['region'] : undefined
  if (command === undefined || command === 'sync') {
    await ensureDir('.cfs/')
    await writeFile('.cfs/.gitignore', '*\n')
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
      Parameters.write()
    ].map(operation => operation.catch(addError)))
    const duration = Math.ceil((Date.now() - started) / 1000)
    console.debug(`The operation took ${duration} ${duration === 1 ? 'second' : 'seconds'}.`)
    const errors = getErrors()
    if (errors.length > 0) {
      await writeFile('.cfs/errors.log', JSON.stringify(getSerializedErrors(), null, 2))
      throw new CliUserError('The operation completed, but with some errors. Check the .cfs/errors.log file for more information.')
    }
    console.log('Success')
  } else if (command === 'ls' || command === 'list') {
    const paths = await globby([ '.cfs/**/*', '!.cfs/.gitignore', '!.cfs/errors.log' ])
    paths.forEach(path => console.log(path))
  } else if (command === 'clean') {
    await remove('.cfs/')
  } else if (command === 'help') {
    console.log(blue(logo()))
    console.log('version   ', yellow(`v${require('../package.json').version}`))
    console.log('repository', yellow('https://github.com/khalidx/cfs'))
    console.log()
    console.log(italic('commands'))
    console.log(`  cfs        ${bold('Outputs all discovered resources to `.cfs/` in the current directory.')}`)
    console.log(`  cfs ${blue('ls')}     ${bold('Lists the names of all resource files to the console.')}`)
    console.log(`  cfs ${blue('clean')}  Deletes the \`.cfs/\` directory.`)
    console.log(`  cfs ${blue('help')}   Outputs this help message.`)
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
          console.error('Error:', code, path.join('/'), message, JSON.stringify(rest))
        })
        console.error('This is most likely a schema validation issue.')
        console.error('Please open a Github issue.')
      } else if (error instanceof CliUserError) {
        console.error('Error:', error.message)
      } else {
        console.error('Error:', error)
      }
      process.exit(1)
    })
  }
}
