/**
 * Abstract base class for SQL drivers in StratisQL
 * @abstract
 */
import { StratisQLConfig, ClientSession, Document, Filter, FindOptions, UpdateFilter, UpdateOptions, AggregateOptions, IndexSpecification, CreateIndexesOptions, IndexDescription, CreateCollectionOptions, Collection } from '../types';

export abstract class BaseDriver {
  protected config: StratisQLConfig;

  constructor(config: StratisQLConfig) {
    this.config = config;
  }

  /** Connect to the database */
  abstract connect(): Promise<void>;
  /** Disconnect from the database */
  abstract disconnect(): Promise<void>;
  /** Execute a parameterized query */
  abstract query<T = any>(sql: string, params?: any[], session?: ClientSession): Promise<T[]>;
  /** Start a transaction and return a session */
  abstract startSession(): Promise<ClientSession>;
  /** Commit a transaction */
  abstract commit(session: ClientSession): Promise<void>;
  /** Rollback a transaction */
  abstract rollback(session: ClientSession): Promise<void>;
  /** Release a session/connection */
  abstract release(session: ClientSession): Promise<void>;
  /** Get the SQL dialect name */
  abstract getDialect(): string;
  /** Check if a table exists */
  abstract tableExists(table: string): Promise<boolean>;
  /** Create a table for a collection */
  abstract createTable(collection: string, schema: Document): Promise<void>;
  /** Drop a table */
  abstract dropTable(collection: string): Promise<void>;
  /** List all tables */
  abstract listTables(): Promise<string[]>;
  /** Create an index */
  abstract createIndex(collection: string, indexSpec: IndexSpecification, options?: CreateIndexesOptions): Promise<string>;
  /** Drop an index */
  abstract dropIndex(collection: string, indexName: string): Promise<void>;
  /** List indexes */
  abstract listIndexes(collection: string): Promise<IndexDescription[]>;
} 