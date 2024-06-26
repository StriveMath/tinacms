# tinacms-clerk

## 1.0.19

### Patch Changes

- Updated dependencies [863307612]
  - @strivemath/tinacms@1.5.43

## 1.0.18

### Patch Changes

- Updated dependencies [db2aa7c55]
  - @strivemath/tinacms@1.5.42

## 1.0.17

### Patch Changes

- Updated dependencies [29013888b]
  - @strivemath/tinacms@1.5.41

## 1.0.16

### Patch Changes

- @strivemath/tinacms@1.5.40

## 1.0.15

### Patch Changes

- @strivemath/tinacms@1.5.39

## 1.0.14

### Patch Changes

- Updated dependencies [a03edfab6]
  - @strivemath/tinacms@1.5.38

## 1.0.13

### Patch Changes

- Updated dependencies [68e7acf94]
  - @strivemath/tinacms@1.5.37

## 1.0.12

### Patch Changes

- Updated dependencies [8702fcc88]
  - @strivemath/tinacms@1.5.36

## 1.0.11

### Patch Changes

- b24af1f4f: bump all packages and republish everything
- Updated dependencies [b24af1f4f]
  - @strivemath/tinacms@1.5.35

## 1.0.10

### Patch Changes

- Updated dependencies [1c45c715c]
  - @strivemath/tinacms@1.5.34

## 1.0.9

### Patch Changes

- Updated dependencies [488b3dfe8]
  - @strivemath/tinacms@1.5.33

## 1.0.8

### Patch Changes

- Updated dependencies [b56a6cf9b]
  - @strivemath/tinacms@1.5.32

## 1.0.7

### Patch Changes

- Updated dependencies [d2c6a5d5e]
  - @strivemath/tinacms@1.5.31

## 1.0.6

### Patch Changes

- Updated dependencies [218194fe6]
  - @strivemath/tinacms@1.5.30

## 1.0.5

### Patch Changes

- b14f54ba0: Scope change ready to publish
- 485af8a0d: Change scope
- Updated dependencies [b14f54ba0]
- Updated dependencies [485af8a0d]
  - @strivemath/tinacms@1.5.29

## 1.0.4

### Patch Changes

- tinacms@1.5.28

## 1.0.3

### Patch Changes

- Updated dependencies [4202c1028]
- Updated dependencies [64f8fa038]
- Updated dependencies [548fe6d96]
- Updated dependencies [50b20f809]
  - tinacms@1.5.27

## 1.0.2

### Patch Changes

- Updated dependencies [9e1a22a53]
  - tinacms@1.5.26

## 1.0.1

### Patch Changes

- tinacms@1.5.25

## 1.0.0

### Major Changes

