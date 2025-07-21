import { StratisQLOptions, StratisQLDriver, StratisQLConfig, Document, Filter, FindOptions, UpdateFilter, UpdateOptions, InsertOneResult, InsertManyResult, UpdateResult, DeleteResult, AggregateOptions, ClientSession, IndexSpecification, CreateIndexesOptions, IndexDescription, CreateCollectionOptions, Collection } from './types/index';
import { MySQLDriver } from './drivers/MySQLDriver';
import { PostgresDriver } from './drivers/PostgresDriver';
import { BaseDriver } from './drivers/BaseDriver';
import * as crud from './crud/crud';
import * as aggregate from './aggregate/aggregate';
import * as transaction from './transaction/transaction';
import * as index from './index/index';
import * as collection from './collection/collection';
import { StratisQLError } from './errors/StratisQLError';

/**
 * Main StratisQL database class
 * @class StratisQL
 */
export class StratisQL {
  private driver: BaseDriver;

  /**
   * Create a new StratisQL instance
   * @param options StratisQL options
   */
  constructor(options: StratisQLOptions) {
    if (options.driver === 'mysql') {
      this.driver = new MySQLDriver(options.config);
    } else if (options.driver === 'postgres') {
      this.driver = new PostgresDriver(options.config);
    } else {
      throw new StratisQLError('Unsupported driver', 'CONFIG');
    }
  }

  /** Connect to the database */
  async connect(): Promise<void> {
    await this.driver.connect();
  }

  /** Disconnect from the database */
  async disconnect(): Promise<void> {
    await this.driver.disconnect();
  }

  // --- CRUD Operations ---

  /** Insert a single document */
  async insertOne<T>(collection: string, doc: T): Promise<InsertOneResult<T>> {
    return crud.insertOne<T>(this.driver, collection, doc);
  }

  /** Insert multiple documents */
  async insertMany<T>(collection: string, docs: T[]): Promise<InsertManyResult<T>> {
    return crud.insertMany<T>(this.driver, collection, docs);
  }

  /** Find documents */
  async find<T>(collection: string, filter: Filter<T> = {}, options: FindOptions = {}): Promise<T[]> {
    return crud.find<T>(this.driver, collection, filter, options);
  }

  /** Find a single document */
  async findOne<T>(collection: string, filter: Filter<T>, options: FindOptions = {}): Promise<T | null> {
    return crud.findOne<T>(this.driver, collection, filter, options);
  }

  /** Update a single document */
  async updateOne<T>(collection: string, filter: Filter<T>, update: UpdateFilter<T>, options: UpdateOptions = {}): Promise<UpdateResult> {
    return crud.updateOne<T>(this.driver, collection, filter, update, options);
  }

  /** Update multiple documents */
  async updateMany<T>(collection: string, filter: Filter<T>, update: UpdateFilter<T>, options: UpdateOptions = {}): Promise<UpdateResult> {
    return crud.updateMany<T>(this.driver, collection, filter, update, options);
  }

  /** Delete a single document */
  async deleteOne<T>(collection: string, filter: Filter<T>): Promise<DeleteResult> {
    return crud.deleteOne<T>(this.driver, collection, filter);
  }

  /** Delete multiple documents */
  async deleteMany<T>(collection: string, filter: Filter<T>): Promise<DeleteResult> {
    return crud.deleteMany<T>(this.driver, collection, filter);
  }

  /** Count documents in a collection */
  async countDocuments<T>(collection: string, filter: Filter<T> = {}): Promise<number> {
    return crud.countDocuments<T>(this.driver, collection, filter);
  }

  // --- Aggregation ---

  /** Aggregate documents using a pipeline */
  async aggregate<T>(collection: string, pipeline: Document[], options: AggregateOptions = {}): Promise<T[]> {
    return aggregate.aggregate<T>(this.driver, collection, pipeline, options);
  }

  // --- Transactions ---

  /** Run operations in a transaction */
  async withTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
    return transaction.withTransaction<T>(this.driver, fn);
  }

  // --- Index Management ---

  /** Create an index */
  async createIndex(collection: string, indexSpec: IndexSpecification, options?: CreateIndexesOptions): Promise<string> {
    return index.createIndex(this.driver, collection, indexSpec, options);
  }

  /** Drop an index */
  async dropIndex(collection: string, indexName: string): Promise<void> {
    return index.dropIndex(this.driver, collection, indexName);
  }

  /** List indexes */
  async listIndexes(collection: string): Promise<IndexDescription[]> {
    return index.listIndexes(this.driver, collection);
  }

  // --- Pagination ---

  /** Find with cursor-based pagination */
  async findWithCursor<T>(collection: string, filter: Filter<T> = {}, options: FindOptions = {}): Promise<{ data: T[]; nextCursor?: any }> {
    return crud.findWithCursor<T>(this.driver, collection, filter, options);
  }

  // --- Collection Management ---

  /** Create a collection */
  async createCollection(name: string, options?: CreateCollectionOptions): Promise<Collection> {
    return collection.createCollection(this.driver, name, options);
  }

  /** Drop a collection */
  async dropCollection(name: string): Promise<void> {
    return collection.dropCollection(this.driver, name);
  }

  /** List all collections */
  async listCollections(): Promise<string[]> {
    return collection.listCollections(this.driver);
  }
} 