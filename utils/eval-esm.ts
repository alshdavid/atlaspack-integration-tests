import {
  createContext,
  Module,
  SourceTextModule,
  SyntheticModule,
} from "node:vm";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

export function evalEsm(modulePath: string | undefined): Promise<Map<string, any>> {
  if (!modulePath) {
    throw Error("Unable to find entry")
  }
  return new Promise((res, rej) => {
    const interval = setTimeout(rej, 5000)
    setTimeout(async () => {
      const store = new Map();

      const require = createRequire(modulePath)

      const context = createContext({
        ...globalThis,
        require,
        test: {
          store,
          done: () => {
            globalThis.clearInterval(interval)
            res(store)
          },
        },
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

        const exportNames = Object.keys(mod2.namespace);

        const imported = new SyntheticModule(
          exportNames,
          function () {
            exportNames.forEach((key: any) =>
              imported.setExport(key, (mod2.namespace as any)[key])
            );
          },
          { identifier: specifier, context: referencingModule.context }
        );

        importsCache.set(specifier, imported);
        return imported;
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
