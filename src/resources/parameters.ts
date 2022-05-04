import { z } from 'zod'
import { SSM, paginateDescribeParameters } from '@aws-sdk/client-ssm'
import { ensureDir, remove, writeFile } from 'fs-extra'
import { join, resolve, dirname } from 'path'

import Regions from './regions'
import { stringSchema } from '../services/schemas'
import { addError } from '../services/errors'

export class Parameters {

  itemSchema = z.object({
    Type: z.union([
      z.literal('SecureString'),
      z.literal('String'),
      z.literal('StringList')
    ]),
    KeyId: stringSchema.optional(),
    LastModifiedDate: z.date(),
    LastModifiedUser: stringSchema,
    Description: stringSchema.optional(),
    AllowedPattern: stringSchema.optional(),
    Version: z.number(),
    Tier: z.union([
      z.literal('Advanced'),
      z.literal('Intelligent-Tiering'),
      z.literal('Standard')
    ]),
    Policies: z.array(z.object({
      PolicyText: z.string().min(0).max(1000000),
      PolicyType: stringSchema,
      PolicyStatus: stringSchema
    })),
    DataType: stringSchema
  }).deepPartial().extend({
    Name: z.string().min(1).max(10000)
  })

  collectionSchema = z.array(this.itemSchema).min(0).max(10000000)

  async describeParameters (params: { region: string }) {
    const ssm = new SSM({ region: params.region })
    return paginateDescribeParameters({ client: ssm }, {})
  }

  async list () {
    const regions = await Regions.list()
    return Promise.all(regions.map(async region => {
      return {
        region,
        parameters: await this.describeParameters({ region: region.RegionName })
      }
    }))
  }

  async clear () {
    await remove('.cfs/parameters/')
  }

  async write () {
    await this.clear()
    const parameters = await this.list()
    await ensureDir('.cfs/parameters/')
    await Promise.all(parameters.map(async entry => {
      for await (const result of entry.parameters) {
        const parameters = await this.collectionSchema.parseAsync(result.Parameters)
        if (parameters.length > 0) {
          await ensureDir(`.cfs/parameters/${encodeURIComponent(entry.region.RegionName)}/`)
        }
        for (const parameter of parameters) {
          const name = resolve('/', parameter.Name.split('/').map(i => encodeURIComponent(i)).join('/')).substring(1)
          await ensureDir(join('.cfs/parameters/', encodeURIComponent(entry.region.RegionName), dirname(name)))
          await writeFile(join('.cfs/parameters/', encodeURIComponent(entry.region.RegionName), name), JSON.stringify(parameter, null, 2))
        }
      }
    }).map(promise => promise.catch(addError)))
  }

}

export default new Parameters()
