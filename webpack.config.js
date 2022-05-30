const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const JsonMinimizerPlugin = require("json-minimizer-webpack-plugin");
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');
const GenerateJsonFromJsPlugin = require('generate-json-from-js-webpack-plugin');

module.exports = (env, argv) => {

    // Set extension target & define options related to it
    const possibleTargets = [
        'chrome',
        'firefox',
    ];
    const BROWSER_TARGET = env.target || 'chrome';
    if ( ! possibleTargets.includes( BROWSER_TARGET ) ) {
        throw new Error( 'Target must be one of: ' + JSON.stringify( possibleTargets ) );
    }
    const definePluginOptions = {
        BROWSER_TARGET: JSON.stringify(BROWSER_TARGET)
    };
    if ( BROWSER_TARGET === 'chrome' ) {
        definePluginOptions.browser = 'chrome';
    }

    const terserPluginOptions = {
        parallel: true,
        terserOptions: {
            output: {
                comments: true
            },
            compress: {
                warnings: false,
                drop_console: false // eslint-disable-line camelcase
            }
        }
    };
    if (argv.mode === 'production') {
        terserPluginOptions.terserOptions.output.comments = false;
        terserPluginOptions.terserOptions.compress.drop_console = true;
    }
    const config = {
        target: 'web',
        entry: {
            devtools_page: './src/js/devtools_page.js', // registerer for devtools page
            devtools: './src/js/devtools.js', // devtools page script
            background: './src/js/background.js', // service worker script
            content_script: './src/js/content_script.js', // message handling content script
            content_script_override: './src/js/content_script_override.js', // window.DustPressDebugger & old debugger version override
        },
        devtool: 'source-map',
        optimization: {
            removeAvailableModules: true,
            minimize: true,
            minimizer: [
                new JsonMinimizerPlugin(),
                new TerserPlugin(terserPluginOptions),
            ]
        },
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: '[name].js',
            chunkFilename: '[name]-[contenthash].js',
            clean: true,
        },
        plugins: [
            new GenerateJsonFromJsPlugin({
                path: './src/js/manifest.js',
                filename: 'manifest.json',
                data: {
                    BROWSER_TARGET,
                }
            }),
            new MiniCssExtractPlugin({
                filename: '[name].css',
                chunkFilename: '[name]-[contenthash].css',
            }),
            new webpack.DefinePlugin(definePluginOptions)
        ],
        experiments: {
            topLevelAwait: true,
        },
        devServer: {
            static: './dist',
            hot: true,
            allowedHosts: 'all',
            https: false,
        },
        module: {
            rules: [
                {
                    test: /\.(js|jsx)$/,
                    resolve: {
                        extensions: ['.js', '.jsx'],
                    },
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                        options: {

                            // Do not use the .babelrc configuration file.
                            babelrc: false,

                            // The loader will cache the results of the loader in node_modules/.cache/babel-loader.
                            cacheDirectory: true,

                            // Enable latest JavaScript features.
                            presets: [
                                '@babel/preset-env',
                                '@babel/preset-react',
                            ],

                            plugins: [
                                '@babel/plugin-syntax-dynamic-import', // Enable dynamic imports.
                                '@babel/plugin-syntax-top-level-await', // Enable await functions on js context top level (in addition to async functions)
                            ]
                        }
                    }
                },
                {
                    test: /\.(scss|css)$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: 'css-loader',
                            options: {
                                sourceMap: true
                            }
                        },
                        {
                            loader: 'postcss-loader',
                            options: {
                                sourceMap: true
                            }
                        },
                        {
                            loader: 'sass-loader',
                            options: {
                                sourceMap: true
                            }
                        }
                    ]
                },
                {
                    test: /\.(html|png|jpe?g|gif|ico)$/i,
                    use: [
                        {
                            loader: 'file-loader',
                            options: {
                                name: '[name].[ext]',
                            },
                        },
                    ],
                },
                {
                    test: /\.json$/i,
                    type: 'asset/resource',
                },
            ],
        }
    };

    if (argv.mode === 'production') {
        config.devtool = undefined;
    }

    return config;
};
