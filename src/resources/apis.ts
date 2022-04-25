import { z } from 'zod'
import { APIGateway, paginateGetRestApis } from '@aws-sdk/client-api-gateway'
import { ApiGatewayV2 } from '@aws-sdk/client-apigatewayv2'
import { ensureDir, remove, writeFile } from 'fs-extra'

import Regions from './regions'
import { stringSchema } from '../services/schemas'
import { addError } from '../services/errors'

export class Apis {

  apiItemSchema = z.object({
    name: stringSchema,
    description: stringSchema,
    createdDate: z.date(),
    version: stringSchema,
    warnings: z.array(stringSchema),
    binaryMediaTypes: z.array(stringSchema),
    minimumCompressionSize: z.number(),
    apiKeySource: z.union([
      z.literal('AUTHORIZER'),
      z.literal('HEADER')
    ]),
    endpointConfiguration: z.object({
      types: z.array(z.union([
        z.literal('EDGE'),
        z.literal('PRIVATE'),
        z.literal('REGIONAL')
      ])),
      vpcEndpointIds: z.array(stringSchema)
    }),
    policy: stringSchema,
    tags: z.object({}).passthrough(),
    disableExecuteApiEndpoint: z.boolean()
  }).deepPartial().extend({
    id: stringSchema
  })

  apiv2ItemSchema = z.object({
    ApiEndpoint: stringSchema,
    ApiGatewayManaged: z.boolean().optional(),
    ApiKeySelectionExpression: stringSchema,
    CorsConfiguration: z.object({
      AllowCredentials: z.boolean(),
      AllowHeaders: z.array(stringSchema),
      AllowMethods: z.array(stringSchema),
      AllowOrigins: z.array(stringSchema),
      ExposeHeaders: z.array(stringSchema),
      MaxAge: z.number()
    }).optional(),
    CreatedDate: z.date(),
    Description: stringSchema.optional(),
    DisableSchemaValidation: z.boolean().optional(),
    DisableExecuteApiEndpoint: z.boolean(),
    ImportInfo: z.array(stringSchema).optional(),
    Name: stringSchema,
    ProtocolType: z.union([
      z.literal('HTTP'),
      z.literal('WEBSOCKET')
    ]),
    RouteSelectionExpression: stringSchema,
    Tags: z.object({}).passthrough(),
    Version: stringSchema.optional(),
    Warnings: z.array(stringSchema).optional()
  }).deepPartial().extend({
    ApiId: stringSchema
  })

  apiCollectionSchema = z.array(this.apiItemSchema).min(0).max(10000)
  
  apiv2CollectionSchema = z.array(this.apiv2ItemSchema).min(0).max(10000)

  async getRestApis (params: { region: string }) {
    const apigateway = new APIGateway({ region: params.region })
    return paginateGetRestApis({ client: apigateway }, {})
  }

  async getApis (params: { region: string }) {
    const apigatewayv2 = new ApiGatewayV2({ region: params.region })
    const paginateGetApis = async function* () {
      let response = await apigatewayv2.getApis({})
      yield response
      while (response.NextToken) {
        response = await apigatewayv2.getApis({ NextToken: response.NextToken })
        yield response
      }
    }
    return paginateGetApis()
  }

  async list () {
    const regions = await Regions.list()
    return Promise.all(regions.map(async region => {
      return {
        region,
        apis: await this.getRestApis({ region: region.RegionName }),
        apisv2: await this.getApis({ region: region.RegionName })
      }
    }))
  }

  async clear () {
    await remove('.cfs/apis/')
  }

  async write () {
    await this.clear()
    const apis = await this.list()
    await ensureDir('.cfs/apis/')
    await Promise.all(apis.map(async entry => {
      for await (const result of entry.apis) {
        const apis = await this.apiCollectionSchema.parseAsync(result.items)
        if (apis.length > 0) {
          await ensureDir(`.cfs/apis/rest/${encodeURIComponent(entry.region.RegionName)}/`)
        }
        for (const api of apis) {
          await writeFile(`.cfs/apis/rest/${encodeURIComponent(entry.region.RegionName)}/${encodeURIComponent(api.id)}`, JSON.stringify(api, null, 2))
        }
      }
      for await (const result of entry.apisv2) {
        const apis = await this.apiv2CollectionSchema.parseAsync(result.Items)
        if (apis.length > 0) {
          await ensureDir(`.cfs/apis/http/${encodeURIComponent(entry.region.RegionName)}/`)
        }
        for (const api of apis) {
          await writeFile(`.cfs/apis/http/${encodeURIComponent(entry.region.RegionName)}/${encodeURIComponent(api.ApiId)}`, JSON.stringify(api, null, 2))
        }
      }
    }).map(promise => promise.catch(addError)))
  }

}

export default new Apis()
