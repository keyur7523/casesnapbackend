// test-gmail-send.js
// Test Gmail SMTP email sending

require('dotenv').config();
const { sendEmployeeInvitation, initializeEmailService } = require('./src/utils/gmailService');

async function testGmailSend() {
    console.log('🧪 Testing Gmail SMTP Email Sending...\n');
    
    // Check configuration
    console.log('📋 Step 1: Checking Configuration');
    console.log('   GMAIL_EMAIL:', process.env.GMAIL_EMAIL || '❌ Missing');
    console.log('   GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '✅ Found (' + process.env.GMAIL_APP_PASSWORD.length + ' chars)' : '❌ Missing');
    console.log('');
    
    // Initialize service
    console.log('📋 Step 2: Initializing Gmail Service');
    const transporter = initializeEmailService();
    if (!transporter) {
        console.error('❌ Failed to initialize Gmail service');
        return;
    }
    console.log('');
    
    // Test sending email
    const testEmail = process.env.TEST_EMAIL || 'juiyezarkar1999@gmail.com';
    console.log('📋 Step 3: Sending Test Email');
    console.log('   To:', testEmail);
    console.log('   From:', process.env.GMAIL_EMAIL);
    console.log('');
    
    try {
        const result = await sendEmployeeInvitation({
            to: testEmail,
            firstName: 'Test',
            lastName: 'User',
            organizationName: 'Test Organization',
            companyEmail: process.env.GMAIL_EMAIL,
            adminName: 'Test Admin',
            invitationLink: 'https://example.com/test-invitation-link'
        });
        
        if (result.success) {
            console.log('✅ Email sent successfully!');
            console.log('📨 Message ID:', result.messageId);
            console.log('');
            console.log('📧 Check the inbox/spam folder of:', testEmail);
        } else {
            console.error('❌ Email sending failed!');
            console.error('   Error:', result.error);
            console.error('   Error Code:', result.errorCode);
        }
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('   Stack:', error.stack);
    }
}

testGmailSend().catch(console.error);
