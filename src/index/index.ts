import { BaseDriver } from '../drivers/BaseDriver';
import { IndexSpecification, CreateIndexesOptions, IndexDescription } from '../types/index';

/**
 * Create an index on a collection (supports unique, fulltext, spatial)
 */
export async function createIndex(driver: BaseDriver, collection: string, indexSpec: IndexSpecification, options?: CreateIndexesOptions & { type?: 'fulltext' | 'spatial' }): Promise<string> {
  // For demo: only unique/fulltext/spatial flags, not full SQL
  return driver.createIndex(collection, indexSpec, options);
}

/**
 * Drop an index from a collection
 */
export async function dropIndex(driver: BaseDriver, collection: string, indexName: string): Promise<void> {
  return driver.dropIndex(collection, indexName);
}

/**
 * List indexes on a collection
 */
export async function listIndexes(driver: BaseDriver, collection: string): Promise<IndexDescription[]> {
  return driver.listIndexes(collection);
}

/**
 * Alter a collection (add/drop column, change type, etc.)
 */
export async function alterCollection(driver: BaseDriver, collection: string, alterSQL: string): Promise<void> {
  await driver.query(alterSQL);
} 