import "../utils/prelude.ts";
import * as assert from "node:assert";
import { describe, test } from "node:test";
import { Fixture } from "../utils/fixture.ts";
import { concurrency } from "../utils/constants.ts";
import { evalCjs } from "../utils/eval-cjs.ts";
import { evalEsm } from "../utils/eval-esm.ts";

describe("javascript-cjs", { concurrency }, function () {
  test("Should support require statements", async () => {
    const fixture = await Fixture.yaml/*yaml*/ `
      options:
        name: "javascript-cjs-basic"

      package.json:
        type: "module"
        main: "dist/index.js"
        source: "index.js"

      index.js: |
        const { a } = require('./a.js')
        const { b } = require('./b.js')
        module.exports = { a, b }

      a.js: |
        export const a = 'a'

      b.js: |
        export const b = 'b'
    `;

    const [entries] = await fixture.bundle("index.js");

    const exports = await evalEsm(entries.get("index.js"));
    const result = exports.default;

    assert.equal(result.a, "a");
    assert.equal(result.b, "b");
  });
});
