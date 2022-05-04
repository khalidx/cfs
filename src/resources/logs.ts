import { z } from 'zod'
import { CloudWatchLogs, paginateDescribeLogGroups } from '@aws-sdk/client-cloudwatch-logs'
import { ensureDir, remove, writeFile } from 'fs-extra'
import { join, resolve, dirname } from 'path'

import Regions from './regions'
import { stringSchema } from '../services/schemas'
import { addError } from '../services/errors'

export class Logs {

  itemSchema = z.object({
    logGroupName: stringSchema
  }).passthrough()

  collectionSchema = z.array(this.itemSchema).min(0).max(10000000)

  async describeLogGroups (params: { region: string }) {
    const cloudWatchLogs = new CloudWatchLogs({ region: params.region })
    return paginateDescribeLogGroups({ client: cloudWatchLogs }, {})
  }

  async list () {
    const regions = await Regions.list()
    return Promise.all(regions.map(async region => {
      return {
        region,
        logs: await this.describeLogGroups({ region: region.RegionName })
      }
    }))
  }

  async clear () {
    await remove('.cfs/logs/')
  }

  async write () {
    await this.clear()
    const logs = await this.list()
    await ensureDir('.cfs/logs/')
    await Promise.all(logs.map(async entry => {
      for await (const result of entry.logs) {
        const logs = await this.collectionSchema.parseAsync(result.logGroups)
        if (logs.length > 0) {
          await ensureDir(`.cfs/logs/${encodeURIComponent(entry.region.RegionName)}/`)
        }
        for (const log of logs) {
          const name = resolve('/', log.logGroupName.split('/').map(i => encodeURIComponent(i)).join('/')).substring(1)
          await ensureDir(join('.cfs/logs/', encodeURIComponent(entry.region.RegionName), dirname(name)))
          await writeFile(join('.cfs/logs/', encodeURIComponent(entry.region.RegionName), name), JSON.stringify(log, null, 2))
        }
      }
    }).map(promise => promise.catch(addError)))
  }

}

export default new Logs()
