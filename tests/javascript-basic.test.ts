import "../utils/prelude.ts";
import * as assert from "node:assert";
import { describe, test } from "node:test";
import { Fixture } from "../utils/fixture.ts";
import { evalEsm } from "../utils/eval-esm.ts";

describe("javascript-basic", { concurrency: 5 }, function () {
  test("Should build basic javascript project", async () => {
    const fixture = await Fixture.create(/*yaml*/ `
      src/index.js: |
        const foo = 'bar'
        test.store.set('foo', foo)
        test.done()
    `);

    const [entries] = await fixture.bundle(["src/index.js"]);

    const control = await evalEsm(fixture.path("src/index.js"));
    const result = await evalEsm(entries.get("src/index.js"));

    assert.equal(control.get("foo"), "bar");
    assert.equal(result.get("foo"), control.get("foo"));
  });
});
