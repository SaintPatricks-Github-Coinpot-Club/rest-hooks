import { isImmutable } from './ImmutableUtils.js';

export default class PolymorphicSchema {
  private declare _schemaAttribute: any;
  protected schema: any;

  constructor(
    definition: any,
    schemaAttribute?: string | ((...args: any) => any),
  ) {
    if (schemaAttribute) {
      this._schemaAttribute =
        typeof schemaAttribute === 'string' ?
          (input: any) => input[schemaAttribute]
        : schemaAttribute;
    }
    this.define(definition);
  }

  get isSingleSchema() {
    return !this._schemaAttribute;
  }

  define(definition: any) {
    // sending Union into another Polymorphic gets hoisted
    if ('_schemaAttribute' in definition && !this._schemaAttribute) {
      this.schema = definition.schema;
      this._schemaAttribute = definition._schemaAttribute;
    } else {
      this.schema = definition;
    }
  }

  getSchemaAttribute(input: any, parent: any, key: any) {
    return !this.isSingleSchema && this._schemaAttribute(input, parent, key);
  }

  inferSchema(input: any, parent: any, key: any) {
    if (this.isSingleSchema) {
      return this.schema;
    }

    const attr = this.getSchemaAttribute(input, parent, key);
    return this.schema[attr];
  }

  normalizeValue(
    value: any,
    parent: any,
    key: any,
    visit: any,
    addEntity: any,
    visitedEntities: any,
    storeEntities: any,
    args?: any[],
  ) {
    if (!value) return value;
    const schema = this.inferSchema(value, parent, key);
    if (!schema) {
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production') {
        const attr = this.getSchemaAttribute(value, parent, key);
        console.warn(
          `Schema attribute ${JSON.stringify(
            attr,
            undefined,
            2,
          )} is not expected.
Expected one of: ${Object.keys(this.schema)
            .map(k => `"${k}"`)
            .join(', ')}

Value: ${JSON.stringify(value, undefined, 2)}`,
        );
      }
      return value;
    }
    const normalizedValue = visit(
      value,
      parent,
      key,
      schema,
      addEntity,
      visitedEntities,
      storeEntities,
      args,
    );
    return (
        this.isSingleSchema ||
          normalizedValue === undefined ||
          normalizedValue === null
      ) ?
        normalizedValue
      : {
          id: normalizedValue,
          schema: this.getSchemaAttribute(value, parent, key),
        };
  }

  // value is guaranteed by caller to not be null
  denormalizeValue(value: any, unvisit: any) {
    const schemaKey =
      !this.isSingleSchema &&
      value &&
      (isImmutable(value) ? value.get('schema') : value.schema);
    if (!this.isSingleSchema && !schemaKey) {
      // denormalize should also handle 'passthrough' values (not normalized) and still
      // construct the correct Entity instance
      if (typeof value === 'object' && value !== null) {
        const schema = this.inferSchema(value, undefined, undefined);
        if (schema) return unvisit(value, schema);
      }
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production' && value) {
        console.warn(
          `TypeError: Unable to infer schema for ${this.constructor.name}
Value: ${JSON.stringify(value, undefined, 2)}.`,
        );
      }
      return value;
    }
    const id =
      this.isSingleSchema ? undefined
      : isImmutable(value) ? value.get('id')
      : value.id;
    const schema = this.isSingleSchema ? this.schema : this.schema[schemaKey];
    return unvisit(id || value, schema);
  }
}
