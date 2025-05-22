import {
  createContext,
  Module,
  SourceTextModule,
  SyntheticModule,
} from "node:vm";
import * as fs from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";

export function evalEsm<T = any>(modulePath: string | undefined): Promise<T> {
  if (!modulePath) {
    throw Error("Unable to find entry")
  }
  return new Promise<T>((done, error) => {
    const interval = setTimeout(() => error("Timeout"), 5000)
    setTimeout(async () => {

      const require = createRequire(modulePath)

      const context = createContext({
        ...globalThis,
        require,
        // test: {
          done: (v: T) => {
            globalThis.clearInterval(interval)
            done(v)
          },
          error
        // },
      });

      const importsCache = new Map();

      async function importsLinker(
        specifier: string,
        referencingModule: SourceTextModule
      ): Promise<Module> {
        if (importsCache.has(specifier)) return importsCache.get(specifier);

        const rel = path.normalize(
          path.join(path.dirname(referencingModule.identifier), specifier)
        );
        const code = await fs.promises.readFile(rel, "utf8");

        const mod2 = new SourceTextModule(code, {
          identifier: specifier,
          importModuleDynamically: importsDynLinker,
          context,
        });
        await mod2.link(importsLinker);
        await mod2.evaluate();

        importsCache.set(specifier, mod2);
        return mod2;
      }

      async function importsDynLinker(
        specifier: string,
        referencingModule: SourceTextModule
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

      const code = await fs.promises.readFile(modulePath, "utf8");
      const module = new SourceTextModule(code, {
        identifier: modulePath,
        importModuleDynamically: importsDynLinker,
        context,
      });

      await module.link(importsLinker);
      await module.evaluate();
    }, 0);
  });
}
