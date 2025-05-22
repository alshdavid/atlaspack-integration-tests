import * as path from "node:path";
import * as fs from "node:fs";
import yaml from "yaml";
import { TempDir } from "./temp-dir.ts";
import { slugify } from "./slugify.ts";
import type {
  BuildSuccessEvent,
  BundleGraph,
  InitialParcelOptions,
  PackagedBundle,
} from "@parcel/types";
import { bundle } from "./bundle.ts";

export class Fixture {
  #tmp: TempDir | undefined;

  constructor() {
    this.#tmp = undefined;
  }

  static async yaml(input: string | TemplateStringsArray): Promise<Fixture> {
    let src: string;
    if (typeof input !== "string") {
      src = input[0];
    } else {
      src = input;
    }

    const { options = {}, ...files } = yaml.parse(src);

    if (!options.name && !files["package.json"]?.name) {
      throw new Error("Missing options.name");
    }

    const name = slugify(options.name || files["package.json"]?.name);

    if (!(".parcelrc" in files)) {
      files[".parcelrc"] = {
        extends: "@parcel/config-default",
      };
    }

    if (!("package.json" in files)) {
      files["package.json"] = {
        name: name,
        type: "module",
      };
    }

    if (!("yarn.lock" in files)) {
      files["yarn.lock"] = `{}`;
    }

    const tmp = await TempDir.create(name);

    const inProgress = [];

    for (let [file, contents] of Object.entries(files)) {
      if (typeof contents === "object") {
        contents = JSON.stringify(contents, null, 2);
      }

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
            "utf8",
          );
        })(),
      );
    }

    await Promise.all(inProgress);
    const fixture = new Fixture();
    fixture.#tmp = tmp;
    return fixture;
  }

  static async fromFile(filePath: string): Promise<Fixture> {
    const input = await fs.promises.readFile(filePath, "utf8");
    return Fixture.yaml(input);
  }

  path(...segments: string[]) {
    if (!this.#tmp) {
      throw new Error("Uninitialized");
    }
    return path.join(this.#tmp?.path, ...segments);
  }

  async bundleWithOptions(
    entries: string[],
    options: InitialParcelOptions = {},
  ): Promise<
    [Map<string, string>, BuildSuccessEvent, BundleGraph<PackagedBundle>]
  > {
    const event = await bundle({
      entries: entries.length
        ? entries.map((seg) => this.path(seg))
        : undefined,
      cacheDir: this.path(".parcel-cache"),
      config: this.path(".parcelrc"),
      shouldDisableCache: true,
      shouldAutoInstall: false,
      ...options,
      defaultTargetOptions: {
        shouldOptimize: false,
        sourceMaps: false,
        distDir: this.path("dist"),
        ...options.defaultTargetOptions,
      },
    });

    const built = new Map<string, string>();

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
  ): Promise<
    [Map<string, string>, BuildSuccessEvent, BundleGraph<PackagedBundle>]
  > {
    return this.bundleWithOptions(entries);
  }
}
