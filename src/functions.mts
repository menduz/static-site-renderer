import Handlebars from "handlebars";
import { marked } from "marked";
import hljs from "highlight.js";

Handlebars.registerHelper("markdown", (content: string) => {
  return marked(content);
});

marked.setOptions({
  highlight: function (code, lang) {
    const language = hljs.getLanguage(lang) ? lang : "plaintext";
    return hljs.highlight(code, { language }).value;
  },
  langPrefix: "hljs language-", // highlight.js css expects a top-level 'hljs' class.
  pedantic: false,
  gfm: true,
  breaks: false,
  sanitize: false,
  smartLists: true,
  smartypants: false,
  xhtml: false,
});

Handlebars.registerHelper("json", function (arg) {
  const j = JSON.stringify(arg, null, 2);
  console.log(j);
});

Handlebars.registerHelper("helperMissing", function (/* dynamic arguments */) {
  var options = arguments[arguments.length - 1];
  var args = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
  console.error("Missing: " + options.name + "(" + args + ")");
  return new Handlebars.SafeString(
    "Missing: " + options.name + "(" + args + ")"
  );
});

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

Handlebars.registerHelper('getOrElse', function (a, b) {return a ? a : b;});

Handlebars.registerHelper('resolveUrl', function (part, base) {
  try {
    return new URL(part, base).toString()
  } catch (err) {
    console.dir({part, base})
    throw err
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
      return a[field] > b[field] ? -1 : 1;
    });
  }
  throw new Error("Iteration failed. second argument field not");
});
