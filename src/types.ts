import Handlebars from "handlebars";

export type Page = {
  publicUrl: string;
  content: string;
  excerpt?: string;
  orig: string;
  language: string;
  matter: string;
  data: Record<any, unknown>
  relativePath: string
  slug?: string
};

export type GlobalContext = {
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
  configuration: {
    staticFolder: string;
    layoutsFolder: string;
  };
  styles: Record<string, Page>;
  preProcessPage?: (page: Page) => void;
  plugins: Array<SitePlugin>
  outFiles: Record<string, Buffer>
};

export type SitePlugin = (context: GlobalContext, page: Page) => Promise<void>