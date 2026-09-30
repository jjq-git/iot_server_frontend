// PostCSS config
// - Autoprefixer adds vendor prefixes for compatibility
// - postcss-pxtorem 把样式里的 font-size: Npx 统一转成 rem，使全站字号跟随
//   <html> 的 font-size 缩放（见 src/utils/font-size.js）。
//   只转 font-size，不动间距/圆角/边框，避免影响布局；
//   媒体查询断点(mediaQuery:false)保持 px，否则响应式断点会跟着字号漂移。
module.exports = {
  plugins: [
    require("autoprefixer"),
    require("postcss-pxtorem")({
      rootValue: 16,
      unitPrecision: 4,
      propList: ["font-size"],
      minPixelValue: 2,
      mediaQuery: false
    })
  ]
}
