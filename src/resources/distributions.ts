import { z } from 'zod'
import { CloudFront, paginateListDistributions } from '@aws-sdk/client-cloudfront'
import { ensureDir, remove, writeFile } from 'fs-extra'

export class Distributions {

  stringSchema = z.string().min(1).max(500)

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
    Items: z.array(this.stringSchema).optional()
  })

  trustedKeyGroupsSchema = z.object({
    Enabled: z.boolean(),
    Quantity: z.number(),
    Items: z.array(this.stringSchema).optional()
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
      LambdaFunctionARN: this.stringSchema,
      EventType: this.eventTypeSchema,
      IncludeBody: z.boolean()
    })).optional()
  })

  functionAssociationsSchema = z.object({
    Quantity: z.number(),
    Items: z.array(z.object({
      FunctionARN: this.stringSchema,
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
        Items: z.array(this.stringSchema)
      }).optional()
    }),
    Headers: z.object({
      Quantity: z.number(),
      Items: z.array(this.stringSchema).optional()
    }),
    QueryStringCacheKeys: z.object({
      Quantity: z.number(),
      Items: z.array(this.stringSchema).optional()
    })
  })

  itemSchema = z.object({
    ARN: this.stringSchema,
    Status: this.stringSchema,
    LastModifiedTime: z.date(),
    DomainName: this.stringSchema,
    Aliases: z.object({
      Quantity: z.number(),
      Items: z.array(this.stringSchema)
    }),
    Origins: z.object({
      Quantity: z.number(),
      Items: z.array(z.object({
        Id: this.stringSchema,
        DomainName: this.stringSchema,
        OriginPath: z.string().min(0).max(1000),
        CustomHeaders: z.object({
          Quantity: z.number(),
          Items: z.array(z.object({
            HeaderName: this.stringSchema,
            HeaderValue: this.stringSchema
          })).optional()
        }),
        S3OriginConfig: z.object({
          OriginAccessIdentity: this.stringSchema
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
          OriginShieldRegion: this.stringSchema.optional()
        })
      }))
    }),
    OriginGroups: z.object({
      Quantity: z.number(),
      Items: z.array(z.object({
        Id: this.stringSchema,
        FailoverCriteria: z.object({
          StatusCodes: z.object({
            Quantity: z.number(),
            Items: z.array(z.number())
          })
        }),
        Members: z.object({
          Quantity: z.number(),
          Items: z.array(z.object({
            OriginId: this.stringSchema
          }))
        })
      })).optional()
    }),
    DefaultCacheBehavior: z.object({
      TargetOriginId: this.stringSchema,
      TrustedSigners: this.trustedSignersSchema,
      TrustedKeyGroups: this.trustedKeyGroupsSchema,
      ViewerProtocolPolicy: this.viewerProtocolPolicySchema,
      AllowedMethods: this.allowedMethodsSchema,
      SmoothStreaming: z.boolean(),
      Compress: z.boolean(),
      LambdaFunctionAssociations: this.lambdaFunctionAssociationsSchema,
      FunctionAssociations: this.functionAssociationsSchema,
      FieldLevelEncryptionId: z.string().min(0).max(500),
      RealtimeLogConfigArn: this.stringSchema.optional(),
      CachePolicyId: this.stringSchema.optional(),
      OriginRequestPolicyId: this.stringSchema.optional(),
      ResponseHeadersPolicyId: this.stringSchema.optional(),
      ForwardedValues: this.forwardedValuesSchema,
      MinTTL: z.number(),
      DefaultTTL: z.number(),
      MaxTTL: z.number()
    }),
    CacheBehaviors: z.object({
      Quantity: z.number(),
      Items: z.array(z.object({
        PathPattern: this.stringSchema,
        TargetOriginId: this.stringSchema,
        TrustedSigners: this.trustedSignersSchema,
        TrustedKeyGroups: this.trustedKeyGroupsSchema,
        ViewerProtocolPolicy: this.viewerProtocolPolicySchema,
        AllowedMethods: this.allowedMethodsSchema,
        SmoothStreaming: z.boolean(),
        Compress: z.boolean(),
        LambdaFunctionAssociations: this.lambdaFunctionAssociationsSchema,
        FunctionAssociations: this.functionAssociationsSchema,
        FieldLevelEncryptionId: this.stringSchema,
        RealtimeLogConfigArn: this.stringSchema,
        CachePolicyId: this.stringSchema,
        OriginRequestPolicyId: this.stringSchema,
        ResponseHeadersPolicyId: this.stringSchema,
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
        ResponsePagePath: this.stringSchema,
        ResponseCode: this.stringSchema,
        ErrorCachingMinTTL: z.number()
      }))
    }),
    Comment: this.stringSchema,
    PriceClass: z.union([
      z.literal('PriceClass_100'),
      z.literal('PriceClass_200'),
      z.literal('PriceClass_All')
    ]),
    Enabled: z.boolean(),
    ViewerCertificate: z.object({
      CloudFrontDefaultCertificate: z.boolean(),
      IAMCertificateId: this.stringSchema.optional(),
      ACMCertificateArn: this.stringSchema,
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
        Items: z.array(this.stringSchema).optional()
      })
    }),
    WebACLId: z.string().min(0).max(500),
    HttpVersion: z.union([
      z.literal('HTTP1.1'),
      z.literal('HTTP2')
    ]),
    IsIPV6Enabled: z.boolean(),
    AliasICPRecordals: z.array(z.object({
      CNAME: this.stringSchema,
      ICPRecordalStatus: z.union([
        z.literal('APPROVED'),
        z.literal('PENDING'),
        z.literal('SUSPENDED')
      ])
    }))
  }).deepPartial().extend({
    Id: this.stringSchema
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
      const distributions = await this.collectionSchema.parseAsync(result.DistributionList?.Items)
      for (const distribution of distributions) {
        await writeFile(`.cfs/distributions/${encodeURIComponent(distribution.Id)}`, JSON.stringify(distribution, null, 2))
      }
    }
  }

}

export default new Distributions()
