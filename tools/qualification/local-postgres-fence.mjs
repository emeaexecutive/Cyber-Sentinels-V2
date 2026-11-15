import path from 'node:path';

// A loopback port alone does not identify a disposable database cluster.
export function assertRehearsalDataDirectory(actual, workspace = process.cwd()) {
  const expected = path.resolve(workspace, 'tmp/pg-execution03/data');
  const normalize = value => process.platform === 'win32' ? value.toLowerCase() : value;
  if (typeof actual !== 'string' || !actual || normalize(path.resolve(actual)) !== normalize(expected)) {
    throw Error('ISOLATED_DATA_DIRECTORY_REQUIRED');
  }
  return { dataDirectoryVerified: true, expected };
}
