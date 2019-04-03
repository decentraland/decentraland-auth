export type APIOptions = {
  baseURL?: string
  loginCallback?: string
  logoutCallback?: string
}

export class API {
  static defaultOptions: APIOptions = {
    baseURL: 'https://auth.decentraland.zone/api/v1',
    loginCallback: '/callback',
    logoutCallback: '/'
  }

  options: APIOptions

  constructor(options: Partial<APIOptions> = {}) {
    this.options = {
      ...API.defaultOptions,
      ...options
    }
  }

  getPath(path: string) {
    return this.options.baseURL + path
  }

  async auth() {
    const path = this.getPath('/auth')
    const body = JSON.stringify({
      domain: location.origin,
      login_callback: this.options.loginCallback,
      logout_callback: this.options.logoutCallback
    })
    const response = await fetch(path, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body
    })
    const json = await response.json()
    return {
      loginURL: json.login_url as string,
      logoutURL: json.logout_url as string
    }
  }

  async token(args: { userToken: string; pubKey: string }) {
    const { userToken, pubKey } = args
    const path = this.getPath('/token')
    const body = JSON.stringify({
      user_token: userToken,
      pub_key: pubKey
    })
    const response = await fetch(path, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body
    })
    const json = await response.json()

    if (!response.ok || json.error) {
      throw new Error(json.error)
    }

    return {
      token: json.access_token as string
    }
  }

  async pubKey() {
    const path = this.getPath('/public_key')
    const response = await fetch(path)
    const pubKey = await response.text()
    return pubKey
  }
}
