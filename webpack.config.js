// Webpack config for Vue2 + ElementUI admin app.
// - Reads .env.development / .env.production
// - Injects environment variables with DefinePlugin
// - Outputs hashed assets for production
// - Supports Vue SFC, JS, SCSS, and asset modules
const path = require("path")
const fs = require("fs")
const crypto = require("crypto")
const { execFileSync } = require("child_process")
const HtmlWebpackPlugin = require("html-webpack-plugin")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const { VueLoaderPlugin } = require("vue-loader")
const CopyWebpackPlugin = require("copy-webpack-plugin")
const TerserPlugin = require("terser-webpack-plugin")
const dotenv = require("dotenv")
const webpack = require("webpack")
const demoContract = require("./config/demo-contract.json")

const APP_MODES = new Set(["backend", "demo"])

const gitValue = (args, fallback = "unknown") => {
  try {
    return execFileSync("git", args, { cwd: __dirname, encoding: "utf8" }).trim() || fallback
  } catch (error) {
    return fallback
  }
}

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex")

class BuildInfoPlugin {
  constructor (options) {
    this.options = options
  }

  apply (compiler) {
    compiler.hooks.thisCompilation.tap("BuildInfoPlugin", compilation => {
      compilation.hooks.processAssets.tap(
        {
          name: "BuildInfoPlugin",
          stage: webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE
        },
        () => {
          const packageJson = require("./package.json")
          const workerAsset = this.options.appMode === "demo"
            ? compilation.getAsset("mockServiceWorker.js")
            : null
          const payload = {
            appMode: this.options.appMode,
            demoTransport: this.options.demoTransport,
            commit: gitValue(["rev-parse", "HEAD"]),
            dirty: Boolean(gitValue(["status", "--porcelain"], "")),
            version: packageJson.version,
            builtAt: new Date().toISOString(),
            contractBackendCommit: demoContract.backendCommit,
            demoSchemaVersion: this.options.appMode === "demo" ? 2 : null,
            demoSeedVersion: this.options.appMode === "demo" ? 5 : null,
            mswVersion: this.options.appMode === "demo" ? packageJson.dependencies.msw : null,
            mockWorkerSha256: workerAsset ? sha256(workerAsset.source.source()) : null,
            configSha256: sha256(fs.readFileSync(this.options.runtimeConfigPath))
          }
          compilation.emitAsset(
            "build-info.json",
            new webpack.sources.RawSource(`${JSON.stringify(payload, null, 2)}\n`)
          )
        }
      )
    })
  }
}

