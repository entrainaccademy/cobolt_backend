const nodemailer = require('nodemailer');
const config = require('./env');

const receiverEmail = process.env.INQUIRY_RECEIVER_EMAIL || 'infocobolt123@gmail.com';

/**
 * Configure Nodemailer transporter based on environment variables
 */
const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (user && pass) {
    if (host) {
      return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }

    // Default to Gmail if only user/pass are provided
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }

  return null;
};

/**
 * Send an email notification for a new customer inquiry
 * @param {Object} inquiry - Saved inquiry document from MongoDB
 */
const sendInquiryEmail = async (inquiry) => {
  const transporter = createTransporter();

  if (!transporter) {
    console.log(
      `[Mailer Notice] No SMTP credentials configured. Inquiry from '${inquiry.name}' (<${inquiry.email}>) stored in MongoDB, but email dispatch skipped. Set SMTP_USER and SMTP_PASS in backend/.env to enable instant email delivery.`
    );
    return {
      sent: false,
      reason: 'SMTP credentials not configured in backend/.env',
    };
  }

  const cleanPhone = (inquiry.phone || '').replace(/[^0-9+]/g, '');
  const waNumber = cleanPhone.startsWith('+') ? cleanPhone.slice(1) : cleanPhone;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background: #DE1D3A; color: #ffffff; padding: 24px; text-align: left; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
        .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.9; }
        .body { padding: 24px; }
        .badge { display: inline-block; padding: 4px 10px; background: #fee2e2; color: #b91c1c; font-size: 11px; font-weight: 700; border-radius: 9999px; text-transform: uppercase; margin-bottom: 16px; }
        .field { margin-bottom: 16px; }
        .label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 4px; }
        .value { font-size: 15px; font-weight: 600; color: #0f172a; }
        .msg-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap; margin-top: 16px; }
        .actions { margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; gap: 12px; }
        .btn { display: inline-block; padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; text-decoration: none; }
        .btn-primary { background: #DE1D3A; color: #ffffff !important; }
        .btn-wa { background: #25D366; color: #ffffff !important; }
        .footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>New Website Machinery Inquiry</h1>
          <p>Cobolt Machineries Lead Notification</p>
        </div>
        <div class="body">
          <span class="badge">${inquiry.serviceType || 'Machinery Purchase'}</span>
          
          <div class="field">
            <div class="label">Customer Name</div>
            <div class="value">${inquiry.name}</div>
          </div>

          <div class="field">
            <div class="label">Corporate / Contact Email</div>
            <div class="value"><a href="mailto:${inquiry.email}" style="color: #DE1D3A; text-decoration: none;">${inquiry.email}</a></div>
          </div>

          <div class="field">
            <div class="label">Phone Number</div>
            <div class="value"><a href="tel:${inquiry.phone}" style="color: #0f172a; text-decoration: none;">${inquiry.phone}</a></div>
          </div>

          ${inquiry.company ? `
          <div class="field">
            <div class="label">Company / Factory</div>
            <div class="value">${inquiry.company}</div>
          </div>` : ''}

          ${inquiry.subject ? `
          <div class="field">
            <div class="label">Subject</div>
            <div class="value">${inquiry.subject}</div>
          </div>` : ''}

          <div class="label">Inquiry Message</div>
          <div class="msg-box">${inquiry.message}</div>

          <div style="margin-top: 24px;">
            <a href="mailto:${inquiry.email}?subject=Re:%20Cobolt%20Machineries%20Inquiry" class="btn btn-primary" style="margin-right: 8px; display: inline-block;">Reply by Email</a>
            ${waNumber ? `<a href="https://wa.me/${waNumber}" class="btn btn-wa" style="display: inline-block;">Chat on WhatsApp</a>` : ''}
          </div>
        </div>
        <div class="footer">
          Received on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST &bull; Cobolt Machineries
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Cobolt Machineries Website" <${process.env.SMTP_USER || process.env.EMAIL_USER || 'no-reply@coboltmachineries.com'}>`,
      to: receiverEmail,
      replyTo: inquiry.email,
      subject: `[New Inquiry] ${inquiry.subject || inquiry.name} - ${inquiry.serviceType || 'Machinery'}`,
      text: `New Inquiry from ${inquiry.name}\n\nEmail: ${inquiry.email}\nPhone: ${inquiry.phone}\nCompany: ${inquiry.company || 'N/A'}\nService: ${inquiry.serviceType}\nSubject: ${inquiry.subject}\n\nMessage:\n${inquiry.message}`,
      html: htmlContent,
    });

    console.log(`[Mailer Success] Email dispatched to ${receiverEmail}. Message ID: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Mailer Error] Failed to send inquiry email:', error.message);
    return { sent: false, error: error.message };
  }
};

module.exports = {
  createTransporter,
  sendInquiryEmail,
  receiverEmail,
};
