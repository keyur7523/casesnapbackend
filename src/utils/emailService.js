// utils/emailService.js

const nodemailer = require('nodemailer');

// Create transporter (will be configured with SMTP details)
let transporter;

const initializeEmailService = () => {
    try {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        console.log('✅ Email service initialized');
        return true;
    } catch (error) {
        console.error('❌ Email service initialization failed:', error.message);
        return false;
    }
};

// Send employee invitation email
const sendEmployeeInvitation = async (emailData) => {
    const { to, firstName, lastName, organizationName, companyEmail, adminName, invitationLink } = emailData;

    if (!transporter) {
        console.log('⚠️ Email service not initialized, logging invitation details instead');
        console.log('📧 Email would be sent to:', to);
        console.log('🔗 Invitation link:', invitationLink);
        return { success: false, message: 'Email service not configured' };
    }

    const mailOptions = {
        from: `"${organizationName}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: to,
        subject: `Invitation to join ${organizationName}`,
        html: `
            <div style="font-family: system-ui, sans-serif, Arial; font-size: 16px; background-color: #f8fafc; color: #0f172a">
              <div style="max-width: 600px; margin: auto; padding: 16px; background-color: #ffffff; border-radius: 8px;">
                
                <a style="text-decoration: none; outline: none" href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" target="_blank">
                  <img
                    style="height: 32px; vertical-align: middle"
                    height="32px"
                    src="cid:logo.png"
                    alt="${organizationName} Logo"
                  />
                </a>

                <p style="color: #0f172a; font-weight: 500;">Dear <strong>${firstName} ${lastName}</strong>,</p>

                <p style="color: #475569;">
                  Welcome to <strong>${organizationName}</strong>! We are thrilled to have you join our team.
                </p>

                <p style="color: #475569;">
                  <strong>${adminName}</strong> has invited you to complete your employee profile.  
                  Please click the link below to provide your information and set up your account:
                </p>

                <p>
                  <a
                    style="
                      display: inline-block;
                      text-decoration: none;
                      outline: none;
                      color: #ffffff;
                      background-color: #facc15;
                      padding: 10px 18px;
                      border-radius: 6px;
                      font-weight: 500;
                    "
                    href="${invitationLink}"
                    target="_blank"
                  >
                    Complete Your Profile
                  </a>
                </p>

                <p style="color: #64748b;">
                  This link is unique to you and should be used to submit your personal and employment details securely.
                </p>

                <p style="color: #475569;">
                  If you have any questions or need help, feel free to contact <strong>${adminName}</strong> at  
                  <a href="mailto:${companyEmail}" style="text-decoration: none; outline: none; color: #facc15"
                    >${companyEmail}</a
                  >.
                </p>

                <p style="color: #475569;">
                  We look forward to welcoming you to the team and helping you get started smoothly!
                </p>

                <p style="color: #0f172a;">
                  Best regards,<br />The <strong>${organizationName}</strong> Team
                </p>
              </div>
            </div>
        `,
        text: `
            Hello ${firstName} ${lastName}!
            
            You have been invited to join ${organizationName} as an employee.
            
            To complete your registration, please visit: ${invitationLink}
            
            This invitation link will expire in 7 days.
            
            If you have any questions, please contact your organization administrator.
            
            Best regards,
            ${organizationName} Team
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Email sending failed:', error.message);
        return { success: false, error: error.message };
    }
};

// Test email configuration
const testEmailConnection = async () => {
    if (!transporter) {
        return { success: false, message: 'Email service not initialized' };
    }

    try {
        await transporter.verify();
        console.log('✅ Email service connection verified');
        return { success: true, message: 'Email service is ready' };
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