- a65ca13f2: ## TinaCMS Self hosted Updates

  ### Changes in the database file

  #### Deprecations and Additions

  - **Deprecated**: `onPut`, `onDelete`, and `level` arguments in `createDatabase`.
  - **Added**: `databaseAdapter` to replace `level`.
  - **Added**: `gitProvider` to substitute `onPut` and `onDelete`.
  - **New Package**: `tinacms-gitprovider-github`, exporting the `GitHubProvider` class.
  - **Interface Addition**: `gitProvider` added to `@strivemath/tinacms-graphql`.
  - **Addition**: Generated database client.

  #### Updated `database.ts` Example

  ```typescript
  import {
    createDatabase,
    createLocalDatabase,
  } from '@strivemath/tinacms-datalayer'
  import { MongodbLevel } from 'mongodb-level'
  import { GitHubProvider } from 'tinacms-gitprovider-github'

  const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === 'true'

  export default isLocal
    ? createLocalDatabase()
    : createDatabase({
        gitProvider: new GitHubProvider({
          branch: process.env.GITHUB_BRANCH,
          owner: process.env.GITHUB_OWNER,
          repo: process.env.GITHUB_REPO,
          token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
        }),
        databaseAdapter: new MongodbLevel<string, Record<string, any>>({
          collectionName: '@strivemath/tinacms',
          dbName: '@strivemath/tinacms',
          mongoUri: process.env.MONGODB_URI,
        }),
        namespace: process.env.GITHUB_BRANCH,
      })
  ```

  ### Migrating `database.ts`

  #### a. Replacing `onPut` and `onDelete` with `gitProvider`

  - **GitHubProvider Usage**: Replace `onPut` and `onDelete` with `gitProvider`, using the provided `GitHubProvider` for GitHub.

  ```typescript
  const gitProvider = new GitHubProvider({
    branch: process.env.GITHUB_BRANCH,
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO,
    token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
  })
  ```

  - **Custom Git Provider**: Implement the `GitProvider` interface for different git providers.

  If you are not using Github as your git provider, you can implement the `GitProvider` interface to use your own git provider.

  ```typescript
  class CustomGitProvider implements GitProvider
      async onPut(key: string, value: string)
          // ...

      async onDelete(key: string)
          // ...


  const gitProvider = new CustomGitProvider();
  ```

  #### b. Renaming `level` to `databaseAdapter`

  - **Renaming in Code**: Change `level` to `databaseAdapter` for clarity.

  ```diff
  createDatabase({
  -    level: new MongodbLevel<string, Record<string, any>>(...),
  +    databaseAdapter: new MongodbLevel<string, Record<string, any>>(...),
  })
  ```

  #### c. `createLocalDatabase` Function

  - **Usage**: Implement a local database with the `createLocalDatabase` function.

  ```typescript
  import { createLocalDatabase } from '@strivemath/tinacms-datalayer'
  createLocalDatabase(port)
  ```

  #### d. Consolidated Example

  - **Updated `database.{ts,js}` File**:

  ```typescript
  import { createDatabase, createLocalDatabase, GitHubProvider } from '@strivemath/tinacms-datalayer';
  import { MongodbLevel } from 'mongodb-level';
  const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === 'true';
  export default isLocal
    ? createLocalDatabase()
    : createDatabase({
        gitProvider: new GitHubProvider(...),
        databaseAdapter: new MongodbLevel<string, Record<string, any>>(...),
      });
  ```

  ### Summary of Authentication Updates in Config

  #### a. AuthProvider and AbstractAuthProvider

  - **New**: `authProvider` in `defineConfig`.
  - **Class**: `AbstractAuthProvider` for extending new auth providers.
  - **Clerk Auth Provider**: New provider added.
  - **Renaming**: `admin.auth` to `admin.authHooks`.
  - **Deprecation**: `admin.auth`.

  #### b. Auth Provider in Internal Client and Config

  - **Transition**: From auth functions to `authProvider` class.

  #### c. Migration for Authentication

  - **Previous API**:

  ```javascript
  defineConfig({
    admin: {
      auth: {
        login() {},
        logout() {},
        //...
      },
    },
    //...
  })
  ```

  - **New API**:

  ```javascript
  import { AbstractAuthProvider } from '@strivemath/tinacms'
  class CustomAuthProvider extends AbstractAuthProvider {
    login() {}
    logout() {}
    //...
  }
  defineConfig({
    authProvider: new CustomAuthProvider(),
    //...
  })
  ```

  ### TinaCMS Self Hosted backend updates

  - **New:** TinaNodeBackend is exported from `@strivemath/tinacms-datalayer`. This is used to host the TinaCMS backend in a single function.
  - **New:** `LocalBackendAuthProvider` is exported from `@strivemath/tinacms-datalayer`. This is used to host the TinaCMS backend locally.

  - **New:** `AuthJsBackendAuthProvider` is exported from `tinacms-authjs`. This is used to host the TinaCMS backend with AuthJS.

  ### Migrating the TinaCMS backend

  Now, instead of hosting the in /tina/api/gql.ts file, the entire TinaCMS backend (including auth) will be hosted in a single backend function.

  `/api/tina/[...routes].{ts,js}`

  ```typescript
  import {
    TinaNodeBackend,
    LocalBackendAuthProvider,
  } from '@strivemath/tinacms-datalayer'

  import { TinaAuthJSOptions, AuthJsBackendAuthProvider } from 'tinacms-authjs'

  import databaseClient from '../../../tina/__generated__/databaseClient'

  const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === 'true'

  const handler = TinaNodeBackend({
    authProvider: isLocal
      ? LocalBackendAuthProvider()
      : AuthJsBackendAuthProvider({
          authOptions: TinaAuthJSOptions({
            databaseClient: databaseClient,
            secret: process.env.NEXTAUTH_SECRET,
          }),
        }),
    databaseClient,
  })

  export default (req, res) => {
    // Modify the request here if you need to
    return handler(req, res)
  }
  ```

  These changes are put in place to make self hosted TinaCMS easier to use and more flexible.

  Please [check out the docs](https://tina.io/docs/self-hosted/overview) for more information on self hosted TinaCMS.

### Patch Changes

- Updated dependencies [a65ca13f2]
  - tinacms@1.5.24
