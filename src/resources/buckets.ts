import { z } from 'zod'
import { S3 } from '@aws-sdk/client-s3'
import { ensureDir, remove, writeFile } from 'fs-extra'

export class Buckets {

  stringSchema = z.string().min(1).max(500)

  itemSchema = z.object({
    Name: this.stringSchema,
    CreationDate: z.date()
  })

  collectionSchema = z.array(this.itemSchema).min(0).max(10000)

  async listBuckets () {
    const s3 = new S3({ region: 'us-east-1' })
    const listBuckets = await s3.listBuckets({})
    return listBuckets.Buckets
  }

  async list () {
    return await this.collectionSchema.parseAsync(await this.listBuckets())
  }

  async clear () {
    await remove('.cfs/buckets/')
  }

  async write () {
    await this.clear()
    const buckets = await this.list()
    await ensureDir('.cfs/buckets/')
    await Promise.all(buckets.map(bucket => writeFile(`.cfs/buckets/${encodeURIComponent(bucket.Name)}`, JSON.stringify(bucket, null, 2))))
  }

}

export default new Buckets()
