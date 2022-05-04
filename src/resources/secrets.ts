import { z } from 'zod'
import { SecretsManager, paginateListSecrets } from '@aws-sdk/client-secrets-manager'
import { ensureDir, remove, writeFile } from 'fs-extra'
import { join, resolve, dirname } from 'path'

import Regions from './regions'
import { stringSchema } from '../services/schemas'
import { addError } from '../services/errors'

export class Secrets {

  itemSchema = z.object({
    Name: stringSchema
  }).passthrough()

  collectionSchema = z.array(this.itemSchema).min(0).max(10000000)

  async listSecrets (params: { region: string }) {
    const secretsManager = new SecretsManager({ region: params.region })
    return paginateListSecrets({ client: secretsManager }, {})
  }

  async list () {
    const regions = await Regions.list()
    return Promise.all(regions.map(async region => {
      return {
        region,
        secrets: await this.listSecrets({ region: region.RegionName })
      }
    }))
  }

  async clear () {
    await remove('.cfs/secrets/')
  }

  async write () {
    await this.clear()
    const secrets = await this.list()
    await ensureDir('.cfs/secrets/')
    await Promise.all(secrets.map(async entry => {
      for await (const result of entry.secrets) {
        const secrets = await this.collectionSchema.parseAsync(result.SecretList)
        if (secrets.length > 0) {
          await ensureDir(`.cfs/secrets/${encodeURIComponent(entry.region.RegionName)}/`)
        }
        for (const secret of secrets) {
          const name = resolve('/', secret.Name.split('/').map(i => encodeURIComponent(i)).join('/')).substring(1)
          await ensureDir(join('.cfs/secrets/', encodeURIComponent(entry.region.RegionName), dirname(name)))
          await writeFile(join('.cfs/secrets/', encodeURIComponent(entry.region.RegionName), name), JSON.stringify(secret, null, 2))
        }
      }
    }).map(promise => promise.catch(addError)))
  }

}

export default new Secrets()
