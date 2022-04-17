import { z } from 'zod'
import { SQS, paginateListQueues } from '@aws-sdk/client-sqs'
import { ensureDir, remove, writeFile } from 'fs-extra'

import Regions from './regions'

export class Queues {

  stringSchema = z.string().min(1).max(500)

  collectionSchema = z.array(this.stringSchema).min(0).max(10000)

  async listQueues (params: { region: string }) {
    const sqs = new SQS({ region: params.region })
    return paginateListQueues({ client: sqs }, {})
  }

  async list () {
    const regions = await Regions.list()
    return Promise.all(regions.map(async region => {
      return {
        region,
        queues: await this.listQueues({ region: region.RegionName })
      }
    }))
  }

  async clear () {
    await remove('.cfs/queues/')
  }

  async write () {
    await this.clear()
    const queues = await this.list()
    await ensureDir('.cfs/queues/')
    await Promise.all(queues.map(async entry => {
      for await (const result of entry.queues) {
        const queues = await this.collectionSchema.parseAsync(result.QueueUrls || [])
        if (queues.length > 0) {
          await ensureDir(`.cfs/queues/${encodeURIComponent(entry.region.RegionName)}/`)
        }
        for (const queue of queues) {
          await writeFile(`.cfs/queues/${encodeURIComponent(entry.region.RegionName)}/${encodeURIComponent(queue)}`, JSON.stringify(queue, null, 2))
        }
      }
    }))
  }

}

export default new Queues()
