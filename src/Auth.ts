import * as jwt from 'jsonwebtoken'
import { BasicEphemeralKey, MessageInput } from 'decentraland-auth-protocol'

import { Login } from './Login'
import { API, APIOptions } from './API'

type AuthOptions = {
  ephemeralKeyTTL: number
  api?: APIOptions
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

  async login(target?: HTMLElement) {
    if (!this.isLoggedIn()) {
      const [userToken] = await Promise.all([
        target
          ? this.loginManager.fromIFrame(target)
          : this.loginManager.fromPopup(),
        this.getServerPublicKey()
      ])
      this.userToken = userToken
      localStorage.setItem(LOCAL_STORAGE_KEY, this.userToken)
    }
    await this.getToken()
  }

  isLoggedIn() {
    return this.userToken !== null
  }

  async logout() {
    await this.loginManager.logout()

    // remove from local storage
    localStorage.removeItem(LOCAL_STORAGE_KEY)

    // remove from instance
    this.userToken = null
    this.accessToken = null
  }

  async getUserToken() {
    if (!this.isLoggedIn()) {
      await this.login()
    }
    return this.userToken!
  }

  getUserKey() {
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
  async getPayload() {
    if (!this.isLoggedIn()) {
      await this.login()
    }

    const payload = jwt.decode(this.accessToken!)
    return payload
  }

  async getToken() {
    if (this.accessToken) {
      try {
        const publicKey = await this.getServerPublicKey()
        jwt.verify(this.accessToken, publicKey)
        return this.accessToken
      } catch (e) {
        // invalid token, generate a new one
      }
    }
    const accessToken = await this.generateAccessToken()
    this.accessToken = accessToken
    return accessToken
  }

  async getHeaders(url: string, options: RequestInit = {}) {
    if (!this.isLoggedIn()) {
      await this.login()
    }

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
    const accessToken = await this.getToken()

    // add required headers
    const requiredHeaders = this.getUserKey().makeMessageCredentials(
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
    const accessToken = await this.getToken()

    const credentials = this.getUserKey().makeMessageCredentials(input, accessToken)

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
    return this.getUserKey().key.publicKeyAsHexString()
  }

  private async getServerPublicKey() {
    if (this.serverPublicKey) {
      return this.serverPublicKey
    }
    const serverPublicKey = await this.api.pubKey()
    this.serverPublicKey = serverPublicKey
    return serverPublicKey
  }

  private async generateAccessToken(): Promise<string> {
    const userToken = await this.getUserToken()
    const pubKey = this.getPublicKey()
    try {
      const { token } = await this.api.token({
        userToken,
        pubKey
      })
      return token
    } catch (e) {
      console.error(e.message)
      await this.logout()
      await this.login()
      return this.generateAccessToken()
    }
  }
}
