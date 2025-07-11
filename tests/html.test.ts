import "../utils/prelude.ts";
import { concurrency } from "../utils/constants.ts";
import * as assert from "node:assert";
import { describe, test } from "node:test";
import { Fixture } from "../utils/fixture.ts";
import { evalHtml } from "../utils/eval-html.ts";

describe("html", { concurrency }, function () {
  test("Should support inline assets", async () => {
    const fixture = await Fixture.yaml/*yaml*/ `
      options:
        name: "html-inline-js"

      package.json:
        source: "index.html"

      index.html: |
        <html><body>
          <script type="module">
            const foo = "bar"
            done(foo)
          </script>
        </body></html>
    `;

    const [entries] = await fixture.bundle("index.html");
    const result = await evalHtml(entries.get("index.html")!);

    assert.equal(result, "bar");
  });

  test("Should support inline assets with static imports", async () => {
    const fixture = await Fixture.yaml/*yaml*/ `
      options:
        name: "html-inline-static-import"

      index.html: |
        <html><body>
          <script type="module">
            import { a } from './a.js'
            done(a)
          </script>
        </body></html>

      a.js: |
        export const a = "a"
    `;

    const [entries] = await fixture.bundle("index.html");
    const result = await evalHtml(entries.get("index.html")!);

    assert.equal(result, "a");
  });

  test("Should support inline assets with dynamic imports", async () => {
    const fixture = await Fixture.yaml/*yaml*/ `
      options:
        name: "html-inline-dynamic-import"

      index.html: |
        <html><body>
          <script type="module">
            (async () => {
              const { a } = await import('./a.js')
              done(a)
            })()
          </script>
        </body></html>

      a.js: |
        export const a = "a"
    `;

    const [entries] = await fixture.bundle("index.html");
    const result = await evalHtml(entries.get("index.html")!, {
      basePath: fixture.path("dist"),
    });

    assert.equal(result, "a");
  });
});
