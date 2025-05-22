import "../utils/prelude.ts";
import * as assert from "node:assert";
import { Fixture } from "../utils/fixture.ts";
import { evalEsm } from "../utils/eval-esm.ts";
import { assertBundles, getBundleData } from "../utils/bundle.ts";
import test from "ava";

test("does not fail when there is a transitive import of an empty file with export *", async (t) => {
  const fixture = await Fixture.create(
    "javascript-transitive-import",
    /* yaml */ `
        empty.js: |
          // intentionally empty

        a.js: |
          export * from './b.js';
          export * from './c.js';
          export * from './d.js';
          export * from './e.js';
          export * from './f.js';
          export * from './empty.js';

        b.js: |
          export * from './c.js';
          export * from './d.js';
          export * from './e.js';
          export * from './f.js';
          export * from './empty.js';

        c.js: |
          export * from './d.js';
          export * from './e.js';
          export * from './f.js';
          export * from './empty.js';

        d.js: |
          export * from './e.js';
          export * from './f.js';
          export * from './empty.js';

        e.js: |
          export * from './empty.js';
          export * from './test.js';

        f.js: |
          export * from './empty.js';

        index.js: |
          import {test} from './a.js';
          done(test)

        package.json: |
          {
            "sideEffects": false
          }

        test.js: |
          export const test = 'should not fail';

        yarn.lock: |
          {}
      `
  );

  let [entries] = await fixture.bundle("index.js");
  const result = await evalEsm(entries.get("index.js"));

  t.assert(result === "should not fail");
});

test("should produce a basic JS bundle with CommonJS requires", async (t) => {
  const fixture = await Fixture.create(
    "javascript-cjs-alias",
    /* yaml */ `
        package.json: |
          {
            "alias": {
              "url": "./url.js"
            }
          }

        index.js: |
          var local = require('./local');
          var url = require('url');

          module.exports = function () {
            return local.a + local.b;
          };

          done()

        local.js: |
          exports.a = 1;
          exports.b = 2;

        url.js: |
          module.exports = 'url'
      `
  );

  let [, buildEvent] = await fixture.bundle("index.js");
  const bundleData = getBundleData(buildEvent.bundleGraph, fixture.path());

  t.deepEqual(bundleData, [
    {
      name: "index.js",
      type: "js",
      assets: ["index.js", "local.js", "url.js"],
    },
  ]);
});

test("should support url: imports with CommonJS output", async (t) => {
  const fixture = await Fixture.create(
    "javascript-cjs-url-import",
    /* yaml */ `
        index.js: |
          import x from "url:./x.txt";
          module.exports = x;
          done(x)

        x.txt: |
          HELLO!

        yarn.lock: "{}"
      `
  );

  let [, , bundleGraph] = await fixture.bundle("index.js");

  assertBundles(bundleGraph, [
    {
      name: "index.js",
      assets: ["index.js", "esmodule-helpers.js"],
    },
    {
      type: "txt",
      assets: ["x.txt"],
    },
  ]);

  t.assert(true)

  // const result = await evalEsm(fixture.path("index.js"))
  // console.log(result)
  // assert.strictEqual(
  //   path.basename(output),
  //   path.basename(txtBundle.filePath),
  // );
});
