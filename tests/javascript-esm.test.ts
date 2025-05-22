import "../utils/prelude.ts";
import * as assert from "node:assert";
import { describe, test } from "node:test";
import { Fixture } from "../utils/fixture.ts";
import { evalEsm } from "../utils/eval-esm.ts";

describe("javascript-esm", { concurrency: 5 }, function () {
  test("Should support static imports", async () => {
    const fixture = await Fixture.create(
      "javascript-esm-static-imports",
      /*yaml*/ `
      index.js: |
        import { a } from './a.js'
        import { b } from './b.js'
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

  test("Should support dynamic imports", async () => {
    const fixture = await Fixture.create(
      "javascript-esm-dynamic-imports",
      /*yaml*/ `
      index.js: |
        (async () => {
          const {a} = await import('./a.js')
          const {b} = await import('./b.js')
          done({ a, b })
        })()

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
