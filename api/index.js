// Vercel serverless entry-point.
// The Express app is built by the api-server workspace (see vercel.json buildCommand).
// We import the compiled output so Vercel can wrap it as a function.
export { default } from '../artifacts/api-server/dist/index.mjs';
