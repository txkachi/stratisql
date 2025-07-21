/**
 * CRUD operations for StratisQL
 * @module crud
 */
import { BaseDriver } from '../drivers/BaseDriver';
import {
  Document,
  Filter,
  FindOptions,
  UpdateFilter,
  UpdateOptions,
  InsertOneResult,
  InsertManyResult,
  UpdateResult,
  DeleteResult
} from '../types';
import { StratisQLError } from '../errors/StratisQLError';
import { buildWhereClause } from '../utils/helpers';

/**
 * Insert a single document into a collection
 */
export async function insertOne<T>(driver: BaseDriver, collection: string, doc: T): Promise<InsertOneResult<T>> {
  // Ensure table exists
  if (!(await driver.tableExists(collection))) {
    await driver.createTable(collection, doc as Document);
  }
  const sql = `INSERT INTO \`${collection}\` (data) VALUES (?)`;
  const params = [JSON.stringify(doc)];
  const result: any = await driver.query(sql, params);
  return {
    acknowledged: true,
    insertedId: result.insertId || null,
    inserted: doc,
  };
}

/**
 * Insert multiple documents into a collection
 */
export async function insertMany<T>(driver: BaseDriver, collection: string, docs: T[]): Promise<InsertManyResult<T>> {
  if (!(await driver.tableExists(collection))) {
    await driver.createTable(collection, docs[0] as Document);
  }
  const sql = `INSERT INTO \`${collection}\` (data) VALUES ${docs.map(() => '(?)').join(', ')}`;
  const params = docs.map(d => JSON.stringify(d));
  const result: any = await driver.query(sql, params);
  return {
    acknowledged: true,
    insertedIds: result.insertId ? Array.from({ length: docs.length }, (_, i) => result.insertId + i) : [],
    inserted: docs,
  };
}

/**
 * Find documents in a collection
 */
export async function find<T>(driver: BaseDriver, collection: string, filter: Filter<T> = {}, options: FindOptions = {}): Promise<T[]> {
  if (!(await driver.tableExists(collection))) return [];
  let sql = `SELECT data FROM \`${collection}\``;
  const where = buildWhereClause(filter, driver.getDialect());
  if (where.clause) sql += ` WHERE ${where.clause}`;
  if (options.sort) {
    // Only support sort on top-level fields in data
    const sortFields = Object.entries(options.sort).map(([k, v]) => `JSON_UNQUOTE(JSON_EXTRACT(data, '$.${k}')) ${v === 1 ? 'ASC' : 'DESC'}`);
    if (sortFields.length) sql += ` ORDER BY ${sortFields.join(', ')}`;
  }
  if (options.limit) sql += ` LIMIT ${options.limit}`;
  if (options.skip) sql += ` OFFSET ${options.skip}`;
  const rows = await driver.query(sql, where.params);
  return rows.map((r: any) => JSON.parse(r.data));
}

/**
 * Find a single document in a collection
 */
export async function findOne<T>(driver: BaseDriver, collection: string, filter: Filter<T>, options: FindOptions = {}): Promise<T | null> {
  const docs = await find<T>(driver, collection, filter, { ...options, limit: 1 });
  return docs[0] || null;
}

/**
 * Update a single document in a collection
 */
export async function updateOne<T>(driver: BaseDriver, collection: string, filter: Filter<T>, update: UpdateFilter<T>, options: UpdateOptions = {}): Promise<UpdateResult> {
  // Call updateMany, but only update the first matching document
  const docs = await find<T>(driver, collection, filter, { limit: 1 });
  if (!docs.length) return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
  const doc = docs[0];
  const updated = applyUpdateOperators(doc, update);
  const sql = `UPDATE \`${collection}\` SET data = ? WHERE JSON_EXTRACT(data, '$.id') = ?`;
  await driver.query(sql, [JSON.stringify(updated), (doc as any).id]);
  return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
}

/**
 * Update multiple documents in a collection
 */
export async function updateMany<T>(driver: BaseDriver, collection: string, filter: Filter<T>, update: UpdateFilter<T>, options: UpdateOptions = {}): Promise<UpdateResult> {
  if (!(await driver.tableExists(collection))) return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
  // Find matching rows
  const docs = await find<T>(driver, collection, filter);
  if (!docs.length) return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
  let modifiedCount = 0;
  let limit = (options as any).limit;
  for (let i = 0; i < docs.length; i++) {
    if (limit && modifiedCount >= limit) break;
    const doc = docs[i];
    const updated = applyUpdateOperators(doc, update);
    const sql = `UPDATE \`${collection}\` SET data = ? WHERE JSON_EXTRACT(data, '$.id') = ?`;
    await driver.query(sql, [JSON.stringify(updated), (doc as any).id]);
    modifiedCount++;
  }
  return { acknowledged: true, matchedCount: docs.length, modifiedCount };
}

