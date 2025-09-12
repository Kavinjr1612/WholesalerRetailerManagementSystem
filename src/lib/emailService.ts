import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

// Initialize SES client
const ses = new SESClient({
  region: 'us-east-1', // Change to your AWS region
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY
  }
});

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export const sendEmail = async ({ to, subject, text, html }: EmailOptions) => {
  try {
    const command = new SendEmailCommand({
      Source: import.meta.env.VITE_AWS_SES_FROM_EMAIL,
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: html || text || '',
            Charset: 'UTF-8',
          },
          Text: {
            Data: text || '',
            Charset: 'UTF-8',
          },
        },
      },
    });

    await ses.send(command);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
};

// Pre-defined email templates
export const emailTemplates = {
  orderConfirmation: (orderNumber: string, totalAmount: number) => ({
    subject: `Order Confirmation #${orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Thank you for your order!</h2>
        <p>Your order #${orderNumber} has been confirmed.</p>
        <p>Total Amount: ₹${totalAmount.toFixed(2)}</p>
        <p>We'll notify you when your order has been shipped.</p>
        <p>Best regards,<br>Sweet & Snacks Wholesaler Team</p>
      </div>
    `
  }),

  lowStockAlert: (productName: string, currentStock: number) => ({
    subject: `Low Stock Alert: ${productName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Low Stock Alert</h2>
        <p>The following product is running low on stock:</p>
        <p><strong>${productName}</strong></p>
        <p>Current stock: ${currentStock} units</p>
        <p>Please take necessary action to replenish the stock.</p>
        <p>Best regards,<br>Sweet & Snacks Wholesaler Team</p>
      </div>
    `
  }),

  welcomeEmail: (name: string) => ({
    subject: 'Welcome to Sweet & Snacks Wholesaler!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Sweet & Snacks Wholesaler!</h2>
        <p>Dear ${name},</p>
        <p>Thank you for joining our platform. We're excited to have you as a partner!</p>
        <p>Here are some quick links to help you get started:</p>
        <ul>
          <li>Browse our product catalog</li>
          <li>Update your profile</li>
          <li>Place your first order</li>
        </ul>
        <p>If you have any questions, feel free to contact our support team.</p>
        <p>Best regards,<br>Sweet & Snacks Wholesaler Team</p>
      </div>
    `
  })
};