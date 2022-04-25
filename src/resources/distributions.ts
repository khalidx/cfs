import { z } from 'zod'
import { CloudFront, paginateListDistributions } from '@aws-sdk/client-cloudfront'
import { ensureDir, remove, writeFile } from 'fs-extra'

import { stringSchema } from '../services/schemas'

export class Distributions {

  methodSchema = z.array(z.union([
    z.literal('DELETE'),
    z.literal('GET'),
    z.literal('HEAD'),
    z.literal('OPTIONS'),
    z.literal('PATCH'),
    z.literal('POST'),
    z.literal('PUT')
  ]))

  eventTypeSchema = z.union([
    z.literal('origin-request'),
    z.literal('origin-response'),
    z.literal('viewer-request'),
    z.literal('viewer-response')
  ])

  trustedSignersSchema = z.object({
    Enabled: z.boolean(),
    Quantity: z.number(),
    Items: z.array(stringSchema).optional()
  })

  trustedKeyGroupsSchema = z.object({
    Enabled: z.boolean(),
    Quantity: z.number(),
    Items: z.array(stringSchema).optional()
  })

  viewerProtocolPolicySchema = z.union([
    z.literal('allow-all'),
    z.literal('https-only'),
    z.literal('redirect-to-https')
  ])

  allowedMethodsSchema = z.object({
    Quantity: z.number(),
    Items: this.methodSchema,
    CachedMethods: z.object({
      Quantity: z.number(),
      Items: this.methodSchema
    })
  })

  lambdaFunctionAssociationsSchema = z.object({
    Quantity: z.number(),
    Items: z.array(z.object({
      LambdaFunctionARN: stringSchema,
      EventType: this.eventTypeSchema,
      IncludeBody: z.boolean()
    })).optional()
  })

  functionAssociationsSchema = z.object({
    Quantity: z.number(),
    Items: z.array(z.object({
      FunctionARN: stringSchema,
      EventType: this.eventTypeSchema
    })).optional()
  })

  forwardedValuesSchema = z.object({
    QueryString: z.boolean(),
    Cookies: z.object({
      Forward: z.union([
        z.literal('all'),
        z.literal('none'),
        z.literal('whitelist'),
      ]),
      WhitelistedNames: z.object({
        Quantity: z.number(),
        Items: z.array(stringSchema)
      }).optional()
    }),
    Headers: z.object({
      Quantity: z.number(),
      Items: z.array(stringSchema).optional()
    }),
    QueryStringCacheKeys: z.object({
      Quantity: z.number(),
      Items: z.array(stringSchema).optional()
    })
  })

