import { spawn } from 'child_process'
import { join } from 'path'
import { pathExists, readFile, remove, ensureDir, writeFile } from 'fs-extra'
import YAML from 'yaml'
import { z } from 'zod'

import { CliPluginError } from './errors'

const pluginSchema = z.union([
  z.object({
    type: z.literal('inline'),
    run: z.string().min(1)
  }),
  z.object({
    type: z.literal('object'),
    run: z.string().min(1),
    description: z.string().optional(),
    disabled: z.boolean().optional()
  })
])

export async function startPlugins () {
  if (['1', 'true'].includes(process.env['CFS_DISABLE_PLUGINS'] || '')) return
  const json = '.cfs/plugins/plugins.json'
  const yaml = '.cfs/plugins/plugins.yaml'
  const yml = '.cfs/plugins/plugins.yml'
  if (await pathExists(json)) return await runPlugins(json)
  if (await pathExists(yaml)) return await runPlugins(yaml)
  if (await pathExists(yml)) return await runPlugins(yml)
}

async function runPlugins (pluginsFilePath: string) {
  const pluginsFile = await readFile(pluginsFilePath, 'utf-8')
  const { plugins, disabled } = pluginsFilePath.endsWith('json') ? JSON.parse(pluginsFile) : YAML.parse(pluginsFile)
  if (disabled) return
  if (!Array.isArray(plugins)) return
  await remove('.cfs/plugins/.run/')
  await ensureDir('.cfs/plugins/.run/')
  await writeFile('.cfs/plugins/.run/.gitignore', '*\n')
  for (let index = 0; index < plugins.length; index++) {
    const plugin = plugins[index]
    if (typeof plugin === 'object') await runPlugin({ ...plugin, type: 'object' }, index)
    else if (typeof plugin === 'string') await runPlugin({ type: 'inline', run: plugin }, index)
    else throw new CliPluginError('Invalid plugin file format')
  }
}

async function runPlugin (plugin: z.infer<typeof pluginSchema>, index: number) {
  const valid = await pluginSchema.parseAsync(plugin)
  if (valid.type === 'object' && valid.disabled) return
  const description = (valid.type === 'object') ? valid.description : undefined
  console.log(`Running plugin ... [${index}${description ? `: ${description}` : ''}]`)
  if (valid.run.endsWith('.js')) return await runJavascript(valid.run)
  if (valid.run.endsWith('.ts')) return await runTypescript(valid.run)
  return await runScript(valid.run, index)
}

async function runJavascript (run: z.infer<typeof pluginSchema>['run']) {
  await runSomething('node', [join('.cfs/plugins/', run)])
}

async function runTypescript (run: z.infer<typeof pluginSchema>['run']) {
  await runSomething('npx', ['ts-node', join('.cfs/plugins/', run)])
}

async function runScript (run: z.infer<typeof pluginSchema>['run'], index: number) {
  const scriptPath = `.cfs/plugins/.run/plugin-${index}.sh`
  await writeFile(scriptPath, run)
  await runSomething('sh', [scriptPath])
}

async function runSomething (command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    spawn(command, args, { stdio: 'inherit' }).on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new CliPluginError('The plugin failed.'))
    })
  })
}
