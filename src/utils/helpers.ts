import { Document } from '../types/index';

/**
 * Build a SQL WHERE clause from a MongoDB-like filter object.
 * Supports $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin, $or, $and, $not operators.
 *
 * @param filter The filter object
 * @param dialect SQL dialect ('mysql' or 'postgres')
 * @returns { clause: string, params: any[] }
 */
export function buildWhereClause(filter: Document, dialect: string): { clause: string; params: any[] } {
  const clauses: string[] = [];
  const params: any[] = [];

  function parseKey(key: string): string {
    if (dialect === 'postgres') {
      return `data->>'${key}'`;
    } else {
      return `JSON_UNQUOTE(JSON_EXTRACT(data, '$.${key}'))`;
    }
  }

  function parseCondition(key: string, value: any): string {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const subClauses: string[] = [];
      for (const op in value) {
        switch (op) {
          case '$eq':
            subClauses.push(`${parseKey(key)} = ?`);
            params.push(value[op]);
            break;
          case '$ne':
            subClauses.push(`${parseKey(key)} <> ?`);
            params.push(value[op]);
            break;
          case '$gt':
            subClauses.push(`${parseKey(key)} > ?`);
            params.push(value[op]);
            break;
          case '$gte':
            subClauses.push(`${parseKey(key)} >= ?`);
            params.push(value[op]);
            break;
          case '$lt':
            subClauses.push(`${parseKey(key)} < ?`);
            params.push(value[op]);
            break;
          case '$lte':
            subClauses.push(`${parseKey(key)} <= ?`);
            params.push(value[op]);
            break;
          case '$in':
            subClauses.push(`${parseKey(key)} IN (${value[op].map(() => '?').join(', ')})`);
            params.push(...value[op]);
            break;
          case '$nin':
            subClauses.push(`${parseKey(key)} NOT IN (${value[op].map(() => '?').join(', ')})`);
            params.push(...value[op]);
            break;
          case '$not':
            // $not can wrap another operator
            const notCond = parseCondition(key, value[op]);
            subClauses.push(`NOT (${notCond})`);
            break;
          default:
            // Unknown operator, ignore
            break;
        }
      }
      return subClauses.join(' AND ');
    } else {
      // Simple equality
      params.push(value);
      return `${parseKey(key)} = ?`;
    }
  }

  for (const key in filter) {
    if (key === '$or' && Array.isArray(filter[key])) {
      const orClauses = filter[key].map((cond: any) => {
        const { clause } = buildWhereClause(cond, dialect);
        return `(${clause})`;
      });
      clauses.push(`(${orClauses.join(' OR ')})`);
    } else if (key === '$and' && Array.isArray(filter[key])) {
      const andClauses = filter[key].map((cond: any) => {
        const { clause } = buildWhereClause(cond, dialect);
        return `(${clause})`;
      });
      clauses.push(`(${andClauses.join(' AND ')})`);
    } else if (key === '$not' && typeof filter[key] === 'object') {
      const { clause } = buildWhereClause(filter[key], dialect);
      clauses.push(`NOT (${clause})`);
    } else {
      const cond = parseCondition(key, filter[key]);
      if (cond) clauses.push(cond);
    }
  }

  return {
    clause: clauses.join(' AND '),
    params,
  };
} 