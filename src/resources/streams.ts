import { z } from 'zod'
import { Kinesis } from '@aws-sdk/client-kinesis'
import { ensureDir, remove, writeFile } from 'fs-extra'

import Regions from './regions'
import { addError } from '../services/errors'

export class Streams {

  stringSchema = z.string().min(1).max(1000)
  
  collectionSchema = z.array(this.stringSchema).min(0).max(10000)

  async listStreams (params: { region: string }) {
    const kinesis = new Kinesis({ region: params.region })
    const paginateListStreams = async function* () {
      let response = await kinesis.listStreams({})
      yield response
      while (response.HasMoreStreams) {
        const last = response.StreamNames?.slice().pop()
        response = last ? await kinesis.listStreams({ ExclusiveStartStreamName: last }) : await kinesis.listStreams({})
        yield response
      }
    }
    return paginateListStreams()
  }

  async list () {
    const regions = await Regions.list()
    return Promise.all(regions.map(async region => {
      return {
        region,
        streams: await this.listStreams({ region: region.RegionName })
      }
    }))
  }

  async clear () {
    await remove('.cfs/streams/')
  }

  async write () {
    await this.clear()
    const vpcs = await this.list()
    await ensureDir('.cfs/streams/')
    await Promise.all(vpcs.map(async entry => {
      for await (const result of entry.streams) {
        const streams = await this.collectionSchema.parseAsync(result.StreamNames)
        if (streams.length > 0) {
          await ensureDir(`.cfs/streams/${encodeURIComponent(entry.region.RegionName)}/`)
        }
        for (const stream of streams) {
          await writeFile(`.cfs/streams/${encodeURIComponent(entry.region.RegionName)}/${encodeURIComponent(stream)}`, JSON.stringify(stream, null, 2))
        }
      }
    }).map(promise => promise.catch(addError)))
  }

}

export default new Streams()
