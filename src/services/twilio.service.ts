import axios from "axios";
import { env } from "../config/env";

/**
 * Twilio SMS sender. Uses a dedicated Axios instance shape to avoid adding new deps.
 */
export const sendTwilioSms = async (to: string, body: string): Promise<void> => {
  const accountSid = env.twilioAccountSid();
  const authToken = env.twilioAuthToken();
  const from = env.twilioFromNumber();

  await axios.post(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
    new URLSearchParams({
      To: to,
      From: from,
      Body: body,
    }),
    {
      auth: { username: accountSid, password: authToken },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );
};
