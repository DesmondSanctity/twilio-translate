## twilio-translate
A utility tool for translating languages foreign to English on the fly using Twilio WhatsApp and AWS Translate service.

## running the project

- Clone the repo to your local machine
  ```bash
  git clone https://github.com/DesmondSanctity/twilio-translate.git
  ```
- Run the installation command to install all the packages needed
  ```bash
  npm install
  ```
- Create a `.env` file and populate the following values with your values. The example `.env` is shown below:
  ```bash
  TWILIO_ACCOUNT_SID=XXXXX
  TWILIO_AUTH_TOKEN=XXXXX
  MY_AWS_SECRET_ACCESS_KEY=XXXXX
  MY_AWS_ACCESS_KEY_ID=XXXXX
  MY_AWS_REGION=XXXXX
  ```
- - Run the project using the command below:
  ```bash
  node index.js
  ```
- Follow this article to understand the process taken to build this app and build along. [https://www.twilio.com/blog/build-translation-bot-twilio-whatsapp-aws-translate](https://www.twilio.com/blog/build-translation-bot-twilio-whatsapp-aws-translate)
