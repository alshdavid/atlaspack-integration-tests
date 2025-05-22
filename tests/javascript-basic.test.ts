import "../utils/prelude.ts";
import * as assert from "node:assert";
import * as child_process from "node:child_process";
import { Fixture } from "../utils/fixture.ts";
import { evalEsm } from "../utils/eval-esm.ts";
import test from 'ava';

test("Should build basic javascript project", async (t) => {
  console.time('test')
  const fixture = await Fixture.create(
    "javascript-basic",
    /*yaml*/ `
    index.js: |
      const foo = 'bar'
      done(foo)
  `
  );

  // child_process.execFileSync('npx', ['parcel', 'build', fixture.path('index.js')], {
  //   cwd: fixture.path(),
  //   stdio: 'inherit'
  // })
  // const control = await evalEsm("/mnt/data/Development/atlassian-labs/atlaspack-integration-tests/.tmp/javascript-basic/index.js");
  // const result = await evalEsm("/mnt/data/Development/atlassian-labs/atlaspack-integration-tests/.tmp/javascript-basic/dist/index.js");

  const [entries] = await fixture.bundle("index.js");

  const control = await evalEsm(fixture.path("index.js"));
  const result = await evalEsm(entries.get("index.js"));

  t.assert(control === "bar");
  t.assert(result === control);
  console.timeEnd('test')
});
