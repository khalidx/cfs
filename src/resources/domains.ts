import { z } from 'zod'
import { Route53, paginateListHostedZones } from '@aws-sdk/client-route-53'
import { ensureDir, remove, writeFile } from 'fs-extra'

import { stringSchema } from '../services/schemas'

export class Domains {

  itemSchema = z.object({
    Name: stringSchema,
    CallerReference: stringSchema,
    Config: z.object({
      Comment: stringSchema,
      PrivateZone: z.boolean()
    }),
    ResourceRecordSetCount: z.number(),
    LinkedService: z.object({
      ServicePrincipal: stringSchema,
      Description: stringSchema
    }).optional()
  }).deepPartial().extend({
    Id: stringSchema
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
