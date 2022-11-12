import { GlobalContext, Page, SitePlugin } from "./types";
import prettier from "prettier";
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

    if (!ret.matterfront.raw) {
      ret.content = Handlebars.compile(ret.content)({ context, ...ret });
    }

    let content = renderWithLayout(
      context,
      ret.matterfront.layout as string | undefined,
      ret,
      [ret.slug]
    );
    try {
      content = prettier.format(content, {
        semi: false,
        parser: "html",
        printWidth: 100,
      });
    } catch (err: any) {
      context.errors.push(err);
    }

    for (const outPath of paths) {
      context.outFiles[outPath] = Buffer.from(content);
    }
  }
}

// renders a page using a layout
export function renderWithLayout(
  context: GlobalContext,
  layoutName: string | undefined,
  page: Page,
  stack: string[]
): string {
  const contextForRendering = { context, ...page };

  if (layoutName) {
    const layout = context.layouts[layoutName];

    if (!layout) throw new Error("Inexistent layout: " + layoutName);

    const content = layout.template(contextForRendering);

    const newStack = [...stack, layoutName];
    if (layout.matter.matterfront.layout) {
      return renderWithLayout(
        context,
        layout.matter.matterfront.layout as string | undefined,
        { ...contextForRendering, content },
        newStack
      );
    }

    return content;
  } else {
    throw new Error(`Invalid layout name ${layoutName}`);
  }
}
