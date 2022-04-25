import { z } from 'zod'
import { CodePipeline, paginateListPipelines } from '@aws-sdk/client-codepipeline'
import { ensureDir, remove, writeFile } from 'fs-extra'

import Regions from './regions'
import { addError } from '../services/errors'

export class Pipelines {

  stringSchema = z.string().min(1).max(1000)

  itemSchema = z.object({
    name: this.stringSchema
  }).passthrough()

  collectionSchema = z.array(this.itemSchema).min(0).max(10000)

  async listPipelines (params: { region: string }) {
    const codePipeline = new CodePipeline({ region: params.region })
    return paginateListPipelines({ client: codePipeline }, {})
  }

  async list () {
    const regions = await Regions.list()
    return Promise.all(regions.map(async region => {
      return {
        region,
        pipelines: (region.RegionName === 'ap-northeast-3') ? [] : await this.listPipelines({ region: region.RegionName })
        // (above) CodePipeline does not seem to exist in the `ap-northeast-3` region, so we ignore that region.
        // See https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/ for availability of regional services.
      }
    }))
  }

  async clear () {
    await remove('.cfs/pipelines/')
  }

  async write () {
    await this.clear()
    const pipelines = await this.list()
    await ensureDir('.cfs/pipelines/')
    await Promise.all(pipelines.map(async entry => {
      for await (const result of entry.pipelines) {
        const pipelines = await this.collectionSchema.parseAsync(result.pipelines)
        if (pipelines.length > 0) {
          await ensureDir(`.cfs/pipelines/${encodeURIComponent(entry.region.RegionName)}/`)
        }
        for (const pipeline of pipelines) {
          await writeFile(`.cfs/pipelines/${encodeURIComponent(entry.region.RegionName)}/${encodeURIComponent(pipeline.name)}`, JSON.stringify(pipeline, null, 2))
        }
      }
    }).map(promise => promise.catch(addError)))
  }

}

export default new Pipelines()
