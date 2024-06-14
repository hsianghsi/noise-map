const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors'); // Import cors middleware

const app = express();
app.use(cors()); // Enable CORS for all routes

app.use('/api', createProxyMiddleware({
  target: 'http://140.109.161.140',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '', // Remove base path
  },
}));

app.listen(3000, () => {
  console.log('Proxy server running on port 3000');
});

