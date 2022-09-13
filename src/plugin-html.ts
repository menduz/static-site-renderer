import { GlobalContext, Page, SitePlugin } from "./types";
import b from "js-beautify";
import * as Handlebars from "handlebars";

export const htmlPlugin: SitePlugin = async (context, page) => {
  if (
    page.relativePath.endsWith(".md") ||
    page.relativePath.endsWith(".html")
  ) {
    if (page.slug) {
      await renderPage(context, page);
    }
  }
};

// Render a page to disk
async function renderPage(context: GlobalContext, ret: Page) {
  const paths: Set<string> = new Set();

  function addOutPath(path: string) {
    // add slug with and without /index.html
    const normalizedPath = path.replace(/\/$/, "");
    paths.add(normalizedPath + ".html");
    paths.add(normalizedPath + "/index.html");
  }

  if (ret.slug) {
    console.log(`> Rendering ${ret.slug as any}`);

    addOutPath(ret.slug);

    if (!ret.data.raw) {
      ret.content = Handlebars.compile(ret.content)({ context, ...ret });
    }

    const content = b.html(
      renderWithLayout(context, ret.data.layout as string | undefined, ret, [
        ret.slug,
      ]),
      {
        indent_size: 2,
      }
    );

    for (const outPath of paths) {
      context.outFiles[outPath] = Buffer.from(content);
    }
  }
}

// renders a page using a layout
export function renderWithLayout(
  context: GlobalContext,
  layoutName: string | undefined,
  data: Page,
  stack: string[]
): string {
  const contextForRendering = { context, ...data };

  if (layoutName) {
    const layout = context.layouts[layoutName];

    if (!layout) throw new Error("Inexistent layout: " + layoutName);

    const content = layout.template(contextForRendering);

    const newStack = [...stack, layoutName];
    if (layout.matter.data.layout) {
      return renderWithLayout(
        context,
        layout.matter.data.layout as string | undefined,
        { ...contextForRendering, content },
        newStack
      );
    }

    return content;
  } else {
    console.dir(data);
    throw new Error("asd");
  }
}
