import { z } from 'zod'
import { Lambda, paginateListFunctions } from '@aws-sdk/client-lambda'
import { ensureDir, remove, writeFile } from 'fs-extra'

import Regions from './regions'
import { addError } from '../errors'

export class Functions {

  stringSchema = z.string().min(1).max(500)

  itemSchema = z.object({
    FunctionArn: this.stringSchema,
    Runtime: this.stringSchema,
    Role: this.stringSchema,
    Handler: this.stringSchema,
    CodeSize: z.number(),
    Description: z.string().min(0).max(1000),
    Timeout: z.number(),
    MemorySize: z.number(),
    LastModified: this.stringSchema,
    CodeSha256: this.stringSchema,
    Version: this.stringSchema,
    VpcConfig: z.object({
      SubnetIds: z.array(this.stringSchema),
      SecurityGroupIds: z.array(this.stringSchema),
      VpcId: this.stringSchema
    }).optional(),
    DeadLetterConfig: z.object({
      TargetArn: this.stringSchema
    }).optional(),
    Environment: z.object({
      Variables: z.object({}).passthrough(),
      Error: z.object({
        ErrorCode: this.stringSchema,
        Message: this.stringSchema
      }).optional()
    }).optional(),
    KMSKeyArn: this.stringSchema.optional(),
    TracingConfig: z.object({
      Mode: z.union([
        z.literal('Active'),
        z.literal('PassThrough')
      ])
    }),
    MasterArn: this.stringSchema.optional(),
    RevisionId: this.stringSchema,
    Layers: z.array(z.object({
      Arn: this.stringSchema,
      CodeSize: z.number(),
      SigningProfileVersionArn: this.stringSchema.optional(),
      SigningJobArn: this.stringSchema.optional()
    })).optional(),
    State: z.union([
      z.literal('Active'),
      z.literal('Failed'),
      z.literal('Inactive'),
      z.literal('Pending')
    ]).optional(),
    StateReason: this.stringSchema.optional(),
    StateReasonCode: z.union([
      z.literal('Creating'),
      z.literal('EniLimitExceeded'),
      z.literal('Idle'),
      z.literal('ImageAccessDenied'),
      z.literal('ImageDeleted'),
      z.literal('InsufficientRolePermissions'),
      z.literal('InternalError'),
      z.literal('InvalidConfiguration'),
      z.literal('InvalidImage'),
      z.literal('InvalidSecurityGroup'),
      z.literal('InvalidSubnet'),
      z.literal('Restoring'),
      z.literal('SubnetOutOfIPAddresses')
    ]).optional(),
    LastUpdateStatus: z.union([
      z.literal('Failed'),
      z.literal('InProgress'),
      z.literal('Successful')
    ]).optional(),
    LastUpdateStatusReason: this.stringSchema.optional(),
    LastUpdateStatusReasonCode: z.union([
      z.literal('EniLimitExceeded'),
      z.literal('ImageAccessDenied'),
      z.literal('ImageDeleted'),
      z.literal('InsufficientRolePermissions'),
      z.literal('InternalError'),
      z.literal('InvalidConfiguration'),
      z.literal('InvalidImage'),
      z.literal('InvalidSecurityGroup'),
      z.literal('InvalidSubnet'),
      z.literal('SubnetOutOfIPAddresses')
    ]).optional(),
    FileSystemConfigs: z.object({
      Arn: this.stringSchema,
      LocalMountPath: this.stringSchema
    }).optional(),
    PackageType: z.union([
      z.literal('Image'),
      z.literal('Zip')
    ]),
    ImageConfigResponse: z.object({
      ImageConfig: z.object({
        EntryPoint: z.array(this.stringSchema),
        Command: z.array(this.stringSchema),
        WorkingDirectory: this.stringSchema
      }),
      Error: z.object({
        ErrorCode: this.stringSchema,
        Message: this.stringSchema
      })
    }).optional(),
    SigningProfileVersionArn: this.stringSchema.optional(),
    SigningJobArn: this.stringSchema.optional(),
    Architectures: z.array(z.union([
      z.literal('arm64'),
      z.literal('x86_64')
    ])),
    EphemeralStorage: z.object({
      Size: z.number()
    })
  }).deepPartial().extend({
    FunctionName: this.stringSchema
  })

  collectionSchema = z.array(this.itemSchema).min(0).max(10000)

  async listFunctions (params: { region: string }) {
    const lambda = new Lambda({ region: params.region })
    return paginateListFunctions({ client: lambda }, {})
  }

  async list () {
    const regions = await Regions.list()
    return Promise.all(regions.map(async region => {
      return {
        region,
        functions: await this.listFunctions({ region: region.RegionName })
      }
    }))
  }

  async clear () {
    await remove('.cfs/functions/')
  }

  async write () {
    await this.clear()
    const functions = await this.list()
    await ensureDir('.cfs/functions/')
    await Promise.all(functions.map(async entry => {
      for await (const result of entry.functions) {
        const functions = await this.collectionSchema.parseAsync(result.Functions)
        if (functions.length > 0) {
          await ensureDir(`.cfs/functions/${encodeURIComponent(entry.region.RegionName)}/`)
        }
        for (const func of functions) {
          await writeFile(`.cfs/functions/${encodeURIComponent(entry.region.RegionName)}/${encodeURIComponent(func.FunctionName)}`, JSON.stringify(func, null, 2))
        }
      }
    }).map(promise => promise.catch(addError)))
  }

}

export default new Functions()
