import * as jwt from 'jsonwebtoken'
import { BasicEphemeralKey, MessageInput } from 'decentraland-auth-protocol'

import { Login } from './Login'
import { API, APIOptions } from './API'

type AuthOptions = {
  ephemeralKeyTTL: number
  api?: APIOptions
}

type AccessToken = {
  ephemeral_key: string
  exp: number
  user_id: string
  version: string
}

const LOCAL_STORAGE_KEY = 'decentraland-auth-user-token'

export class Auth {
  static defaultOptions: AuthOptions = {
    ephemeralKeyTTL: 60 * 60 * 2 // TTL for the ephemeral key
  }

  private options: AuthOptions
  private api: API
  private userToken: string | null = null
  private accessToken: string | null = null
  private serverPublicKey: string | null = null
  private ephemeralKey: BasicEphemeralKey | null = null
  private loginManager: Login

  constructor(options: Partial<AuthOptions> = {}) {
    this.options = {
      ...Auth.defaultOptions,
      ...options
    }
    this.api = new API(this.options.api)
    this.loginManager = new Login(this.api)
    this.userToken = localStorage.getItem(LOCAL_STORAGE_KEY) || null
  }

  // returns a user token
  async login(target?: HTMLElement): Promise<string> {
    if (this.userToken === null) {
      const [userToken] = await Promise.all([
        target
              ? this.loginManager.fromIFrame(target)
              : this.loginManager.fromPopup(),
        this.getServerPublicKey()
      ])
      this.userToken = userToken
      localStorage.setItem(LOCAL_STORAGE_KEY, this.userToken)
      return this.userToken
    }
    return this.userToken
  }

  async logout() {
    await this.loginManager.logout()

    // remove from local storage
    localStorage.removeItem(LOCAL_STORAGE_KEY)

    // remove from instance
    this.userToken = null
    this.accessToken = null
  }

  getEphemeralKey() {
    if (!this.ephemeralKey || this.ephemeralKey.hasExpired()) {
      this.ephemeralKey = BasicEphemeralKey.generateNewKey(
        this.options.ephemeralKeyTTL
      )
    }
    return this.ephemeralKey
  }

  /**
   * Returns the user data of the JWT decoded payload
   */
  async getAccessTokenData() {
    return jwt.decode(await this.getAccessToken()) as AccessToken
  }

  async getAccessToken(): Promise<string> {
    if (this.accessToken) {
      try {
        const publicKey = await this.getServerPublicKey()
        jwt.verify(this.accessToken, publicKey)
        const tokenData = jwt.decode(this.accessToken) as AccessToken
        if (tokenData.ephemeral_key === this.getPublicKey()) {
          return this.accessToken
        } else {
          console.log(`TOKENS DO NOT MATCH: token: ${tokenData.ephemeral_key}  currentKey: ${this.getPublicKey()}`)
        }
      } catch (e) {
          // invalid token, generate a new one
      }
    }
    const userToken = await this.login()

    const pubKey = this.getPublicKey()
    try {
      const { token } = await this.api.token({
        userToken,
        pubKey
      })
      this.accessToken = token
      return token
    } catch (e) {
      console.error(e.message)
      await this.logout()
      throw e
    }
  }

  async getHeaders(url: string, options: RequestInit = {}) {
    await this.login()

    let method = 'GET'
    let body: any = null
    let headers: Record<string, string> = {}

    if (options.method) {
      method = options.method.toUpperCase()
    }

    if (options.body) {
      body = Buffer.from(options.body as string)
    }

    const input = MessageInput.fromHttpRequest(method, url, body)
    const accessToken = await this.getAccessToken()

    // add required headers
    const requiredHeaders = this.getEphemeralKey().makeMessageCredentials(
      input,
      accessToken
    )
    for (const [key, value] of requiredHeaders.entries()) {
      headers[key] = value
    }

    // add optional headers
    if (options && options.headers) {
      const optionalHeaders = options.headers as Record<string, string>
      headers = {
        ...headers,
        ...optionalHeaders
      }
    }

    return headers
  }

  async getRequest(url: string, options: RequestInit = {}) {
    let headers = await this.getHeaders(url, options)
    if (options.headers) {
      headers = { ...(options.headers as Record<string, string>), ...headers }
    }

    const request = new Request(url, {
      ...options,
      headers
    })

    return request
  }

  async getMessageCredentials(message: string | null) {
    const msg = message === null ? null : Buffer.from(message)
    const input = MessageInput.fromMessage(msg)
    const accessToken = await this.getAccessToken()

    const credentials = this.getEphemeralKey().makeMessageCredentials(input, accessToken)

    let result: Record<string, string> = {}

    for (const [key, value] of credentials.entries()) {
      result[key] = value
    }

    return result
  }

  dispose() {
    this.loginManager.dispose()
  }

  private getPublicKey() {
    return this.getEphemeralKey().key.publicKeyAsHexString()
  }

  private async getServerPublicKey() {
    if (this.serverPublicKey) {
      return this.serverPublicKey
    }
    const serverPublicKey = await this.api.pubKey()
    this.serverPublicKey = serverPublicKey
    return serverPublicKey
  }
}
