export default {
  // Don't hardcode paths - allow command-line arguments to override
  // If no path is specified, this default will be used
  default: 'e2e/features/**/*.feature',
  import: ['e2e/.e2e-dist/step-definitions/**/*.js', 'e2e/.e2e-dist/support/**/*.js'],
  format: ['progress-bar', 'html:reports/e2e.html'],
  formatOptions: {
    snippetInterface: 'async-await',
  },
  dryRun: false,
  failFast: true, // Stop on first failure to prevent loops
  strict: true,
  retry: 0, // Never retry - prevents infinite loops
  parallel: 1, // Run serially - prevents multiple browser windows
}
