#!/usr/bin/env node
import arg from "arg";
import { cp, mkdir, readFile, rm, writeFile } from "fs/promises";
import matter from "gray-matter";
import { basename, dirname, join, relative, resolve } from "path";
import { iterateFolder } from "./filesystem.js";
import Handlebars from "handlebars";
import b from "js-beautify";
import sass from "sass";

import { init as initHandlebars } from "./functions.js";

type Page = {
  publicUrl: string;
  content: string;
  excerpt?: string;
  orig: string;
  language: string;
  matter: string;
} & Record<any, unknown>;

type GlobalContext = {
  baseUrl: string;
  srcDir: string;
  pages: Record<string, Page>;
  layouts: Record<
    string,
    {
      matter: Page;
      template: Handlebars.TemplateDelegate;
    }
  >;
  styles: Record<string, Page & { finalUrl: string }>;
};

Handlebars.registerHelper("styleUrl", function (context: GlobalContext, name) {
  if (!context.styles[name]) throw new Error("Style not found: " + name);
  return context.styles[name].finalUrl;
});

// Process a matterfront file
async function processMatterfront(file: string, globalContext: GlobalContext) {
  const content = (await readFile(file)).toString();
  const r = matter(content);
  const matterfront: Page = {
    ...r.data,
    ...r,
    orig: content,
    publicUrl: "NONE",
  };

  const slug = matterfront.slug as string | undefined;
  if (slug) {
    matterfront.publicUrl = new URL(slug, globalContext.baseUrl).toString();

    if ((slug as string) in globalContext.pages) {
      throw new Error("Duplicated slug: " + slug);
    }

    if (file.endsWith(".css") || file.endsWith(".scss")) {
      matterfront.content = (
        await sass.compileStringAsync(matterfront.content, {
          loadPaths: [dirname(file)],
        })
      ).css;
      globalContext.styles[slug] = {
        ...matterfront,
        finalUrl: slug,
      };
    } else {
      globalContext.pages[slug] = matterfront;
    }
  } else {
    console.warn(
      `! Missing slug in file ${relative(globalContext.srcDir, file)}`
    );
  }
}

// Render a page to disk
async function renderPage(context: GlobalContext, ret: Page, outDir: string) {
  const paths: Set<string> = new Set();

  function addOutPath(path: string) {
    // add slug with and without /index.html
    const normalizedPath = path.replace(/\/$/, "");
    paths.add(join(outDir, normalizedPath + ".html"));
    paths.add(join(outDir, normalizedPath + "/index.html"));
  }
  const slug = ret.slug as string;

  if (slug) {
    if (Array.isArray(ret.redirect_from)) {
      for (const path of ret.redirect_from as string[]) {
        // await writeFile(outPath, content);
      }
    }

    console.log(`> Rendering ${slug as any}`);

    addOutPath(slug);

    if (!ret.raw) {
      ret.content = Handlebars.compile(ret.content)({ context, ...ret });
    }

    const content = b.html(
      renderWithLayout(context, ret.layout as string | undefined, ret, [slug]),
      {
        indent_size: 2,
      }
    );

    for (const outPath of paths) {
      await mkdir(dirname(outPath), { recursive: true });
      await writeFile(outPath, content);
      console.log(`  Writing ${relative(context.srcDir, outPath)}`);
    }
  }
}

// Render all pages to disk
async function renderAll(context: GlobalContext, outDir: string) {
  for (let i in context.pages) {
    await renderPage(context, context.pages[i], outDir);
    console.log();
  }
}

// renders a page using a layout
function renderWithLayout(
  context: GlobalContext,
  layoutName: string | undefined,
  data: any,
  stack: string[]
): string {
  const contextForRendering = { context, ...data };

  if (layoutName) {
    const layout = context.layouts[layoutName];

    if (!layout) throw new Error("Inexistent layout: " + layoutName);

    const content = layout.template(contextForRendering);

    const newStack = [...stack, layoutName];
    if (layout.matter.layout) {
      return renderWithLayout(
        context,
        layout.matter.layout as string | undefined,
        {
          content,
          data,
          context,
        },
        newStack
      );
    }

    // console.log(`    ${newStack.join(" < ")}`);

    return content;
  } else {
    console.dir(data);
    throw new Error("asd");
  }
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
  };

  // load templates
  for await (const file of iterateFolder(
    resolve(srcDir, ".site-generator/layouts"),
    false
  )) {
    const content = (await readFile(file)).toString();
    const r = matter(content);
    const matterfront: Page = {
      publicUrl: "<TEMPLATE>",
      ...r.data,
      ...r,
      orig: content,
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
    if (
      relativeFile.startsWith(".") ||
      relativeFile.startsWith(outRelative)
    )
      continue;
    console.log(`> Processing input file ${relativeFile}`);
    await processMatterfront(file, context);
  }

  // copy public folder
  const publicFolder = resolve(resolve(srcDir, ".site-generator/public"));
  for await (const file of iterateFolder(publicFolder, false)) {
    const relativePath = relative(publicFolder, file);
    // console.log(`> Copy ${relativePath} to ${resolve(outDir, relativePath)}`);
    await cp(file, resolve(outDir, relativePath));
  }

  // copy public folder
  for (let styleSlug in context.styles) {
    const outPath = resolve(outDir, styleSlug);
    context.styles[styleSlug].finalUrl = "/" + styleSlug;
    console.log(`> Writing ${outPath}`);
    await writeFile(outPath, context.styles[styleSlug].content);
  }

  console.log(`Redirects:`);
  for (const page of Object.values(context.pages)) {
    if (page.redirect_from && Array.isArray(page.redirect_from) && page.slug) {
      const content = redirectPage(context, page.slug as string);
      for (const path of page.redirect_from) {
        const normalizedPath = path.replace(/\/$/, "");
        {
          const dst = join(outDir, normalizedPath + ".html");
          await mkdir(dirname(dst), { recursive: true });
          console.log(`> Writing ${dst}`);
          await writeFile(dst, content);
        }
        {
          const dst = join(outDir, normalizedPath + "/index.html");
          await mkdir(dirname(dst), { recursive: true });
          console.log(`> Writing ${dst}`);
          await writeFile(dst, content);
        }
      }
    }
  }

  // render everything
  await renderAll(context, outDir);
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
