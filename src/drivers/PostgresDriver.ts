/**
 * PostgreSQL driver for StratisQL
 * @class PostgresDriver
 * @extends BaseDriver
 */
import { Pool, PoolClient } from 'pg';
import { BaseDriver } from './BaseDriver';
import { StratisQLConfig, ClientSession, Document, IndexSpecification, CreateIndexesOptions, IndexDescription } from '../types';
import { StratisQLError } from '../errors/StratisQLError';
import { logger } from '../utils/logger';

export class PostgresDriver extends BaseDriver {
  private pool: Pool;

  constructor(config: StratisQLConfig) {
    super(config);
    this.pool = new Pool({
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.database,
      port: config.port || 5432,
      max: 10,
    });
  }

  /**
   * Enhanced connect with auto-reconnect logic
   */
  async connect(): Promise<void> {
    let retries = 3;
    while (retries > 0) {
      try {
        await this.pool.connect();
        return;
      } catch (err) {
        retries--;
        if (retries === 0) throw new StratisQLError('Failed to connect to PostgreSQL after retries', 'PG_CONNECT', err);
        await new Promise(res => setTimeout(res, 1000));
      }
    }
  }

  /** Disconnect from the PostgreSQL database */
  async disconnect(): Promise<void> {
    await this.pool.end();
  }

  /** Health check for the PostgreSQL connection pool */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (err) {
      logger.error('Postgres health check failed', err);
      return false;
    }
  }

  /** Execute a parameterized query */
  async query<T = any>(sql: string, params: any[] = [], session?: ClientSession): Promise<T[]> {
    try {
      const client = session?.session as PoolClient | undefined;
      const result = client ? await client.query(sql, params) : await this.pool.query(sql, params);
      return result.rows as T[];
    } catch (err) {
      throw new StratisQLError('PostgreSQL query failed', 'PG_QUERY', err);
    }
  }

  /**
   * Start a transaction and return a session
   * @param isolationLevel Optional isolation level (e.g., 'READ COMMITTED')
   * @param savepointName Optional savepoint name for nested transactions
   */
  async startSession(isolationLevel?: string, savepointName?: string): Promise<ClientSession> {
    const client = await this.pool.connect();
    if (isolationLevel) {
      await client.query(`BEGIN ISOLATION LEVEL ${isolationLevel}`);
    } else {
      await client.query('BEGIN');
    }
    if (savepointName) {
      await client.query(`SAVEPOINT ${savepointName}`);
    }
    return { session: client };
  }

  /** Commit a transaction */
  async commit(session: ClientSession): Promise<void> {
    const client = session.session as PoolClient;
    await client.query('COMMIT');
  }

  /** Rollback a transaction */
  async rollback(session: ClientSession): Promise<void> {
    const client = session.session as PoolClient;
    await client.query('ROLLBACK');
  }

  /** Release a session/connection */
  async release(session: ClientSession): Promise<void> {
    const client = session.session as PoolClient;
    client.release();
  }

  /**
   * Create a savepoint in the current transaction
   */
  async createSavepoint(session: ClientSession, name: string): Promise<void> {
    const client = session.session as PoolClient;
    await client.query(`SAVEPOINT ${name}`);
  }

  /**
   * Release a savepoint
   */
  async releaseSavepoint(session: ClientSession, name: string): Promise<void> {
    const client = session.session as PoolClient;
    await client.query(`RELEASE SAVEPOINT ${name}`);
  }

  /**
   * Rollback to a savepoint
   */
  async rollbackToSavepoint(session: ClientSession, name: string): Promise<void> {
    const client = session.session as PoolClient;
    await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
  }

  /** Get the SQL dialect name */
  getDialect(): string {
    return 'postgres';
  }

  /** Check if a table exists */
  async tableExists(table: string): Promise<boolean> {
    const sql = `SELECT to_regclass($1) as exists`;
    const rows = await this.query(sql, [table]);
    return !!rows[0]?.exists;
  }

  /** Create a table for a collection (simple schema: id SERIAL PRIMARY KEY, data JSONB) */
  async createTable(collection: string, schema: Document): Promise<void> {
    const sql = `CREATE TABLE IF NOT EXISTS "${collection}" (id SERIAL PRIMARY KEY, data JSONB)`;
    await this.query(sql);
  }

  /** Drop a table */
  async dropTable(collection: string): Promise<void> {
    const sql = `DROP TABLE IF EXISTS "${collection}"`;
    await this.query(sql);
  }

  /** List all tables */
  async listTables(): Promise<string[]> {
    const sql = `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
    const rows = await this.query(sql);
    return rows.map((row: any) => row.tablename);
  }

  /** Create an index */
  async createIndex(collection: string, indexSpec: IndexSpecification, options?: CreateIndexesOptions): Promise<string> {
    const fields = Object.keys(indexSpec).map(f => `"data"->>'${f}'`).join(', ');
    const name = options?.name || `idx_${Object.keys(indexSpec).join('_')}`;
    const unique = options?.unique ? 'UNIQUE' : '';
    const sql = `CREATE ${unique} INDEX IF NOT EXISTS "${name}" ON "${collection}" (${fields})`;
    await this.query(sql);
    return name;
  }

  /** Drop an index */
  async dropIndex(collection: string, indexName: string): Promise<void> {
    const sql = `DROP INDEX IF EXISTS "${indexName}"`;
    await this.query(sql);
  }

  /** List indexes */
  async listIndexes(collection: string): Promise<IndexDescription[]> {
    const sql = `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = $1`;
    const rows = await this.query(sql, [collection]);
    return rows.map((row: any) => ({
      name: row.indexname,
      key: {}, // Not easily parsed from indexdef, left empty for now
      unique: row.indexdef.includes('UNIQUE'),
    }));
  }
} 