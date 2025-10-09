// utils/emailService.js

const sgMail = require('@sendgrid/mail');

// Initialize SendGrid
const initializeEmailService = () => {
    try {
        const apiKey = process.env.SENDGRID_API_KEY;
        
        if (!apiKey) {
            console.log('⚠️ SENDGRID_API_KEY not found in environment variables');
            console.log('📧 Email service will not send emails. Invitation links will still be generated.');
            return false;
        }

        sgMail.setApiKey(apiKey);
        console.log('✅ SendGrid email service initialized');
        return true;
    } catch (error) {
        console.error('❌ Email service initialization failed:', error.message);
        return false;
    }
};

// Send employee invitation email
const sendEmployeeInvitation = async (emailData) => {
    const { to, firstName, lastName, organizationName, companyEmail, adminName, invitationLink } = emailData;

    // Check if SendGrid is configured
    if (!process.env.SENDGRID_API_KEY) {
        console.log('⚠️ SendGrid API key not configured, logging invitation details instead');
        console.log('📧 Email would be sent to:', to);
        console.log('🔗 Invitation link:', invitationLink);
        return { success: false, message: 'Email service not configured' };
    }

    const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_FROM || 'noreply@casesnap.com';

    const msg = {
        to: to,
        from: {
            email: fromEmail,
            name: organizationName
        },
        subject: `Invitation to join ${organizationName}`,
        html: `
            <div style="font-family: system-ui, sans-serif, Arial; font-size: 16px; background-color: #f8fafc; color: #0f172a; padding: 20px;">
              <div style="max-width: 600px; margin: auto; padding: 40px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #facc15; font-size: 32px; margin: 0;">CaseSnap</h1>
                  <p style="color: #64748b; margin: 5px 0 0 0;">Legal Case Management</p>
                </div>

                <p style="color: #0f172a; font-weight: 500; font-size: 18px;">Dear <strong>${firstName} ${lastName}</strong>,</p>

                <p style="color: #475569; line-height: 1.6;">
                  Welcome to <strong>${organizationName}</strong>! We are thrilled to have you join our team.
                </p>

                <p style="color: #475569; line-height: 1.6;">
                  <strong>${adminName}</strong> has invited you to complete your employee profile.  
                  Please click the button below to provide your information and set up your account:
                </p>

                <div style="text-align: center; margin: 30px 0;">
                  <a
                    style="
                      display: inline-block;
                      text-decoration: none;
                      outline: none;
                      color: #1f2937;
                      background-color: #facc15;
                      padding: 14px 32px;
                      border-radius: 8px;
                      font-weight: 600;
                      font-size: 16px;
                      box-shadow: 0 4px 6px rgba(250, 204, 21, 0.3);
                    "
                    href="${invitationLink}"
                    target="_blank"
                  >
                    Complete Your Profile →
                  </a>
                </div>

                <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
                  This link is unique to you and should be used to submit your personal and employment details securely.
                  <br/><br/>
                  <strong>⏰ This invitation expires in 7 days.</strong>
                </p>

                <div style="border-top: 1px solid #e2e8f0; margin: 30px 0; padding-top: 20px;">
                  <p style="color: #475569; line-height: 1.6;">
                    If you have any questions or need help, feel free to contact <strong>${adminName}</strong> at  
                    <a href="mailto:${companyEmail}" style="text-decoration: none; outline: none; color: #facc15; font-weight: 500;">${companyEmail}</a>.
                  </p>

                  <p style="color: #475569; line-height: 1.6;">
                    We look forward to welcoming you to the team and helping you get started smoothly!
                  </p>
                </div>

                <p style="color: #0f172a; margin-top: 30px;">
                  Best regards,<br />
                  <strong>The ${organizationName} Team</strong>
                </p>

                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
                  <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                    © 2024 CaseSnap. All rights reserved.
                  </p>
                </div>
              </div>
            </div>
        `,
        text: `
Hello ${firstName} ${lastName}!

You have been invited to join ${organizationName} as an employee.

${adminName} has invited you to complete your employee profile.

To complete your registration, please visit: ${invitationLink}

This invitation link will expire in 7 days.

If you have any questions, please contact ${adminName} at ${companyEmail}.

We look forward to welcoming you to the team and helping you get started smoothly!

Best regards,
The ${organizationName} Team
        `
    };

    try {
        const response = await sgMail.send(msg);
        console.log('✅ Email sent successfully via SendGrid');
        console.log('📧 Sent to:', to);
        console.log('📨 Message ID:', response[0].headers['x-message-id']);
        return { success: true, messageId: response[0].headers['x-message-id'] };
    } catch (error) {
        console.error('❌ SendGrid email sending failed:', error.message);
        if (error.response) {
            console.error('📧 SendGrid Error Details:', error.response.body);
        }
        return { success: false, error: error.message };
    }
};

// Test email configuration
const testEmailConnection = async () => {
    if (!process.env.SENDGRID_API_KEY) {
        console.log('⚠️ SendGrid API key not configured');
        return { success: false, message: 'Email service not initialized' };
    }

    try {
        // SendGrid doesn't have a verify method, but we can check if API key is set
        console.log('✅ SendGrid email service is configured');
        return { success: true, message: 'SendGrid email service is ready' };
    } catch (error) {
        console.error('❌ Email service connection failed:', error.message);
        return { success: false, error: error.message };
    }
};

module.exports = {
    initializeEmailService,
    sendEmployeeInvitation,
    testEmailConnection
};
