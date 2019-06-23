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
const userToken = await auth.login() // prompts the user to login

const accessToken = await auth.getAccessToken() // returns a valid access token
const { user_id } = await auth.getAccessTokenData() // returns access token payload data
```

#### Send signed request

```ts
const auth = new Auth()
await auth.login()

// GET
const request = await auth.createRequest(
  'some-service.decentraland.org/path?query=param'
)
const response = await fetch(request)

// POST
const request = await auth.createRequest(
  'some-service.decentraland.org/do-something',
  {
    method: 'post',
    headers: {
      'Some-Header': 'bla bla'
    },
    body: JSON.stringify({ param: 'asdf' })
  }
)
const response = await fetch(request)
```
#### Generate credentials for message

```ts
const auth = new Auth()
const userToken = await auth.login()

const msg  = "hi there!" // it could also be a null

const credentials = await auth.getMessageCredentials(msg)
```

This library makes use of `Buffer`, which is not present natively in the browser. There's a polyfill that is included by default by some bundlers (like webpack), but if you don't have it make sure to add it to your project: [Buffer](https://github.com/feross/buffer).

## API

- `new Auth([options])`: Returns a new instance of `Auth`. It takes an optional `options` objects that can contain the following properties:

  - `ephemeralKeyTTL`: Time to live for the ephemeral key (in seconds). Default value is `60 * 60 * 2` (2 hours).

  - `api`: An object with options for the underlying `API` instance:

    - `baseURL`: The base url of the `auth-service`. Default value is `https://auth.decentraland.zone/api/v1`.

    - `loginCallback`: The login callback url. It defaults to `/callback`.

    - `logoutCallback`: The logout callback url. It defaults to `/`.

- `auth.login([target])`: Returns a promise that will resolve once the user is logged in. The first time it's called it will prompt the user to login though a Popup. If a `target` dom node is provided, instead of a Popup it will insert an iframe inside the target node and use that. If the user closes the Popup the promise will reject. If the user session is still active this method might resolve without having to open a popup.

- `auth.isLoggedIn()`: Returns a boolean telling wheter the user is logged in or not.

- `auth.getAccessToken()`: It returns a promise that resolves to an access token. This access token has a short life so it is recommended to get a new token every time you need to use is instead of storing it.

- `auth.getAccessTokenData()`: It returns a promise that resolves to the payload of the access token (basically the decoded JWT).

- `auth.logout()`: It returns a promise that resolves once the user is logged out. After using this, the next time the `login()` method is called it will prompt the user with the login flow.

- `auth.getUserToken()`: It returns a promise that resolves to the `userToken`. This token is the one used to generate the `accessToken`(s).

- `auth.createRequest(url, options?)`: It returns a promise that resolves to a `Request` object that can be used with `fetch`. It takes a URL and the same options as `fetch`.

- `auth.getHeaders(url, options?)`: It returns a promise that resolves to an object containing the mandatory headers to be used in a signed request. It takes a URL and the same options as `fetch`.

- `auth.getUserKey()`: Returns the instance of the ephemeral key.

- `auth.dispose()`: It removes all the bindings on this instance. It does NOT perform a logout.
