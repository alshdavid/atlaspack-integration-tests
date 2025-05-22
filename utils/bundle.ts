// Right now the public API of atlaspack is broken?
import * as path from "node:path";
import * as assert from "node:assert";
import * as util from "node:util";
import { Parcel } from "@parcel/core";
import type {
  InitialParcelOptions,
  BuildSuccessEvent,
  BundleGraph,
  PackagedBundle,
} from "@parcel/types";

export function bundle(
  options: InitialParcelOptions,
): Promise<BuildSuccessEvent> {
  const atlaspack = new Parcel(options);
  return atlaspack.run();
}

export function getBundleData(
  bundleGraph: BundleGraph<PackagedBundle>,
  inputDir: string,
): Array<{ name: string; type: string; assets: string[] }> {
  const byAlphabet = (a: string, b: string) =>
    a.toLowerCase() < b.toLowerCase() ? -1 : 1;
  const bundles = bundleGraph.getBundles();
  const bundleData = bundles.map((bundle) => {
    const assets: string[] = [];
    bundle.traverseAssets((asset) => {
      assets.push(path.relative(inputDir, asset.filePath));
    });
    assets.sort(byAlphabet);
    return { name: bundle.name, type: bundle.type, assets };
  });
  bundleData.sort(({ name: a }, { name: b }) => byAlphabet(a, b));
  return bundleData;
}

export type AssertBundle = {
  name?: string | RegExp;
  type?: string;
  assets?: Array<string>;
  childBundles?: Array<AssertBundle>;
};

export function assertBundles(
  bundleGraph: BundleGraph<PackagedBundle>,
  expectedBundles: Array<AssertBundle>,
) {
  let actualBundles: Array<AssertBundle> = [];
  const byAlphabet = (a: string, b: string) =>
    a.toLowerCase() < b.toLowerCase() ? -1 : 1;

  bundleGraph.traverseBundles((bundle) => {
    let assets: Array<string> = [];

    bundle.traverseAssets((asset) => {
      if (/@swc[/\\]helpers/.test(asset.filePath)) {
        // Skip all helpers for now, as they add friction and churn to assertions.
        // A longer term solution might have an explicit opt-in to this behavior, or
        // if we enable symbol propagation unconditionally, the set of helpers
        // should be more minimal.
        return;
      }

      if (/runtime-[a-z0-9]{16}\.js/.test(asset.filePath)) {
        // Skip runtime assets, which have hashed filenames for source maps.
        return;
      }

      const name = path.basename(asset.filePath);
      assets.push(name);
    });

    assets.sort(byAlphabet);
    actualBundles.push({
      name:
        bundle.bundleBehavior === "inline"
          ? bundle.name
          : path.basename(bundle.filePath),
      type: bundle.type,
      assets,
    });
  }, undefined);

  for (let bundle of expectedBundles) {
    if (!Array.isArray(bundle.assets)) {
      throw new Error(
        "Expected bundle must include an array of expected assets",
      );
    }
    bundle.assets.sort(byAlphabet);
  }

  assert.equal(
    actualBundles.length,
    expectedBundles.length,
    "expected number of bundles mismatched",
  );

  for (let expectedBundle of expectedBundles) {
    let name = expectedBundle.name;
    let found = actualBundles.some((actualBundle) => {
      if (name != null && actualBundle.name != null) {
        if (typeof name === "string") {
          if (name !== actualBundle.name) {
            return false;
          }
        } else if (name instanceof RegExp) {
          if (typeof actualBundle.name === "string") {
            if (!name.test(actualBundle.name)) {
              return false;
            }
          }
        } else {
          // $FlowFixMe[incompatible-call]
          assert.fail("Expected bundle name has invalid type");
        }
      }

      if (
        expectedBundle.type != null &&
        expectedBundle.type !== actualBundle.type
      ) {
        return false;
      }

      return (
        expectedBundle.assets &&
        expectedBundle.assets.length === actualBundle.assets?.length &&
        expectedBundle.assets.every((a, i) => {
          if (!actualBundle.assets) return false;
          return a === actualBundle.assets[i];
        })
      );
    });

    if (!found) {
      // $FlowFixMe[incompatible-call]
      assert.fail(
        `Could not find expected bundle: \n\n${util.inspect(
          expectedBundle,
        )} \n\nActual bundles: \n\n${util.inspect(actualBundles)}`,
      );
    }
  }
}
