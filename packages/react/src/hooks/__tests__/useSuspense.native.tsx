import {
  State,
  initialState,
  Controller,
  ActionTypes,
  actionTypes,
} from '@data-client/core';
import { FetchAction } from '@data-client/core';
import { Endpoint, FetchFunction, ReadEndpoint } from '@data-client/endpoint';
import { normalize } from '@data-client/normalizr';
import {
  Fixture,
  makeRenderDataClient,
  mockInitialState,
  MockResolver,
} from '@data-client/test';
import { jest } from '@jest/globals';
import { Temporal } from '@js-temporal/polyfill';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { render, act, screen } from '@testing-library/react-native';
import {
  CoolerArticleResource,
  InvalidIfStaleArticleResource,
  GetNoEntities,
  ArticleTimedResource,
  ContextAuthdArticleResource,
  AuthContext,
  PaginatedArticleResource,
  CoolerArticle,
  PaginatedArticle,
  FutureArticleResource,
  ArticleTimed,
  ContextAuthdArticleResourceBase,
} from '__tests__/new';
import { createEntityMeta } from '__tests__/utils';
import nock from 'nock';
import React, { Suspense } from 'react';
import { Text, View } from 'react-native';
import { InteractionManager } from 'react-native';

// relative imports to avoid circular dependency in tsconfig references
import {
  CacheProvider,
  useController,
  ControllerContext,
  StateContext,
  AsyncBoundary,
} from '../..';
import { articlesPages, payload, users, nested } from '../test-fixtures';
import useSuspense from '../useSuspense';

async function testDispatchFetch(
  Component: React.FunctionComponent<any>,
  payloads: any[],
) {
  const dispatch = jest.fn((value: ActionTypes) => Promise.resolve());
  const controller = new Controller({ dispatch });

  const tree = (
    <ControllerContext.Provider value={controller}>
      <AsyncBoundary fallback={<Text></Text>}>
        <Component />
      </AsyncBoundary>
    </ControllerContext.Provider>
  );
  render(tree);
  expect(dispatch).toHaveBeenCalled();
  // react 19 suspends twice
  expect(dispatch.mock.calls.length).toBeGreaterThanOrEqual(payloads.length);

  let i = 0;
  for (const call of dispatch.mock.calls as any) {
    // react 19, skip every other
    if (Number(React.version.substring(0, 3)) >= 19 && i % 2 === 1) {
      continue;
    }
    expect(call[0].type).toBe(actionTypes.FETCH);
    delete call[0]?.meta?.fetchedAt;
    delete call[0]?.meta?.promise;
    expect(call[0]).toMatchSnapshot();
    const action: FetchAction = call[0] as any;
    // const res = await action.endpoint(...action.args);
    // expect(res).toEqual(payloads[i]);
    i++;
  }
}

function ArticleComponentTester({ invalidIfStale = false, schema = true }) {
  let endpoint =
    invalidIfStale ?
      InvalidIfStaleArticleResource.get
    : CoolerArticleResource.get;
  if (!schema) {
    endpoint = (endpoint as any).extend({ schema: undefined }) as any;
  }
  const article = useSuspense(endpoint, {
    id: payload.id,
  });
  return (
    <View testID="article">
      <Text>{article.title}</Text>
      <Text>{article.content}</Text>
    </View>
  );
}

