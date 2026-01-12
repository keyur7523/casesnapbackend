// test-email-config.js
// Script to test email configuration

require('dotenv').config();
const { initializeEmailService, testEmailConnection, sendEmployeeInvitation } = require('./src/utils/emailService');

async function testEmailConfig() {
    console.log('🧪 Testing Email Configuration...\n');
    
    // Test 1: Check environment variables
    console.log('📋 Step 1: Checking Environment Variables');
    console.log('   SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '✅ Found' : '❌ Missing');
    console.log('   SENDGRID_FROM_EMAIL:', process.env.SENDGRID_FROM_EMAIL || '⚠️ Not set (will use default)');
    console.log('   SMTP_FROM:', process.env.SMTP_FROM || '⚠️ Not set');
    console.log('');
    
    // Test 2: Initialize email service
    console.log('📋 Step 2: Initializing Email Service');
    const initialized = initializeEmailService();
    console.log('   Result:', initialized ? '✅ Initialized' : '❌ Failed to initialize');
    console.log('');
    
    // Test 3: Test connection
    console.log('📋 Step 3: Testing Email Connection');
    const connectionTest = await testEmailConnection();
    console.log('   Result:', connectionTest.success ? '✅ Connected' : '❌ Failed');
    if (!connectionTest.success) {
        console.log('   Error:', connectionTest.message || connectionTest.error);
    }
    console.log('');
    
    // Test 4: Try sending a test email (if configured)
    if (process.env.SENDGRID_API_KEY && process.env.TEST_EMAIL) {
        console.log('📋 Step 4: Sending Test Email');
        console.log('   To:', process.env.TEST_EMAIL);
        
        const testEmailResult = await sendEmployeeInvitation({
            to: process.env.TEST_EMAIL,
            firstName: 'Test',
            lastName: 'User',
            organizationName: 'Test Organization',
            companyEmail: 'test@example.com',
            adminName: 'Test Admin',
            invitationLink: 'https://example.com/test-link'
        });
        
        if (testEmailResult.success) {
            console.log('   ✅ Test email sent successfully!');
            console.log('   Message ID:', testEmailResult.messageId);
        } else {
            console.log('   ❌ Test email failed!');
            console.log('   Error:', testEmailResult.error || testEmailResult.message);
            if (testEmailResult.details) {
                console.log('   Details:', JSON.stringify(testEmailResult.details, null, 2));
            }
        }
    } else {
        console.log('📋 Step 4: Skipping Test Email');
        if (!process.env.SENDGRID_API_KEY) {
            console.log('   ⚠️ SENDGRID_API_KEY not set');
        }
        if (!process.env.TEST_EMAIL) {
            console.log('   ⚠️ TEST_EMAIL not set (set it in .env to test sending)');
        }
    }
    
    console.log('\n📝 Summary:');
    if (!process.env.SENDGRID_API_KEY) {
        console.log('❌ SENDGRID_API_KEY is missing!');
        console.log('   → Add SENDGRID_API_KEY=your_key to your .env file');
        console.log('   → See EMAIL_SETUP_GUIDE.md for instructions');
    } else if (!initialized) {
        console.log('❌ Email service failed to initialize');
        console.log('   → Check that your API key is valid');
    } else {
        console.log('✅ Email service is configured correctly!');
        console.log('   → Check server logs when sending invitations');
    }
}

testEmailConfig().catch(console.error);
