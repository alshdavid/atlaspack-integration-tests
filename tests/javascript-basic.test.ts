import "../utils/prelude.ts";
import * as assert from "node:assert";
import { describe, test } from "node:test";
import { Fixture } from "../utils/fixture.ts";
import { evalEsm } from "../utils/eval-esm.ts";

describe("javascript-basic", { concurrency: 5 }, function () {
  test("Should build basic javascript project", async () => {
    const fixture = await Fixture.create(
      "javascript-basic",
      /*yaml*/ `
      index.js: |
        const foo = 'bar'
        done(foo)
    `
    );

    const [entries] = await fixture.bundle("index.js");

    const control = await evalEsm(fixture.path("index.js"));
    const result = await evalEsm(entries.get("index.js"));

    assert.equal(control, "bar");
    assert.equal(result, control);
  });
});
