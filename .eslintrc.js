// ESLint config
// - Standard + Vue essential rules
// - Allows console for admin console usage
module.exports = {
  root: true,
  env: {
    browser: true,
    node: true
  },
  extends: ["standard", "plugin:vue/essential"],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module"
  },
  rules: {
    "no-console": "off"
  }
}
