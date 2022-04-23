import express from 'express'
import open from 'open'

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
