import * as vm from "node:vm";
import * as module from "node:module";
import { timeout } from "./constants.ts";

export type EvalCjsOutput<T = any> = T;

export function evalCjs<T = any>(
  modulePath: string | undefined,
  globals: Record<string, any> = {},
): Promise<EvalCjsOutput<T>> {
  if (!modulePath) {
    throw Error("Unable to find entry");
  }
  return new Promise<EvalCjsOutput<T>>((resolve, reject) => {
    const interval = setTimeout(() => reject("Timeout"), timeout);
    setTimeout(async () => {
      try {
        const localRequire = module.createRequire(modulePath);

        const context = vm.createContext({
          ...globalThis,
          ...globals,
          console: globalThis.console,
          require: localRequire,
          module: {
            exports: {},
            require: localRequire,
          },
          _context: {
            resolve: (v: any) => {
              globalThis.clearInterval(interval);
              resolve(v);
            },
          },
        });

        const script = new vm.Script(
          `
          globalThis.require = require
          global.require = require
          module.require = require

          ${Object.keys(globals)
            .map(
              (key) => `
            globalThis['${key}'] = ${key};
            global['${key}'] = ${key};
            module['${key}'] = ${key};
          `,
            )
            .join("\n")}

          const result = require("${modulePath}")
          _context.resolve(result)
        `,
          {
            filename: modulePath,
          },
        );

        script.runInContext(context);
      } catch (error: any) {
        globalThis.clearInterval(interval);
        reject(error);
      }
    }, 0);
  });
}

export async function evalCjsCb<T = any>(
  modulePath: string | undefined,
  globals: Record<string, any> = {},
): Promise<T | undefined> {
  let value: T | undefined = undefined;
  await evalCjs(modulePath, {
    ...globals,
    done: (v: T) => (value = v),
  });
  return value;
}
