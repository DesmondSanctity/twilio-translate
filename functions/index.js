import twilio from 'twilio';
import AWS from 'aws-sdk';

import dotenv from 'dotenv'


dotenv.config()

// Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// AWS credentials
const accessKeyId = process.env.MY_AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.MY_AWS_SECRET_ACCESS_KEY;
const region = `${process.env.MY_AWS_REGION}`;

// Set up Twilio client
const twilioClient = twilio(accountSid, authToken);

// Set up AWS client
const translate = new AWS.Translate({ accessKeyId, secretAccessKey, region });


// Function to send voice note to Twilio WhatsApp number
export async function sendResponseToWhatsappText(from, to, text) {
    // Use Twilio API to send `text` message from `from` to `to` number  
    await twilioClient.messages.create({
        to,
        from,
        body: text
    });
}

export async function translateText(text) {
    const params = {
        Text: text,
        SourceLanguageCode: 'auto',
        TargetLanguageCode: 'en',
    };

    return new Promise((resolve, reject) => {
        translate.translateText(params, (err, data) => {
            if (err) reject(err);
            else {
                const translation = data.TranslatedText;
                resolve(translation);
            }
        });
    });
}

// Function to handle incoming messages
export async function handleIncomingMessage(req, res) {
    try {
        const { Body, from, to } = req.body;

        let translation = await translateText(Body);

        sendResponseToWhatsappText(to, from, translation);

    } catch (error) {
        console.error('Error handling incoming message:', error);
        res.status(500).send('An error occurred.');
    }
}