import twilio from 'twilio';
import AWS from '@aws-sdk/client-s3';
import AWSTc from '@aws-sdk/client-transcribe'
import AWSTl from '@aws-sdk/client-translate';
import axios from 'axios';
import fs from 'fs'
import path from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv'


dotenv.config()

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const phoneNumber = 'whatsapp:+2349059391242'

// AWS credentials
const accessKeyId = process.env.MY_AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.MY_AWS_SECRET_ACCESS_KEY;
const region = process.env.MY_AWS_REGION;
const bucketName = `${process.env.MY_AWS_S3_BUCKET}`;

// Set up Twilio client
const twilioClient = twilio(accountSid, authToken);

// Set up AWS clients
const s3 = new AWS.S3({ accessKeyId, secretAccessKey, region });
const transcribe = new AWSTc.Transcribe({ accessKeyId, secretAccessKey, region });
const translate = new AWSTl.Translate({ accessKeyId, secretAccessKey, region });

// Function to send voice note to Twilio WhatsApp number
async function sendVoiceNoteToTwilio(from, to, mediaUrl) {
    try {
        const message = await twilioClient.messages.create({
            from,
            to,
            mediaUrl,
        });

        console.log('Voice note sent:', message.sid);
    } catch (error) {
        console.error('Error sending voice note:', error);
    }
}

// Function to transcribe audio using AWS Transcribe
async function transcribeAudio(s3Bucket, s3Key) {
    const params = {
        LanguageCode: 'en-US',
        Media: { MediaFileUri: `s3://${s3Bucket}/${s3Key}` },
        TranscriptionJobName: 'transcribe-job',
    };

    try {
        const response = await transcribe.startTranscriptionJob(params);
        console.log('Transcription job started:', response.TranscriptionJob.TranscriptionJobName);
    } catch (error) {
        console.error('Error starting transcription job:', error);
    }
}

// Function to translate text using AWS Translate
async function translateText(text) {
    const params = {
        Text: text,
        SourceLanguageCode: 'auto',
        TargetLanguageCode: 'en',
    };

    try {
        const response = await translate.translateText(params);
        console.log('Translated text:', response.TranslatedText);
        return response.TranslatedText;
    } catch (error) {
        console.error('Error translating text:', error);
    }
}

// Function to save data to S3 bucket
async function saveToS3(data, filename) {
    const params = {
        Bucket: bucketName,
        Key: filename,
        Body: data,
        ContentType: 'audio/ogg'
    };

    try {
        const response = await s3.putObject(params).promise();;
        console.log('Data saved to S3:', response.Location);
    } catch (error) {
        console.error('Error saving data to S3:', error);
    }
}

// Handle voicemail recording
async function handleVoicemailRecording(req, res) {
    const body = req.body;
    console.log(body);
    try {
        const recordingUrl = req.body.MediaUrl0; console.log(recordingUrl)
        const s3Key = `voicemail-${Date.now()}.ogg`;

        // Download the audio file from the URL
        const response = await axios.get(recordingUrl, { responseType: 'arraybuffer' });
        const audioData = response.data; console.log(audioData)

        // Save the audio file locally
        // const rootDirectory = path.resolve(__dirname, '.'); // Assuming this is the root directory of your project
        // const audioFolderPath = path.join(rootDirectory, 'audio');
        // const localFilePath = path.join(audioFolderPath, `${s3Key}`);
        // fs.writeFileSync(localFilePath, audioData);

        // Send the voicemail recording to Twilio WhatsApp number
        sendVoiceNoteToTwilio(twilioPhoneNumber, phoneNumber, recordingUrl);

        // Send the voicemail to s3 bucket
        saveToS3(audioData, s3Key);

        // Transcribe the audio using AWS Transcribe
        transcribeAudio(bucketName, s3Key);

        // Send a response back to the Twilio API
        res.set('Content-Type', 'text/xml');
        res.send('<Response><Say>Thank you for leaving a voice note.</Say></Response>');
    } catch (error) {
        console.error('Error handling voicemail recording:', error);
        res.status(500).send('An error occurred.');
    }
}

// Function to handle incoming messages
export async function handleIncomingMessage(req, res) {
    try {
        const messageBody = req.body.Body;
        const from = req.body.From;
        const to = req.body.To;

        console.log(messageBody)

        if (req.body.NumMedia > 0) {
            // Voice note received
            // const mediaUrl = req.body.MediaUrl;
            await handleVoicemailRecording(req, res);
        } else {
            // Text message received
            // Translate the message to English
            const translatedText = await translateText(messageBody);

            // Send the translated message back to the Twilio WhatsApp number
            await twilioClient.messages.create({
                from: to,
                to: from,
                body: `Translated message: ${translatedText}`,
            });

            // Send a response back to the Twilio API
            res.set('Content-Type', 'text/xml');
            res.send('<Response></Response>');
        }
    } catch (error) {
        console.error('Error handling incoming message:', error);
        res.status(500).send('An error occurred.');
    }
}