const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
const glob = require("glob");
const path = require("path");
const webpack = require("webpack");

const config = ({ filename, input, output, production }) => {
    let optimization = {};

    production = production === "false" ? false : true;

    if (!production) {
        optimization = {
            mangleWasmImports: false,
            minimize: false
        };
    }

    return {
        entry: {
            [(filename || "app") + (production ? ".min" : "")]: glob.sync(
                `${input}/{,!(node_modules)/**/}!(webpack)*.js`
            )
        },
        mode: production ? "development" : "production",
        optimization,
        output: {
            path: output
        },
        plugins: [
            new NodePolyfillPlugin(),
            new webpack.ProvidePlugin({
                Buffer: ["buffer", "Buffer"],
                process: "process/browser"
            })
        ],
        resolve: {
            fallback: {
                fs: false
            }
        }
    };
};

module.exports = config;
