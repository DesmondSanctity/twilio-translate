import twilio from 'twilio';
import AWS from '@aws-sdk/client-s3';
import AWSTc from '@aws-sdk/client-transcribe'
import AWSTl from '@aws-sdk/client-translate';

import dotenv from 'dotenv'


dotenv.config()

// Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// AWS credentials
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION;
const bucketName = process.env.AWS_S3_BUCKET;
const saveBucketName = process.env.AWS_S3_BUCKET_SAVE;

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
        const response = await transcribe.startTranscriptionJob(params).promise();
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
        const response = await translate.translateText(params).promise();
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
    };

    try {
        const response = await s3.upload(params).promise();
        console.log('Data saved to S3:', response.Location);
    } catch (error) {
        console.error('Error saving data to S3:', error);
    }
}

// Handle voicemail recording
async function handleVoicemailRecording(req, res) {
    try {
        const recordingUrl = req.body.RecordingUrl;
        const s3Key = `voicemail-${Date.now()}.mp3`;

        // Send the voicemail recording to Twilio WhatsApp number
        sendVoiceNoteToTwilio(twilioPhoneNumber, twilioPhoneNumber, recordingUrl);

        // Send the voicemail to s3 bucket
        saveToS3(recordingUrl, s3Key);

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