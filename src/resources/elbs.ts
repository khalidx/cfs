import { z } from 'zod'
import { ElasticLoadBalancing, paginateDescribeLoadBalancers } from '@aws-sdk/client-elastic-load-balancing'
import { ElasticLoadBalancingV2, paginateDescribeLoadBalancers as paginateDescribeLoadBalancersV2 } from '@aws-sdk/client-elastic-load-balancing-v2'
import { ensureDir, remove, writeFile } from 'fs-extra'

import Regions from './regions'
import { addError } from '../errors'

export class Elbs {

  stringSchema = z.string().min(1).max(1000)

  elbItemSchema = z.object({
    LoadBalancerName: this.stringSchema
  }).passthrough()

  elbv2ItemSchema = z.object({
    LoadBalancerName: this.stringSchema
  }).passthrough()

  elbCollectionSchema = z.array(this.elbItemSchema).min(0).max(10000)
  
  elbv2CollectionSchema = z.array(this.elbv2ItemSchema).min(0).max(10000)

  async describeLoadBalancers (params: { region: string }) {
    const elasticLoadBalancing = new ElasticLoadBalancing({ region: params.region })
    return paginateDescribeLoadBalancers({ client: elasticLoadBalancing }, {})
  }

  async describeLoadBalancersV2 (params: { region: string }) {
    const elasticLoadBalancingV2 = new ElasticLoadBalancingV2({ region: params.region })
    return paginateDescribeLoadBalancersV2({ client: elasticLoadBalancingV2 }, {})
  }

  async list () {
    const regions = await Regions.list()
    return Promise.all(regions.map(async region => {
      return {
        region,
        elbs: await this.describeLoadBalancers({ region: region.RegionName }),
        elbsV2: await this.describeLoadBalancersV2({ region: region.RegionName })
      }
    }))
  }

  async clear () {
    await remove('.cfs/elbs/')
  }

  async write () {
    await this.clear()
    const elbs = await this.list()
    await ensureDir('.cfs/elbs/')
    await Promise.all(elbs.map(async entry => {
      for await (const result of entry.elbs) {
        const elbs = await this.elbCollectionSchema.parseAsync(result.LoadBalancerDescriptions)
        if (elbs.length > 0) {
          await ensureDir(`.cfs/elbs/classic/${encodeURIComponent(entry.region.RegionName)}/`)
        }
        for (const elb of elbs) {
          await writeFile(`.cfs/elbs/classic/${encodeURIComponent(entry.region.RegionName)}/${encodeURIComponent(elb.LoadBalancerName)}`, JSON.stringify(elb, null, 2))
        }
      }
      for await (const result of entry.elbsV2) {
        const elbs = await this.elbv2CollectionSchema.parseAsync(result.LoadBalancers)
        if (elbs.length > 0) {
          await ensureDir(`.cfs/elbs/v2/${encodeURIComponent(entry.region.RegionName)}/`)
        }
        for (const elb of elbs) {
          await writeFile(`.cfs/elbs/v2/${encodeURIComponent(entry.region.RegionName)}/${encodeURIComponent(elb.LoadBalancerName)}`, JSON.stringify(elb, null, 2))
        }
      }
    }).map(promise => promise.catch(addError)))
  }

}

export default new Elbs()
