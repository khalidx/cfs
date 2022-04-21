import { z } from 'zod'
import { EC2 } from '@aws-sdk/client-ec2'
import { ensureDir, remove, writeFile } from 'fs-extra'

export class Regions {

  regionNameSchema = z.string().min(1).max(100)

  itemSchema = z.object({
    Endpoint: z.string().min(1).max(500),
    OptInStatus: z.string().min(1).max(500)
  }).deepPartial().extend({
    RegionName: this.regionNameSchema
  })
  
  collectionSchema = z.array(this.itemSchema).min(1).max(1000)

  private region: string | undefined = undefined
  private regions: z.infer<typeof this.collectionSchema> = []

  set (region: string | undefined) {
    if (region) {
      this.region = region
    }
  }

  async describeRegions () {
    const ec2 = new EC2({ region: 'us-east-1' })
    const describeRegions = (this.region)
      ? await ec2.describeRegions({ AllRegions: false, Filters: [ { Name: 'region-name', Values: [ this.region ] } ] })
      : await ec2.describeRegions({ AllRegions: false })
    return describeRegions.Regions
  }

  async list () {
    if (this.regions.length === 0) {
      this.regions = await this.collectionSchema.parseAsync(await this.describeRegions())
    }
    return this.regions
  }

  async clear () {
    await remove('.cfs/regions/')
  }

  async write () {
    await this.clear()
    const regions = await this.list()
    await ensureDir('.cfs/regions/')
    await Promise.all(regions.map(region => writeFile(`.cfs/regions/${encodeURIComponent(region.RegionName)}`, JSON.stringify(region, null, 2))))
  }

}

export default new Regions()
