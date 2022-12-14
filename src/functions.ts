import Handlebars from "handlebars";
import { parse as parseMarkdown, ParseFlags } from "markdown-wasm";
import hljs from "highlight.js";
import get from "lodash.get";
import prettier from "prettier";
import { graphvizSync } from "@hpcc-js/wasm";
import { GlobalContext } from "./types";

export async function init(context: GlobalContext) {
  const viz = await graphvizSync();

  Handlebars.registerHelper("markdown", function (content: string) {
    const that = this;
    if (typeof content !== "string" || !content.trim().length) return "";
    return parseMarkdown(content ?? "", {
      onCodeBlock(lang, codeBytes) {
        const code = codeBytes.toString();
        if (lang == "x-dot") {
          return viz.dot(code, "svg");
        }
        try {
          const [prettyCode, newLang] = formatIfNeeded(code, lang);
          const language = hljs.getLanguage(newLang) ? newLang : "plaintext";
          return hljs.highlight(prettyCode, { language }).value;
        } catch (err) {
          context.errors.push(
            new Error(`⚠️  Error in ${that.relativePath}:\n${err.message}`)
          );
          return code;
        }
      },
      parseFlags:
        ParseFlags.DEFAULT |
        ParseFlags.LATEX_MATH_SPANS |
        ParseFlags.COLLAPSE_WHITESPACE,
    });
  });

  Handlebars.registerHelper("json", function (arg) {
    const j = JSON.stringify(arg, null, 2);
    console.log(j);
    return j;
  });

  Handlebars.registerHelper("log", function (arg) {
    console.dir(arg);
    return undefined;
  });

  Handlebars.registerHelper("eq", function (a, b) {
    return a == b;
  });

  Handlebars.registerHelper("neq", function (a, b) {
    return a != b;
  });
  Handlebars.registerHelper("gt", function (a, b) {
    return a > b;
  });
  Handlebars.registerHelper("lt", function (a, b) {
    return a < b;
  });
  Handlebars.registerHelper("gte", function (a, b) {
    return a >= b;
  });
  Handlebars.registerHelper("lte", function (a, b) {
    return a <= b;
  });
  Handlebars.registerHelper("number", function (a) {
    return +a;
  });

  Handlebars.registerHelper(
    "helperMissing",
    function (/* dynamic arguments */) {
      var options = arguments[arguments.length - 1];
      var args = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
      console.error("Missing: " + options.name + "(" + args + ")");
      return new Handlebars.SafeString(
        "Missing: " + options.name + "(" + args + ")"
      );
    }
  );

  Handlebars.registerHelper("blockHelperMissing", function (context, options) {
    console.error(
      "Helper '" +
        options.name +
        "' not found. " +
        "Printing block: " +
        options.fn(context)
    );
    return (
      "Helper '" +
      options.name +
      "' not found. " +
      "Printing block: " +
      options.fn(context)
    );
  });

  Handlebars.registerHelper("getOrElse", function (a, b) {
    return a ? a : b;
  });

  Handlebars.registerHelper("resolveUrl", function (part, base) {
    try {
      return new URL(part, base).toString();
    } catch (err) {
      return base + part;
    }
  });

  Handlebars.registerHelper("isoDate", function (date, options) {
    if (date) {
      return new Date(date).toISOString();
    }
    return "";
  });

  Handlebars.registerHelper("prettyDate", function (date, options) {
    if (date) {
      return new Date(date).toISOString().replace(/(T.+)/, "");
    }
    return "";
  });

  Handlebars.registerHelper("join", function (array, separator) {
    if (array && Array.isArray(array)) {
      return array.join(separator);
    }
    if (array !== undefined) {
      throw new Error("Provided argument is not an array");
    }
  });

  Handlebars.registerHelper("sortAsc", function (iterable, field) {
    if (field) {
      const iter: any[] = Array.isArray(iterable)
        ? iterable
        : iterable && typeof iterable == "object"
        ? Object.values(iterable)
        : [];

      return iter.sort((a, b) => {
        return get(a, field) < get(b, field) ? -1 : 1;
      });
    }
    throw new Error("Iteration failed. second argument field not");
  });

  Handlebars.registerHelper("sortDesc", function (iterable, field) {
    if (field) {
      const iter: any[] = Array.isArray(iterable)
        ? iterable
        : iterable && typeof iterable == "object"
        ? Object.values(iterable)
        : [];

      return iter.sort((a, b) => {
        return get(a, field) > get(b, field) ? -1 : 1;
      });
    }
    throw new Error("Iteration failed. second argument field not");
  });

  Handlebars.registerHelper("get", function (obj, field) {
    return get(obj, field);
  });
}

function formatIfNeeded(code: string, language: string): [string, string] {
  switch (language) {
    case "typescript":
    case "css":
    case "scss":
    case "json":
    case "yaml":
    case "graphql":
    case "markdown":
    case "html":
      return [
        prettier.format(code, {
          semi: false,
          parser: language,
          printWidth: 100,
          trailingComma: "none",
        }),
        language,
      ];
    case "json":
      return [
        prettier.format(code, {
          semi: false,
          parser: "json",
          printWidth: 100,
          trailingComma: "none",
        }),
        "json",
      ];
    case "jsonc":
      return [
        prettier.format(code, {
          semi: false,
          parser: "json",
          printWidth: 100,
          trailingComma: "none",
        }),
        "javascript",
      ];
    case "javascript":
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
      return [
        prettier.format(code, {
          semi: false,
          parser: "typescript",
          printWidth: 100,
          trailingComma: "none",
        }),
        "typescript",
      ];
  }
  return [code, language];
}
