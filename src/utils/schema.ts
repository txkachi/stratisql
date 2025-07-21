import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';
import { Document } from '../types/index';

const ajv = new Ajv();

/**
 * Compile a JSON schema and return a validator function
 * @param schema JSON Schema
 */
export function compileSchema<T>(schema: JSONSchemaType<T>): ValidateFunction<T> {
  return ajv.compile(schema);
}

/**
 * Validate a document against a compiled schema
 * @param validate The compiled validator
 * @param doc The document to validate
 */
export function validateDoc<T>(validate: ValidateFunction<T>, doc: T): boolean {
  return validate(doc) as boolean;
}

/**
 * Infer a JSON schema from a document (basic, for demo)
 * @param doc The document
 */
export function inferSchema(doc: Document): Document {
  const schema: Document = { type: 'object', properties: {}, required: [] };
  for (const key in doc) {
    const val = doc[key];
    if (typeof val === 'number') schema.properties[key] = { type: 'number' };
    else if (typeof val === 'string') schema.properties[key] = { type: 'string' };
    else if (typeof val === 'boolean') schema.properties[key] = { type: 'boolean' };
    else if (Array.isArray(val)) schema.properties[key] = { type: 'array' };
    else if (typeof val === 'object') schema.properties[key] = { type: 'object' };
    schema.required.push(key);
  }
  return schema;
} 