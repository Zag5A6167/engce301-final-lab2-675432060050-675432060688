const express = require('express');
const cors = require('cors');
require('dotenv').config();
const taskRoutes = require('./routes/tasks');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/tasks', taskRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'task-service', timestamp: new Date() });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`[task-service] Running on port ${PORT}`);
});
