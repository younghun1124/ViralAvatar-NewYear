/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Phaser webpack 설정
    config.module.rules.push({
      test: /\.js$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader'
      }
    })

    // Node 환경에서 canvas 모듈 사용하지 않도록 설정
    if (isServer) {
      config.externals.push({
        'canvas': 'commonjs canvas'
      })
    }

    return config
  }
};

export default nextConfig;
