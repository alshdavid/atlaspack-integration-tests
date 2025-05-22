import "../utils/prelude.ts";
import * as assert from "node:assert";
import { describe, test } from "node:test";
import { Fixture } from "../utils/fixture.ts";
import { concurrency } from "../utils/constants.ts";
import { evalEsm } from "../utils/eval-esm.ts";
import { evalCjs } from "../utils/eval-cjs.ts";

describe("javascript-basic", { concurrency }, function () {
  test("Should build basic javascript project", async () => {
    const fixture = await Fixture.yaml/*yaml*/ `
      options:
        name: "javascript-basic"

      package.json:
        type: "module"
        main: "dist/index.js"

      index.js: |
        const foo = 'bar'
        export default foo
    `;

    const [entries] = await fixture.bundle("index.js");

    const control = await evalEsm(fixture.path("index.js"));
    const result = await evalEsm(entries.get("index.js"));

    assert.equal(control.default, "bar");
    assert.equal(result.default, control.default);
  });

  test("Should build basic javascript project async", async () => {
    const fixture = await Fixture.yaml/*yaml*/ `
      options:
        name: "javascript-basic-async"

      package.json:
        type: "module"
        main: "dist/index.js"

      index.js: |
        const done = new PromiseSubject()
        setTimeout(() => done.resolve(42), 0)
        export default done
    `;

    const [entries] = await fixture.bundle("index.js");

    const control = await evalEsm(fixture.path("index.js"));
    const result = await evalEsm(entries.get("index.js"));

    assert.equal(await control.default, 42);
    assert.equal(await result.default, await control.default);
  });

  test("Should build basic javascript project with external global", async () => {
    const fixture = await Fixture.yaml/*yaml*/ `
      options:
        name: "javascript-basic-globals"

      package.json:
        type: "module"
        main: "dist/index.js"

      index.js: |
        foo(42)
    `;

    const [entries] = await fixture.bundle("index.js");

    let value1;
    await evalEsm(entries.get("index.js"), { foo: (v: any) => (value1 = v) });
    assert.equal(value1, 42);

    let value2;
    await evalCjs(entries.get("index.js"), { foo: (v: any) => (value2 = v) });
    assert.equal(value2, 42);
  });
});
