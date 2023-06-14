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
async function sendResponseToWhatsappText(from, to, body) {
    try {
        const message = await twilioClient.messages.create({
            from,
            to,
            body
        });

        console.log('Voice note sent:', message.sid);
    } catch (error) {
        console.error('Error sending voice note:', error);
    }
}

// Function to translate text using AWS Translate
async function translateText(text, from, to) {
    const params = {
        Text: text,
        SourceLanguageCode: 'auto',
        TargetLanguageCode: 'en',
    };

    console.log(params)
    console.log(from, to)

    try {
        translate.translateText(params, (err, data) => {
            if (err) console.log(err, err.stack)
            else {
                const translation = data.TranslatedText; console.log('data', data)
                // Use translation which is the translated text
                console.log('here', translation)

                // Send the text translated to Twilio WhatsApp number
                sendResponseToWhatsappText(from, to, translation);
            }
        })
    } catch (error) {
        console.error('Error translating text:', error);
    }
}

// Function to handle incoming messages
export async function handleIncomingMessage(req, res) {
    try {
        const messageBody = req.body.Body;
        const from = req.body.From;
        const to = req.body.To;

        console.log(messageBody, from, to)

        // Translate the message to English
        await translateText(messageBody, to, from);

        // Send a response back to the Twilio API
        res.set('Content-Type', 'text/xml');
        res.send('<Response></Response>');

    } catch (error) {
        console.error('Error handling incoming message:', error);
        res.status(500).send('An error occurred.');
    }
}