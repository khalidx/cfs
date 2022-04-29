import globby from 'globby'
import { readJson, writeFile } from 'fs-extra'
import { S3 } from '@aws-sdk/client-s3'

/**
 * This plugin reads all files in `.cfs/buckets/`.
 * 
 * For each bucket discovered, it makes an API call to AWS
 * to `getPublicAccessBlock`, and persists the response
 * back to the JSON resource file for the bucket.
 * 
 * If any buckets don't have the correct public access block
 * configuration, a warning is displayed to the console for
 * each offending bucket.
 */
export async function start () {
  const s3 = new S3({ region: 'us-east-1' })
  const publicBuckets: Array<string> = []
  await globby('.cfs/buckets/')
  .then(paths => Promise.all(paths.map(async path => ({ path, json: await readJson(path) }))))
  .then(buckets => Promise.all(buckets.map(async bucket => {
    if (!bucket.json.PublicAccessBlockConfiguration) {
      const response = await s3.getPublicAccessBlock({ Bucket: bucket.json.Name })
      bucket.json.PublicAccessBlockConfiguration = response.PublicAccessBlockConfiguration
    }
    const shouldWarn = !bucket.json.PublicAccessBlockConfiguration.BlockPublicAcls
      || !bucket.json.PublicAccessBlockConfiguration.IgnorePublicAcls
      || !bucket.json.PublicAccessBlockConfiguration.BlockPublicPolicy
      || !bucket.json.PublicAccessBlockConfiguration.RestrictPublicBuckets
    if (shouldWarn) publicBuckets.push(bucket.json.Name)
    return bucket
  })))
  .then(buckets => Promise.all(buckets.map(bucket => writeFile(bucket.path, JSON.stringify(bucket.json, null, 2)))))
  if (publicBuckets.length > 0) {
    publicBuckets.forEach(bucket => {
      console.warn(`The bucket [${bucket}] has no PublicAccessBlockConfiguration and is at risk for being public.`)
    })
  } else {
    console.log('Nice! There are no public buckets, and all buckets have a PublicAccessBlockConfiguration.')
  }
}

if (require.main === module) {
  start().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
