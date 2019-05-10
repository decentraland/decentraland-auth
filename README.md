# decentraland-auth

JavaScript client for the auth-service

## Installation

```
$ npm i decentraland-auth
```

## Usage

Create an `Auth` instance, login and then get access tokens whenever you need them

```ts
import { Auth } from 'decentraland-auth'

const auth = new Auth()
await auth.login() // prompts the user to login

const accessToken = await auth.getToken() // returns a valid access token
const userKey = auth.getUserKey() // returns the key used to get the token
```

#### Send signed request

With the `accessToken` and the `userKey` you should be able to send a signed request to the service provider you are trying to reach.

```ts
const AuthModule =  require('decentraland-auth-protocol')
const Buffer = require('buffer/').Buffer //To use buffer from the browser

let accessToken = await auth.getToken()
const userKey = auth.getUserKey()
const fullURL = 'https://theService.com/path/param/?query=something'

// GET request example
const input = AuthModule.MessageInput.fromHttpRequest("GET", fullURL, null)
  
let requestMandatoryHeaders = userKey.makeMessageCredentials(input, accessToken)

const response = await fetch(fullURL, {
    method: 'get',
    headers: requestMandatoryHeaders
  })

// POST request example
accessToken = await auth.getToken()
const body = Buffer.from(
    JSON.stringify({ param1: 'data1', param2: 'data2' }),
    'utf8'
)

const inputPost = AuthModule.MessageInput.fromHttpRequest("POST", fullURL, body)
  
requestMandatoryHeaders = userKey.makeMessageCredentials(inputPost, accessToken)

let response = await fetch(fullURL, {
    method: 'post',
    headers: requestMandatoryHeaders,
    body
  })
```
* [Buffer Library](https://github.com/feross/buffer)

## API

- `new Auth([options])`: Returns a new instance of `Auth`. It takes an optional `options` objects that can contain the following properties:

  - `keepAlive`: If `true`, the instance will keep renewing the access tokens in the background to minimize the time to return a token when using the `getToken()` method. Default value is `true`.

  - `renewalOffset`: If `keepAlive` is `true`, this property sets how many milliseconds prior to its expiration a token should be renewed. Default value is `2000`.

  - `ephemeralKeyTTL`: Time to live for the ephemeral key (in seconds). Default value is `60 * 60 * 2` (2 hours).

  - `api`: An object with options for the underlying `API` instance:

    - `baseURL`: The base url of the `auth-service`. Default value is `https://auth.decentraland.zone/api/v1`.

    - `loginCallback`: The login callback url. It defaults to `/callback`.

    - `logoutCallback`: The logout callback url. It defaults to `/`.

- `auth.login([target])`: Returns a promise that will resolve once the user is logged in. The first time it's called it will prompt the user to login though a Popup. If a `target` dom node is provided, instead of a Popup it will insert an iframe inside the target node and use that. If the user closes the Popup the promise will reject. If the user session is still active this method might resolve without having to open a popup.

- `auth.getToken()`: It returns an access token. This access token has a short life so it is recommended to get a new token every time you need to use is instead of storing it.

- `auth.logout()`: It returns a promise that resolves once the user is logged out. After using this, the next time the `login()` method is called it will prompt the user with the login flow.

- `auth.isLoggedIn()`: Returns a boolean telling wheter the user is logged in or not.

- `auth.getUserToken()`: It returns a promise that resolves to the `userToken`. This token is the one used to generate the `accessToken`(s).

- `auth.dispose()`: It removes all the bindings and on this instance. It does NOT perform a logout.
