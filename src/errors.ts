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