module.exports = (env, argv) => {
  env = env || {}
  const mode = argv.mode || "development"
  const isProd = mode === "production"
  const appMode = env.appMode
  if (!APP_MODES.has(appMode)) {
    throw new Error(`Invalid --env appMode=${appMode || "<missing>"}; expected backend or demo`)
  }
  const isDemo = appMode === "demo"
  const demoTransport = isDemo ? String(env.demoTransport || "worker").trim().toLowerCase() : "backend"
  if (!new Set(["worker", "inline"]).has(demoTransport) && isDemo) {
    throw new Error(`Invalid --env demoTransport=${demoTransport}; expected worker or inline`)
  }
  if (isProd && isDemo && demoTransport !== "worker") {
    throw new Error("Production Demo builds must use the worker transport")
  }
  const runtimeConfigPath = path.resolve(__dirname, isDemo ? "public/config.demo.json" : "public/config.json")
  const demoDevHosts = String(env.demoDevHost || process.env.VUE_APP_DEMO_DEV_HOSTS || "")
    .split(",")
    .map(host => host.trim().toLowerCase())
    .filter(Boolean)
  if (demoDevHosts.some(host => host.includes("*") || host.includes("/") || host.includes(":"))) {
    throw new Error("Demo development hosts must be exact hostnames without wildcard, path, scheme, or port")
  }

  // Load env file based on mode
  const envFile = isProd ? ".env.production" : ".env.development"
  const envConfig = dotenv.config({ path: envFile }).parsed || {}
  const localEnvConfig = isProd ? {} : (dotenv.config({ path: ".env.local" }).parsed || {})
  // A process-level override lets isolated local-device labs select a dedicated
  // backend port without rewriting the developer's tracked .env.development.
  const devApiTarget = process.env.VUE_APP_DEV_API_TARGET || envConfig.VUE_APP_DEV_API_TARGET || "http://127.0.0.1:8000"
  // Test credentials are only read from a process/local runtime override. They
  // are deliberately excluded from DefinePlugin and production artifacts.
  const devTestAccountPassword = process.env.VUE_APP_TEST_ACCOUNT_PASSWORD || localEnvConfig.VUE_APP_TEST_ACCOUNT_PASSWORD || ""

  // Convert env key/value to DefinePlugin format
  const defineEnv = Object.keys(envConfig).reduce((acc, key) => {
    acc[`process.env.${key}`] = JSON.stringify(envConfig[key])
    return acc
  }, {})

  return {
    // App entry
    entry: path.resolve(__dirname, "src/main.js"),

    // Build output
    output: {
      path: path.resolve(__dirname, isDemo ? "dist-demo" : "dist"),
      filename: isProd ? "js/[name].[contenthash:8].js" : "js/[name].js",
      publicPath: isProd ? "auto" : "/",
      clean: true
    },

    // Module resolution
    resolve: {
      extensions: [".js", ".vue", ".json"],
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@app-mode-entry$": path.resolve(__dirname, `src/app-mode-entries/${appMode}.js`),
        "@realtime-mode-entry$": path.resolve(__dirname, `src/realtime-mode-entries/${appMode}.js`),
        "vue$": "vue/dist/vue.esm.js"
      }
    },

    // Source maps
    devtool: isProd ? false : "eval-source-map",

    // Loaders
    module: {
      rules: [
        // Vue SFC
        {
          test: /\.vue$/,
          loader: "vue-loader"
        },
        // JS (ES6+)
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader"
          }
        },
        // CSS
        {
          test: /\.css$/,
          use: [
            isProd ? MiniCssExtractPlugin.loader : "style-loader",
            "css-loader",
            "postcss-loader"
          ]
        },
        // SCSS/SASS
        {
          test: /\.s[ac]ss$/,
          use: [
            isProd ? MiniCssExtractPlugin.loader : "style-loader",
            "css-loader",
            "postcss-loader",
            {
              loader: "sass-loader",
              options: {
                implementation: require("sass"),
                api: "modern"
              }
            }
          ]
        },
        // Assets
        {
          test: /src[\\/]assets[\\/]icons[\\/]icons\.svg$/,
          type: "asset/resource",
          generator: {
            filename: "assets/icons.[contenthash:8].svg"
          }
        },
        {
          test: /\.(png|jpe?g|gif|svg|woff2?|eot|ttf|otf)$/,
          exclude: /src[\\/]assets[\\/]icons[\\/]icons\.svg$/,
          type: "asset",
          parser: {
            dataUrlCondition: {
              maxSize: 10 * 1024
            }
          },
          generator: {
            filename: "assets/[name].[hash:8][ext]"
          }
        }
      ]
    },

    // Plugins
    plugins: [
      new VueLoaderPlugin(),
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, isDemo ? "public/index.demo.html" : "public/index.html"),
        inject: "body"
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: path.resolve(__dirname, "public/favicon.svg"), to: "favicon.svg", noErrorOnMissing: true },
          { from: path.resolve(__dirname, "public/favicon.ico"), to: "favicon.ico", noErrorOnMissing: true },
          { from: runtimeConfigPath, to: "config.json", noErrorOnMissing: false },
          ...(isDemo
            ? [{ from: path.resolve(__dirname, "public/mockServiceWorker.js"), to: "mockServiceWorker.js", noErrorOnMissing: false }]
            : [])
        ]
      }),
      new webpack.DefinePlugin({
        ...defineEnv,
        __BUILD_APP_MODE__: JSON.stringify(appMode),
        __DEMO_DEV_HOSTS__: JSON.stringify(demoDevHosts),
        __DEMO_TRANSPORT__: JSON.stringify(demoTransport)
      }),
      new BuildInfoPlugin({ appMode, demoTransport, runtimeConfigPath }),
      ...(isProd
        ? [new MiniCssExtractPlugin({ filename: "css/[name].[contenthash:8].css" })]
        : [])
    ],

    // Dev server
    devServer: {
      port: Number(process.env.PORT) || (isDemo ? 46944 : 8080),
      host: "0.0.0.0",
      allowedHosts: isDemo ? ["localhost", "127.0.0.1", "[::1]", ...demoDevHosts] : "all",
      historyApiFallback: true,
      hot: true,
      open: false,  // 不自动打开浏览器
      client: {
        overlay: {
          errors: true,
          warnings: true,
          runtimeErrors: (error) => {
            const message = error && error.message ? error.message : String(error || '')
            return message !== 'ResizeObserver loop completed with undelivered notifications.' &&
              message !== 'ResizeObserver loop limit exceeded'
          }
        }
      },
      // 开发模式下使用 / 路径，让 webpack-dev-server 正常工作
      devMiddleware: {
        publicPath: "/"
      },
      static: {
        directory: path.resolve(__dirname, "public"),
        publicPath: "/",
        watch: false
      },
      ...(isDemo
        ? {}
        : {
            proxy: {
              "/api": {
                target: devApiTarget,
                changeOrigin: true,
                ws: true
              },
              // Local EMQX in Podman reaches the same trusted dev-server port and
              // forwards only the backend's root-level auth/ACL callback paths.
              "/emqx": {
                target: devApiTarget,
                changeOrigin: true
              }
            }
          }),
      setupMiddlewares: (middlewares, devServer) => {
        if (!devServer) {
          throw new Error('webpack-dev-server is not defined');
        }
        devServer.app.get('/config.json', (req, res) => {
          let runtimeConfig = {}
          try {
            runtimeConfig = JSON.parse(fs.readFileSync(runtimeConfigPath, 'utf8'))
          } catch (error) {
            res.status(500).json({ error: 'runtime_config_unavailable' })
            return
          }
          if (!isDemo && devTestAccountPassword) {
            runtimeConfig.testAccountPassword = devTestAccountPassword
          }
          res.set('Cache-Control', 'no-store')
          res.json(runtimeConfig)
        })
        // 提供 favicon 文件访问
        devServer.app.get('/favicon.svg', (req, res) => {
          res.sendFile(path.resolve(__dirname, 'public/favicon.svg'));
        });
        devServer.app.get('/favicon.ico', (req, res) => {
          res.sendFile(path.resolve(__dirname, 'public/favicon.ico'));
        });
        return middlewares;
      }
    },

    // Optimization
    optimization: {
      splitChunks: {
        chunks: "all"
      },
      // 生产构建剥离 console.log/info/debug，保留 console.warn/error 便于线上排查
      minimizer: isProd
        ? [
          new TerserPlugin({
            exclude: /mockServiceWorker\.js$/,
            terserOptions: {
              compress: {
                pure_funcs: ["console.log", "console.info", "console.debug"]
              }
            },
            extractComments: false
          })
        ]
        : []
    }
  }
}
