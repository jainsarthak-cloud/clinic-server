import 'dotenv/config';

const csv = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  corsOrigins: csv(process.env.CORS_ORIGINS),
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET
  }
};

if (!config.jwt.accessSecret && config.env === 'production') {
  throw new Error('JWT_ACCESS_SECRET is required in production');
}

export default config;
