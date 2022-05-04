import { z } from 'zod'
import { IAM, paginateListUsers } from '@aws-sdk/client-iam'
import { ensureDir, remove, writeFile } from 'fs-extra'
import { join, resolve } from 'path'

import { stringSchema } from '../services/schemas'

export class Users {

  itemSchema = z.object({
    Path: stringSchema,
    UserName: stringSchema
  }).passthrough()

  collectionSchema = z.array(this.itemSchema).min(0).max(100000)

  async listUsers () {
    const iam = new IAM({ region: 'us-east-1' })
    return paginateListUsers({ client: iam }, {})
  }

  async list () {
    return await this.listUsers()
  }

  async clear () {
    await remove('.cfs/users/')
  }

  async write () {
    await this.clear()
    await ensureDir('.cfs/users/')
    for await (const result of await this.list()) {
      const users = await this.collectionSchema.parseAsync(result.Users)
      for (const user of users) {
        const path = resolve('/', user.Path.split('/').map(i => encodeURIComponent(i)).join('/')).substring(1)
        await ensureDir(join('.cfs/users/', path))
        await writeFile(join('.cfs/users/', path, encodeURIComponent(user.UserName)), JSON.stringify(user, null, 2))
      }
    }
  }

}

export default new Users()
