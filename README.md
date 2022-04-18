# cfs

<img src="logo.svg" alt="cloudfs - An easy way to discover and manage your cloud like a local filesystem." width="350px">

An easy way to discover and manage your cloud like a local filesystem.

[![npm package version badge](https://img.shields.io/npm/v/@khalidx/cfs.svg?style=flat-square)](https://www.npmjs.com/package/@khalidx/cfs)
[![GitHub last commit badge](https://img.shields.io/github/last-commit/khalidx/cfs.svg?style=flat-square)](https://github.com/khalidx/cfs/commits/main)
[![GitHub license badge](https://img.shields.io/github/license/khalidx/cfs.svg?style=flat-square)](https://github.com/khalidx/cfs/blob/main/LICENSE)

## install

```sh
npm install -g @khalidx/cfs
```

Also, a native binary is available for [Windows](https://github.com/khalidx/cfs/releases/download/v0.1.0/cfs-win.exe), [Mac](https://github.com/khalidx/cfs/releases/download/v0.1.0/cfs-macos), and [Linux](https://github.com/khalidx/cfs/releases/download/v0.1.0/cfs-linux).

Need help using this application? [Read this](#support).

## cli

```sh
cfs
cfs ls
cfs clean
```

> Make sure you're [logged in to AWS](#aws-credentials) before running the commands above.

## discovering resources

```sh
cfs
```

Running the command above outputs all [discovered resources](#supported-resources) to `.cfs/` in the current directory.

```sh
cfs ls
```

Running the command above lists the names of all resource files to the console. This is useful for passing the output to other tools, like `grep`.

For example, for viewing "vpc" resources only (searching file names):

```sh
cfs ls | grep vpc
```

Or, for viewing any resource with "us-east-1" in its configuration file (searching file contents):

```sh
cfs ls | xargs grep -l us-east-1
```

Of course, you could also use the built-in search in your favorite IDE (like VSCode) or open and browse the files directly!

To remove all downloaded resources from the local filesystem (without affecting anything in your cloud account), run:

```sh
cfs clean
```

This is the same as deleting the `.cfs/` directory yourself with `rm -rf .cfs/`.

## updating resources

(coming soon)

## supported resources

The following cloud resources are [currently supported](./src/resources/):

- AWS CloudWatch Metric Alarms
- AWS CloudWatch Composite Alarms
- AWS API Gateway HTTP APIs
- AWS API Gateway REST APIs
- AWS S3 Buckets
- AWS CloudWatch Synthetics Canaries
- AWS ACM Certificates
- AWS CloudFront Distributions
- AWS Route53 Hosted Zones
- AWS Lambda Functions
- AWS EC2 Instances
- AWS SSM Parameters
- AWS SQS Queues
- AWS Regions
- AWS CloudFormation Stacks
- AWS DynamoDB Tables
- AWS SNS Topics
- AWS VPCs

More resources are coming soon, with the goal of covering all resources listed on the [AWS resource and property types reference](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html) page.

## plugins

(coming soon)

## aws credentials

Make sure you're logged in to AWS, and have the corresponding credentials file or environment variables set. Otherwise, `cfs` won't be able to query your cloud resources.

Here's a quick guide from AWS on [configuring your credentials with the AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html#cli-configure-quickstart-config).

## developers

This section is for developers working on the `cfs` code. If you are instead looking for usage instructions, see the sections above.

After cloning, run `npm link` to make the `cfs` CLI available. You can now edit the TypeScript source files, and whenever you run `cfs` you'll be working with the latest sources directly, without having to build/compile the TypeScript files.

## support

🚀 Over the **next week** (April 18-25 2022), all Github issues submitted will receive an 8-hour turnaround time, for a good beta testing experience!
