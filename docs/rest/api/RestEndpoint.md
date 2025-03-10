---
title: RestEndpoint
---

<head>
  <title>RestEndpoint - Strongly typed path-based API definitions</title>
</head>

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

`RestEndpoints` are for [HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP) based protocols like REST.

<Tabs
defaultValue="RestEndpoint"
values={[
{ label: 'RestEndpoint', value: 'RestEndpoint' },
{ label: 'Endpoint', value: 'Endpoint' },
]}>
<TabItem value="RestEndpoint">

```typescript
interface RestGenerics {
  readonly path: string;
  readonly schema?: Schema | undefined;
  readonly method?: string;
  readonly body?: any;
}

export class RestEndpoint<O extends RestGenerics = any> extends Endpoint {
  /* Prepare fetch */
  readonly path: string;
  readonly urlPrefix: string;
  readonly requestInit: RequestInit;
  readonly method: string;
  readonly signal: AbortSignal | undefined;
  url(...args: Parameters<F>): string;
  getRequestInit(
    this: any,
    body?: RequestInit['body'] | Record<string, unknown>,
  ): RequestInit;
  getHeaders(headers: HeadersInit): HeadersInit;

  /* Perform/process fetch */
  fetchResponse(input: RequestInfo, init: RequestInit): Promise<Response>;
  parseResponse(response: Response): Promise<any>;
  process(value: any, ...args: Parameters<F>): any;
}
```

</TabItem>
<TabItem value="Endpoint">

```typescript
class Endpoint<F extends (...args: any) => Promise<any>> {
  constructor(fetchFunction: F, options: EndpointOptions);

  key(...args: Parameters<F>): string;

  readonly sideEffect?: true;

  readonly schema?: Schema;

  /** Default data expiry length, will fall back to NetworkManager default if not defined */
  readonly dataExpiryLength?: number;
  /** Default error expiry length, will fall back to NetworkManager default if not defined */
  readonly errorExpiryLength?: number;
  /** Poll with at least this frequency in miliseconds */
  readonly pollFrequency?: number;
  /** Marks cached resources as invalid if they are stale */
  readonly invalidIfStale?: boolean;
  /** Enables optimistic updates for this request - uses return value as assumed network response */
  readonly getOptimisticResponse?: (
    snap: SnapshotInterface,
    ...args: Parameters<F>
  ) => ResolveType<F>;
  /** Determines whether to throw or fallback to */
  readonly errorPolicy?: (error: any) => 'soft' | undefined;
}
```

</TabItem>
</Tabs>

:::info extends

`RestEndpoint` extends [Endpoint](./Endpoint.md)

:::

## Usage

