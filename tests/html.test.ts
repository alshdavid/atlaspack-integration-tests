import "../utils/prelude.ts";
import * as assert from "node:assert";
import { describe, test } from "node:test";
import { Fixture } from "../utils/fixture.ts";
import { evalHtml } from "../utils/eval-html.ts";

describe("html", { concurrency: 5 }, function () {
  test("Should support inline assets", async () => {
    const fixture = await Fixture.create(/*yaml*/ `
      index.html: |
        <html><body>
          <script type="module">
            const foo = "bar"
            test.store.set('foo', foo)
            test.done()
          </script>
        </body></html>
    `);

    const [entries] = await fixture.bundle(["index.html"]);
    const result = await evalHtml(entries.get("index.html")!);

    assert.equal(result.get("foo"), "bar");
  });

  test("Should support inline assets with static imports", async () => {
    const fixture = await Fixture.create(/*yaml*/ `
      index.html: |
        <html><body>
          <script type="module">
            import { a } from './a.js'
            test.store.set('a', a)
            test.done()
          </script>
        </body></html>

      a.js: |
        export const a = "a"
    `);

    const [entries] = await fixture.bundle(["index.html"]);
    const result = await evalHtml(entries.get("index.html")!);

    assert.equal(result.get("a"), "a");
  });

  test("Should support inline assets with dynamic imports", async () => {
    const fixture = await Fixture.create(/*yaml*/ `
      index.html: |
        <html><body>
          <script type="module">
            (async () => {
              const { a } = await import('./a.js')
              test.store.set('a', a)
              test.done()
            })()
          </script>
        </body></html>

      a.js: |
        export const a = "a"
    `);

    const [entries] = await fixture.bundle(["index.html"]);
    const result = await evalHtml(entries.get("index.html")!, {
      basePath: fixture.path('dist')
    });

    assert.equal(result.get("a"), "a");
  });
});