/**
 * Delete a single document in a collection
 */
export async function deleteOne<T>(driver: BaseDriver, collection: string, filter: Filter<T>): Promise<DeleteResult> {
  return deleteMany(driver, collection, filter, 1);
}

/**
 * Delete multiple documents in a collection
 */
export async function deleteMany<T>(driver: BaseDriver, collection: string, filter: Filter<T>, limit?: number): Promise<DeleteResult> {
  if (!(await driver.tableExists(collection))) return { acknowledged: true, deletedCount: 0 };
  const docs = await find<T>(driver, collection, filter);
  let deletedCount = 0;
  for (let i = 0; i < docs.length; i++) {
    if (limit && deletedCount >= limit) break;
    const doc = docs[i];
    const sql = `DELETE FROM \`${collection}\` WHERE JSON_EXTRACT(data, '$.id') = ?`;
    await driver.query(sql, [(doc as any).id]);
    deletedCount++;
  }
  return { acknowledged: true, deletedCount };
}

/**
 * Count documents in a collection
 */
export async function countDocuments<T>(driver: BaseDriver, collection: string, filter: Filter<T> = {}): Promise<number> {
  if (!(await driver.tableExists(collection))) return 0;
  let sql = `SELECT COUNT(*) as count FROM \`${collection}\``;
  const where = buildWhereClause(filter, driver.getDialect());
  if (where.clause) sql += ` WHERE ${where.clause}`;
  const rows = await driver.query(sql, where.params);
  return rows[0]?.count || 0;
}

/**
 * Find documents with advanced cursor-based pagination
 * @param driver The database driver
 * @param collection The collection name
 * @param filter Query filter
 * @param options Find options (cursorField, cursorValue, limit, reverse, count)
 * @returns { data: T[], nextCursor?: any, totalCount?: number }
 */
export async function findWithCursor<T>(driver: BaseDriver, collection: string, filter: Filter<T> = {}, options: FindOptions & { cursorField?: string; cursorValue?: any; limit?: number; reverse?: boolean; count?: boolean } = {}): Promise<{ data: T[]; nextCursor?: any; totalCount?: number }> {
  const { cursorField = 'id', cursorValue, limit = 10, reverse = false, count = false, sort = { [cursorField]: reverse ? -1 : 1 } } = options;
  let cursorFilter: Filter<T> = { ...filter };
  if (cursorValue !== undefined && cursorValue !== null) {
    cursorFilter = {
      ...cursorFilter,
      ...(reverse
        ? { [cursorField]: { $lt: cursorValue } }
        : { [cursorField]: { $gt: cursorValue } })
    };
  }
  const data = await find<T>(driver, collection, cursorFilter, { ...options, sort, limit });
  const nextCursor = data.length === limit ? (data[data.length - 1] as any)?.[cursorField] : undefined;
  let totalCount: number | undefined = undefined;
  if (count) {
    totalCount = await countDocuments<T>(driver, collection, filter);
  }
  return { data, nextCursor, totalCount };
}

// --- Helper functions ---

/** Apply MongoDB-like update operators to a document */
function applyUpdateOperators<T>(doc: T, update: UpdateFilter<T>): T {
  let updated = { ...doc };
  if (update.$set) {
    updated = { ...updated, ...update.$set };
  }
  if (update.$inc) {
    for (const k in update.$inc) {
      (updated as any)[k] = ((updated as any)[k] || 0) + update.$inc[k]!;
    }
  }
  if (update.$push) {
    for (const k in update.$push) {
      if (!Array.isArray((updated as any)[k])) (updated as any)[k] = [];
      (updated as any)[k].push(update.$push[k]);
    }
  }
  if (update.$pull) {
    if (update.$pull) {
      for (const k in update.$pull) {
        if (Array.isArray((updated as any)[k])) {
          (updated as any)[k] = (updated as any)[k].filter((v: any) => v !== update.$pull![k]);
        }
      }
    }
  }
    return updated;
}