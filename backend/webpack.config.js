const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');
const path = require('path');

module.exports = (options) => {
  return {
    ...options,
    externals: [
      nodeExternals({
        allowlist: ['webpack/hot/poll?100'],
      }),
    ],
    plugins: [
      ...options.plugins,
      new webpack.IgnorePlugin({
        checkResource(resource) {
          const lazyImports = [
            'kafkajs',
            'mqtt',
            'nats',
            'amqplib',
            'amqp-connection-manager',
            '@grpc/grpc-js',
            '@grpc/proto-loader',
            'redis',
            'ioredis',
            'hiredis',
            'tedious',
            'mongodb',
            'react-native-sqlite-storage',
            'sql.js',
            'sqlite3',
            'better-sqlite3',
            'pg-native',
            'pg-query-stream',
            'typeorm-aurora-data-api-driver',
            'oracledb',
            'mysql',
            'mysql2',
            'pg-hstore',
          ];
          
          if (!lazyImports.includes(resource)) {
            return false;
          }
          
          try {
            require.resolve(resource);
          } catch (err) {
            return true;
          }
          
          return false;
        },
      }),
    ],
  };
};