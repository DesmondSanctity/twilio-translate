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
    console.log(from, to, text)
    // Use Twilio API to send `text` message from `from` to `to` number  
    await twilioClient.messages.create({
        to: to,
        from: from,
        body: text
    });
}

async function translateText(text) {
    const params = {
        Text: text,
        SourceLanguageCode: 'auto',
        TargetLanguageCode: 'en',
    };

    return new Promise((resolve, reject) => {
        translate.translateText(params, (err, data) => {
            console.log(data)
            if (err) reject(err);
            else {
                const translation =  `Your translation from ${data.SourceLanguageCode} to ${data.TargetLanguageCode} is: \n ${data.TranslatedText}`;
                resolve(translation);
            }
        });
    });
}

// Function to handle incoming messages
export async function handleIncomingMessage(req, res) {
    try {
        const { Body, From, To } = req.body;
        console.log(Body, From, To)

        let translation = await translateText(Body);

        sendResponseToWhatsappText(To, From, translation);

    } catch (error) {
        console.error('Error handling incoming message:', error);
        res.status(500).send('An error occurred.');
    }
}