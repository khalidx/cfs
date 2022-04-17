import { ensureDir, writeFile } from 'fs-extra'
import globby from 'globby'

import Regions from './resources/regions'
import Vpcs from './resources/vpcs'
import Buckets from './resources/buckets'
import Tables from './resources/tables'
import Domains from './resources/domains'
import Certificates from './resources/certificates'

export async function cli (args: string[]) {
  const command = args.shift()
  if (command === undefined || command === 'sync') {
    await ensureDir('.cfs/')
    await writeFile('.cfs/.gitignore', '*\n')
    await Regions.write()
    await Promise.all([
      Vpcs.write(),
      Buckets.write(),
      Tables.write(),
      Domains.write(),
      Certificates.write()
    ])
    console.log('Success')
  } else if (command === 'ls' || command === 'list') {
    const paths = await globby([ '.cfs/**/*' ])
    paths.forEach(path => console.log(path))
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
