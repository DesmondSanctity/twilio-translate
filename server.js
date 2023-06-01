import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import morgan from 'morgan';

import { handleIncomingMessage } from './functions/index.js';

const app = express();

/** middlewares */
app.use(express.json());
app.use(cors());
app.use(morgan('tiny'));
app.disable('x-powered-by'); // less hackers know about our stack
app.use(bodyParser.urlencoded({ extended: false }));



// // Handle voicemail recording
// app.post('/handle-voicemail', async (req, res) => {
//   await handleVoicemailRecording(req, res);
// });

// Handle incoming messages
app.post('/incoming-message', async (req, res) => {
  await handleIncomingMessage(req, res);
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
