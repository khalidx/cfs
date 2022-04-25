import { z } from 'zod'
import { CloudWatch, paginateDescribeAlarms } from '@aws-sdk/client-cloudwatch'
import { ensureDir, remove, writeFile } from 'fs-extra'

import Regions from './regions'
import { stringSchema } from '../services/schemas'
import { addError } from '../services/errors'

export class Alarms {

  dimensionsSchema = z.array(z.object({
    Name: stringSchema,
    Value: stringSchema
  }))

  unitSchema = z.union([
    z.literal('Bits'),
    z.literal('Bits/Second'),
    z.literal('Bytes'),
    z.literal('Bytes/Second'),
    z.literal('Count'),
    z.literal('Count/Second'),
    z.literal('Gigabits'),
    z.literal('Gigabits/Second'),
    z.literal('Gigabytes'),
    z.literal('Gigabytes/Second'),
    z.literal('Kilobits'),
    z.literal('Kilobits/Second'),
    z.literal('Kilobytes'),
    z.literal('Kilobytes/Second'),
    z.literal('Megabits'),
    z.literal('Megabits/Second'),
    z.literal('Megabytes'),
    z.literal('Megabytes/Second'),
    z.literal('Microseconds'),
    z.literal('Milliseconds'),
    z.literal('None'),
    z.literal('Percent'),
    z.literal('Seconds'),
    z.literal('Terabits'),
    z.literal('Terabits/Second'),
    z.literal('Terabytes'),
    z.literal('Terabytes/Second')
  ])

  stateValueSchema = z.union([
    z.literal('ALARM'),
    z.literal('INSUFFICIENT_DATA'),
    z.literal('OK')
  ])

  metricAlarmsItemSchema = z.object({
    AlarmName: stringSchema,
    AlarmDescription: stringSchema,
    AlarmConfigurationUpdatedTimestamp: z.date(),
    ActionsEnabled: z.boolean(),
    OKActions: z.array(stringSchema),
    AlarmActions: z.array(stringSchema),
    InsufficientDataActions: z.array(stringSchema),
    StateValue: this.stateValueSchema,
    StateReason: stringSchema,
    StateReasonData: stringSchema,
    StateUpdatedTimestamp: z.date(),
    MetricName: stringSchema,
    Namespace: stringSchema,
    Statistic: z.union([
      z.literal('Average'),
      z.literal('Maximum'),
      z.literal('Minimum'),
      z.literal('SampleCount'),
      z.literal('Sum')
    ]),
    ExtendedStatistic: stringSchema,
    Dimensions: this.dimensionsSchema,
    Period: z.number(),
    Unit: this.unitSchema,
    EvaluationPeriods: z.number(),
    DatapointsToAlarm: z.number(),
    Threshold: z.number(),
    ComparisonOperator: z.union([
      z.literal('GreaterThanOrEqualToThreshold'),
      z.literal('GreaterThanThreshold'),
      z.literal('GreaterThanUpperThreshold'),
      z.literal('LessThanLowerOrGreaterThanUpperThreshold'),
      z.literal('LessThanLowerThreshold'),
      z.literal('LessThanOrEqualToThreshold'),
      z.literal('LessThanThreshold')
    ]),
    TreatMissingData: stringSchema,
    EvaluateLowSampleCountPercentile: stringSchema,
    Metrics: z.array(z.object({
      Id: stringSchema,
      MetricStat: z.object({
        Metric: z.object({
          Namespace: stringSchema,
          MetricName: stringSchema,
          Dimensions: this.dimensionsSchema
        }),
        Period: z.number(),
        Stat: stringSchema,
        Unit: this.unitSchema
      }),
      Expression: stringSchema,
      Label: stringSchema,
      ReturnData: z.boolean(),
      Period: z.number(),
      AccountId: stringSchema
    })),
    ThresholdMetricId: stringSchema
  }).deepPartial().extend({
    AlarmArn: stringSchema
  })

  metricAlarmsCollectionSchema = z.array(this.metricAlarmsItemSchema).min(0).max(10000)
  
  compositeAlarmsItemSchema = z.object({
    ActionsEnabled: z.boolean(),
    AlarmActions: z.array(stringSchema),
    AlarmConfigurationUpdatedTimestamp: z.date(),
    AlarmDescription: stringSchema,
    AlarmName: stringSchema,
    AlarmRule: stringSchema,
    InsufficientDataActions: z.array(stringSchema),
    OKActions: z.array(stringSchema),
    StateReason: stringSchema,
    StateReasonData: stringSchema,
    StateUpdatedTimestamp: z.date(),
    StateValue: this.stateValueSchema
  }).deepPartial().extend({
    AlarmArn: stringSchema.refine(arn => arn.split(':alarm:').length === 2)
  })

  compositeAlarmsCollectionSchema = z.array(this.compositeAlarmsItemSchema).min(0).max(10000)

  async describeAlarms (params: { region: string }) {
    const cloudwatch = new CloudWatch({ region: params.region })
    return paginateDescribeAlarms({ client: cloudwatch }, {})
  }

  async list () {
    const regions = await Regions.list()
    return Promise.all(regions.map(async region => {
      return {
        region,
        alarms: await this.describeAlarms({ region: region.RegionName })
      }
    }))
  }

  async clear () {
    await remove('.cfs/alarms/')
  }

  async write () {
    await this.clear()
    const alarms = await this.list()
    await ensureDir('.cfs/alarms/')
    await Promise.all(alarms.map(async entry => {
      for await (const result of entry.alarms) {
        const metricAlarms = await this.metricAlarmsCollectionSchema.parseAsync(result.MetricAlarms)
        if (metricAlarms.length > 0) {
          await ensureDir(`.cfs/alarms/metric/${encodeURIComponent(entry.region.RegionName)}/`)
        }
        for (const alarm of metricAlarms) {
          await writeFile(`.cfs/alarms/metric/${encodeURIComponent(entry.region.RegionName)}/${encodeURIComponent(alarm.AlarmArn.substring(alarm.AlarmArn.indexOf(':alarm:') + ':alarm:'.length))}`, JSON.stringify(alarm, null, 2))
        }
        const compositeAlarms = await this.compositeAlarmsCollectionSchema.parseAsync(result.CompositeAlarms)
        if (compositeAlarms.length > 0) {
          await ensureDir(`.cfs/alarms/composite/${encodeURIComponent(entry.region.RegionName)}/`)
        }
        for (const alarm of compositeAlarms) {
          await writeFile(`.cfs/alarms/composite/${encodeURIComponent(entry.region.RegionName)}/${encodeURIComponent(alarm.AlarmArn.substring(alarm.AlarmArn.indexOf(':alarm:') + ':alarm:'.length))}`, JSON.stringify(alarm, null, 2))
        }
      }
    }).map(promise => promise.catch(addError)))
  }

}

export default new Alarms()
