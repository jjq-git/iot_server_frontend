// Babel config for Vue2 project
// - Transpile modern JS for broad browser support
module.exports = {
  presets: [
    ["@babel/preset-env", { targets: "> 0.25%, not dead" }]
  ]
}
