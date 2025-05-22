import "../utils/prelude.ts";
import * as assert from "node:assert";
import { describe, test } from "node:test";
import { Fixture } from "../utils/fixture.ts";
import { evalEsm } from "../utils/eval-esm.ts";

describe("javascript-cjs", { concurrency: 5 }, function () {
  test("Should support require statements", async () => {
    const fixture = await Fixture.create(
      "javascript-cjs-basic",
      /*yaml*/ `
      index.js: |
        const { a } = require('./a.js')
        const { b } = require('./b.js')
        done({ a, b })

      a.js: |
        export const a = 'a'

      b.js: |
        export const b = 'b'
    `
    );

    const [entries] = await fixture.bundle("index.js");

    const control = await evalEsm(fixture.path("index.js"));
    const result = await evalEsm(entries.get("index.js"));

    assert.equal(control.a, "a");
    assert.equal(control.b, "b");
    assert.equal(result.a, control.a);
    assert.equal(result.b, control.b);
  });
});
