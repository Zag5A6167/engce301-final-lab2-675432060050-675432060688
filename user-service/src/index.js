const express = require('express');
const cors = require('cors');
require('dotenv').config();
const userRoutes = require('./routes/users');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'user-service', timestamp: new Date() });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`[user-service] Running on port ${PORT}`);
});
