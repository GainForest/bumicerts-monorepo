// cucumber.mjs — Cucumber.js configuration for TypeScript
// Run: node --import tsx npx cucumber-js
export default {
  paths: ["bdd/features/**/*.feature"],
  import: [
    "bdd/step-definitions/**/*.ts",
    "bdd/support/**/*.ts",
  ],
  format: [
    "summary",
    "json:bdd/reports/cucumber-report.json",
    "html:bdd/reports/cucumber-report.html",
  ],
  formatOptions: { snippetInterface: "async-await" },
  publishQuiet: true,
  worldParameters: {},
};
