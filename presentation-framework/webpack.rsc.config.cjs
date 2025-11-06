const path = require('path');
const ReactFlightWebpackPlugin = require('react-server-dom-webpack/plugin');

module.exports = {
  mode: 'production',
  entry: {
    server: path.resolve(__dirname, 'src/rsc/components/index.ts'),
  },
  target: 'node',
  output: {
    path: path.resolve(__dirname, 'dist/rsc'),
    filename: '[name].js',
    libraryTarget: 'commonjs2',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new ReactFlightWebpackPlugin({
      isServer: true,
      clientReferences: [
        path.resolve(__dirname, 'src/rsc/components/index.ts'),
      ],
      moduleTypes: {
        server: 'react-server',
        client: 'react-client',
      },
      chunkName: 'rsc-manifest',
    }),
  ],
};
