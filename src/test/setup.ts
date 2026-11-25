import '@testing-library/jest-dom/vitest';
import os from 'node:os';
import path from 'node:path';

if (!process.env.CIVICLENS_DATA_DIR) {
  process.env.CIVICLENS_DATA_DIR = path.join(
    os.tmpdir(),
    `civiclens-vitest-${process.pid}`
  );
}
process.env.CIVICLENS_ALLOW_DEMO_MODE = 'true';
process.env.CIVICLENS_SESSION_SECRET = 'vitest-session-secret-32-chars-minimum!!';
