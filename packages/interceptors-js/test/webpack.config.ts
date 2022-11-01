import * as path from "path";
import * as webpack from "webpack";

const webpackConfig: webpack.Configuration = {
  target: "web",
  plugins: [
    new webpack.EnvironmentPlugin({
      NODE_DEBUG: JSON.stringify(true),
    }),
  ],
  resolve: {
    alias: {
      "@apihero/interceptors-js": path.resolve(__dirname, ".."),
    },
  },
};

export default webpackConfig;
