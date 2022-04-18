import { ensureDir, writeFile, remove } from 'fs-extra'
import globby from 'globby'

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

export async function cli (args: string[]) {
  const command = args.shift()
  if (command === undefined || command === 'sync') {
    await ensureDir('.cfs/')
    await writeFile('.cfs/.gitignore', '*\n')
    console.debug('Downloading resource information ...')
    const started = Date.now()
    await Regions.write()
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
      Instances.write()
    ])
    console.debug(`The operation took ${Date.now() - started} ms.`)
    console.log('Success')
  } else if (command === 'ls' || command === 'list') {
    const paths = await globby([ '.cfs/**/*' ])
    paths.forEach(path => console.log(path))
  } else if (command === 'clean') {
    await remove('.cfs/')
  } else {
    throw new CliUserError(`The provided command is invalid: "${command}"`)
  }
}

export class CliUserError extends Error {
  constructor (message: string) {
    super('Error: ' + message)
  }
}

export function start (module: NodeModule) {
  if (require.main === module) {
    cli(process.argv.slice(2)).catch(error => {
      console.error((error instanceof CliUserError) ? error.message : error)
      process.exit(1)
    })
  }
}
