import * as os from 'node:os';

export const concurrency = os.cpus()?.length || 5
