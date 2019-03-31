import { Auth } from '../src'

const auth = new Auth()

// @ts-ignore
window.login = async function login(target) {
  const accessToken = await auth.login(target)
  print(`Access Token: ${accessToken}`)
}

// @ts-ignore
window.logout = async function logout() {
  await auth.logout()
  print(`Access Token:`)
}

function print(text: string) {
  const node = document.getElementById('output')
  if (node) {
    node.innerHTML = text
  }
}
