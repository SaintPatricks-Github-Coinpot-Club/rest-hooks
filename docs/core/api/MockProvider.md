---
title: "<MockProvider />"
---

```typescript
function MockProvider({
  children,
  results,
}: {
  children: React.ReactChild;
  results: Fixture[];
}): JSX.Element;
```

&lt;MockResolver /\> is a simple substitute provider to prefill the cache with fixtures so the 'happy path'
can be tested. This is useful for [storybook](../guides/storybook.md) as well as component testing.

:::caution Deprecated

Use [<MockResolver /\>](./mockResolver) instead as it also supports [imperative fetches](../api/Controller.md#fetch) like [create](/rest/api/createResource#create) and [update](/rest/api/createResource#update).

Note: <MockProvider /\> disables dispatches, thus no fetches will occur. To simply initalize the
cache, use [mockInitialState()](./mockInitialState) to construct initialState for the normal [<CacheProvider /\>](./CacheProvider)

:::

## Arguments

### results

```typescript
interface Fixture {
  request: ReadEndpoint;
  params: object;
  result: object | string | number;
}
```

This prop specifies the fixtures to use data from. Each item represents a fetch defined by the
[Endpoint](/rest/api/Endpoint) and params. `Result` contains the JSON response expected from said fetch.

## Returns

```typescript
JSX.Element
```

Renders the children prop.

## Example

```typescript
import { MockProvider } from '@rest-hooks/test';

import ArticleResource from 'resources/ArticleResource';
import MyComponentToTest from 'components/MyComponentToTest';

const results = [
  {
    request: ArticleResource.getList,
    params: { maxResults: 10 },
    result: [
      {
        id: 5,
        content: 'have a merry christmas',
        author: 2,
        contributors: [],
      },
      {
        id: 532,
        content: 'never again',
        author: 23,
        contributors: [5],
      },
    ],
  },
];

<MockProvider results={results}>
  <MyComponentToTest />
</MockProvider>
```
