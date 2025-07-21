import { BaseDriver } from '../drivers/BaseDriver';
import { Document, AggregateOptions } from '../types/index';
import { buildWhereClause } from '../utils/helpers';

/**
 * Aggregate documents using a MongoDB-like pipeline.
 * Supports $match, $sort, $group, $project, $limit, $skip, $unwind stages.
 *
 * @template T
 * @param driver The database driver
 * @param collection The collection name
 * @param pipeline Aggregation pipeline
 * @param options Aggregate options
 * @returns Aggregated documents
 */
export async function aggregate<T>(driver: BaseDriver, collection: string, pipeline: Document[], options: AggregateOptions = {}): Promise<T[]> {
  let sql = `SELECT data`;
  let groupStage: Document | null = null;
  let projectStage: Document | null = null;
  let whereClause = '';
  let whereParams: any[] = [];
  let sortClause = '';
  let limitClause = '';
  let offsetClause = '';

  // Parse pipeline stages
  for (const stage of pipeline) {
    if (stage.$match) {
      const where = buildWhereClause(stage.$match, driver.getDialect());
      whereClause = where.clause;
      whereParams = where.params;
    }
    if (stage.$sort) {
      const sortFields = Object.entries(stage.$sort).map(
        ([k, v]) => `${driver.getDialect() === 'postgres' ? `data->>'${k}'` : `JSON_UNQUOTE(JSON_EXTRACT(data, '$.${k}'))`} ${v === 1 ? 'ASC' : 'DESC'}`
      );
      sortClause = `ORDER BY ${sortFields.join(', ')}`;
    }
    if (stage.$group) {
      groupStage = stage.$group;
    }
    if (stage.$project) {
      projectStage = stage.$project;
    }
    if (stage.$limit) {
      limitClause = `LIMIT ${Number(stage.$limit)}`;
    }
    if (stage.$skip) {
      offsetClause = `OFFSET ${Number(stage.$skip)}`;
    }
    // $unwind is not natively supported in SQL, would require JSON_TABLE or lateral joins
  }

  // Handle $group (only simple _id and accumulators like $sum, $avg, $min, $max)
  if (groupStage) {
    const groupId = groupStage._id;
    const accumFields = Object.keys(groupStage).filter(k => k !== '_id');
    const groupExprs = accumFields.map(field => {
      const expr = groupStage[field];
      if (typeof expr === 'object' && expr !== null) {
        if (expr.$sum) return `SUM(CAST(data->>'${expr.$sum}' AS NUMERIC)) AS "${field}"`;
        if (expr.$avg) return `AVG(CAST(data->>'${expr.$avg}' AS NUMERIC)) AS "${field}"`;
        if (expr.$min) return `MIN(data->>'${expr.$min}') AS "${field}"`;
        if (expr.$max) return `MAX(data->>'${expr.$max}') AS "${field}"`;
      }
      return '';
    });
    sql = `SELECT data->>'${groupId}' AS _id${groupExprs.length ? ', ' + groupExprs.join(', ') : ''} FROM "${collection}"`;
    if (whereClause) sql += ` WHERE ${whereClause}`;
    sql += ` GROUP BY data->>'${groupId}'`;
    if (sortClause) sql += ` ${sortClause}`;
    if (limitClause) sql += ` ${limitClause}`;
    if (offsetClause) sql += ` ${offsetClause}`;
    const rows = await driver.query(sql, whereParams);
    return rows as T[];
  }

  // Default: simple find with projection
  sql = `SELECT data FROM "${collection}"`;
  if (whereClause) sql += ` WHERE ${whereClause}`;
  if (sortClause) sql += ` ${sortClause}`;
  if (limitClause) sql += ` ${limitClause}`;
  if (offsetClause) sql += ` ${offsetClause}`;
  const rows = await driver.query(sql, whereParams);
  let result = rows.map((r: any) => JSON.parse(r.data));

  // Handle $project in JS (SQL projection for performance can be added later)
  if (projectStage) {
    result = result.map((doc: any) => {
      const projected: any = {};
      for (const key in projectStage) {
        if (projectStage[key]) projected[key] = doc[key];
      }
      return projected;
    });
  }

  // $unwind is not natively supported, can be emulated in JS for arrays
  for (const stage of pipeline) {
    if (stage.$unwind) {
      const path = stage.$unwind.replace(/^\$/, '');
      const unwound: any[] = [];
      for (const doc of result) {
        if (Array.isArray(doc[path])) {
          for (const val of doc[path]) {
            unwound.push({ ...doc, [path]: val });
          }
        } else {
          unwound.push(doc);
        }
      }
      result = unwound;
    }
  }

  return result;
} 