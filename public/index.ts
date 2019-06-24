import { Auth } from '../src'

const auth = new Auth()

// @ts-ignore
window.login = async function login(target) {
  try {
    await auth.login(target)
    const accessToken = await auth.getAccessToken()
    const payload = await auth.getAccessTokenData()
    print(
      `Access Token: ${accessToken}<br><br>Payload: ${JSON.stringify(payload)}`
    )
  } catch (e) {
    console.error(e.message)
  }
}

// @ts-ignore
window.logout = async function logout() {
  await auth.logout()
  print(`Access Token:<br><br>Payload:`)
}

function print(text: string) {
  const node = document.getElementById('output')
  if (node) {
    node.innerHTML = text
  }
}
