import * as child_process from "node:child_process";
import * as path from "node:path";
import * as process from "node:process";
import * as url from "node:url";
import * as glob from "glob";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

void (async function () {
  const found = glob.sync("tests/**/*.test.ts", { cwd: __dirname });

  const NODE_OPTIONS = [
    "--import",
      "tsx",
    "--experimental-vm-modules",
    "--disable-warning=ExperimentalWarning",
  ]

  child_process.execFileSync(
    "node",
    [
      ...NODE_OPTIONS,
      "--experimental-vm-modules",
      "--disable-warning=ExperimentalWarning",
      path.join("node_modules", ".bin", "ava"),
      ...found,
    ],
    {
      cwd: __dirname,
      stdio: "inherit",
      env: {
        "NODE_OPTIONS": NODE_OPTIONS.join(" "),
        ...process.env,
      }
    }
  );
})();
