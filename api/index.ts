import app from '../server.js';

// Vercel serverless function entry point
export default async (req: any, res: any) => {
  // Pass to Express app
  return app(req, res);
};
