import { z } from 'zod'
import { RDS, paginateDescribeDBClusters } from '@aws-sdk/client-rds'
import { ensureDir, remove, writeFile } from 'fs-extra'

import Regions from './regions'
import { stringSchema } from '../services/schemas'
import { addError } from '../services/errors'

export class Databases {

  itemSchema = z.object({
    DatabaseName: stringSchema
  }).passthrough()

  collectionSchema = z.array(this.itemSchema).min(0).max(10000)

  async describeDbClusters (params: { region: string }) {
    const rds = new RDS({ region: params.region })
    return paginateDescribeDBClusters({ client: rds }, { IncludeShared: true })
  }

  async list () {
    const regions = await Regions.list()
    return Promise.all(regions.map(async region => {
      return {
        region,
        databases: await this.describeDbClusters({ region: region.RegionName })
      }
    }))
  }

  async clear () {
    await remove('.cfs/databases/')
  }

  async write () {
    await this.clear()
    const databases = await this.list()
    await ensureDir('.cfs/databases/')
    await Promise.all(databases.map(async entry => {
      for await (const result of entry.databases) {
        const databases = await this.collectionSchema.parseAsync(result.DBClusters)
        if (databases.length > 0) {
          await ensureDir(`.cfs/databases/${encodeURIComponent(entry.region.RegionName)}/`)
        }
        for (const database of databases) {
          await writeFile(`.cfs/databases/${encodeURIComponent(entry.region.RegionName)}/${encodeURIComponent(database.DatabaseName)}`, JSON.stringify(database, null, 2))
        }
      }
    }).map(promise => promise.catch(addError)))
  }

}

export default new Databases()
