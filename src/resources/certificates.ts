import { z } from 'zod'
import { ACM, paginateListCertificates } from '@aws-sdk/client-acm'
import { ensureDir, remove, writeFile } from 'fs-extra'

import Regions from './regions'
import { addError } from '../errors'

export class Certificates {

  stringSchema = z.string().min(1).max(500)

  itemSchema = z.object({
    CertificateArn: this.stringSchema,
    DomainName: this.stringSchema
  })

  collectionSchema = z.array(this.itemSchema).min(0).max(10000)

  async listCertificates (params: { region: string }) {
    const acm = new ACM({ region: params.region })
    return paginateListCertificates({ client: acm }, {})
  }

  async list () {
    const regions = await Regions.list()
    return Promise.all(regions.map(async region => {
      return {
        region,
        certificates: await this.listCertificates({ region: region.RegionName })
      }
    }))
  }

  async clear () {
    await remove('.cfs/certificates/')
  }

  async write () {
    await this.clear()
    const certificates = await this.list()
    await ensureDir('.cfs/certificates/')
    await Promise.all(certificates.map(async entry => {
      for await (const result of entry.certificates) {
        const certificates = await this.collectionSchema.parseAsync(result.CertificateSummaryList)
        if (certificates.length > 0) {
          await ensureDir(`.cfs/certificates/${encodeURIComponent(entry.region.RegionName)}/`)
        }
        for (const certificate of certificates) {
          await writeFile(`.cfs/certificates/${encodeURIComponent(entry.region.RegionName)}/${encodeURIComponent(certificate.CertificateArn.substring(certificate.CertificateArn.indexOf(':certificate/') + ':certificate/'.length))}`, JSON.stringify(certificate, null, 2))
        }
      }
    }).map(promise => promise.catch(addError)))
  }

}

export default new Certificates()
