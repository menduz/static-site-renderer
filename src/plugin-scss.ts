import { GlobalContext, SitePlugin } from "./types";
import * as Handlebars from "handlebars";
import sass from "sass";
import { dirname, resolve } from "path";

Handlebars.registerHelper("styleUrl", function (context: GlobalContext, name) {
  if (!context.styles[name]) throw new Error("Style not found: " + name);
  return context.styles[name].publicUrl;
});

export const scssPlugin: SitePlugin = async (context, page) => {
  if (page.relativePath.endsWith(".scss")) {
    page.content = (
      await sass.compileStringAsync(page.content, {
        loadPaths: [dirname(resolve(context.srcDir, page.relativePath))],
      })
    ).css;

    if (page.slug) {
      if (page.slug in context.styles) {
        throw new Error("Duplicated slug: " + page.slug);
      }

      context.styles[page.slug] = page;
      context.outFiles[page.slug] = Buffer.from(page.content);
    } else {
      console.warn(`! Missing slug in file ${page.relativePath}`);
    }
  }
};
