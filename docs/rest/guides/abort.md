---
title: Aborting Fetch
---

import HooksPlayground from '@site/src/components/HooksPlayground';

[AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) provides a new way of cancelling
fetches that are no longer considered relevant. This can be hooked into fetch via the second `RequestInit` parameter.

## Cancelling on params change

Sometimes a user has the opportunity to fill out a field that is used to affect the results of a network call.
If this is a text input, they could potentially type quite quickly, thus creating a lot of network requests.

Using `@rest-hooks/hooks` package with [useCancelling()](/docs/api/useCancelling) will automatically cancel in-flight requests if the parameters
change before the request is resolved.

<HooksPlayground>

```tsx
function AbortDemo() {
  const [id, setId] = React.useState(1);
  return (
    <div>
      <React.Suspense fallback="...">
        <TodoDetail id={id} />
      </React.Suspense>
      <div>
        <button onClick={() => setId(id => id - 1)}>-</button>
        {' '}<button onClick={() => setId(id => id + 1)}>+</button>
        {' '}&nbsp;{id}
      </div>
    </div>
  );
}
function TodoDetail({ id }) {
  const todo = useSuspense(useCancelling(TodoResource.get, { id }), { id });
  return <div>{todo.title}</div>;
}
render(<AbortDemo />);
```

</HooksPlayground>

Try clicking the `+` very quickly. If you increment before it resolves the request will be cancelled and you should
not see results in the store.

:::caution Warning

Be careful when using this with many disjoint components fetching the same
arguments (Endpoint/params pair) to useSuspense(). This solution aborts fetches per-component,
which means you might end up canceling a fetch that another component still cares about.

:::
