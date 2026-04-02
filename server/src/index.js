import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import { authenticate } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import institutionsRouter from './routes/institutions.js';
import requisitionsRouter from './routes/requisitions.js';
import syncRouter from './routes/sync.js';
import transactionsRouter from './routes/transactions.js';
import thirdPartiesRouter from './routes/thirdParties.js';
import tagsRouter from './routes/tags.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Public routes
app.use('/api/auth', authRouter);

// Protected routes
app.use('/api/institutions', authenticate, institutionsRouter);
app.use('/api/requisitions', authenticate, requisitionsRouter);
app.use('/api/sync', authenticate, syncRouter);
app.use('/api/transactions', authenticate, transactionsRouter);
app.use('/api/third-parties', authenticate, thirdPartiesRouter);
app.use('/api/tags', authenticate, tagsRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
