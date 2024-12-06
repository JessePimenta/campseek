import express from 'express';
import { analyzeCollections } from './controllers/analyzerController.js';

const app = express();
app.use(express.json());

app.post('/analyze', analyzeCollections);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});