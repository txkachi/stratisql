/**
 * MySQL driver for StratisQL
 * @class MySQLDriver
 * @extends BaseDriver
 */
import mysql, { Pool, PoolConnection } from 'mysql2/promise';
import { BaseDriver } from './BaseDriver';
import { StratisQLConfig, ClientSession, Document, IndexSpecification, CreateIndexesOptions, IndexDescription } from '../types';
import { StratisQLError } from '../errors/StratisQLError';
import { logger } from '../utils/logger';

export class MySQLDriver extends BaseDriver {
  private pool: Pool;

  constructor(config: StratisQLConfig) {
    super(config);
    this.pool = mysql.createPool({
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.database,
      port: config.port || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  /** Connect to the MySQL database */
  async connect(): Promise<void> {
    try {
      await this.pool.getConnection();
    } catch (err) {
      throw new StratisQLError('Failed to connect to MySQL', 'MYSQL_CONNECT', err);
    }
  }

  /** Disconnect from the MySQL database */
  async disconnect(): Promise<void> {
    await this.pool.end();
  }

  /** Health check for the MySQL connection pool */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (err) {
      logger.error('MySQL health check failed', err);
      return false;
    }
  }

  /** Execute a parameterized query */
  async query<T = any>(sql: string, params: any[] = [], session?: ClientSession): Promise<T[]> {
    try {
      const conn = session?.session as PoolConnection | undefined;
      const [rows] = conn ? await conn.query(sql, params) : await this.pool.query(sql, params);
      return rows as T[];
    } catch (err) {
      throw new StratisQLError('MySQL query failed', 'MYSQL_QUERY', err);
    }
  }

  /** Start a transaction and return a session */
  async startSession(): Promise<ClientSession> {
    const conn = await this.pool.getConnection();
    await conn.beginTransaction();
    return { session: conn };
  }

  /** Commit a transaction */
  async commit(session: ClientSession): Promise<void> {
    const conn = session.session as PoolConnection;
    await conn.commit();
  }

  /** Rollback a transaction */
  async rollback(session: ClientSession): Promise<void> {
    const conn = session.session as PoolConnection;
    await conn.rollback();
  }

  /** Release a session/connection */
  async release(session: ClientSession): Promise<void> {
    const conn = session.session as PoolConnection;
    await conn.release();
  }

  /** Get the SQL dialect name */
  getDialect(): string {
    return 'mysql';
  }

  /** Check if a table exists */
  async tableExists(table: string): Promise<boolean> {
    const sql = 'SHOW TABLES LIKE ?';
    const rows = await this.query(sql, [table]);
    return rows.length > 0;
  }

  /** Create a table for a collection (simple schema: id INT AUTO_INCREMENT PRIMARY KEY, data JSON) */
  async createTable(collection: string, schema: Document): Promise<void> {
    const sql = `CREATE TABLE IF NOT EXISTS \`${collection}\` (id INT AUTO_INCREMENT PRIMARY KEY, data JSON)`;
    await this.query(sql);
  }

  /** Drop a table */
  async dropTable(collection: string): Promise<void> {
    const sql = `DROP TABLE IF EXISTS \`${collection}\``;
    await this.query(sql);
  }

  /** List all tables */
  async listTables(): Promise<string[]> {
    const sql = 'SHOW TABLES';
    const rows = await this.query(sql);
    return rows.map((row: any) => String(Object.values(row)[0]));
  }

  /** Create an index */
  async createIndex(collection: string, indexSpec: IndexSpecification, options?: CreateIndexesOptions): Promise<string> {
    const fields = Object.keys(indexSpec).map(f => `\`${f}\``).join(', ');
    const name = options?.name || `idx_${Object.keys(indexSpec).join('_')}`;
    const unique = options?.unique ? 'UNIQUE' : '';
    const sql = `CREATE ${unique} INDEX \`${name}\` ON \`${collection}\` (${fields})`;
    await this.query(sql);
    return name;
  }

  /** Drop an index */
  async dropIndex(collection: string, indexName: string): Promise<void> {
    const sql = `DROP INDEX \`${indexName}\` ON \`${collection}\``;
    await this.query(sql);
  }

  /** List indexes */
  async listIndexes(collection: string): Promise<IndexDescription[]> {
    const sql = `SHOW INDEX FROM \`${collection}\``;
    const rows = await this.query(sql);
    const indexes: IndexDescription[] = [];
    for (const row of rows) {
      indexes.push({
        name: row.Key_name,
        key: { [row.Column_name]: row.Non_unique ? 1 : -1 },
        unique: !row.Non_unique,
      });
    }
    return indexes;
  }
} 