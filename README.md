# decentraland-auth

JavaScript client for the auth-service

## Usage

Create an `Auth` instance, login and then get access tokens whenever you need them

```ts
import { Auth } from 'decentraland-auth'

const auth = new Auth()
await auth.login()

const accessToken = await auth.getToken()
```

The `login()` method already resolves to a valid `accessToken` in case you want to use it right away

```ts
import { Auth } from 'decentraland-auth'

const auth = new Auth()
const accessToken = await auth.login()
```
