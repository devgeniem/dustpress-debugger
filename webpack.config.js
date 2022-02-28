const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const JsonMinimizerPlugin = require("json-minimizer-webpack-plugin");
const TerserPlugin = require('terser-webpack-plugin');

const config = {
    target: 'web',
    entry: {
        index: './src/index.js',
        devtools: './src/devtools.js',
        background: './src/background.js',
        content_script: './src/content_script.js',
    },
    devtool: 'source-map',
    optimization: {
        runtimeChunk: {
            name: ( entrypoint ) => `runtime-${entrypoint.name}`,
        },
        removeAvailableModules: true,
        minimize: true,
        minimizer: [
            new JsonMinimizerPlugin(),
            // new TerserPlugin({
            //     parallel: true,
            //     terserOptions: {
            //         // output: {
            //         //     comments: false
            //         // },
            //         compress: {
            //             warnings: false,
            //             drop_console: true // eslint-disable-line camelcase
            //         }
            //     }
            // }),
        ]
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        chunkFilename: '[name]-[contenthash].js',
        clean: true,
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: '[name].css',
            chunkFilename: '[name]-[contenthash].css',
        }),
        new CopyPlugin({
            patterns: [
                { from: "./src/manifest.json", to: "manifest.json" },
            ],
        }),
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
                test: /\.js$/,
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

module.exports = (env, argv) => {
    if (argv.mode === 'production') {
        // config.devtool = undefined;
    }

    return config;
};
