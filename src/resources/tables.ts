import { z } from 'zod'
import { DynamoDB, paginateListTables } from '@aws-sdk/client-dynamodb'
import { ensureDir, remove, writeFile } from 'fs-extra'

import Regions from './regions'

export class Tables {

  stringSchema = z.string().min(1).max(500)

  collectionSchema = z.array(this.stringSchema).min(0).max(10000)

  async listTables (params: { region: string }) {
    const dynamoDb = new DynamoDB({ region: params.region })
    return paginateListTables({ client: dynamoDb }, {})
  }

  async list () {
    const regions = await Regions.list()
    return Promise.all(regions.map(async region => {
      return {
        region,
        tables: await this.listTables({ region: region.RegionName })
      }
    }))
  }

  async clear () {
    await remove('.cfs/tables/')
  }

  async write () {
    await this.clear()
    const tables = await this.list()
    await ensureDir('.cfs/tables/')
    await Promise.all(tables.map(async entry => {
      for await (const result of entry.tables) {
        const tables = await this.collectionSchema.parseAsync(result.TableNames)
        if (tables.length > 0) {
          await ensureDir(`.cfs/tables/${encodeURIComponent(entry.region.RegionName)}/`)
        }
        for (const table of tables) {
          await writeFile(`.cfs/tables/${encodeURIComponent(entry.region.RegionName)}/${encodeURIComponent(table)}`, JSON.stringify(table, null, 2))
        }
      }
    }))
  }

}

export default new Tables()
