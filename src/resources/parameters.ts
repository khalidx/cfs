import { z } from 'zod'
import { SSM, paginateDescribeParameters } from '@aws-sdk/client-ssm'
import { ensureDir, remove, writeFile } from 'fs-extra'
import { resolve, dirname } from 'path'

import Regions from './regions'
import { addError } from '../errors'

export class Parameters {

  stringSchema = z.string().min(1).max(500)

  itemSchema = z.object({
    Type: z.union([
      z.literal('SecureString'),
      z.literal('String'),
      z.literal('StringList')
    ]),
    KeyId: this.stringSchema.optional(),
    LastModifiedDate: z.date(),
    LastModifiedUser: this.stringSchema,
    Description: this.stringSchema.optional(),
    AllowedPattern: this.stringSchema.optional(),
    Version: z.number(),
    Tier: z.union([
      z.literal('Advanced'),
      z.literal('Intelligent-Tiering'),
      z.literal('Standard')
    ]),
    Policies: z.array(z.object({
      PolicyText: z.string().min(0).max(1000000),
      PolicyType: this.stringSchema,
      PolicyStatus: this.stringSchema
    })),
    DataType: this.stringSchema
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
          await ensureDir(`.cfs/parameters/${encodeURIComponent(entry.region.RegionName)}/${dirname(name)}`)
          await writeFile(`.cfs/parameters/${encodeURIComponent(entry.region.RegionName)}/${name}`, JSON.stringify(parameter, null, 2))
        }
      }
    }).map(promise => promise.catch(addError)))
  }

}

export default new Parameters()
