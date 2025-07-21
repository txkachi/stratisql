import { BaseDriver } from '../drivers/BaseDriver';
import { ClientSession } from '../types/index';

/**
 * Run operations in a transaction with optional isolation level
 * @param driver The database driver
 * @param fn The function to execute within the transaction
 * @param isolationLevel Optional isolation level (e.g., 'READ COMMITTED')
 */
export async function withTransaction<T>(driver: BaseDriver, fn: (session: ClientSession) => Promise<T>, isolationLevel?: string): Promise<T> {
  const session = await driver.startSession();
  try {
    const result = await fn(session);
    await driver.commit(session);
    return result;
  } catch (err) {
    await driver.rollback(session);
    throw err;
  } finally {
    await driver.release(session);
  }
}

/**
 * Run operations in a nested transaction (savepoint)
 * @param driver The database driver
 * @param session The parent session
 * @param fn The function to execute within the savepoint
 * @param savepointName The savepoint name
 */
export async function withSavepoint<T>(
  driver: BaseDriver & {
    createSavepoint(session: ClientSession, savepointName: string): Promise<void>;
    releaseSavepoint(session: ClientSession, savepointName: string): Promise<void>;
    rollbackToSavepoint(session: ClientSession, savepointName: string): Promise<void>;
  },
  session: ClientSession,
  fn: (session: ClientSession) => Promise<T>,
  savepointName: string
): Promise<T> {
  await driver.createSavepoint(session, savepointName);
  try {
    const result = await fn(session);
    await driver.releaseSavepoint(session, savepointName);
    return result;
  } catch (err) {
    await driver.rollbackToSavepoint(session, savepointName);
    throw err;
  }
} 