import { Browser, PropertySymbol } from "happy-dom";
import fs from "node:fs";
import path from "node:path";

export type EvalHtmlOptions = {
  basePath?: string
}

export async function evalHtml(
  filePath: string | undefined,
  {basePath}: EvalHtmlOptions = {}
): Promise<Map<string, any>> {
  if (!filePath) {
    throw Error("Unable to find entry");
  }
  return new Promise((res, rej) => {
    const interval = setTimeout(rej, 5000);
    setTimeout(async () => {
      const store = new Map();
      const base = basePath || path.dirname(filePath);

      const browser = new Browser({
        settings: {
          disableJavaScriptEvaluation: false,
          fetch: {
            interceptor: {
              beforeAsyncRequest: async ({ request, window }) => {
                const url =
                  request[PropertySymbol.url].pathname.replace("/", "") ||
                  "index.html";

                const fullPath = path.join(base, url);
                const response = await fs.promises.readFile(fullPath);
                return new window.Response(response);
              },
            },
          },
        },
      });

      const page = browser.newPage();

      page.virtualConsolePrinter.addEventListener("print", (_) =>
        console.log(page.virtualConsolePrinter.readAsString().trim())
      );
      (page.mainFrame.window as any).test = {
        store,
        done: () => {
          globalThis.clearInterval(interval);
          res(store);
        },
      };

      page.url = `https://example.com`;
      page.content = await fs.promises.readFile(filePath, "utf8");
      await page.waitUntilComplete();
      await page.close();
    }, 0);
  });
}
