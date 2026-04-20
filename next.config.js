module.exports = {
  reactStrictMode: true,
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: `${process.env.REACT_APP_API_URL}/api/:path*`
        }
      ]
    };
  }
};
