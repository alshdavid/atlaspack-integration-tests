import { Browser, PropertySymbol } from "happy-dom";
import fs from "node:fs";
import path from "node:path";

export type EvalHtmlOptions = {
  basePath?: string
}

export async function evalHtml<T = any>(
  filePath: string | undefined,
  {basePath}: EvalHtmlOptions = {}
): Promise<T> {
  if (!filePath) {
    throw Error("Unable to find entry");
  }
  return new Promise<T>((done, error) => {
    const interval = setTimeout(() => error("Timeout"), 5000);
    setTimeout(async () => {
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

      (page.mainFrame.window as any).done = (v:T) => {
        clearInterval(interval)
        done(v)
      };
      (page.mainFrame.window as any).error = error;

      page.url = `https://example.com`;
      page.content = await fs.promises.readFile(filePath, "utf8");
      await page.waitUntilComplete();
      await page.close();
    }, 0);
  });
}
