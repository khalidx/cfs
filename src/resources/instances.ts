import { z } from 'zod'
import { EC2, paginateDescribeInstances } from '@aws-sdk/client-ec2'
import { ensureDir, remove, writeFile } from 'fs-extra'

import Regions from './regions'
import { stringSchema } from '../services/schemas'
import { addError } from '../services/errors'

export class Instances {

  itemSchema = z.object({
    ReservationId: stringSchema
  }).passthrough()

  collectionSchema = z.array(this.itemSchema).min(0).max(10000000)

  async describeInstances (params: { region: string }) {
    const ec2 = new EC2({ region: params.region })
    return paginateDescribeInstances({ client: ec2 }, {})
  }

  async list () {
    const regions = await Regions.list()
    return Promise.all(regions.map(async region => {
      return {
        region,
        instances: await this.describeInstances({ region: region.RegionName })
      }
    }))
  }

  async clear () {
    await remove('.cfs/instances/')
  }

  async write () {
    await this.clear()
    const instances = await this.list()
    await ensureDir('.cfs/instances/')
    await Promise.all(instances.map(async entry => {
      for await (const result of entry.instances) {
        const instances = await this.collectionSchema.parseAsync(result.Reservations)
        if (instances.length > 0) {
          await ensureDir(`.cfs/instances/${encodeURIComponent(entry.region.RegionName)}/`)
        }
        for (const instance of instances) {
          await writeFile(`.cfs/instances/${encodeURIComponent(entry.region.RegionName)}/${encodeURIComponent(instance.ReservationId)}`, JSON.stringify(instance, null, 2))
        }
      }
    }).map(promise => promise.catch(addError)))
  }

}

export default new Instances()
