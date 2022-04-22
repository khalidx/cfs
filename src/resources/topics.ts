import { z } from 'zod'
import { SNS, paginateListTopics } from '@aws-sdk/client-sns'
import { ensureDir, remove, writeFile } from 'fs-extra'

import Regions from './regions'
import { addError } from '../errors'

export class Topics {

  stringSchema = z.string().min(1).max(500)

  itemSchema = z.object({
    TopicArn: this.stringSchema
  })

  collectionSchema = z.array(this.itemSchema).min(0).max(10000)

  async listTopics (params: { region: string }) {
    const sns = new SNS({ region: params.region })
    return paginateListTopics({ client: sns }, {})
  }

  async list () {
    const regions = await Regions.list()
    return Promise.all(regions.map(async region => {
      return {
        region,
        topics: await this.listTopics({ region: region.RegionName })
      }
    }))
  }

  async clear () {
    await remove('.cfs/topics/')
  }

  async write () {
    await this.clear()
    const topics = await this.list()
    await ensureDir('.cfs/topics/')
    await Promise.all(topics.map(async entry => {
      for await (const result of entry.topics) {
        const topics = await this.collectionSchema.parseAsync(result.Topics)
        if (topics.length > 0) {
          await ensureDir(`.cfs/topics/${encodeURIComponent(entry.region.RegionName)}/`)
        }
        for (const topic of topics) {
          await writeFile(`.cfs/topics/${encodeURIComponent(entry.region.RegionName)}/${encodeURIComponent(topic.TopicArn.substring(topic.TopicArn.indexOf(':topic/') + ':topic/'.length))}`, JSON.stringify(topic, null, 2))
        }
      }
    }).map(promise => promise.catch(addError)))
  }

}

export default new Topics()
