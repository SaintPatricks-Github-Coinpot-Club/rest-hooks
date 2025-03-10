---
title: useCache()
id: useCache
original_id: useCache
---

<!--DOCUSAURUS_CODE_TABS-->
<!--Type-->

```typescript
function useCache(
  fetchShape: ReadShape,
  params: object | null,
): Denormalize<typeof fetchShape.schema> | null;
```

<!--With Generics-->

```typescript
function useCache<Params extends Readonly<object>, S extends Schema>(
  fetchShape: Pick<ReadShape<S, Params>, 'schema' | 'getFetchKey'>,
  params: Params | null,
): Denormalize<S> | null;
```

<!--END_DOCUSAURUS_CODE_TABS-->

Excellent to use data in the normalized cache without fetching.

- [On Error (404, 500, etc)](https://www.restapitutorial.com/httpstatuscodes.html):
  - Returns previously cached if exists
  - null otherwise
- While loading:
  - Returns previously cached if exists
  - null otherwise

## Example

### Using a type guard to deal with null

```tsx
function Post({ id }: { id: number }) {
  const post = useCache(PostResource.detailShape(), { id });
  // post as PostResource | null
  if (!post) return null;
  // post as PostResource (typeguarded)
  // ...render stuff here
}
```

### Paginated data

When entities are stored in nested structures, that structure will remain.

```typescript
export class PaginatedPostResource extends Resource {
  readonly id: number | null = null;
  readonly title: string = '';
  readonly content: string = '';

  static urlRoot = 'http://test.com/post/';

  static listShape<T extends typeof Resource>(this: T) {
    return {
      ...super.listShape(),
      schema: { results: [this.getEntitySchema()], nextPage: '', lastPage: '' },
    };
  }
}
```

```tsx
function ArticleList({ page }: { page: string }) {
  const { results: posts, nextPage, lastPage } = useCache(
    PaginatedPostResource.listShape(),
    { page },
  );
  // posts as PaginatedPostResource[] | null
  if (!posts) return null;
  // posts as PaginatedPostResource[] (typeguarded)
  // ...render stuff here
}
```

## Useful `FetchShape`s to send

[Resource](./Resource.md#provided-and-overridable-methods) provides these built-in:

- detailShape()
- listShape()

Feel free to add your own [FetchShape](./FetchShape.md) as well.
