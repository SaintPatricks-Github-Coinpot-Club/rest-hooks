---
title: useSuspense()
---

<head>
  <title>useSuspense() - Data fetching with Suspense</title>
</head>

import GenericsTabs from '@site/src/components/GenericsTabs';
import ConditionalDependencies from '../shared/_conditional_dependencies.mdx';

<GenericsTabs>

```typescript
function useSuspense(
  endpoint: ReadEndpoint,
  ...args: Parameters<typeof endpoint> | [null]
): Denormalize<typeof endpoint.schema>;
```

```typescript
function useSuspense<
  E extends EndpointInterface<FetchFunction, Schema | undefined, undefined>,
  Args extends readonly [...Parameters<E>] | readonly [null],
>(
  endpoint: E,
  ...args: Args
): E['schema'] extends Exclude<Schema, null>
  ? Denormalize<E['schema']>
  : ReturnType<E>;
```

</GenericsTabs>

Excellent for retrieving the data you need.

`useSuspense()` [suspends](../getting-started/data-dependency#async-fallbacks) rendering until the data is available. This is much like [await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await)ing an [async](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function) function. That is to say, the lines after the function won't be run until resolution (data is available).

Cache policy is [Stale-While-Revalidate](https://tools.ietf.org/html/rfc5861) by default but also [configurable](../getting-started/expiry-policy.md).

- Triggers fetch:
  - On first-render
    - or parameters change
    - or required entity is deleted
    - or imperative [invalidation](./Controller.md#invalidate) triggered
  - and When not in cache or result is considered stale
  - and When no identical requests are in flight
  - and when params are not null
- [On Error (404, 500, etc)](https://www.restapitutorial.com/httpstatuscodes.html):
  - Throws error to be [caught](../getting-started/data-dependency#async-fallbacks) by [Error Boundaries](https://reactjs.org/docs/error-boundaries.html)
- While Loading:
  - Returns previously cached if exists (even if stale)
    - except in case of delete or [invalidation](./Controller.md#invalidate)
  - [Suspend rendering](../getting-started/data-dependency#async-fallbacks) otherwise

## Single

```tsx
function Post({ id }: { id: number }) {
  const post = useSuspense(PostResource.get, { id });
  // post as PostResource
}
```

## List

```tsx
function Posts() {
  const posts = useSuspense(PostResource.getList);
  // posts as PostResource[]
}
```

## Sequential

```tsx
function PostWithAuthor() {
  const post = useSuspense(PostResource.get, { id });
  // post as PostResource
  const author = useSuspense(UserResource.get, {
    id: post.userId,
  });
  // author as UserResource
}
```

## Paginated data

When entities are stored in nested structures, that structure will remain.

```typescript
export class PaginatedPost extends Entity {
  readonly id: number | null = null;
  readonly title: string = '';
  readonly content: string = '';

  pk() { return this.id }
}

export const getPosts = new RestEndpoint({
  path: '/post\\?page=:page',
  schema: { results: [PaginatedPost], nextPage: '', lastPage: '' },
})
```

```tsx
function ArticleList({ page }: { page: string }) {
  const {
    results: posts,
    nextPage,
    lastPage,
  } = useSuspense(getPosts, { page });
  // posts as PaginatedPostResource[]
}
```
<ConditionalDependencies />

## Useful `Endpoint`s to send

[Resource](/rest/api/createResource#members) provides these built-in:

- get
- getList

Feel free to add your own [RestEndpoint](/rest/api/RestEndpoint) as well.
