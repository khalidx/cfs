# cfs

<img src="logo.svg" width="350px">

An easy way to manage your cloud like a local filesystem.

## cli

```sh
cfs
cfs ls
```

## supported resources

The following cloud resources are [currently supported](./src/resources/):

- AWS S3 Buckets
- AWS ACM Certificates
- AWS CloudFront Distributions
- AWS Route53 Hosted Zones
- AWS Lambda Functions
- AWS SQS Queues
- AWS Regions
- AWS DynamoDB Tables
- AWS SNS Topics
- AWS VPCs

## plugins

(coming soon)

## developers

This section is for developers working on the `cfs` code. For usage instructions, see the sections above.

After cloning, run `npm link` to make the `cfs` CLI available.
