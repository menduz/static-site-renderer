module.exports = function ({ context }) {
  context.AAA = 1;

  context.preProcessPage = function (page) {
    if (page.matterfront.title?.includes("PI")) {
      page.slug = "/custom-slug";
    }
  };
};
