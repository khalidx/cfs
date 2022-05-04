import { z } from 'zod'
import { IAM, paginateListPolicies } from '@aws-sdk/client-iam'
import { ensureDir, remove, writeFile } from 'fs-extra'
import { join, resolve } from 'path'

import { stringSchema } from '../services/schemas'

export class Policies {

  itemSchema = z.object({
    Path: stringSchema,
    PolicyName: stringSchema
  }).passthrough()

  collectionSchema = z.array(this.itemSchema).min(0).max(100000)

  async listPolicies () {
    const iam = new IAM({ region: 'us-east-1' })
    return paginateListPolicies({ client: iam }, {})
  }

  async list () {
    return await this.listPolicies()
  }

  async clear () {
    await remove('.cfs/policies/')
  }

  async write () {
    await this.clear()
    await ensureDir('.cfs/policies/')
    for await (const result of await this.list()) {
      const policies = await this.collectionSchema.parseAsync(result.Policies)
      for (const policy of policies) {
        const path = resolve('/', policy.Path.split('/').map(i => encodeURIComponent(i)).join('/')).substring(1)
        await ensureDir(join('.cfs/policies/', path))
        await writeFile(join('.cfs/policies/', path, encodeURIComponent(policy.PolicyName)), JSON.stringify(policy, null, 2))
      }
    }
  }

}

export default new Policies()
