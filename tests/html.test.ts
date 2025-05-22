// import "../utils/prelude.ts";
import { Fixture } from "../utils/fixture.ts";
import { evalHtml } from "../utils/eval-html.ts";
import test from 'ava';

test("Should support inline assets", async t => {
  const fixture = await Fixture.create(
    "html-inline-js",
    /*yaml*/ `
    index.html: |
      <html><body>
        <script type="module">
          const foo = "bar"
          done(foo)
        </script>
      </body></html>
  `
  );

  const [entries] = await fixture.bundle("index.html");
  const result = await evalHtml(entries.get("index.html")!);

  t.assert(result === "bar");
});

test("Should support inline assets with static imports", async t => {
  const fixture = await Fixture.create(
    "html-inline-static-import",
    /*yaml*/ `
    index.html: |
      <html><body>
        <script type="module">
          import { a } from './a.js'
          done(a)
        </script>
      </body></html>

    a.js: |
      export const a = "a"
  `
  );

  const [entries] = await fixture.bundle("index.html");
  const result = await evalHtml(entries.get("index.html")!);

  t.assert(result === "a");
});

test("Should support inline assets with dynamic imports", async t => {
  const fixture = await Fixture.create(
    "html-inline-dynamic-import",
    /*yaml*/ `
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
  `
  );

  const [entries] = await fixture.bundle("index.html");
  const result = await evalHtml(entries.get("index.html")!, {
    basePath: fixture.path("dist"),
  });

  t.assert(result === "a");
});
