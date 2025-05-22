import "../utils/prelude.ts";
import * as assert from "node:assert";
import { describe, test } from "node:test";
import { Fixture } from "../utils/fixture.ts";
import { evalEsm } from "../utils/eval-esm.ts";

describe("javascript-esm", { concurrency: 5 }, function () {
  test("Should support static imports", async () => {
    const fixture = await Fixture.create(/*yaml*/ `
      index.js: |
        import { a } from './a.js'
        import { b } from './b.js'

        test.store.set('a', a)
        test.store.set('b', b)
        test.done()

      a.js: |
        export const a = 'a'

      b.js: |
        export const b = 'b'
    `);

    const [entries] = await fixture.bundle(["index.js"]);

    const control = await evalEsm(fixture.path("index.js"));
    const result = await evalEsm(entries.get("index.js"));

    assert.equal(control.get("a"), "a");
    assert.equal(control.get("b"), "b");
    assert.equal(result.get("a"), control.get("a"));
    assert.equal(result.get("b"), control.get("b"));
  });

  test("Should support dynamic imports", async () => {
    const fixture = await Fixture.create(/*yaml*/ `
      index.js: |
        (async () => {
          const {a} = await import('./a.js')
          const {b} = await import('./b.js')

          test.store.set('a', a)
          test.store.set('b', b)
          test.done()
        })()

      a.js: |
        export const a = 'a'

      b.js: |
        export const b = 'b'
    `);

    const [entries] = await fixture.bundle(["index.js"]);

    const control = await evalEsm(fixture.path("index.js"));
    const result = await evalEsm(entries.get("index.js")!);

    assert.equal(control.get("a"), "a");
    assert.equal(control.get("b"), "b");
    assert.equal(result.get("a"), control.get("a"));
    assert.equal(result.get("b"), control.get("b"));
  });
});
