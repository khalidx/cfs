import { z } from 'zod'
import { CloudWatch, paginateDescribeAlarms } from '@aws-sdk/client-cloudwatch'
import { ensureDir, remove, writeFile } from 'fs-extra'

import Regions from './regions'
import { addError } from '../services/errors'

export class Alarms {

  stringSchema = z.string().min(1).max(500)

  dimensionsSchema = z.array(z.object({
    Name: this.stringSchema,
    Value: this.stringSchema
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
    AlarmName: this.stringSchema,
    AlarmDescription: this.stringSchema,
    AlarmConfigurationUpdatedTimestamp: z.date(),
    ActionsEnabled: z.boolean(),
    OKActions: z.array(this.stringSchema),
    AlarmActions: z.array(this.stringSchema),
    InsufficientDataActions: z.array(this.stringSchema),
    StateValue: this.stateValueSchema,
    StateReason: this.stringSchema,
    StateReasonData: this.stringSchema,
    StateUpdatedTimestamp: z.date(),
    MetricName: this.stringSchema,
    Namespace: this.stringSchema,
    Statistic: z.union([
      z.literal('Average'),
      z.literal('Maximum'),
      z.literal('Minimum'),
      z.literal('SampleCount'),
      z.literal('Sum')
    ]),
    ExtendedStatistic: this.stringSchema,
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
    TreatMissingData: this.stringSchema,
    EvaluateLowSampleCountPercentile: this.stringSchema,
    Metrics: z.array(z.object({
      Id: this.stringSchema,
      MetricStat: z.object({
        Metric: z.object({
          Namespace: this.stringSchema,
          MetricName: this.stringSchema,
          Dimensions: this.dimensionsSchema
        }),
        Period: z.number(),
        Stat: this.stringSchema,
        Unit: this.unitSchema
      }),
      Expression: this.stringSchema,
      Label: this.stringSchema,
      ReturnData: z.boolean(),
      Period: z.number(),
      AccountId: this.stringSchema
    })),
    ThresholdMetricId: this.stringSchema
  }).deepPartial().extend({
    AlarmArn: this.stringSchema
  })

  metricAlarmsCollectionSchema = z.array(this.metricAlarmsItemSchema).min(0).max(10000)
  
  compositeAlarmsItemSchema = z.object({
    ActionsEnabled: z.boolean(),
    AlarmActions: z.array(this.stringSchema),
    AlarmConfigurationUpdatedTimestamp: z.date(),
    AlarmDescription: this.stringSchema,
    AlarmName: this.stringSchema,
    AlarmRule: this.stringSchema,
    InsufficientDataActions: z.array(this.stringSchema),
    OKActions: z.array(this.stringSchema),
    StateReason: this.stringSchema,
    StateReasonData: this.stringSchema,
    StateUpdatedTimestamp: z.date(),
    StateValue: this.stateValueSchema
  }).deepPartial().extend({
    AlarmArn: this.stringSchema
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
          await writeFile(`.cfs/alarms/metric/${encodeURIComponent(entry.region.RegionName)}/${encodeURIComponent(alarm.AlarmArn.substring(alarm.AlarmArn.indexOf(':alarm/') + ':alarm/'.length))}`, JSON.stringify(alarm, null, 2))
        }
        const compositeAlarms = await this.compositeAlarmsCollectionSchema.parseAsync(result.CompositeAlarms)
        if (compositeAlarms.length > 0) {
          await ensureDir(`.cfs/alarms/composite/${encodeURIComponent(entry.region.RegionName)}/`)
        }
        for (const alarm of compositeAlarms) {
          await writeFile(`.cfs/alarms/composite/${encodeURIComponent(entry.region.RegionName)}/${encodeURIComponent(alarm.AlarmArn.substring(alarm.AlarmArn.indexOf(':alarm/') + ':alarm/'.length))}`, JSON.stringify(alarm, null, 2))
        }
      }
    }).map(promise => promise.catch(addError)))
  }

}

export default new Alarms()
