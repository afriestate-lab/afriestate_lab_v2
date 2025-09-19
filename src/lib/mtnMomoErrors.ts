// MTN MoMo API Error Codes and Messages
export const MTN_MOMO_ERRORS = {
  // Authentication Errors
  'AUTHENTICATION_FAILED': {
    code: 'AUTHENTICATION_FAILED',
    message: 'Ikosa mu kwemeza. Ongera ugerageze.',
    userMessage: 'Ikosa mu kwemeza. Ongera ugerageze.'
  },
  'INVALID_CREDENTIALS': {
    code: 'INVALID_CREDENTIALS',
    message: 'Amakuru y\'ikwemeza ntiyemewe.',
    userMessage: 'Amakuru y\'ikwemeza ntiyemewe.'
  },
  'TOKEN_EXPIRED': {
    code: 'TOKEN_EXPIRED',
    message: 'Ubwemeza bwarangiye. Ongera ugerageze.',
    userMessage: 'Ubwemeza bwarangiye. Ongera ugerageze.'
  },

  // Payment Errors
  'PAYMENT_FAILED': {
    code: 'PAYMENT_FAILED',
    message: 'Ubwishyu ntibwashoboye.',
    userMessage: 'Ubwishyu ntibwashoboye.'
  },
  'INSUFFICIENT_FUNDS': {
    code: 'INSUFFICIENT_FUNDS',
    message: 'Amafaranga atariho mu konte yawe.',
    userMessage: 'Amafaranga atariho mu konte yawe. Ongera ugerageze nyuma yo kwongeramo amafaranga.'
  },
  'INVALID_PHONE_NUMBER': {
    code: 'INVALID_PHONE_NUMBER',
    message: 'Nimero ya telefoni ntiyemewe.',
    userMessage: 'Nimero ya telefoni ntiyemewe. Hitamo nimero ya MTN yemewe.'
  },
  'PAYMENT_CANCELLED': {
    code: 'PAYMENT_CANCELLED',
    message: 'Ubwishyu wahagaritse.',
    userMessage: 'Ubwishyu wahagaritse.'
  },
  'PAYMENT_TIMEOUT': {
    code: 'PAYMENT_TIMEOUT',
    message: 'Ubwishyu ntibwemezwe mu gihe cyagenewe.',
    userMessage: 'Ubwishyu ntibwemezwe mu gihe cyagenewe. Ongera ugerageze.'
  },
  'DUPLICATE_TRANSACTION': {
    code: 'DUPLICATE_TRANSACTION',
    message: 'Ubwishyu bwo kwongera.',
    userMessage: 'Ubwishyu bwo kwongera. Ongera ugerageze nyuma gato.'
  },

  // Network Errors
  'NETWORK_ERROR': {
    code: 'NETWORK_ERROR',
    message: 'Ikosa mu murongo wa interineti.',
    userMessage: 'Ikosa mu murongo wa interineti. Ongera ugerageze.'
  },
  'TIMEOUT': {
    code: 'TIMEOUT',
    message: 'Ubwishyu ntibwemezwe mu gihe cyagenewe.',
    userMessage: 'Ubwishyu ntibwemezwe mu gihe cyagenewe. Ongera ugerageze.'
  },
  'SERVICE_UNAVAILABLE': {
    code: 'SERVICE_UNAVAILABLE',
    message: 'Serivisi ya MTN MoMo ntishoboka.',
    userMessage: 'Serivisi ya MTN MoMo ntishoboka. Ongera ugerageze nyuma gato.'
  },

  // Configuration Errors
  'CONFIGURATION_ERROR': {
    code: 'CONFIGURATION_ERROR',
    message: 'Ikosa mu gutegura serivisi.',
    userMessage: 'Ikosa mu gutegura serivisi. Koresha uburyo bwo kwishyura buhagije.'
  },
  'MISSING_CONFIG': {
    code: 'MISSING_CONFIG',
    message: 'Amakuru y\'ikwemeza atariho.',
    userMessage: 'Amakuru y\'ikwemeza atariho. Koresha uburyo bwo kwishyura buhagije.'
  },

  // API User Errors
  'API_USER_CREATION_FAILED': {
    code: 'API_USER_CREATION_FAILED',
    message: 'Gukora umukoresha wa API ntibwashoboye.',
    userMessage: 'Gukora umukoresha wa API ntibwashoboye. Ongera ugerageze.'
  },
  'API_KEY_CREATION_FAILED': {
    code: 'API_KEY_CREATION_FAILED',
    message: 'Gukora urufunguzo rwa API ntibwashoboye.',
    userMessage: 'Gukora urufunguzo rwa API ntibwashoboye. Ongera ugerageze.'
  },
  'API_USER_FETCH_FAILED': {
    code: 'API_USER_FETCH_FAILED',
    message: 'Gusuzuma umukoresha wa API ntibwashoboye.',
    userMessage: 'Gusuzuma umukoresha wa API ntibwashoboye. Ongera ugerageze.'
  },

  // Generic Errors
  'UNKNOWN_ERROR': {
    code: 'UNKNOWN_ERROR',
    message: 'Ikosa ridasobanuye.',
    userMessage: 'Ikosa ridasobanuye. Ongera ugerageze.'
  },
  'VALIDATION_ERROR': {
    code: 'VALIDATION_ERROR',
    message: 'Amakuru atariho cyangwa atariho.',
    userMessage: 'Amakuru atariho cyangwa atariho. Ongera ugerageze.'
  }
} as const

