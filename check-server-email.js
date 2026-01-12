// check-server-email.js
// Check if server is using Gmail service correctly

require('dotenv').config();

console.log('🔍 Checking Server Email Configuration...\n');

// Check 1: Environment variables
console.log('📋 Step 1: Environment Variables');
console.log('   GMAIL_EMAIL:', process.env.GMAIL_EMAIL || '❌ Missing');
console.log('   GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '✅ Found (' + process.env.GMAIL_APP_PASSWORD.length + ' chars)' : '❌ Missing');
console.log('');

// Check 2: Import paths
console.log('📋 Step 2: Checking Import Paths');
try {
    const gmailService = require('./src/utils/gmailService');
    console.log('   ✅ gmailService.js found');
    console.log('   Functions available:', Object.keys(gmailService).join(', '));
} catch (error) {
    console.error('   ❌ Error loading gmailService:', error.message);
}
console.log('');

// Check 3: Controller import
console.log('📋 Step 3: Checking Controller');
try {
    const employeeController = require('./src/controllers/employeeController');
    console.log('   ✅ employeeController.js found');
    // Check what it's importing
    const fs = require('fs');
    const controllerCode = fs.readFileSync('./src/controllers/employeeController.js', 'utf8');
    if (controllerCode.includes('gmailService')) {
        console.log('   ✅ Controller is using gmailService');
    } else if (controllerCode.includes('emailjsService')) {
        console.log('   ⚠️ Controller is still using emailjsService (needs update)');
    } else if (controllerCode.includes('emailService')) {
        console.log('   ⚠️ Controller is still using emailService/SendGrid (needs update)');
    }
} catch (error) {
    console.error('   ❌ Error loading controller:', error.message);
}
console.log('');

// Check 4: App.js import
console.log('📋 Step 4: Checking app.js');
try {
    const fs = require('fs');
    const appCode = fs.readFileSync('./src/app.js', 'utf8');
    if (appCode.includes('gmailService')) {
        console.log('   ✅ app.js is using gmailService');
    } else if (appCode.includes('emailjsService')) {
        console.log('   ⚠️ app.js is still using emailjsService (needs update)');
    } else if (appCode.includes('emailService')) {
        console.log('   ⚠️ app.js is still using emailService/SendGrid (needs update)');
    }
} catch (error) {
    console.error('   ❌ Error reading app.js:', error.message);
}
console.log('');

// Check 5: Test email sending
console.log('📋 Step 5: Testing Email Sending');
const { sendEmployeeInvitation } = require('./src/utils/gmailService');
sendEmployeeInvitation({
    to: 'juiyezarkar1999@gmail.com',
    firstName: 'Test',
    lastName: 'User',
    organizationName: 'Test Org',
    companyEmail: process.env.GMAIL_EMAIL,
    adminName: 'Test Admin',
    invitationLink: 'https://example.com/test'
}).then(result => {
    if (result.success) {
        console.log('   ✅ Email sending works!');
    } else {
        console.log('   ❌ Email sending failed:', result.error);
    }
}).catch(error => {
    console.error('   ❌ Error:', error.message);
});
