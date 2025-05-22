import {
  createContext,
  Module,
  SourceTextModule,
  SyntheticModule,
} from "node:vm";
import * as path from "node:path";
import * as fs from "node:fs";
import * as url from "node:url";
import { PromiseSubject } from "./promise-subject.ts";
import { timeout } from "./constants.ts";

export type EvalEsmOutput = Record<string, any>;

export function evalEsm(
  modulePath: string | undefined,
  globals: Record<string, any> = {},
): Promise<EvalEsmOutput> {
  if (!modulePath) {
    throw Error("Unable to find entry");
  }
  const moduleBase = path.basename(modulePath);
  return new Promise<EvalEsmOutput>((resolve, reject) => {
    const interval = setTimeout(() => reject("Timeout"), timeout);
    setTimeout(async () => {
      try {
        const context = createContext({
          ...globalThis,
          ...globals,
          PromiseSubject: PromiseSubject,
          console: globalThis.console,
          _context: {
            resolve: (v: any) => {
              globalThis.clearInterval(interval);
              resolve(v);
            },
            reject: (e: any) => {
              globalThis.clearInterval(interval);
              reject(e);
            },
          },
        });

        const importsCache = new Map();

        async function importsLinker(
          specifier: string,
          referencingModule: SourceTextModule,
        ): Promise<Module> {
          if (importsCache.has(specifier)) return importsCache.get(specifier);

          let target: string;

          if (path.isAbsolute(specifier)) {
            target = specifier;
          } else if (specifier.startsWith("./")) {
            target = path.normalize(
              path.join(path.dirname(referencingModule.identifier), specifier),
            );
          } else {
            const target = import.meta.resolve(
              specifier,
              path.basename(moduleBase),
            );
            const mod = await import(target);

            const exportNames = Object.keys(mod);
            const imported = new SyntheticModule(
              exportNames,
              function () {
                exportNames.forEach((key) => imported.setExport(key, mod[key]));
              },
              { identifier: specifier, context: referencingModule.context },
            );

            importsCache.set(specifier, mod);
            return imported;
          }

          const code = await fs.promises.readFile(target, "utf8");
          const mod = new SourceTextModule(code, {
            identifier: target,
            importModuleDynamically: importsDynLinker,
            context,
          });

          await mod.link(importsLinker);
          await mod.evaluate();

          return mod;
        }

        async function importsDynLinker(
          specifier: string,
          referencingModule: SourceTextModule,
        ): Promise<Module> {
          const m = await importsLinker(specifier, referencingModule);
          if (m.status === "unlinked") {
            await m.link(importsLinker);
          }
          if (m.status === "linked") {
            await m.evaluate();
          }
          return m;
        }

        const module = new SourceTextModule(
          `
            ${Object.keys(globals)
              .map((key) => `globalThis['${key}'] = ${key};`)
              .join("\n")}

            import('${modulePath}')
              .then(exports => {
                const output = {}

                for (const key of Object.keys(exports)) {
                  output[key] = exports[key]
                }

                _context.resolve(output)
              })
              .catch(err => {
                _context.reject(err)
              })
          `,
          {
            identifier: `init.vm`,
            importModuleDynamically: importsDynLinker,
            context,
          },
        );

        await module.link(importsLinker);
        await module.evaluate();
      } catch (error) {
        globalThis.clearInterval(interval);
        reject(error);
      }
    }, 0);
  });
}

export async function evalEsmCb<T = any>(
  modulePath: string | undefined,
  globals: Record<string, any> = {},
): Promise<T | undefined> {
  let value: T | undefined = undefined;
  await evalEsm(modulePath, {
    ...globals,
    done: (v: T) => (value = v),
  });
  return value;
}
