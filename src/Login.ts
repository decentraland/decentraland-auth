import { future, IFuture } from 'fp-future'

import { API } from './API'
import { USER_TOKEN_EVENT, LOGOUT_EVENT } from './Events'

export const IFRAME_STYLE_ID = 'decentraland-auth-iframe-style'
export const LOGIN_IFRAME_ID = 'decentraland-auth-login-iframe'
export const LOGOUT_IFRAME_ID = 'decentraland-auth-logout-iframe'

export const IFRAME_CSS = `#${LOGIN_IFRAME_ID} {
  width: 100%;
  height: 100%;
  border: none;
}
#${LOGOUT_IFRAME_ID} {
  width: 1px;
  height: 1px;
  border: none;
}
`

export enum LoginType {
  IFRAME = 'IFRAME',
  POPUP = 'POPUP'
}

type MessageData = {
  type: string
  token: string
  from: string
}

export class Login {
  api: API
  loginFuture: IFuture<string> = future()

  constructor(api: API = new API()) {
    this.api = api
    window.addEventListener('message', this.handleMessage)
  }

  async fromIFrame(target: HTMLElement) {
    this.injectStyles()
    const { loginURL } = await this.api.auth()
    const iframe = document.createElement('iframe')
    iframe.id = LOGIN_IFRAME_ID
    iframe.src = loginURL
    // remove everything inside the target
    while (target.firstChild) {
      target.removeChild(target.firstChild)
    }
    target.appendChild(iframe)
    iframe.addEventListener('load', () => {
      if (iframe.contentWindow) {
        this.rejectOnClose(iframe.contentWindow)
      }
    })

    return this.loginFuture
  }

  async fromPopup(title = 'Login', width = 400, height = 600) {
    const { loginURL } = await this.api.auth()

    // center popup on screen
    const dualScreenLeft =
      (window.screenLeft as any) !== undefined
        ? window.screenLeft
        : window.screenX
    const dualScreenTop =
      (window.screenTop as any) !== undefined
        ? window.screenTop
        : window.screenY

    const windowWidth = window.innerWidth
      ? window.innerWidth
      : document.documentElement.clientWidth
      ? document.documentElement.clientWidth
      : screen.width
    const windowHeight = window.innerHeight
      ? window.innerHeight
      : document.documentElement.clientHeight
      ? document.documentElement.clientHeight
      : screen.height

    const systemZoom = windowWidth / window.screen.availWidth
    const left = (windowWidth - width) / 2 / systemZoom + dualScreenLeft
    const top = (windowHeight - height) / 2 / systemZoom + dualScreenTop

    // open popup
    const newWindow = window.open(
      loginURL,
      title,
      `scrollbars=yes, width=${width / systemZoom}, height=${height /
        systemZoom}, top=${top}, left=${left}`
    )

    // puts focus on the newWindow
    if (newWindow && newWindow.focus) newWindow.focus()

    this.rejectOnClose(newWindow!)

    return this.loginFuture
  }

  async logout() {
    if (!document.getElementById(LOGOUT_IFRAME_ID)) {
      this.injectStyles()
      const { logoutURL } = await this.api.auth()
      const iframe = document.createElement('iframe')
      iframe.id = LOGOUT_IFRAME_ID
      iframe.src = logoutURL
      document.body.appendChild(iframe)
    }
  }

  dispose() {
    window.removeEventListener('message', this.handleMessage)
  }

  private injectStyles() {
    // inject css for iframe (only once)
    if (!document.getElementById(IFRAME_STYLE_ID)) {
      const style: HTMLStyleElement = document.createElement('style')
      style.id = IFRAME_STYLE_ID
      style.type = 'text/css'
      style.appendChild(document.createTextNode(IFRAME_CSS))
      document.head.appendChild(style)
    }
  }

  private handleMessage = async (event: MessageEvent) => {
    const data: MessageData = event.data
    if (!data) return
    switch (data.type) {
      case LOGOUT_EVENT: {
        const logoutIFrame = document.getElementById(LOGOUT_IFRAME_ID)
        if (logoutIFrame) {
          logoutIFrame.remove()
        }
        break
      }
      case USER_TOKEN_EVENT: {
        // resolve user token
        this.loginFuture.resolve(data.token)

        if (data.from === LoginType.POPUP) {
          // close popup
          const source = event.source as Window
          source.close()
        } else if (data.from === LoginType.IFRAME) {
          // remove iframe
          const loginIFrame = document.getElementById(LOGIN_IFRAME_ID)
          if (loginIFrame) {
            loginIFrame.remove()
          }
        }

        break
      }
    }
  }

  private rejectOnClose(win: Window) {
    let interval: number | null = window.setInterval(() => {
      if (win.closed) {
        this.loginFuture.reject(new Error('Login window closed'))
        this.loginFuture = future()
      }
    }, 250)

    function clear() {
      if (interval) {
        clearInterval(interval)
      }
      interval = null
    }

    this.loginFuture.then(clear).catch(clear)
  }
}