describe('useSuspense()', () => {
  let renderDataClient: ReturnType<typeof makeRenderDataClient>;
  const fbmock = jest.fn();

  async function testMalformedResponse(
    payload: any,
    endpoint: ReadEndpoint<FetchFunction, any> = CoolerArticleResource.get,
  ) {
    const { result, waitForNextUpdate } = renderDataClient(
      () => {
        return useSuspense(endpoint, {
          id: 400,
        });
      },
      {
        resolverFixtures: [
          { endpoint, args: [{ id: 400 }], response: payload },
        ],
      },
    );
    expect(result.current).toBeUndefined();
    await waitForNextUpdate();
    expect(result.error).toBeDefined();
    expect((result.error as any).status).toBeGreaterThan(399);
    expect(result.error).toMatchSnapshot();
  }

  function Fallback() {
    fbmock();
    return null;
  }

  beforeAll(() => {
    nock(/.*/)
      .persist()
      .defaultReplyHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Access-Token',
        'Content-Type': 'application/json',
      })
      .options(/.*/)
      .reply(200)
      .get(`/article-cooler/${payload.id}`)
      .reply(200, payload)
      .get(`/article-time/${payload.id}`)
      .reply(200, { ...payload, createdAt: '2020-06-07T02:00:15+0000' })
      .delete(`/article-cooler/${payload.id}`)
      .reply(204, '')
      .delete(`/article/${payload.id}`)
      .reply(200, {})
      .get(`/article-cooler/0`)
      .reply(403, {})
      .get(`/article-cooler/666`)
      .reply(200, '')
      .get(`/article-cooler`)
      .reply(200, nested)
      .get(`/user`)
      .reply(200, users);
  });

  afterAll(() => {
    nock.cleanAll();
  });

  beforeEach(() => {
    renderDataClient = makeRenderDataClient(CacheProvider);
    fbmock.mockReset();
  });

  afterEach(() => {
    try {
      screen.unmount();
      // eslint-disable-next-line no-empty
    } catch (e) {}
  });

  it('should dispatch an action that fetches', async () => {
    await testDispatchFetch(ArticleComponentTester, [payload]);
  });

  it('should NOT suspend if result already in cache and options.invalidIfStale is false', () => {
    const state: State<unknown> = mockInitialState([
      {
        endpoint: CoolerArticleResource.get,
        args: [{ id: payload.id }],
        response: payload,
      },
    ]) as any;

    const tree = (
      <StateContext.Provider value={state}>
        <Suspense fallback={<Fallback />}>
          <ArticleComponentTester />
        </Suspense>
      </StateContext.Provider>
    );
    const { getByText } = render(tree);
    expect(fbmock).not.toHaveBeenCalled();
    const title = getByText(payload.title);
    expect(title).toBeDefined();
  });
  describe('result is stale and options.invalidIfStale is false', () => {
    const { entities, result } = normalize(CoolerArticle, payload);
    const fetchKey = CoolerArticleResource.get.key({ id: payload.id });
    const state = {
      ...initialState,
      entities,
      entitiesMeta: createEntityMeta(entities),
      results: {
        [fetchKey]: result,
      },
      meta: {
        [fetchKey]: {
          date: 0,
          fetchedAt: 0,
          expiresAt: 0,
        },
      },
    };
    let thenavigation: any;
    function Home() {
      return <Text>Home</Text>;
    }
    function SyncArticleComponentTester({ navigation }: { navigation: any }) {
      thenavigation = navigation;
      return (
        <AsyncBoundary fallback={<Fallback />}>
          <ArticleComponentTester />
        </AsyncBoundary>
      );
    }
    const dispatch = jest.fn(() => Promise.resolve());
    const controller = new Controller({ dispatch });
    const Stack = createNativeStackNavigator();

    const tree = (
      <StateContext.Provider value={state}>
        <ControllerContext.Provider value={controller}>
          <NavigationContainer>
            <Stack.Navigator initialRouteName="Article">
              <Stack.Screen
                name="Article"
                component={SyncArticleComponentTester}
              />
              <Stack.Screen name="Home" component={Home} />
            </Stack.Navigator>
          </NavigationContainer>
        </ControllerContext.Provider>
      </StateContext.Provider>
    );
    it('should NOT suspend even when result is stale and options.invalidIfStale is false', () => {
      dispatch.mockClear();
      const { getByText, getByTestId } = render(tree);
      expect(fbmock).not.toHaveBeenCalled();
      const title = getByText(payload.title);
      expect(title).toBeDefined();
      // still should revalidate
      expect(dispatch.mock.calls.length).toBe(1);
    });
    it('should fetch when navigator refocuses and results are stale', async () => {
      await import('@react-navigation/native');
      dispatch.mockClear();

      const { getByText, getByTestId } = render(tree);
      expect(fbmock).not.toHaveBeenCalled();
      await new Promise(resolve =>
        InteractionManager.runAfterInteractions(() => {
          resolve(null);
        }),
      );
      // still should revalidate
      expect(dispatch.mock.calls.length).toBe(1);
      act(() => thenavigation.navigate('Home'));
      expect(getByText('Home')).toBeDefined();

      act(() => thenavigation.goBack());
      await new Promise(resolve =>
        InteractionManager.runAfterInteractions(() => {
          resolve(null);
        }),
      );
      expect(getByTestId('article')).toBeDefined();
      // since we got focus back we should have called again
      expect(dispatch.mock.calls.length).toBe(2);
    });
  });

  it('should NOT suspend if result is not stale and options.invalidIfStale is true', () => {
    const { entities, result } = normalize(CoolerArticle, payload);
    const fetchKey = InvalidIfStaleArticleResource.get.key({ id: payload.id });
    const state = {
      ...initialState,
      entities,
      results: {
        [fetchKey]: result,
      },
      entitiesMeta: createEntityMeta(entities),
      meta: {
        [fetchKey]: {
          date: Infinity,
          fetchedAt: Infinity,
          expiresAt: Infinity,
        },
      },
    };

    const tree = (
      <StateContext.Provider value={state}>
        <Suspense fallback={<Fallback />}>
          <ArticleComponentTester invalidIfStale />
        </Suspense>
      </StateContext.Provider>
    );
    const { getByText } = render(tree);
    expect(fbmock).not.toHaveBeenCalled();
    const title = getByText(payload.title);
    expect(title).toBeDefined();
  });
  it('should suspend if result stale in cache and options.invalidIfStale is true', () => {
    const { entities, result } = normalize(CoolerArticle, payload);
    const fetchKey = InvalidIfStaleArticleResource.get.key({ id: payload.id });
    const state = {
      ...initialState,
      entities,
      results: {
        [fetchKey]: result,
      },
      entitiesMeta: createEntityMeta(entities),
      meta: {
        [fetchKey]: {
          date: 0,
          fetchedAt: 0,
          expiresAt: 0,
        },
      },
    };
    const controller = new Controller({ dispatch: () => Promise.resolve() });

    const tree = (
      <StateContext.Provider value={state}>
        <ControllerContext.Provider value={controller}>
          <Suspense fallback={<Fallback />}>
            <ArticleComponentTester invalidIfStale />
          </Suspense>
        </ControllerContext.Provider>
      </StateContext.Provider>
    );
    render(tree);
    expect(fbmock).toHaveBeenCalled();
  });
  it('should suspend if result stale in cache and options.invalidIfStale is true and no schema', () => {
    const endpoint = InvalidIfStaleArticleResource.get.extend({
      schema: undefined,
    });
    const fetchKey = endpoint.key({ id: payload.id });
    const state = {
      ...initialState,
      entities: {},
      results: {
        [fetchKey]: payload,
      },
      entitiesMeta: {},
      meta: {
        [fetchKey]: {
          date: 0,
          fetchedAt: 0,
          expiresAt: 0,
        },
      },
    };
    const controller = new Controller({ dispatch: () => Promise.resolve() });

    const tree = (
      <StateContext.Provider value={state}>
        <ControllerContext.Provider value={controller}>
          <Suspense fallback={<Fallback />}>
            <ArticleComponentTester invalidIfStale schema={false} />
          </Suspense>
        </ControllerContext.Provider>
      </StateContext.Provider>
    );
    render(tree);
    expect(fbmock).toHaveBeenCalled();
  });

  describe('errors', () => {
    let errorspy: jest.Spied<typeof global.console.error>;
    beforeEach(() => {
      errorspy = jest
        .spyOn(global.console, 'error')
        .mockImplementation(() => {});
    });
    afterEach(() => {
      errorspy.mockRestore();
    });

    const fixtures: Fixture[] = [
      {
        endpoint: CoolerArticleResource.get,
        args: [{ id: payload.id }],
        response: payload,
      },
      {
        endpoint: InvalidIfStaleArticleResource.get,
        args: [{ id: payload.id }],
        response: payload,
      },
    ];

    it('should console.error when lastReset is NaN', async () => {
      const state: State<unknown> = {
        ...initialState,
        lastReset: NaN as any,
      };

      const tree = (
        <CacheProvider initialState={state}>
          <MockResolver fixtures={fixtures}>
            <Suspense fallback={<Fallback />}>
              <ArticleComponentTester />
            </Suspense>
          </MockResolver>
        </CacheProvider>
      );
      const { findAllByText } = render(tree);
      expect(fbmock).toHaveBeenCalled();
      await act(async () => {
        let count = 0;
        while (errorspy.mock.calls.length < 1 && count < 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          count++;
        }
        /* TODO: remove above and re-enable below once we figure out how to make suspense testing work in react 18 */
        //await findAllByText(payload.title);
      });
      expect(errorspy.mock.calls).toContainEqual([
        'state.lastReset is NaN. Only positive timestamps are valid.',
      ]);
    });

    // taken from integration
    it('should throw errors on bad network', async () => {
      const { result, waitForNextUpdate } = renderDataClient(
        () => {
          return useSuspense(CoolerArticleResource.get, {
            id: '0',
          });
        },
        {
          resolverFixtures: [
            {
              endpoint: CoolerArticleResource.get,
              args: [{ id: '0' }],
              error: true,
              response: {
                status: 403,
                statusText: 'Forbidden',
                data: {
                  message: 'You are not allowed to access this resource.',
                },
              },
            },
          ],
        },
      );
      expect(result.current).toBeUndefined();
      await waitForNextUpdate();
      expect(result.error).toBeDefined();
      expect((result.error as any).status).toBe(403);
    });

    it('should throw error when response is array when expecting entity', async () => {
      await testMalformedResponse([]);
    });

    it('should throw error when response is {} when expecting entity', async () => {
      await testMalformedResponse({});
    });

    it('should throw error when response is number when expecting entity', async () => {
      await testMalformedResponse(5);
    });

    it('should throw error when response is string when expecting entity', async () => {
      await testMalformedResponse('hi');
    });

    /* TODO: Add these back when we have opt-in required
  it('should throw error when response is string when expecting nested entity', async () => {
    const endpoint = CoolerArticleResource.detail().extend({
      schema: { data: CoolerArticleResource },
    });
    await testMalformedResponse('hi', endpoint);
  });

  it('should throw error when response is nested string when expecting nested entity', async () => {
    const endpoint = CoolerArticleResource.detail().extend({
      schema: { data: CoolerArticleResource },
    });
    await testMalformedResponse({ data: 5, parcel: 2 }, endpoint);
  });

  it('should throw error when response is nested missing id when expecting nested entity', async () => {
    const endpoint = CoolerArticleResource.detail().extend({
      schema: { data: CoolerArticleResource },
    });
    await testMalformedResponse(
      { data: { ...payload, id: undefined }, parcel: 2 },
      endpoint,
    );
  });*/
  });

  /*it('should not suspend with null params to useSuspense()', () => {
    let article: CoolerArticle | undefined;
    const { result } = renderDataClient(() => {
      const a = useSuspense(CoolerArticleResource.get, null);
      a.tags;
      article = a;
      // @ts-expect-error
      const b: CoolerArticleResource = a;
      return 'done';
    });
    expect(result.current).toBe('done');
    expect(article).toBeUndefined();
  });*/

  it('should maintain schema structure even with null params', () => {
    let articles: PaginatedArticle[] | undefined;
    const { result } = renderDataClient(
      () => {
        const { results, nextPage } = useSuspense(
          PaginatedArticleResource.getList,
          null,
        );
        articles = results;
        // @ts-expect-error
        const b: PaginatedArticleResource[] = results;
        return nextPage;
      },
      {
        initialFixtures: [
          {
            endpoint: PaginatedArticleResource.getList,
            args: [],
            response: articlesPages,
          },
        ],
      },
    );
    expect(result.current).toBe('');
    expect(articles).toBeUndefined();
  });

  it('should suspend with no params to useSuspense()', async () => {
    const List = CoolerArticleResource.getList;
    const { result, waitForNextUpdate } = renderDataClient(
      () => {
        return useSuspense(List);
      },
      {
        resolverFixtures: [
          {
            endpoint: List,
            args: [],
            response: nested,
          },
        ],
      },
    );
    expect(result.current).toBeUndefined();
    await waitForNextUpdate();
    expect(result.current.length).toEqual(nested.length);

    // @ts-expect-error
    () => useSuspense(List, 5);
    // @ts-expect-error
    () => useSuspense(List, '5');
  });

  it('should read with id params Endpoint', async () => {
    const Detail = FutureArticleResource.get;
    const { result, waitForNextUpdate } = renderDataClient(
      () => {
        return useSuspense(Detail, 5);
      },
      {
        resolverFixtures: [
          {
            endpoint: Detail,
            args: [5],
            response: payload,
          },
        ],
      },
    );
    expect(result.current).toBeUndefined();
    await waitForNextUpdate();
    expect(result.current).toEqual(CoolerArticle.fromJS(payload));

    // @ts-expect-error
    () => useSuspense(Detail);
    // @ts-expect-error
    () => useSuspense(Detail, 5, 10);
    // @ts-expect-error
    () => useSuspense(Detail, {});
    // @ts-expect-error
    () => useSuspense(Detail, new Date());
  });

  it('should work with endpoints with no entities', async () => {
    const userId = '5';
    const response = { firstThing: '', someItems: [{ a: 5 }] };
    const { result, waitForNextUpdate } = renderDataClient(
      () => {
        return useSuspense(GetNoEntities, { userId });
      },
      {
        resolverFixtures: [
          {
            endpoint: GetNoEntities,
            args: [{ userId }],
            response,
          },
        ],
      },
    );
    // undefined means it threw
    expect(result.current).toBeUndefined();
    await waitForNextUpdate();
    expect(result.current).toStrictEqual(response);
  });

  it('should work with Serializable shapes', async () => {
    const { result, waitForNextUpdate } = renderDataClient(
      () => {
        return useSuspense(ArticleTimedResource.get, { id: payload.id });
      },
      {
        resolverFixtures: [
          {
            endpoint: ArticleTimedResource.get,
            args: [{ id: payload.id }],
            response: { ...payload, createdAt: '2020-06-07T02:00:15+0000' },
          },
        ],
      },
    );
    // undefined means it threw
    expect(result.current).toBeUndefined();
    await waitForNextUpdate();
    expect(
      result.current.createdAt.equals(result.current.createdAt),
    ).toBeTruthy();
    expect(result.current.createdAt).toEqual(
      Temporal.Instant.from('2020-06-07T02:00:15+0000'),
    );
    expect(result.current.id).toEqual(payload.id);
    expect(result.current).toBeInstanceOf(ArticleTimed);
  });

  it('reset promises do not propagate', async () => {
    let rejectIt: (reason?: any) => void = () => {};
    const func = () => {
      return new Promise((resolve, reject) => {
        rejectIt = reject;
      });
    };
    const MyEndpoint = new Endpoint(func, {
      key() {
        return 'MyEndpoint';
      },
    });
    const { result, unmount } = renderDataClient(() => {
      return useSuspense(MyEndpoint);
    });
    expect(result.current).toBeUndefined();
    unmount();
    act(() => rejectIt('failed'));
    // the test will fail if promise is not caught
  });

  describe('context authentication', () => {
    it('should use latest context when making requests', async () => {
      const consoleSpy = jest.spyOn(console, 'error');
      const wrapper = ({
        children,
        authToken,
      }: React.PropsWithChildren<{
        authToken: string;
      }>) => (
        <AuthContext.Provider value={authToken}>
          {children}
        </AuthContext.Provider>
      );
      const { result, controller, waitForNextUpdate, rerender } =
        renderDataClient(
          () => {
            return {
              data: useSuspense(ContextAuthdArticleResource.useGet(), {
                id: payload.id,
              }),
              endpoint: ContextAuthdArticleResource.useGet(),
            };
          },
          {
            wrapper,
            initialProps: { authToken: '' },
            resolverFixtures: [
              {
                endpoint: ContextAuthdArticleResourceBase.get,
                fetchResponse(input, init) {
                  if (
                    (init.headers as any)?.['Access-Token'] === 'thepassword'
                  ) {
                    return payload;
                  }
                  return { ...payload, title: 'unauthorized' };
                },
              },
            ],
          },
        );
      // undefined means it threw (suspended)
      expect(result.current).toBeUndefined();
      await waitForNextUpdate();
      // should only happen if nock doesn't work
      expect(result.error).toBeUndefined();
      expect(result.current.data.title).toBe('unauthorized');
      rerender({ authToken: 'thepassword' });
      const data = await controller.fetch(result.current.endpoint, {
        id: payload.id,
      });
      expect(data).toEqual(result.current.endpoint.schema.fromJS(payload));
      expect(result.current.data.title).toEqual(payload.title);
      // ensure we don't violate call-order changes
      expect(consoleSpy.mock.calls.length).toBeLessThan(1);
    });
  });
});
