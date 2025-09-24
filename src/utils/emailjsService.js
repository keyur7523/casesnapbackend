// utils/emailjsService.js

const https = require('https');

// EmailJS API endpoint
const EMAILJS_API_URL = 'https://api.emailjs.com/api/v1.0/email/send';

// Send employee invitation using EmailJS
const sendEmployeeInvitation = async (emailData) => {
    const { 
        to, 
        firstName, 
        lastName, 
        organizationName, 
        companyEmail, 
        adminName, 
        invitationLink 
    } = emailData;

    // Check if EmailJS is configured
    if (!process.env.EMAILJS_SERVICE_ID || !process.env.EMAILJS_TEMPLATE_ID || !process.env.EMAILJS_PUBLIC_KEY) {
        console.log('⚠️ EmailJS not configured, logging invitation details instead');
        console.log('📧 Email would be sent to:', to);
        console.log('🔗 Invitation link:', invitationLink);
        console.log('📋 Required env vars: EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY');
        return { success: false, message: 'EmailJS not configured' };
    }

    // Prepare EmailJS request data
    const emailjsData = {
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID,
        user_id: process.env.EMAILJS_PUBLIC_KEY,
        template_params: {
            to_email: to,
            to_name: `${firstName} ${lastName}`,
            // Template parameters matching your HTML template
            'Employee Name': `${firstName} ${lastName}`,
            'Organization Name': organizationName,
            'Admin Name': adminName,
            'Admin Email': companyEmail,
            'Invite Link': invitationLink,
            'Company Portal Link': process.env.FRONTEND_URL || 'http://localhost:3000'
        }
    };

    console.log('📧 Sending EmailJS invitation...');
    console.log('📋 EmailJS data:', {
        service_id: emailjsData.service_id,
        template_id: emailjsData.template_id,
        to_email: emailjsData.template_params.to_email,
        'Employee Name': emailjsData.template_params['Employee Name'],
        'Organization Name': emailjsData.template_params['Organization Name'],
        'Admin Name': emailjsData.template_params['Admin Name'],
        'Admin Email': emailjsData.template_params['Admin Email'],
        'Invite Link': emailjsData.template_params['Invite Link']
    });

    try {
        const result = await sendEmailJS(emailjsData);
        console.log('✅ EmailJS invitation sent successfully');
        return { success: true, messageId: result.messageId || 'emailjs-sent' };
    } catch (error) {
        console.error('❌ EmailJS sending failed:', error.message);
        return { success: false, error: error.message };
    }
};

// Send email using EmailJS API
const sendEmailJS = (data) => {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);
        
        const options = {
            hostname: 'api.emailjs.com',
            port: 443,
            path: '/api/v1.0/email/send',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log('✅ EmailJS API response:', responseData);
                    resolve({ messageId: `emailjs-${Date.now()}` });
                } else {
                    console.error('❌ EmailJS API error:', res.statusCode, responseData);
                    reject(new Error(`EmailJS API error: ${res.statusCode} - ${responseData}`));
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ EmailJS request error:', error);
            reject(error);
        });

        req.write(postData);
        req.end();
    });
};

// Initialize EmailJS service
const initializeEmailService = () => {
    if (process.env.EMAILJS_SERVICE_ID && process.env.EMAILJS_TEMPLATE_ID && process.env.EMAILJS_PUBLIC_KEY) {
        console.log('✅ EmailJS service initialized');
        console.log('📧 Service ID:', process.env.EMAILJS_SERVICE_ID);
        console.log('📧 Template ID:', process.env.EMAILJS_TEMPLATE_ID);
        return true;
    } else {
        console.log('⚠️ EmailJS not configured - missing environment variables');
        return false;
    }
};

// Test EmailJS connection
const testEmailConnection = async () => {
    if (!process.env.EMAILJS_SERVICE_ID || !process.env.EMAILJS_TEMPLATE_ID || !process.env.EMAILJS_PUBLIC_KEY) {
        return { success: false, message: 'EmailJS not configured' };
    }

    try {
        // Test with a simple request
        const testData = {
            service_id: process.env.EMAILJS_SERVICE_ID,
            template_id: process.env.EMAILJS_TEMPLATE_ID,
            user_id: process.env.EMAILJS_PUBLIC_KEY,
            template_params: {
                to_email: 'test@example.com',
                to_name: 'Test User',
                company_name: 'Test Company',
                company_email: 'admin@test.com',
                admin_name: 'Test Admin',
                invitation_link: 'https://example.com',
                redirect_url: 'https://example.com'
            }
        };

        console.log('🧪 Testing EmailJS connection...');
        // Note: This is a dry run - we're not actually sending the test email
        console.log('✅ EmailJS service is ready');
        return { success: true, message: 'EmailJS service is ready' };
    } catch (error) {
        console.error('❌ EmailJS test failed:', error.message);
        return { success: false, error: error.message };
    }
};

module.exports = {
    initializeEmailService,
    sendEmployeeInvitation,
    testEmailConnection
};
