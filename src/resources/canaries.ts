import { z } from 'zod'
import { Synthetics, paginateDescribeCanaries } from '@aws-sdk/client-synthetics'
import { ensureDir, remove, writeFile } from 'fs-extra'

import Regions from './regions'
import { stringSchema } from '../services/schemas'
import { addError } from '../services/errors'

export class Canaries {

  itemSchema = z.object({
    Name: stringSchema,
    Code: z.object({
      SourceLocationArn: stringSchema,
      Handler: stringSchema
    }),
    ExecutionRoleArn: stringSchema,
    Schedule: z.object({
      Expression: stringSchema,
      DurationInSeconds: z.number()
    }),
    RunConfig: z.object({
      TimeoutInSeconds: z.number(),
      MemoryInMB: z.number(),
      ActiveTracing: z.boolean()
    }),
    SuccessRetentionPeriodInDays: z.number(),
    FailureRetentionPeriodInDays: z.number(),
    Status: z.object({
      State: z.union([
        z.literal('CREATING'),
        z.literal('DELETING'),
        z.literal('ERROR'),
        z.literal('READY'),
        z.literal('RUNNING'),
        z.literal('STARTING'),
        z.literal('STOPPED'),
        z.literal('STOPPING'),
        z.literal('UPDATING')
      ]),
      StateReason: stringSchema,
      StateReasonCode: z.literal('INVALID_PERMISSIONS')
    }),
    Timeline: z.object({
      Created: z.date(),
      LastModified: z.date(),
      LastStarted: z.date(),
      LastStopped: z.date()
    }),
    ArtifactS3Location: stringSchema,
    EngineArn: stringSchema,
    RuntimeVersion: stringSchema,
    VpcConfig: z.object({
      VpcId: stringSchema,
      SubnetIds: z.array(stringSchema),
      SecurityGroupIds: z.array(stringSchema)
    }),
    VisualReference: z.object({
      BaseScreenshots: z.array(z.object({
        ScreenshotName: stringSchema,
        IgnoreCoordinates: z.array(stringSchema)
      })),
      BaseCanaryRunId: stringSchema
    }),
    Tags: z.object({}).passthrough(),
    ArtifactConfig: z.object({
      S3Encryption: z.object({
        EncryptionMode: z.union([
          z.literal('SSE_KMS'),
          z.literal('SSE_S3')
        ]),
        KmsKeyArn: stringSchema
      })
    })
  }).deepPartial().extend({
    Id: stringSchema
  })

  collectionSchema = z.array(this.itemSchema).min(0).max(10000)

  async describeCanaries (params: { region: string }) {
    const synthetics = new Synthetics({ region: params.region })
    return paginateDescribeCanaries({ client: synthetics }, {})
  }

  async list () {
    const regions = await Regions.list()
    return Promise.all(regions.map(async region => {
      return {
        region,
        canaries: await this.describeCanaries({ region: region.RegionName })
      }
    }))
  }

  async clear () {
    await remove('.cfs/canaries/')
  }

  async write () {
    await this.clear()
    const canaries = await this.list()
    await ensureDir('.cfs/canaries/')
    await Promise.all(canaries.map(async entry => {
      for await (const result of entry.canaries) {
        const canaries = await this.collectionSchema.parseAsync(result.Canaries)
        if (canaries.length > 0) {
          await ensureDir(`.cfs/canaries/${encodeURIComponent(entry.region.RegionName)}/`)
        }
        for (const canary of canaries) {
          await writeFile(`.cfs/canaries/${encodeURIComponent(entry.region.RegionName)}/${encodeURIComponent(canary.Id)}`, JSON.stringify(canary, null, 2))
        }
      }
    }).map(promise => promise.catch(addError)))
  }

}

export default new Canaries()
