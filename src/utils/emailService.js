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
    const { to, firstName, lastName, organizationName, invitationLink } = emailData;

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
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Employee Invitation</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; }
                    .content { padding: 20px; }
                    .button { 
                        display: inline-block; 
                        background-color: #007bff; 
                        color: white; 
                        padding: 12px 24px; 
                        text-decoration: none; 
                        border-radius: 5px; 
                        margin: 20px 0;
                    }
                    .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to ${organizationName}</h1>
                    </div>
                    <div class="content">
                        <h2>Hello ${firstName} ${lastName}!</h2>
                        <p>You have been invited to join <strong>${organizationName}</strong> as an employee.</p>
                        <p>To complete your registration and set up your account, please click the button below:</p>
                        <p style="text-align: center;">
                            <a href="${invitationLink}" class="button">Complete Registration</a>
                        </p>
                        <p><strong>Important:</strong></p>
                        <ul>
                            <li>This invitation link will expire in 7 days</li>
                            <li>You will need to provide your contact details and personal information</li>
                            <li>If you have any questions, please contact your organization administrator</li>
                        </ul>
                        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">
                            ${invitationLink}
                        </p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message. Please do not reply to this email.</p>
                        <p>&copy; ${new Date().getFullYear()} ${organizationName}. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
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
