import "../utils/prelude.ts";
import * as assert from "node:assert";
import { describe, test } from "node:test";
import { Fixture } from "../utils/fixture.ts";
import { concurrency } from "../utils/constants.ts";
import { evalCjs } from "../utils/eval-cjs.ts";
import { evalEsm } from "../utils/eval-esm.ts";

describe("javascript-esm", { concurrency }, function () {
  test("Should support static imports", async () => {
    const fixture = await Fixture.yaml/*yaml*/ `
      options:
        name: "javascript-esm-static-imports"

      package.json:
        type: "module"
        main: "dist/index.js"
        source: "index.js"

      index.js: |
        import { a } from './a.js'
        import { b } from './b.js'
        export { a, b }

      a.js: |
        export const a = 'a'

      b.js: |
        export const b = 'b'
    `;

    const [entries] = await fixture.bundle("index.js");

    const control = await evalEsm(fixture.path("index.js"));
    const result = await evalEsm(entries.get("index.js"));

    assert.equal(control.a, "a");
    assert.equal(control.b, "b");
    assert.equal(result.a, control.a);
    assert.equal(result.b, control.b);
  });

  test("Should support dynamic imports", async () => {
    const fixture = await Fixture.yaml/*yaml*/ `
      options:
        name: "javascript-esm-dynamic-imports"

      package.json:
        type: "module"
        main: "dist/index.js"
        source: "index.js"

      index.js: |
        export default (async () => {
          const {a} = await import('./a.js')
          const {b} = await import('./b.js')
          return { a, b }
        })()

      a.js: |
        export const a = 'a'

      b.js: |
        export const b = 'b'
    `;

    const [entries] = await fixture.bundle("index.js");

    const control = await (await evalCjs(fixture.path("index.js"))).default;
    const result = await (await evalCjs(entries.get("index.js"))).default;

    assert.equal(control.a, "a");
    assert.equal(control.b, "b");
    assert.equal(result.a, control.a);
    assert.equal(result.b, control.b);
  });
});