export type MTNMoMoErrorCode = keyof typeof MTN_MOMO_ERRORS

export interface MTNMoMoErrorResponse {
  code: string
  message: string
  details?: any
  statusCode?: number
}

export class MTNMoMoError extends Error {
  public code: string
  public userMessage: string
  public details?: any
  public statusCode?: number

  constructor(errorResponse: MTNMoMoErrorResponse) {
    const errorInfo = MTN_MOMO_ERRORS[errorResponse.code as MTNMoMoErrorCode] || MTN_MOMO_ERRORS.UNKNOWN_ERROR
    
    super(errorInfo.message)
    this.name = 'MTNMoMoError'
    this.code = errorResponse.code
    this.userMessage = errorInfo.userMessage
    this.details = errorResponse.details
    this.statusCode = errorResponse.statusCode
  }
}

export function parseMTNMoMoError(error: any): MTNMoMoError {
  // Handle different error formats
  if (error instanceof MTNMoMoError) {
    return error
  }

  // Handle HTTP errors
  if (error.status || error.statusCode) {
    const statusCode = error.status || error.statusCode
    
    switch (statusCode) {
      case 400:
        return new MTNMoMoError({
          code: 'VALIDATION_ERROR',
          message: error.message || 'Bad Request',
          statusCode
        })
      case 401:
        return new MTNMoMoError({
          code: 'AUTHENTICATION_FAILED',
          message: error.message || 'Unauthorized',
          statusCode
        })
      case 403:
        return new MTNMoMoError({
          code: 'INVALID_CREDENTIALS',
          message: error.message || 'Forbidden',
          statusCode
        })
      case 404:
        return new MTNMoMoError({
          code: 'SERVICE_UNAVAILABLE',
          message: error.message || 'Service Not Found',
          statusCode
        })
      case 408:
        return new MTNMoMoError({
          code: 'TIMEOUT',
          message: error.message || 'Request Timeout',
          statusCode
        })
      case 500:
        return new MTNMoMoError({
          code: 'SERVICE_UNAVAILABLE',
          message: error.message || 'Internal Server Error',
          statusCode
        })
      case 502:
      case 503:
      case 504:
        return new MTNMoMoError({
          code: 'SERVICE_UNAVAILABLE',
          message: error.message || 'Service Unavailable',
          statusCode
        })
      default:
        return new MTNMoMoError({
          code: 'UNKNOWN_ERROR',
          message: error.message || 'Unknown Error',
          statusCode
        })
    }
  }

  // Handle network errors
  if (error.message && error.message.includes('Network')) {
    return new MTNMoMoError({
      code: 'NETWORK_ERROR',
      message: error.message
    })
  }

  // Handle timeout errors
  if (error.message && (error.message.includes('timeout') || error.message.includes('Timeout'))) {
    return new MTNMoMoError({
      code: 'TIMEOUT',
      message: error.message
    })
  }

  // Handle configuration errors
  if (error.message && error.message.includes('not configured')) {
    return new MTNMoMoError({
      code: 'CONFIGURATION_ERROR',
      message: error.message
    })
  }

  // Default to unknown error
  return new MTNMoMoError({
    code: 'UNKNOWN_ERROR',
    message: error.message || 'Unknown error occurred'
  })
}

export function getMTNMoMoErrorMessage(error: any): string {
  try {
    const mtnError = parseMTNMoMoError(error)
    return mtnError.userMessage
  } catch {
    return 'Habaye ikosa mu gukora ubwishyu. Ongera ugerageze.'
  }
}

export function isRetryableError(error: any): boolean {
  const retryableCodes = [
    'NETWORK_ERROR',
    'TIMEOUT',
    'SERVICE_UNAVAILABLE',
    'AUTHENTICATION_FAILED',
    'TOKEN_EXPIRED'
  ]
  
  try {
    const mtnError = parseMTNMoMoError(error)
    return retryableCodes.includes(mtnError.code as MTNMoMoErrorCode)
  } catch {
    return false
  }
}
