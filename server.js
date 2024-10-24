import express from 'express';
import multer from 'multer';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import path from 'path';
import fs from 'fs/promises';

// Multer setup to store files in the /tmp directory
const upload = multer({ dest: path.join('/tmp') });
const app = express();
const client = new ImageAnnotatorClient();
const port = process.env.PORT || 8080;

app.post('/upload', upload.single('pic'), async (req, res) => {
    try {
        const filePath = req.file.path;

        // Call Google Cloud Vision to detect labels
        const [result] = await client.labelDetection(filePath);
        const labels = result.labelAnnotations.map(label => ({
            description: label.description,
            score: (label.score * 100).toFixed(2) // Convert score to percentage and round to 2 decimals
        }));

        // Return the labels and confidence percentages as an HTML response with progress bars
        res.send(`
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            padding: 20px;
            text-align: center;
          }
          h2 {
            color: #333;
          }
          .label-container {
            margin-bottom: 20px;
          }
          .progress-bar {
            width: 100%;
            background-color: #e0e0e0;
            border-radius: 13px;
            overflow: hidden;
            margin: 10px 0;
          }
          .progress {
            height: 24px;
            background-color: #007bff;
            border-radius: 13px;
          }
          a {
            display: inline-block;
            margin-top: 20px;
            padding: 10px 20px;
            background-color: #28a745;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-size: 1.1em;
          }
          a:hover {
            background-color: #218838;
          }
        </style>
      </head>
      <body>
        <h2>Detected Labels and Confidence:</h2>
        ${labels.map(label => `
          <div class="label-container">
            <strong>${label.description} - ${label.score}%</strong>
            <div class="progress-bar">
              <div class="progress" style="width: ${label.score}%"></div>
            </div>
          </div>
        `).join('')}
        <a href="/">Upload another image</a>
      </body>
      </html>
    `);

        await fs.unlink(filePath);
    } catch (err) {
        console.error('Error during image processing:', err);
        res.status(500).send('Internal Server Error: Could not process the image.');
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'client', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
