import express from 'express'
import open from 'open'

import * as svgs from './svgs'

export async function startServer (resources: Array<{ id: number, path: string, content: string }>) {
  const app = express()
  app.get('/search', (req, res, _next) => {
    if (!req.query['q']) return res.status(400).send('400 - Bad Request')
    const query = req.query['q']
    if (query && typeof query === 'string') {
      const lowercase = query.toLowerCase()
      return res.json(resources.filter(resource => resource.path.toLowerCase().includes(lowercase) || resource.content.toLowerCase().includes(lowercase)))
    }
    return res.status(400).send('400 - Bad Request')
  })
  app.get('/img/logo', (_req, res, _next) => {
    res.contentType('image/svg+xml')
    res.send(svgs.CloudfsLogoSvg())
  })
  app.get('/icons/:type', (req, res, _next) => {
    const type = req.params.type
    if (type === 'alarms') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ResAmazonCloudWatchAlarm48LightSvg())
    }
    if (type === 'apis') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ArchAmazonAPIGateway48Svg())
    }
    if (type === 'buckets') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ResAmazonSimpleStorageServiceS3Standard48LightSvg())
    }
    if (type === 'canaries') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ResAmazonCloudWatchSynthetics48LightSvg())
    }
    if (type === 'certificates') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ArchAWSCertificateManager48Svg())
    }
    if (type === 'distributions') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ArchAmazonCloudFront48Svg())
    }
    if (type === 'domains') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ResAmazonRoute53HostedZone48LightSvg())
    }
    if (type === 'functions') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ResAWSLambdaLambdaFunction48LightSvg())
    }
    if (type === 'instances') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ResAmazonEC2Instance48LightSvg())
    }
    if (type === 'parameters') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ResAWSSystemsManagerParameterStore48LightSvg())
    }
    if (type === 'queues') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ArchAmazonSimpleQueueService48Svg())
    }
    if (type === 'regions') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ResDisk48LightSvg())
    }
    if (type === 'stacks') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ResAWSCloudFormationStack48LightSvg())
    }
    if (type === 'tables') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ArchAmazonDynamoDB48Svg())
    }
    if (type === 'topics') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ArchAmazonSimpleNotificationService48Svg())
    }
    if (type === 'vpcs') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ArchAmazonVirtualPrivateCloud48Svg())
    }
    return res.status(404).send('404 - Not Found')
  })
  const port = 3000
  const url = `http://localhost:${port}/`
  await new Promise<void>((resolve) => {
    app.listen(port, () => {
      console.log(`Server listening on ${url} ...`)
      resolve()
    })
  })
  await open(url)
}
