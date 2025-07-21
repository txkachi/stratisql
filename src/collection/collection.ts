import { BaseDriver } from '../drivers/BaseDriver';
import { CreateCollectionOptions, Collection, Document } from '../types/index';
import { compileSchema, validateDoc, inferSchema } from '../utils/schema';

const collectionSchemas: Map<string, any> = new Map();

/**
 * Create a collection (table) and register schema
 */
export async function createCollection(driver: BaseDriver, name: string, options?: CreateCollectionOptions & { schema?: Document }): Promise<Collection> {
  await driver.createTable(name, {});
  if (options?.schema) {
    // Fix: compileSchema expects a JSONSchemaType, not a Document.
    // So, only pass options.schema if it is a valid JSONSchemaType.
    // If not, throw an error or convert as needed.
    // Here, we assume options.schema is already a valid JSONSchemaType.
    const validator = compileSchema(options.schema as any);
    collectionSchemas.set(name, validator);
  }
  return { name };
}

/**
 * Validate a document against the collection schema
 */
export function validateCollectionDoc(collection: string, doc: Document): boolean {
  const validator = collectionSchemas.get(collection);
  if (!validator) return true;
  return validateDoc(validator, doc);
}

/**
 * Infer and register schema from a sample document
 */
export function registerInferredSchema(collection: string, doc: Document): void {
  const schema = inferSchema(doc);
  // Fix: compileSchema expects a JSONSchemaType, so ensure schema is typed as such
  const validator = compileSchema(schema as any);
  collectionSchemas.set(collection, validator);
}
/*
 * Drop a collection (table)
 */
export async function dropCollection(driver: BaseDriver, name: string): Promise<void> {
  await driver.dropTable(name);
  collectionSchemas.delete(name);
}

/**
 * List all collections (tables)
 */
export async function listCollections(driver: BaseDriver): Promise<string[]> {
  return driver.listTables();
} 