#!/usr/bin/env node
import arg from "arg";
import { cp, mkdir, readFile, rm, writeFile } from "fs/promises";
import matter from "gray-matter";
import { basename, dirname, join, relative, resolve } from "path";
import { iterateFolder } from "./filesystem.js";
import Handlebars from "handlebars";

import hljs from "highlight.js";

import { init as initHandlebars } from "./functions.js";
import { existsSync } from "fs";
import { GlobalContext, Page } from "./types.js";
import { scssPlugin } from "./plugin-scss.js";
import { htmlPlugin, renderWithLayout } from "./plugin-html.js";

// Process a matterfront file
async function processMatterfront(file: string, context: GlobalContext) {
  const content = (await readFile(file)).toString();
  const r = matter(content);
  const page: Page = {
    ...r,
    orig: content,
    publicUrl: "NONE",
    relativePath: relative(context.srcDir, file),
  };

  if (context.preProcessPage) {
    context.preProcessPage(page);
  }

  page.slug = page.slug || (page.data as any)?.slug;

  if (page.slug) {
    try {
      page.publicUrl = new URL(page.slug, context.baseUrl).toString();
    } catch (err: any) {
      page.publicUrl = context.baseUrl + page.slug;
    }
    if (page.slug in context.pages) {
      throw new Error("Duplicated slug: " + page.slug);
    }
    context.pages[page.slug] = page;
  } else {
    console.warn(`! Missing slug in file ${page.relativePath}`);
  }

  return page;
}

async function main() {
  const args = arg({
    "--outDir": String,
    "--publicUrl": String,
    "--srcDir": String,
  });

  if (!args["--srcDir"]) throw new Error("--srcDir must be provided");
  if (!args["--outDir"]) throw new Error("--outDir must be provided");
  if (!args["--publicUrl"]) throw new Error("--publicUrl must be provided");

  await initHandlebars();

  const srcDir = resolve(args["--srcDir"]!);
  const outDir = resolve(args["--outDir"]!);
  const publicUrl = args["--publicUrl"]!;

  // create the out dir
  await mkdir(outDir, { recursive: true });

  // delete all html files
  for await (const file of iterateFolder(outDir, false)) {
    if (file.endsWith(".html")) {
      await rm(file);
    }
  }

  const context: GlobalContext = {
    baseUrl: publicUrl,
    srcDir,
    pages: {},
    layouts: {},
    styles: {},
    configuration: {
      staticFolder: ".site-generator/public",
      layoutsFolder: ".site-generator/layouts",
    },
    plugins: [scssPlugin, htmlPlugin],
    outFiles: {},
  };

  (context as any).context = context;

  // import a custom script
  const script = resolve(srcDir, ".site-generator/index.js");
  let imported = null;
  const paramsForScript = { context, Handlebars, hljs };
  if (existsSync(script)) {
    console.log(`> Running ${relative(srcDir, script)}`);
    imported = require(script);
    if (imported.default) {
      await imported.default(paramsForScript);
    } else if (typeof imported == "function") {
      await imported(paramsForScript);
    }
  }

  // load templates
  for await (const file of iterateFolder(
    resolve(srcDir, context.configuration.layoutsFolder),
    false
  )) {
    const content = (await readFile(file)).toString();
    const r = matter(content);
    const matterfront: Page = {
      publicUrl: "<TEMPLATE>",
      ...r,
      orig: content,
      relativePath: relative(context.srcDir, file),
    };
    const name = basename(file).replace(/\..+$/, "");
    console.log(`> Loading template ${name} from ${relative(srcDir, file)}`);
    context.layouts[name] = {
      matter: matterfront,
      template: Handlebars.compile(matterfront.content),
    };
    Handlebars.registerPartial(name, function (ctx) {
      return renderWithLayout(context, name, ctx, ["(partial)"]);
    });
  }

  const outRelative = relative(srcDir, outDir);
  // load content files
  for await (const file of iterateFolder(resolve(srcDir, "."), false)) {
    const relativeFile = relative(srcDir, file);
    if (relativeFile.startsWith(".") || relativeFile.startsWith(outRelative))
      continue;
    console.log(`> Processing input file ${relativeFile}`);
    await processMatterfront(file, context);
  }

  if (imported && imported.runChecks) {
    await imported.runChecks(paramsForScript);
  }

  for (const plugin of context.plugins) {
    for (const page of Object.values(context.pages)) {
      await plugin(context, page);
    }
  }

  // copy public folder
  const publicFolder = resolve(
    resolve(srcDir, context.configuration.staticFolder)
  );
  for await (const file of iterateFolder(publicFolder, false)) {
    const relativePath = relative(publicFolder, file);
    // console.log(`> Copy ${relativePath} to ${resolve(outDir, relativePath)}`);
    await cp(file, resolve(outDir, relativePath));
  }

  for (const page of Object.values(context.pages)) {
    if (
      page.data.redirect_from &&
      Array.isArray(page.data.redirect_from) &&
      page.slug
    ) {
      const content = Buffer.from(redirectPage(context, page.slug as string));
      for (const path of page.data.redirect_from) {
        const normalizedPath = path.replace(/\/$/, "");
        context.outFiles[normalizedPath + ".html"] = content;
        context.outFiles[normalizedPath + "/index.html"] = content;
      }
    }
  }

  // write files
  for (const [file, buffer] of Object.entries(context.outFiles)) {
    let resolvedFile = file.startsWith("/")
      ? outDir + file
      : resolve(outDir, file);

    if (!resolvedFile.startsWith(outDir)) {
      console.log("! Ignoring writing out file " + resolvedFile);
      continue;
    }
    await mkdir(dirname(resolvedFile), { recursive: true });
    await writeFile(resolvedFile, buffer);
    console.log(`  Writing ${relative(outDir, resolvedFile)}`);
  }
}

function redirectPage(context: GlobalContext, slug: string) {
  const url = new URL(slug, context.baseUrl).toString();
  return `
<!DOCTYPE html>
<html lang="en-US">
  <meta charset="utf-8">
  <title>Redirecting&hellip;</title>
  <link rel="canonical" href="${url}">
  <script>location="${url}"</script>
  <meta http-equiv="refresh" content="0; url=${url}">
  <meta name="robots" content="noindex">
  <h1>Redirecting&hellip;</h1>
  <a href="${url}">Click here if you are not redirected.</a>
</html>`;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
