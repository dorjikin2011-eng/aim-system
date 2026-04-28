module.exports = (req, res) => {
  console.log('Simple endpoint called');
  res.status(200).json({ 
    message: 'Simple endpoint works!',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    hasDatabaseUrl: !!process.env.DATABASE_URL
  });
};
