import { Browser, PropertySymbol } from "happy-dom";
import fs from "node:fs";
import path from "node:path";
import { timeout } from "./constants.ts";

export type EvalHtmlOptions = {
  basePath?: string;
};

export async function evalHtml<T = any>(
  filePath: string | undefined,
  { basePath }: EvalHtmlOptions = {},
): Promise<T> {
  if (!filePath) {
    throw Error("Unable to find entry");
  }
  return new Promise<T>((resolve, reject) => {
    const interval = setTimeout(() => reject("Timeout"), timeout);
    setTimeout(async () => {
      try {
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

        (page.mainFrame.window as any).done = (v: T) => {
          clearInterval(interval);
          resolve(v);
        };
        (page.mainFrame.window as any).error = (e: any) => {
          clearInterval(interval);
          reject(e);
        };
        (page.mainFrame.window as any).console = globalThis.console;

        page.url = `https://example.com`;
        page.content = await fs.promises.readFile(filePath, "utf8");
        await page.waitUntilComplete();
        await page.close();
      } catch (error) {
        globalThis.clearInterval(interval);
        reject(error);
      }
    }, 0);
  });
}
