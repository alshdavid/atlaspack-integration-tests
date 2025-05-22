import * as os from "node:os";

export const concurrency = os.cpus()?.length || 5;
export const timeout = process.env.TIMEOUT
  ? parseInt(process.env.TIMEOUT, 10)
  : 5000;
