import { serializeError } from 'serialize-error'
import { ZodError } from 'zod'

export class CliUserError extends Error {
  constructor(message: string) {
    super(message)
  }
}

export class CliPluginError extends Error {
  constructor(message: string) {
    super(message)
  }
}

const errors: Array<unknown> = []
export function addError (error: unknown) {
  errors.push(error)
}
const insufficientPermissionsGenericExpression = /^(User: arn:aws:).+( is not authorized to perform: ).+( on resource: ).+( deny)/
type ErrorType = 'NoInternetAccess' | 'AuthenticationMissing' | 'AuthenticationExpired' | 'AuthenticationInvalid' | 'InsufficientPermissions' | 'SchemaValidationFailed' | 'Unknown'
function getErrorType (error: any): ErrorType {
  const httpStatusCode = typeof error.$metadata === 'object' ? error.$metadata.httpStatusCode : undefined
  if (error.code === 'EAI_AGAIN' && error.syscall === 'getaddrinfo') return 'NoInternetAccess'
  if (error.name = 'CredentialsProviderError' && error.message === 'Could not load credentials from any providers') return 'AuthenticationMissing'
  if (error.Code === 'RequestExpired' || error.Code === 'ExpiredToken') return 'AuthenticationExpired'
  if (error.Code === 'AuthFailure' && error.message === 'AWS was not able to validate the provided access credentials' && httpStatusCode === 401) return 'AuthenticationInvalid'
  if (error.Code === 'InvalidAccessKeyId' && error.message === 'The AWS Access Key Id you provided does not exist in our records.' && httpStatusCode === 403) return 'AuthenticationInvalid'
  if (error.Code === 'InvalidClientTokenId' && error.message === 'The security token included in the request is invalid.' && httpStatusCode === 403) return 'AuthenticationInvalid'
  if (error.Code === 'AccessDenied' && httpStatusCode === 403) return 'InsufficientPermissions'
  if (error.Code === 'AuthorizationError' && httpStatusCode === 403) return 'InsufficientPermissions'
  if (error.Code = 'UnauthorizedOperation' && httpStatusCode === 403) return 'InsufficientPermissions'
  if (error.__type === 'AccessDeniedException' && httpStatusCode === 400) return 'InsufficientPermissions'
  if (insufficientPermissionsGenericExpression.test(error.message) && (httpStatusCode === 400 || httpStatusCode === 403)) return 'InsufficientPermissions'
  if (error instanceof ZodError) return 'SchemaValidationFailed'
  return 'Unknown'
}
export function getFormattedErrors () {
  const categories: { [K in ErrorType]: number } = {
    'NoInternetAccess': 0,
    'AuthenticationMissing': 0,
    'AuthenticationExpired': 0,
    'AuthenticationInvalid': 0,
    'InsufficientPermissions': 0,
    'SchemaValidationFailed': 0,
    'Unknown': 0
  }
  const formattedErrors = errors.map((error: any) => {
    const type = getErrorType(error)
    categories[type]++
    if (type === 'AuthenticationExpired' && error['Token-0']) delete error['Token-0']
    if (type === 'AuthenticationInvalid' && error['AWSAccessKeyId']) delete error['AWSAccessKeyId']
    return {
      type,
      error: serializeError(error)
    }
  })
  return {
    count: formattedErrors.length,
    categories,
    errors: formattedErrors
  }
}
