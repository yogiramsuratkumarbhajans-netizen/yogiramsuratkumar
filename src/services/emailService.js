// Brevo (Sendinblue) Email Service
// Uses Brevo SMTP/API for sending notification emails

const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY;
const SENDER_EMAIL = import.meta.env.VITE_SENDER_EMAIL;
const SENDER_NAME = 'Namavruksha';

/**
 * Send notification email using Brevo API
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email address
 * @param {string} params.subject - Email subject
 * @param {string} params.message - Email body (plain text)
 * @returns {Promise<Object>} - Response from Brevo API
 */
export const sendNotificationEmail = async ({ to, subject, message }) => {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: SENDER_NAME,
          email: SENDER_EMAIL
        },
        to: [{ email: to }],
        subject: subject,
        textContent: message,
        htmlContent: `<div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
                    <div style="background: linear-gradient(135deg, #FF9933 0%, #8B0000 100%); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                        <h1 style="color: white; margin: 0;">🙏 Namavruksha</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">The Divine Tree of the Holy Name</p>
                    </div>
                    <div style="background: #fff; padding: 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px;">
                        <h2 style="color: #8B0000; margin-top: 0;">${subject}</h2>
                        <div style="white-space: pre-wrap; color: #333; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</div>
                    </div>
                    <div style="text-align: center; padding: 16px; color: #999; font-size: 12px;">
                        <p>Yogi Ramsuratkumar Jaya Guru Raya!</p>
                        <p>© Namavruksha - Rooted in Nama. Growing in Faith.</p>
                    </div>
                </div>`
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Brevo API error:', errorData);
      throw new Error(errorData.message || 'Failed to send email');
    }

    const result = await response.json();
    console.log('Email sent successfully:', result);
    return { status: 200, messageId: result.messageId };
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

/**
 * Send new registration notification to admin
 * @param {Object} userData - User registration data
 */
export const sendNewRegistrationNotification = async (userData) => {
  const message = `A new devotee has joined Namavruksha!

📋 Registration Details:
━━━━━━━━━━━━━━━━━━━━━━
Name: ${userData.name}
Email: ${userData.email}
WhatsApp: ${userData.whatsapp || 'Not provided'}
City: ${userData.city || 'Not provided'}
State: ${userData.state || 'Not provided'}
Country: ${userData.country || 'Not provided'}
━━━━━━━━━━━━━━━━━━━━━━

Registered at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST

🙏 Hari Om!`;

  return sendNotificationEmail({
    to: SENDER_EMAIL, // Send to admin email
    subject: '🌱 New Sankalpa Registration - ' + userData.name,
    message
  });
};
