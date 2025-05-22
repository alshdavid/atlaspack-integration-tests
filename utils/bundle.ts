// Right now the public API of atlaspack is broken?
import { Parcel } from "@parcel/core";
import type {
  InitialParcelOptions,
  BuildSuccessEvent,
} from "@parcel/types";
import { Fixture } from "./fixture.ts";

export function bundle(options: InitialParcelOptions): Promise<BuildSuccessEvent> {
  const atlaspack = new Parcel(options);
  return atlaspack.run();
}

export function bundleFixture(
  fixture: Fixture,
  options: InitialParcelOptions = {}
): Promise<BuildSuccessEvent> {
  const atlaspack = new Parcel({
    entries: [fixture.path("index.js")],
    defaultTargetOptions: {
      distDir: fixture.path("dist"),
      shouldOptimize: false,
      sourceMaps: false,
      outputFormat: "esmodule",
      ...options.defaultTargetOptions,
    },
    cacheDir: fixture.path(".parcel-cache"),
    config: fixture.path(".parcelrc"),
    shouldDisableCache: true,
    ...options,
  });
  return atlaspack.run();
}
