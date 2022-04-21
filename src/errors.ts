import { serializeError } from 'serialize-error'

export { ZodError } from 'zod'

export class CliUserError extends Error {
  constructor(message: string) {
    super(message)
  }
}

const errors: Array<unknown> = []
export function addError (error: unknown) {
  errors.push(error)
}
export function getErrors () {
  return errors
}
export function getSerializedErrors () {
  return errors.map(error => serializeError(error))
}