  itemSchema = z.object({
    ARN: stringSchema,
    Status: stringSchema,
    LastModifiedTime: z.date(),
    DomainName: stringSchema,
    Aliases: z.object({
      Quantity: z.number(),
      Items: z.array(stringSchema)
    }),
    Origins: z.object({
      Quantity: z.number(),
      Items: z.array(z.object({
        Id: stringSchema,
        DomainName: stringSchema,
        OriginPath: z.string().min(0).max(1000),
        CustomHeaders: z.object({
          Quantity: z.number(),
          Items: z.array(z.object({
            HeaderName: stringSchema,
            HeaderValue: stringSchema
          })).optional()
        }),
        S3OriginConfig: z.object({
          OriginAccessIdentity: stringSchema
        }),
        CustomOriginConfig: z.object({
          HTTPPort: z.number(),
          HTTPSPort: z.number(),
          OriginProtocolPolicy: z.union([
            z.literal('http-only'),
            z.literal('https-only'),
            z.literal('match-viewer')
          ]),
          OriginSslProtocols: z.object({
            Quantity: z.number(),
            Items: z.array(z.union([
              z.literal('SSLv3'),
              z.literal('TLSv1'),
              z.literal('TLSv1.1'),
              z.literal('TLSv1.2')
            ]))
          }),
          OriginReadTimeout: z.number(),
          OriginKeepaliveTimeout: z.number()
        }).optional(),
        ConnectionAttempts: z.number(),
        ConnectionTimeout: z.number(),
        OriginShield: z.object({
          Enabled: z.boolean(),
          OriginShieldRegion: stringSchema.optional()
        })
      }))
    }),
    OriginGroups: z.object({
      Quantity: z.number(),
      Items: z.array(z.object({
        Id: stringSchema,
        FailoverCriteria: z.object({
          StatusCodes: z.object({
            Quantity: z.number(),
            Items: z.array(z.number())
          })
        }),
        Members: z.object({
          Quantity: z.number(),
          Items: z.array(z.object({
            OriginId: stringSchema
          }))
        })
      })).optional()
    }),
    DefaultCacheBehavior: z.object({
      TargetOriginId: stringSchema,
      TrustedSigners: this.trustedSignersSchema,
      TrustedKeyGroups: this.trustedKeyGroupsSchema,
      ViewerProtocolPolicy: this.viewerProtocolPolicySchema,
      AllowedMethods: this.allowedMethodsSchema,
      SmoothStreaming: z.boolean(),
      Compress: z.boolean(),
      LambdaFunctionAssociations: this.lambdaFunctionAssociationsSchema,
      FunctionAssociations: this.functionAssociationsSchema,
      FieldLevelEncryptionId: z.string().min(0).max(500),
      RealtimeLogConfigArn: stringSchema.optional(),
      CachePolicyId: stringSchema.optional(),
      OriginRequestPolicyId: stringSchema.optional(),
      ResponseHeadersPolicyId: stringSchema.optional(),
      ForwardedValues: this.forwardedValuesSchema,
      MinTTL: z.number(),
      DefaultTTL: z.number(),
      MaxTTL: z.number()
    }),
    CacheBehaviors: z.object({
      Quantity: z.number(),
      Items: z.array(z.object({
        PathPattern: stringSchema,
        TargetOriginId: stringSchema,
        TrustedSigners: this.trustedSignersSchema,
        TrustedKeyGroups: this.trustedKeyGroupsSchema,
        ViewerProtocolPolicy: this.viewerProtocolPolicySchema,
        AllowedMethods: this.allowedMethodsSchema,
        SmoothStreaming: z.boolean(),
        Compress: z.boolean(),
        LambdaFunctionAssociations: this.lambdaFunctionAssociationsSchema,
        FunctionAssociations: this.functionAssociationsSchema,
        FieldLevelEncryptionId: stringSchema,
        RealtimeLogConfigArn: stringSchema,
        CachePolicyId: stringSchema,
        OriginRequestPolicyId: stringSchema,
        ResponseHeadersPolicyId: stringSchema,
        ForwardedValues: this.forwardedValuesSchema,
        MinTTL: z.number(),
        DefaultTTL: z.number(),
        MaxTTL: z.number()
      })).optional()
    }),
    CustomErrorResponses: z.object({
      Quantity: z.number(),
      Items: z.array(z.object({
        ErrorCode: z.number(),
        ResponsePagePath: stringSchema,
        ResponseCode: stringSchema,
        ErrorCachingMinTTL: z.number()
      }))
    }),
    Comment: stringSchema,
    PriceClass: z.union([
      z.literal('PriceClass_100'),
      z.literal('PriceClass_200'),
      z.literal('PriceClass_All')
    ]),
    Enabled: z.boolean(),
    ViewerCertificate: z.object({
      CloudFrontDefaultCertificate: z.boolean(),
      IAMCertificateId: stringSchema.optional(),
      ACMCertificateArn: stringSchema,
      SSLSupportMethod: z.union([
        z.literal('sni-only'),
        z.literal('static-ip'),
        z.literal('vip')
      ]),
      MinimumProtocolVersion: z.union([
        z.literal('SSLv3'),
        z.literal('TLSv1'),
        z.literal('TLSv1.1_2016'),
        z.literal('TLSv1.2_2018'),
        z.literal('TLSv1.2_2019'),
        z.literal('TLSv1.2_2021'),
        z.literal('TLSv1_2016')
      ]),
      Certificate: z.string().min(1).max(10000),
      CertificateSource: z.union([
        z.literal('acm'),
        z.literal('cloudfront'),
        z.literal('iam')
      ])
    }),
    Restrictions: z.object({
      GeoRestriction: z.object({
        RestrictionType: z.union([
          z.literal('blacklist'),
          z.literal('none'),
          z.literal('whitelist')
        ]),
        Quantity: z.number(),
        Items: z.array(stringSchema).optional()
      })
    }),
    WebACLId: z.string().min(0).max(500),
    HttpVersion: z.union([
      z.literal('HTTP1.1'),
      z.literal('HTTP2')
    ]),
    IsIPV6Enabled: z.boolean(),
    AliasICPRecordals: z.array(z.object({
      CNAME: stringSchema,
      ICPRecordalStatus: z.union([
        z.literal('APPROVED'),
        z.literal('PENDING'),
        z.literal('SUSPENDED')
      ])
    }))
  }).deepPartial().extend({
    Id: stringSchema
  })

  collectionSchema = z.array(this.itemSchema).min(0).max(10000)

  async listDistributions () {
    const cloudfront = new CloudFront({ region: 'us-east-1' })
    return paginateListDistributions({ client: cloudfront }, {})
  }

  async list () {
    return await this.listDistributions()
  }

  async clear () {
    await remove('.cfs/distributions/')
  }

  async write () {
    await this.clear()
    await ensureDir('.cfs/distributions/')
    for await (const result of await this.list()) {
      const distributions = await this.collectionSchema.parseAsync(result.DistributionList?.Items || [])
      for (const distribution of distributions) {
        await writeFile(`.cfs/distributions/${encodeURIComponent(distribution.Id)}`, JSON.stringify(distribution, null, 2))
      }
    }
  }

}

export default new Distributions()
