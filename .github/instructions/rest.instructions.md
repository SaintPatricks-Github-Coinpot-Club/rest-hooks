---
applyTo: '**/*.ts*'
---
# Guide: Using `@data-client/rest` for Resource Modeling

This project uses [@data-client/rest](https://dataclient.io/rest) to define, fetch, normalize, and update RESTful resources and entities in React/TypeScript apps with type safety and automatic cache management.  
**Always follow these patterns when generating code that interacts with remote APIs.**

---

## 1. Defining Schemas

Define [schemas](https://dataclient.io/rest/api/schema) to represent the JSON returned by an endpoint. Compose these
to represent the data expected.

### Object

- [Entity](https://dataclient.io/rest/api/Entity) - represents a single unique object (denormalized)
- [new schema.Union(Entity)](https://dataclient.io/rest/api/Union) - polymorphic objects (A | B)
- `{[key:string]: Schema}` - immutable objects
- `new schema.Invalidate(Entity)` - to delete an Entity

### List

- [new schema.Collection([Entity])](https://dataclient.io/rest/api/Collection) - mutable/growable lists
- `[Entity]` - immutable lists
- `new schema.All(Entity)` - list all Entities of a kind

### Map

- `new schema.Collection(schema.Values(Entity))` - mutable/growable maps
- `new schema.Values(Entity)` - immutable maps

### Programmatic

- [new schema.Query(Queryable)](https://dataclient.io/rest/api/Query) - memoized programmatic selectors

---

## 2. Entity best practices

- Every `Entity` subclass **defines defaults** for _all_ non-optional serialised fields.
- Override `pk()` only when the primary key ≠ `id`.
- `pk()` return type is `number | string | undefined`
- Override `Entity.process(value, parent, key, args)` to insert fields based on args/url
- `static schema` (optional) for nested schemas or deserialization functions
  - When designing APIs, prefer nesting entities

---

## 3. Resources (`resource()`)

- [resource()](https://dataclient.io/rest/api/resource) creates a collection of [RestEndpoints](https://dataclient.io/rest/api/RestEndpoint) for CRUD operations on a common object
- Required fields:
  - `path`: path‑to‑regexp template (typed!)
  - `schema`: Declarative data shape for a **single** item (typically Entity or Union)
- Optional:
  - `urlPrefix`: Host root, if not `/`
  - `searchParams`: Type for query parameters (TS generic) in MyResource.getList
  - `paginationField`: Add MyResource.getList.getPage for pagination
  - `optimistic`: Boolean, when true all mutations will update optimistically, improving performance

```ts
import { Entity, resource } from '@data-client/rest';
import { User } from './User';

export class Todo extends Entity {
  id = 0;
  user = User.fromJS();
  title = '';
  completed = false;
  createdAt = new Date();

  static key = 'Todo';
  static schema = {
    user: User,
    createdAt: (iso: string) => new Date(iso),
  }
}

export const TodoResource = resource({
  urlPrefix: 'https://jsonplaceholder.typicode.com',
  path: '/todos/:id',
  schema: Todo,
  searchParams: {} as { userId?: string | number } | undefined,
  paginationField: 'page',
  optimistic: true,
});
```

### Usage

#### [Rendering](https://dataclient.io/docs/getting-started/data-dependency)

```ts
// GET https://jsonplaceholder.typicode.com/todos/5
const todo = useSuspense(TodoResource.get, { id: 5 });
// GET https://jsonplaceholder.typicode.com/todos
const todoList = useSuspense(TodoResource.getList);
// GET https://jsonplaceholder.typicode.com/todos?userId=1
const todoListByUser = useSuspense(TodoResource.getList, { userId: 1 });
```

#### [Mutations](https://dataclient.io/docs/getting-started/mutations)

```ts
const ctrl = useController();
// PUT https://jsonplaceholder.typicode.com/todos/5
const updateTodo = todo => ctrl.fetch(TodoResource.update, { id }, todo);
// PATCH https://jsonplaceholder.typicode.com/todos/5
const partialUpdateTodo = todo =>
  ctrl.fetch(TodoResource.partialUpdate, { id }, todo);
// POST https://jsonplaceholder.typicode.com/todos
const addTodoToStart = todo =>
  ctrl.fetch(TodoResource.getList.unshift, todo);
// POST https://jsonplaceholder.typicode.com/todos?userId=1
const addTodoToEnd = todo => ctrl.fetch(TodoResource.getList.push, { userId: 1 }, todo);
// DELETE https://jsonplaceholder.typicode.com/todos/5
const deleteTodo = id => ctrl.fetch(TodoResource.delete, { id });
// GET https://jsonplaceholder.typicode.com/todos?userId=1&page=2
const getNextPage = (page) => ctrl.fetch(TodoResource.getList.getPage, { userId: 1, page })
```

#### Programmatic queries

```ts
const queryRemainingTodos = new schema.Query(
  TodoResource.getList.schema,
  entries => entries.filter(todo => !todo.completed).length,
);
```

```ts
const groupTodoByUser = new schema.Query(
  TodoResource.getList.schema,
  todos => Object.groupBy(todos, todo => todo.userId),
);
```

For more detailed usage, refer to the [@data-client/react guide](.github/instructions/react.instructions.md).

---

## 4. Custom [RestEndpoint](https://dataclient.io/rest/api/RestEndpoint) patterns

```ts
/** Stand‑alone endpoint with custom typing */
export const getTicker = new RestEndpoint({
  urlPrefix: 'https://api.exchange.coinbase.com',
  path: '/products/:product_id/ticker',
  schema: Ticker,
  pollFrequency: 2000,
});
```

**Typing tips**  
- `path` path‑to‑regexp template for 1st arg
- `method` ≠ `GET` ⇒ 2nd arg = body (unless `body: undefined`)
- Provide `searchParams` / `body` _values_ purely for **type inference**
- Use `RestGenerics` when inheriting from `RestEndpoint`

### getOptimisticResponse()

```ts
getOptimisticResponse(snap, { id }) {
  const article = snap.get(Article, { id });
  if (!article) throw snap.abort;
  return {
    id,
    votes: article.votes + 1,
  };
}
```

---

## 5. **Union Types (Polymorphic Schemas)**

To define polymorphic resources (e.g., events), use [schema.Union](https://dataclient.io/rest/api/Union) and a discriminator field.

```typescript
import { schema } from '@data-client/rest';

export abstract class Event extends Entity {
  type: EventType = 'Issue';    // discriminator field is shared
  /* ... */
}
export class PullRequestEvent extends Event { /* ... */ }
export class IssuesEvent extends Event { /* ... */ }

export const EventResource = resource({
  path: '/users/:login/events/public/:id',
  schema: new schema.Union(
    {
      PullRequestEvent,
      IssuesEvent,
      // ...other event types...
    },
    'type', // discriminator field
  ),
});
```

---

## 7. **Extending Resources**

Use `.extend()` to add or override endpoints.

```typescript
export const IssueResource = resource({
  // ...base config...
}).extend((Base) => ({
  search: Base.getList.extend({
    path: '/search/issues',
    // ...custom schema or params...
  }),
}));
```

---

## 8. Best Practices & Notes

- When asked to browse or navigate to a web address, actual visit the address
- Always set up `schema` on every resource/entity/collection for normalization
- Prefer `RestEndpoint` over `resource()` for defining single endpoints or when mutation endpoints don't exist
- Normalize deeply nested or relational data by defining proper schemas

## 9. Common Mistakes to Avoid

- Don’t forget to use `fromJS()` or assign default properties for class fields
- Don't use `resource()` when mutation endpoints are not used or needed

# Official Documentation Links

- [Getting Started](https://dataclient.io/docs/getting-started/resource)
- [RestEndpoint API](https://dataclient.io/rest/api/RestEndpoint)
- [Resource API](https://dataclient.io/rest/api/resource)
- [Entity API](https://dataclient.io/rest/api/Entity)
- [Schema Guide](https://dataclient.io/rest/api/schema#schema-overview)
- [Relational Data Guide](https://dataclient.io/rest/guides/relational-data)

**ALWAYS follow these patterns and refer to the official docs for edge cases. Prioritize code generation that is idiomatic, type-safe, and leverages automatic normalization/caching via schema definitions.**