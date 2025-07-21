# StratisQL

[![npm version](https://img.shields.io/npm/v/stratisql.svg)](https://www.npmjs.com/package/stratisql)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js CI](https://github.com/txkachi/stratisql/actions/workflows/node.js.yml/badge.svg)](https://github.com/txkachi/stratisql/actions)
[![npm downloads](https://img.shields.io/npm/dm/stratisql.svg)](https://www.npmjs.com/package/stratisql)
[![license](https://img.shields.io/npm/l/stratisql.svg)](./LICENSE)
[![types](https://img.shields.io/npm/types/stratisql.svg)](https://www.npmjs.com/package/stratisql)


**StratisQL** is a professional, TypeScript-first, MongoDB-like SQL wrapper for Node.js, supporting **MySQL** and **PostgreSQL** natively. It provides a modern, NoSQL-style API for SQL databases, with full CRUD, aggregation, transactions, schema validation, advanced pagination, index/collection management, and more.

---

## Features

- **MongoDB-like API**: `insertOne`, `find`, `updateMany`, `aggregate`, etc.
- **Native MySQL & PostgreSQL**: Uses `mysql2/promise` and `pg` drivers directly.
- **Automatic Table & Index Management**: Collections map to tables, indexes are auto-created as needed.
- **Advanced Aggregation Pipeline**: `$match`, `$sort`, `$group`, `$project`, `$limit`, `$skip`, `$unwind`.
- **Atomic Updates**: `$inc`, `$push`, `$pull` and more.
- **Transactions**: Full support, including nested transactions (savepoints) and isolation levels.
- **Schema Validation**: JSON Schema validation and type inference.
- **Advanced Pagination**: Keyset/cursor, reverse, and total count support.
- **Profiling & Logging**: Query timing, slow query log, error log, fully configurable.
- **Health Check & Auto-Reconnect**: Robust connection management.
- **TypeScript Strict Mode**: Full typings, JSDoc, and strict mode.
- **Extensible & Modular**: Easy to extend for new SQL dialects or features.

---

## Installation

```bash
npm install stratisql mysql2 pg ajv
```

> **Note:** You must install the native driver for your database (`mysql2` for MySQL, `pg` for PostgreSQL) and `ajv` for schema validation.

---

## Quick Start

```typescript
import { StratisQL } from "./src/StratisQL";

const db = new StratisQL({
  driver: "postgres", // or "mysql"
  config: {
    host: "localhost",
    user: "root",
    password: "password",
    database: "mydb",
  },
});

async function main() {
  await db.createCollection("users");

  await db.insertOne("users", {
    id: 1,
    name: "Alice",
    age: 30,
    roles: ["admin"],
  });
  await db.insertMany("users", [
    { id: 2, name: "Bob", age: 25, roles: ["user"] },
    { id: 3, name: "Charlie", age: 28, roles: [] },
  ]);

  const user = await db.findOne("users", { id: 1 });
  console.log(user);

  await db.updateOne(
    "users",
    { id: 2 },
    { $inc: { age: 1 }, $push: { roles: "editor" } }
  );

  const users = await db.find("users", {}, { limit: 10, sort: { age: -1 } });
  console.log(users);

  await db.withTransaction(async (session) => {
    await db.updateOne("users", { id: 1 }, { $pull: { roles: "admin" } });
    await db.deleteOne("users", { id: 3 });
  });

  await db.createIndex("users", { age: 1 });
  const indexes = await db.listIndexes("users");
  console.log(indexes);

  await db.dropCollection("users");
}

main();
```

---

## Configuration

You can configure StratisQL using a config object or environment variables (recommended for production):

```typescript
const db = new StratisQL({
  driver: "mysql",
  config: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: 3306,
  },
});
```

---

## API Reference

### CRUD Operations

- `insertOne<T>(collection, doc)`
- `insertMany<T>(collection, docs)`
- `find<T>(collection, filter?, options?)`
- `findOne<T>(collection, filter, options?)`
- `updateOne<T>(collection, filter, update, options?)`
- `updateMany<T>(collection, filter, update, options?)`
- `deleteOne<T>(collection, filter)`
- `deleteMany<T>(collection, filter)`
- `countDocuments<T>(collection, filter?)`

### Aggregation

- `aggregate<T>(collection, pipeline, options?)`
  - Supports `$match`, `$sort`, `$group`, `$project`, `$limit`, `$skip`, `$unwind`

### Transactions

- `withTransaction<T>(fn, isolationLevel?)`
- `withSavepoint<T>(session, fn, savepointName)`

### Index Management

- `createIndex(collection, indexSpec, options?)`
- `dropIndex(collection, indexName)`
- `listIndexes(collection)`
- `alterCollection(collection, alterSQL)`

### Pagination

- `findWithCursor<T>(collection, filter?, options?)`
  - Supports keyset, reverse, and total count

### Collection Management

- `createCollection(name, options?)`
- `dropCollection(name)`
- `listCollections()`

### Schema Validation

- Register schema on collection creation: `{ schema: myJsonSchema }`
- Validate documents before insert/update
- Auto-infer schema from sample document

### Error Handling

- All errors are instances of `StratisQLError` with code, type, and user-friendly message

---

## Advanced Features

### Logging & Profiling

- Fully configurable logger:
  ```typescript
  import { logger } from "./src/utils/logger";
  logger.setEnabled(false); // Disable all logging
  logger.setSlowQueryLogging(false); // Disable slow query logging
  ```
- Logs slow queries, errors, and info/warn messages

### Health Check & Auto-Reconnect

- `db.driver.healthCheck()` returns `true` if the pool is healthy
- Automatic reconnect logic in all drivers

### Schema Validation & Type Inference

- Use JSON Schema for validation
- Auto-infer schema from sample document

### Transactions

- Nested transactions with savepoints
- Isolation level support

### Pagination

- Keyset/cursor-based, reverse, and total count

### Index & Collection Management

- Unique, fulltext, spatial index support
- Collection alter/migration

---

## TypeScript & JSDoc

- 100% TypeScript strict mode
- All public APIs have JSDoc
- Full type safety for all operations

---

## Error Handling

- All errors are `StratisQLError` with code, type, and user-friendly message
- Example:
  ```typescript
  try {
    await db.insertOne("users", { ... });
  } catch (err) {
    if (err instanceof StratisQLError) {
      console.error(err.userMessage);
    }
  }
  ```

---

## License

MIT © [txkachi](https://www.github.com/txkachi)
