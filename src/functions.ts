import Handlebars from "handlebars";
import { parse as parseMarkdown, ParseFlags } from "markdown-wasm";
import hljs from "highlight.js";
import get from "lodash.get";
import { graphvizSync } from "@hpcc-js/wasm";

export async function init() {
  const viz = await graphvizSync();

  Handlebars.registerHelper("markdown", (content: string) => {
    return parseMarkdown(content, {
      onCodeBlock(lang, codeBytes) {
        const code = codeBytes.toString();
        if (lang == "x-dot") {
          return viz.dot(code, "svg");
        }
        const language = hljs.getLanguage(lang) ? lang : "plaintext";
        return hljs.highlight(code, { language }).value;
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
      console.dir({ part, base });
      throw err;
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
    return get(obj, field)
  });
}
