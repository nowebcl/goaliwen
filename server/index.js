import app from './app.js';

const PORT = process.env.PORT || 5181;

app.listen(PORT, () => {
  console.log(`[API Server] Running on http://localhost:${PORT}`);
  console.log(`[Flow Gateway] Ready on ${process.env.FLOW_API_URL || 'https://www.flow.cl/api'}`);
});
