import * as path from "node:path";
import * as fs from "node:fs";
import yaml from "yaml";
import { TempDir } from "./temp-dir.ts";
import { slugify } from "./slugify.ts";
import { BuildSuccessEvent, BundleGraph, InitialParcelOptions, PackagedBundle } from "@parcel/types";
import { bundle } from "./bundle.ts";

export class Fixture {
  #tmp: TempDir | undefined;

  constructor() {
    this.#tmp = undefined;
  }

  static async yaml(input: TemplateStringsArray) {}

  static async create(name: string, input: string): Promise<Fixture> {
    // const name = (Math.random() * 10000000).toFixed(0);
    const files = yaml.parse(input);

    if (!(".parcelrc" in files)) {
      files[".parcelrc"] = `{ "extends": "@parcel/config-default" }`;
    }

    if (!("package.json" in files)) {
      files["package.json"] = `{ "name": "${slugify(name)}" }`;
    }

    const tmp = await TempDir.create(name);

    let inProgress = [];
    for (const [file, contents] of Object.entries(files)) {
      inProgress.push(
        (async () => {
          if (!fs.existsSync(path.dirname(path.join(tmp.path, file)))) {
            await fs.promises.mkdir(path.dirname(path.join(tmp.path, file)), {
              recursive: true,
            });
          }
          await fs.promises.writeFile(
            path.join(tmp.path, file),
            contents as string,
            "utf8"
          );
        })()
      );
    }
    await Promise.all(inProgress);

    const fixture = new Fixture();
    fixture.#tmp = tmp;
    return fixture;
  }

  path(...segments: string[]) {
    if (!this.#tmp) {
      throw new Error("Uninitialized");
    }
    return path.join(this.#tmp?.path, ...segments);
  }

  async bundleWithOptions(
    entries: string[],
    options: InitialParcelOptions = {}
  ): Promise<[Map<string, string>, BuildSuccessEvent, BundleGraph<PackagedBundle>]> {
    const built = new Map<string, string>();
    const event = await bundle({
      entries: entries.map((seg) => this.path(seg)),
      defaultTargetOptions: {
        distDir: this.path("dist"),
        shouldOptimize: false,
        sourceMaps: false,
        outputFormat: "esmodule",
        ...options.defaultTargetOptions,
      },
      cacheDir: this.path(".parcel-cache"),
      config: this.path(".parcelrc"),
      shouldDisableCache: true,
      ...options,
    });

    block: for (const entry of entries) {
      for (const bundle of event.bundleGraph.getEntryBundles()) {
        if (bundle.getMainEntry()?.filePath.endsWith(entry)) {
          built.set(entry, bundle.filePath);
          continue block;
        }
        throw new Error("Cannot find entry asset for " + entry);
      }
    }
    return [built, event, event.bundleGraph];
  }

  async bundle(
    ...entries: string[]
  ): Promise<[Map<string, string>, BuildSuccessEvent, BundleGraph<PackagedBundle>]> {
    return this.bundleWithOptions(entries)
  }
}
