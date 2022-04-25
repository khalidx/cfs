import { z } from 'zod'
import { CloudFormation, paginateDescribeStacks } from '@aws-sdk/client-cloudformation'
import { ensureDir, remove, writeFile } from 'fs-extra'

import Regions from './regions'
import { stringSchema } from '../services/schemas'
import { addError } from '../services/errors'

export class Stacks {

  itemSchema = z.object({
    StackName: stringSchema,
    ChangeSetId: stringSchema.optional(),
    Description: stringSchema.optional(),
    Parameters: z.array(z.object({
      ParameterKey: stringSchema,
      ParameterValue: z.string().min(0).max(10000),
      UsePreviousValue: z.boolean().optional(),
      ResolvedValue: stringSchema.optional()
    })),
    CreationTime: z.date(),
    DeletionTime: z.date().optional(),
    LastUpdatedTime: z.date().optional(),
    RollbackConfiguration: z.object({
      RollbackTriggers: z.array(z.object({
        Arn: stringSchema,
        Type: stringSchema
      })).optional(),
      MonitoringTimeInMinutes: z.number().optional()
    }),
    StackStatus: z.union([
      z.literal('CREATE_COMPLETE'),
      z.literal('CREATE_FAILED'),
      z.literal('CREATE_IN_PROGRESS'),
      z.literal('DELETE_COMPLETE'),
      z.literal('DELETE_FAILED'),
      z.literal('DELETE_IN_PROGRESS'),
      z.literal('IMPORT_COMPLETE'),
      z.literal('IMPORT_IN_PROGRESS'),
      z.literal('IMPORT_ROLLBACK_COMPLETE'),
      z.literal('IMPORT_ROLLBACK_FAILED'),
      z.literal('IMPORT_ROLLBACK_IN_PROGRESS'),
      z.literal('REVIEW_IN_PROGRESS'),
      z.literal('ROLLBACK_COMPLETE'),
      z.literal('ROLLBACK_FAILED'),
      z.literal('ROLLBACK_IN_PROGRESS'),
      z.literal('UPDATE_COMPLETE'),
      z.literal('UPDATE_COMPLETE_CLEANUP_IN_PROGRESS'),
      z.literal('UPDATE_FAILED'),
      z.literal('UPDATE_IN_PROGRESS'),
      z.literal('UPDATE_ROLLBACK_COMPLETE'),
      z.literal('UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS'),
      z.literal('UPDATE_ROLLBACK_FAILED'),
      z.literal('UPDATE_ROLLBACK_IN_PROGRESS')
    ]),
    StackStatusReason: stringSchema.optional(),
    DisableRollback: z.boolean(),
    NotificationARNs: z.array(stringSchema),
    TimeoutInMinutes: z.number().optional(),
    Capabilities: z.array(z.union([
      z.literal('CAPABILITY_AUTO_EXPAND'),
      z.literal('CAPABILITY_IAM'),
      z.literal('CAPABILITY_NAMED_IAM')
    ])),
    Outputs: z.array(z.object({
      OutputKey: stringSchema,
      OutputValue: stringSchema,
      Description: stringSchema.optional(),
      ExportName: stringSchema.optional()
    })).optional(),
    RoleARN: stringSchema.optional(),
    Tags: z.array(z.object({
      Key: stringSchema,
      Value: stringSchema
    })),
    EnableTerminationProtection: z.boolean().optional(),
    ParentId: stringSchema.optional(),
    RootId: stringSchema.optional(),
    DriftInformation: z.object({
      StackDriftStatus: z.union([
        z.literal('DRIFTED'),
        z.literal('IN_SYNC'),
        z.literal('NOT_CHECKED'),
        z.literal('UNKNOWN')
      ]),
      LastCheckTimestamp: z.date().optional()
    })
  }).deepPartial().extend({
    StackId: stringSchema.refine(id => id.split(':stack/').length === 2)
  })

  collectionSchema = z.array(this.itemSchema).min(0).max(10000)

  async describeStacks (params: { region: string }) {
    const cloudformation = new CloudFormation({ region: params.region })
    return paginateDescribeStacks({ client: cloudformation }, {})
  }

  async list () {
    const regions = await Regions.list()
    return Promise.all(regions.map(async region => {
      return {
        region,
        stacks: await this.describeStacks({ region: region.RegionName })
      }
    }))
  }

  async clear () {
    await remove('.cfs/stacks/')
  }

  async write () {
    await this.clear()
    const stacks = await this.list()
    await ensureDir('.cfs/stacks/')
    await Promise.all(stacks.map(async entry => {
      for await (const result of entry.stacks) {
        const stacks = await this.collectionSchema.parseAsync(result.Stacks)
        if (stacks.length > 0) {
          await ensureDir(`.cfs/stacks/${encodeURIComponent(entry.region.RegionName)}/`)
        }
        for (const stack of stacks) {
          await writeFile(`.cfs/stacks/${encodeURIComponent(entry.region.RegionName)}/${encodeURIComponent(stack.StackId.substring(stack.StackId.indexOf(':stack/') + ':stack/'.length))}`, JSON.stringify(stack, null, 2))
        }
      }
    }).map(promise => promise.catch(addError)))
  }

}

export default new Stacks()
