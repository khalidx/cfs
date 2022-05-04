import { z } from 'zod'
import { IAM, paginateListRoles } from '@aws-sdk/client-iam'
import { ensureDir, remove, writeFile } from 'fs-extra'
import { resolve } from 'path'

import { stringSchema } from '../services/schemas'

export class Roles {

  itemSchema = z.object({
    Path: stringSchema,
    RoleName: stringSchema
  }).passthrough()

  collectionSchema = z.array(this.itemSchema).min(0).max(100000)

  async listRoles () {
    const iam = new IAM({ region: 'us-east-1' })
    return paginateListRoles({ client: iam }, {})
  }

  async list () {
    return await this.listRoles()
  }

  async clear () {
    await remove('.cfs/roles/')
  }

  async write () {
    await this.clear()
    await ensureDir('.cfs/roles/')
    for await (const result of await this.list()) {
      const roles = await this.collectionSchema.parseAsync(result.Roles)
      for (const role of roles) {
        const path = resolve('/', role.Path.split('/').map(i => encodeURIComponent(i)).join('/')).substring(1)
        await ensureDir(`.cfs/roles/${path}`)
        await writeFile(`.cfs/roles/${path}/${encodeURIComponent(role.RoleName)}`, JSON.stringify(role, null, 2))
      }
    }
  }

}

export default new Roles()
