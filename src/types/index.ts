/**
 * StratisQL Type Definitions
 * @module types
 */

/** Supported SQL drivers */
export type StratisQLDriver = 'mysql' | 'postgres';

/** Database connection config */
export interface StratisQLConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port?: number;
}

/** Main StratisQL options */
export interface StratisQLOptions {
  driver: StratisQLDriver;
  config: StratisQLConfig;
}

/** Generic document type */
export type Document = Record<string, any>;

/** Filter type for queries */
export type Filter<T> = Partial<T> & {
  [key: string]: any;
};

/** Find options */
export interface FindOptions {
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
  projection?: Record<string, 0 | 1>;
}

/** Update filter for atomic operations */
export type UpdateFilter<T> = {
  $set?: Partial<T>;
  $inc?: Partial<Record<keyof T, number>>;
  $push?: Partial<Record<keyof T, any>>;
  $pull?: Partial<Record<keyof T, any>>;
  [key: string]: any;
};

/** Update options */
export interface UpdateOptions {
  upsert?: boolean;
}

/** InsertOne result */
export interface InsertOneResult<T> {
  acknowledged: boolean;
  insertedId: any;
  inserted: T;
}

/** InsertMany result */
export interface InsertManyResult<T> {
  acknowledged: boolean;
  insertedIds: any[];
  inserted: T[];
}

/** Update result */
export interface UpdateResult {
  acknowledged: boolean;
  matchedCount: number;
  modifiedCount: number;
  upsertedId?: any;
}

/** Delete result */
export interface DeleteResult {
  acknowledged: boolean;
  deletedCount: number;
}

/** Aggregate options */
export interface AggregateOptions {
  allowDiskUse?: boolean;
}

/** Client session for transactions */
export interface ClientSession {
  /** Internal session object for driver */
  readonly session: any;
}

/** Index specification */
export type IndexSpecification = Record<string, 1 | -1>;

/** Create indexes options */
export interface CreateIndexesOptions {
  unique?: boolean;
  name?: string;
}

/** Index description */
export interface IndexDescription {
  name: string;
  key: IndexSpecification;
  unique?: boolean;
}

/** Create collection options */
export interface CreateCollectionOptions {
  /** If true, create as temporary table */
  temporary?: boolean;
}

/** Collection object */
export interface Collection {
  name: string;
} 