import type { GetEntityCache } from './entitiesCache.js';
import { EndpointsCache } from './types.js';
import WeakDependencyMap, { type Dep } from './WeakDependencyMap.js';
import type Cache from '../denormalize/cache.js';
import type { INVALID } from '../denormalize/symbol.js';
import type { EntityInterface, EntityPath } from '../interface.js';
import type { DenormGetEntity } from './types.js';

export default class GlobalCache implements Cache {
  private dependencies: Dep<EntityPath>[] = [];
  private cycleCache: Map<string, Map<string, number>> = new Map();
  private cycleIndex = -1;
  private localCache: Map<string, Map<string, any>> = new Map();

  declare private _getCache: GetEntityCache;

  declare private _getEntity: DenormGetEntity;
  declare private _resultCache: EndpointsCache;

  constructor(
    getEntity: DenormGetEntity,
    getCache: GetEntityCache,
    resultCache: EndpointsCache,
  ) {
    this._getEntity = getEntity;
    this._getCache = getCache;
    this._resultCache = resultCache;
  }

  getEntity(
    pk: string,
    schema: EntityInterface,
    entity: any,
    computeValue: (localCacheKey: Map<string, any>) => void,
  ): object | undefined | typeof INVALID {
    const key = schema.key;
    const { localCacheKey, cycleCacheKey } = this.getCacheKey(key);

    if (!localCacheKey.get(pk)) {
      const globalCache: WeakDependencyMap<
        EntityPath,
        object,
        EntityCacheValue
      > = this._getCache(pk, schema);
      const [cacheValue, cachePath] = globalCache.get(entity, this._getEntity);
      // TODO: what if this just returned the deps - then we don't need to store them

      if (cachePath) {
        localCacheKey.set(pk, cacheValue.value);
        // TODO: can we store the cache values instead of tracking *all* their sources?
        // this is only used for setting endpoints cache correctly. if we got this far we will def need to set as we would have already tried getting it
        this.dependencies.push(...cacheValue.dependencies);
        return cacheValue.value;
      }
      // if we don't find in denormalize cache then do full denormalize
      else {
        const trackingIndex = this.dependencies.length;
        cycleCacheKey.set(pk, trackingIndex);
        this.dependencies.push({ path: { key, pk }, entity });

        /** NON-GLOBAL_CACHE CODE */
        computeValue(localCacheKey);
        /** /END NON-GLOBAL_CACHE CODE */

        cycleCacheKey.delete(pk);
        // if in cycle, use the start of the cycle to track all deps
        // otherwise, we use our own trackingIndex
        const localKey = this.dependencies.slice(
          this.cycleIndex === -1 ? trackingIndex : this.cycleIndex,
        );
        const cacheValue: EntityCacheValue = {
          dependencies: localKey,
          value: localCacheKey.get(pk),
        };
        globalCache.set(localKey, cacheValue);

        // start of cycle - reset cycle detection
        if (this.cycleIndex === trackingIndex) {
          this.cycleIndex = -1;
        }
      }
    } else {
      // cycle detected
      if (cycleCacheKey.has(pk)) {
        this.cycleIndex = cycleCacheKey.get(pk)!;
      } else {
        // with no cycle, globalCacheEntry will have already been set
        this.dependencies.push({ path: { key, pk }, entity });
      }
    }
    return localCacheKey.get(pk);
  }

  private getCacheKey(key: string) {
    if (!this.localCache.has(key)) {
      this.localCache.set(key, new Map());
    }
    if (!this.cycleCache.has(key)) {
      this.cycleCache.set(key, new Map());
    }
    const localCacheKey = this.localCache.get(key)!;
    const cycleCacheKey = this.cycleCache.get(key)!;
    return { localCacheKey, cycleCacheKey };
  }

  /** Cache varies based on input (=== aka reference) */
  getResults(
    input: any,
    cachable: boolean,
    computeValue: () => any,
  ): {
    data: any;
    paths: EntityPath[];
  } {
    if (!cachable) {
      return { data: computeValue(), paths: this.paths() };
    }

    let [data, paths] = this._resultCache.get(input, this._getEntity);

    if (paths === undefined) {
      data = computeValue();
      // we want to do this before we add our 'input' entry
      paths = this.paths();
      // for the first entry, `path` is ignored so empty members is fine
      this.dependencies.unshift({ path: { key: '', pk: '' }, entity: input });
      this._resultCache.set(this.dependencies, data);
    } else {
      paths.shift();
    }
    return { data, paths };
  }

  protected paths() {
    return this.dependencies.map(dep => dep.path);
  }
}

interface EntityCacheValue {
  dependencies: Dep<EntityPath>[];
  value: object | typeof INVALID | undefined;
}
