// Test SendGrid Email Service
require('dotenv').config();
const { initializeEmailService, sendEmployeeInvitation } = require('./src/utils/emailService');

const testSendGrid = async () => {
    console.log('🧪 Testing SendGrid Email Service...\n');

    // Check environment variables
    if (!process.env.SENDGRID_API_KEY) {
        console.error('❌ SENDGRID_API_KEY not found in environment variables');
        console.log('📝 Please add SENDGRID_API_KEY to your .env file');
        return;
    }

    if (!process.env.SENDGRID_FROM_EMAIL) {
        console.error('❌ SENDGRID_FROM_EMAIL not found in environment variables');
        console.log('📝 Please add SENDGRID_FROM_EMAIL to your .env file');
        return;
    }

    console.log('✅ Environment variables found');
    console.log('📧 From Email:', process.env.SENDGRID_FROM_EMAIL);
    console.log('🔑 API Key:', process.env.SENDGRID_API_KEY.substring(0, 10) + '...');

    // Initialize email service
    const initialized = initializeEmailService();
    if (!initialized) {
        console.error('❌ Failed to initialize email service');
        return;
    }

    // Test email data
    const testEmailData = {
        to: process.env.SENDGRID_FROM_EMAIL, // Send test email to yourself
        firstName: 'Test',
        lastName: 'User',
        organizationName: 'CaseSnap Test',
        companyEmail: process.env.SENDGRID_FROM_EMAIL,
        adminName: 'Test Admin',
        invitationLink: 'https://localhost:3000/employees/register?token=test123'
    };

    console.log('\n📤 Sending test email...');
    const result = await sendEmployeeInvitation(testEmailData);

    if (result.success) {
        console.log('✅ Test email sent successfully!');
        console.log('📨 Message ID:', result.messageId);
        console.log('📧 Check your inbox for the test email');
    } else {
        console.error('❌ Failed to send test email:', result.error || result.message);
    }
};

// Run the test
testSendGrid().catch(console.error);
