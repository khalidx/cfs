import { z } from 'zod'
import { Route53, paginateListHostedZones } from '@aws-sdk/client-route-53'
import { ensureDir, remove, writeFile } from 'fs-extra'

export class Domains {

  stringSchema = z.string().min(1).max(500)

  itemSchema = z.object({
    Id: this.stringSchema,
    Name: this.stringSchema,
    CallerReference: this.stringSchema,
    Config: z.object({
      Comment: this.stringSchema,
      PrivateZone: z.boolean()
    }),
    ResourceRecordSetCount: z.number(),
    LinkedService: z.object({
      ServicePrincipal: this.stringSchema,
      Description: this.stringSchema
    }).optional()
  })

  collectionSchema = z.array(this.itemSchema).min(0).max(10000)

  async listHostedZones () {
    const route53 = new Route53({ region: 'us-east-1' })
    return paginateListHostedZones({ client: route53 }, {})
  }

  async list () {
    return await this.listHostedZones()
  }

  async clear () {
    await remove('.cfs/domains/')
  }

  async write () {
    await this.clear()
    await ensureDir('.cfs/domains/')
    for await (const result of await this.list()) {
      const domains = await this.collectionSchema.parseAsync(result.HostedZones)
      for (const domain of domains) {
        await writeFile(`.cfs/domains/${encodeURIComponent(domain.Id.substring('/hostedzone/'.length))}`, JSON.stringify(domain, null, 2))
      }
    }
  }

}

export default new Domains()
