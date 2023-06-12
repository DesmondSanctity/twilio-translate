import twilio from 'twilio';
import AWS from 'aws-sdk';
import axios from 'axios';

import dotenv from 'dotenv'


dotenv.config()

// Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// AWS credentials
const accessKeyId = process.env.MY_AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.MY_AWS_SECRET_ACCESS_KEY;
const region = `${process.env.MY_AWS_REGION}`;
const bucketName = 'twilio-record';

// Set up Twilio client
const twilioClient = twilio(accountSid, authToken);

// Set up AWS clients
const s3 = new AWS.S3({ accessKeyId, secretAccessKey, region });
const transcribe = new AWS.TranscribeService({ accessKeyId, secretAccessKey, region });
const translate = new AWS.Translate({ accessKeyId, secretAccessKey, region });

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
        const response = transcribe.startTranscriptionJob(params);
        console.log('Transcription job started:', response);
        return response
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

    console.log(params)

    try {
        translate.translateText(params, (err, data) => {
            if (err) console.log(err, err.stack)
            else {
                const translation = data.TranslatedText; console.log('data', data)
                // Use translation which is the translated text
                console.log('here', translation)
                return translation
            }
        })
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
        const response = await s3.putObject(params).promise();
        console.log('Data saved to S3:', response.Location);
    } catch (error) {
        console.error('Error saving data to S3:', error);
    }
}

// Handle voicemail recording
async function handleVoicemailRecording(req, res) {

    const from = req.body.From;
    const to = req.body.To;

    console.log(from, to)
    try {
        const recordingUrl = req.body.MediaUrl0;
        console.log('recording', recordingUrl)
        const s3Key = `recording-${Date.now()}`;
        console.log('key', s3Key)

        // Download the audio file from the URL
        const response = await axios.get(recordingUrl, { responseType: 'arraybuffer' });
        const audioData = response.data; console.log(audioData)

        // Send the voicemail recording to Twilio WhatsApp number
        sendVoiceNoteToTwilio(to, from, recordingUrl);

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

        console.log(messageBody, to, from)

        if (req.body.NumMedia > 0) {
            // Voice note received
            // const mediaUrl = req.body.MediaUrl;
            await handleVoicemailRecording(req, res);
        } else {
            // Text message received
            // Translate the message to English
            const translatedText = await translateText(messageBody);

            console.log('translate', translatedText)

            // Send the translated message back to the Twilio WhatsApp number
            await twilioClient.messages.create({
                from: to,
                to: from,
                body: `Translated message: ${translatedText ? translatedText : 'Sorry an error occured'}`,
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