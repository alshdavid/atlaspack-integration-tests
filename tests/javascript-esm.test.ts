import "../utils/prelude.ts";
import * as assert from "node:assert";
import { Fixture } from "../utils/fixture.ts";
import { evalEsm } from "../utils/eval-esm.ts";
import test from 'ava';

test("Should support static imports", async t => {
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

  t.assert(control.a === "a");
  t.assert(control.b === "b");
  t.assert(result.a === control.a);
  t.assert(result.b === control.b);
});

test("Should support dynamic imports", async (t) => {
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

  t.assert(control.a === "a");
  t.assert(control.b === "b");
  t.assert(result.a === control.a);
  t.assert(result.b === control.b);
});
