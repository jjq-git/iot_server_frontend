export class AppStartupError extends Error {
  constructor (code, message, cause = null) {
    super(message || code)
    this.name = 'AppStartupError'
    this.code = code
    this.cause = cause
  }
}

export function asStartupError (error) {
  if (error instanceof AppStartupError) return error
  return new AppStartupError('E_DEMO_CONFIG_LOAD', error?.message || 'Application startup failed', error)
}