All options are supported as arguments to the constructor, [extend](#extend), and as overrides when using [inheritance](#inheritance)

### Simplest retrieval

```ts
const getTodo = new RestEndpoint({
  path: 'https\\://jsonplaceholder.typicode.com/todos/:id',
});
```

### Managing state

```ts
export class Todo extends Entity {
  id = '';
  title = '';
  completed = false;
  pk() { return this.id }
}

const getTodo = new RestEndpoint({
  urlPrefix: 'https://jsonplaceholder.typicode.com'
  path: '/todos/:id',
  schema: Todo,
});
const updateTodo = new RestEndpoint({
  urlPrefix: 'https://jsonplaceholder.typicode.com',
  path: '/todos/:id',
  method: 'PUT',
  schema: Todo,
})
```

Using a [Schema](./schema.md) enables automatic data consistency without the need to hurt performance with refetching.

## Fetch Lifecycle

RestEndpoint adds to Endpoint by providing customizations for a provided fetch method.

1. _Prepare fetch_
   1. url()
      - [urlPrefix](#urlPrefix)
      - [path](#path)
   1. [getRequestInit()](#getRequestInit)
      - [getHeaders()](#getHeaders)
      - [method](#method)
      - [signal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)
1. _Perform fetch_
   1. [fetchResponse()](#fetchResponse)
   1. [parseResponse()](#parseResponse)
   1. [process()](#process)

```ts title="fetch implementation for RestEndpoint"
function fetch(...args) {
  const urlParams = this.#hasBody && args.length < 2 ? {} : args[0] || {};
  const body = this.#hasBody ? args[args.length - 1] : undefined;
  return this.fetchResponse(this.url(urlParams), this.getRequestInit(body))
    .then(this.parseResponse)
    .then(res => this.process(res, ...args));
}
```

## Prepare Fetch

Members double as options (second constructor arg). While none are required, the first few
have defaults.

### path: string {#path}

Uses [path-to-regex](https://github.com/pillarjs/path-to-regexp#compile-reverse-path-to-regexp) to build
urls using the parameters passed. This also informs the types so they are properly enforced.

`:` prefixed words are key names. Both strings and numbers are accepted as options.

```ts
const getThing = new RestEndpoint({ path: '/:group/things/:id' });
getThing({ group: 'first', id: 77 });
```

`?` to indicate optional parameters

```ts
const optional = new RestEndpoint({ path: '/:group/things/:number?' });
optional({ group: 'first' });
optional({ group: 'first', number: 'fifty' });
```

`\\` to escape special characters like `:` or `?`

```ts
const getSite = new RestEndpoint({ path: 'https\\://site.com/:slug' });
getSite({ slug: 'first' });
```

### urlPrefix: string = '' {#urlPrefix}

Prepends this to the compiled [path](#path)

### method: string = 'GET' {#method}

[Method](https://developer.mozilla.org/en-US/docs/Web/API/Request/method) is part of the HTTP protocol.
REST protocols use these to indicate the type of operation. Because of this RestEndpoint uses this
to inform `sideEffect` and whether the endpoint should use a `body` payload.

`GET` is 'readonly', other methods imply sideEffects.

`GET` and `DELETE` both default to no `body`.

### getRequestInit(body): RequestInit {#getRequestInit}

Prepares [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch) used in fetch.
This is sent to [fetchResponse](#fetchResponse)

### getHeaders(headers: HeadersInit): HeadersInit {#getHeaders}

Called by [getRequestInit](#getRequestInit) to determine [HTTP Headers](https://developer.mozilla.org/en-US/docs/Web/API/Request/headers)

This is often useful for [authentication](../guides/auth)

:::caution

Don't use hooks here.

:::

## Handle fetch

### fetchResponse(input, init): Promise {#fetchResponse}

Performs the [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) call

### parseResponse(response): Promise {#parseResponse}

Takes the [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) and parses via .text() or .json()

### process(value, ...args): any {#process}

Perform any transforms with the parsed result. Defaults to identity function.

## Endpoint Life-Cycles

### schema: Schema {#schema}

Declarative definition of how to [process responses](./schema)

- [where](./schema) to expect [Entities](./Entity.md)
- Classes to [deserialize fields](/rest/guides/network-transform#deserializing-fields)

Not providing this option means no entities will be extracted.

```tsx
import { Entity, RestEndpoint } from '@rest-hooks/rest';

class User extends Entity {
  readonly id: string = '';
  readonly username: string = '';

  pk() {
    return this.id;
  }
}

const getUser = new RestEndpoint({
  path: '/users/:id',
  schema: User,
});
```

### dataExpiryLength?: number {#dataexpirylength}

Custom data cache lifetime for the fetched resource. Will override the value set in NetworkManager.

[Learn more about expiry time](/docs/getting-started/expiry-policy#expiry-time)

### errorExpiryLength?: number {#errorexpirylength}

Custom data error lifetime for the fetched resource. Will override the value set in NetworkManager.

### errorPolicy?: (error: any) => 'soft' | undefined {#errorpolicy}

'soft' will use stale data (if exists) in case of error; undefined or not providing option will result
in error.

[Learn more about errorPolicy](/docs/getting-started/expiry-policy#error-policy)

```ts
errorPolicy(error) {
  return error.status >= 500 ? 'soft' : undefined;
}
```

### invalidIfStale: boolean {#invalidifstale}

Indicates stale data should be considered unusable and thus not be returned from the cache. This means
that useSuspense() will suspend when data is stale even if it already exists in cache.

### pollFrequency: number {#pollfrequency}

Frequency in millisecond to poll at. Requires using [useSubscription()](/docs/api/useSubscription) to have
an effect.

### getOptimisticResponse: (snap, ...args) => fakePayload {#getoptimisticresponse}

When provided, any fetches with this endpoint will behave as though the `fakePayload` return value
from this function was a succesful network response. When the actual fetch completes (regardless
of failure or success), the optimistic update will be replaced with the actual network response.

[Optimistic update guide](guides/optimistic-updates.md)

### update(normalizedResponseOfThis, ...args) => ({ [endpointKey]: (normalizedResponseOfEndpointToUpdate) => updatedNormalizedResponse) }) {#update}

```ts title="UpdateType.ts"
type UpdateFunction<
  Source extends EndpointInterface,
  Updaters extends Record<string, any> = Record<string, any>,
> = (
  source: ResultEntry<Source>,
  ...args: Parameters<Source>
) => { [K in keyof Updaters]: (result: Updaters[K]) => Updaters[K] };
```

Simplest case:

```ts title="userEndpoint.ts"
const createUser = new RestEndpoint({
  path: '/user',
  method: 'POST',
  schema: User,
  update: (newUserId: string) => ({
    [userList.key()]: (users = []) => [newUserId, ...users],
  }),
});
```

More updates:

```typescript title="Component.tsx"
const allusers = useSuspense(userList);
const adminUsers = useSuspense(userList, { admin: true });
```

The endpoint below ensures the new user shows up immediately in the usages above.

```ts title="userEndpoint.ts"
const createUser = new RestEndpoint({
  path: '/user',
  method: 'POST',
  schema: User,
  update: (newUserId, newUser)  => {
    const updates = {
      [userList.key()]: (users = []) => [newUserId, ...users],
    ];
    if (newUser.isAdmin) {
      updates[userList.key({ admin: true })] = (users = []) => [newUserId, ...users];
    }
    return updates;
  },
});
```

This is usage with a [createResource](./createResource.md)

```typescript title="TodoResource.ts"
import { Entity, createResource } from '@rest-hooks/rest';

export class Todo extends Entity {
  readonly id: number = 0;
  readonly userId: number = 0;
  readonly title: string = '';
  readonly completed: boolean = false;

  pk() {
    return `${this.id}`;
  }
}

// We declare BaseTodoResource before TodoResource to prevent recursive type definitions
const BaseTodoResource = createResource({
  path: 'https://jsonplaceholder.typicode.com/todos/:id',
  schema: Todo,
});
export const TodoResource = {
  ...BaseTodoResource,
  create: BaseTodoResource.create.extend({
    // highlight-start
    update: (newResourceId: string) => ({
      [todoList.key({})]: (resourceIds: string[] = []) => [
        ...resourceIds,
        newResourceId,
      ],
    }),
    // highlight-end
  }),
};
```

## extend(options): Endpoint {#extend}

Can be used to further customize the endpoint definition

```typescript
const getUser = new RestEndpoint({ path: '/users/:id' });

const UserDetailNormalized = getUser.extend({
  schema: User,
  getHeaders(headers: HeadersInit): HeadersInit {
    return {
      ...headers,
      'Access-Token': getAuth(),
    };
  },
});
```

## paginated(removeCursor): args {#paginated}

```typescript
function paginated<E, A extends any[]>(
  this: E,
  removeCursor: (...args: A) => readonly [...Parameters<E>],
): PaginationEndpoint<E, A>;
```

Extends an endpoint whose schema contains an Array and creates a new endpoint that
will append the items it finds into the list from the first endpoint. See [Infinite Scrolling Pagination](guides/pagination.md#infinite-scrolling) for more info.

```ts
const getNextPage = getList.paginated(
  ({ cursor, ...rest }: { cursor: string | number }) =>
    (Object.keys(rest).length ? [rest] : []) as any,
);
```

`removeCusor` is a function that takes the arguments sent in fetch of `getNextPage` and returns
the arguments to update `getList`.

## Inheritance

Make sure you use `RestGenerics` to keep types working.

```ts
import { RestEndpoint, RestGenerics } from '@rest-hooks/rest';

class GithubEndpoint<O extends RestGenerics = any> extends RestEndpoint<O> {
  urlPrefix = 'https://api.github.com';

  getHeaders(headers: HeadersInit): HeadersInit {
    return {
      ...headers,
      'Access-Token': getAuth(),
    };
  }
}
```
