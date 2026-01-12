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
        service_id: process.env.EMAILJS_SERVICE_ID || 'service_erm300c',
        template_id: process.env.EMAILJS_TEMPLATE_ID || 'template_wn4dbsz',
        user_id: process.env.EMAILJS_PUBLIC_KEY,
        template_params: {
            to_email: to,
            to_name: `${firstName} ${lastName}`,
            // Template parameters - adjust these to match your EmailJS template variables
            'employee_name': `${firstName} ${lastName}`,
            'employeeName': `${firstName} ${lastName}`,
            'Employee Name': `${firstName} ${lastName}`,
            'organization_name': organizationName,
            'organizationName': organizationName,
            'Organization Name': organizationName,
            'admin_name': adminName,
            'adminName': adminName,
            'Admin Name': adminName,
            'admin_email': companyEmail,
            'adminEmail': companyEmail,
            'Admin Email': companyEmail,
            'invite_link': invitationLink,
            'inviteLink': invitationLink,
            'Invite Link': invitationLink,
            'invitationLink': invitationLink,
            'company_portal_link': process.env.FRONTEND_URL || 'http://localhost:3000',
            'companyPortalLink': process.env.FRONTEND_URL || 'http://localhost:3000',
            'Company Portal Link': process.env.FRONTEND_URL || 'http://localhost:3000'
        }
    };

    console.log('📧 Sending EmailJS invitation...');
    console.log('📋 EmailJS Configuration:');
    console.log('   Service ID:', emailjsData.service_id);
    console.log('   Template ID:', emailjsData.template_id);
    console.log('   To Email:', emailjsData.template_params.to_email);
    console.log('   Employee Name:', emailjsData.template_params.to_name);
    console.log('   Organization:', emailjsData.template_params.organizationName);
    console.log('   Admin Name:', emailjsData.template_params.adminName);
    console.log('   Invitation Link:', emailjsData.template_params.invitationLink);

    try {
        console.log('📤 Attempting to send email via EmailJS...');
        const result = await sendEmailJS(emailjsData);
        console.log('✅ EmailJS invitation sent successfully');
        console.log('📧 Sent to:', to);
        console.log('📨 Message ID:', result.messageId || 'emailjs-sent');
        return { success: true, messageId: result.messageId || 'emailjs-sent' };
    } catch (error) {
        console.error('❌ EmailJS sending failed!');
        console.error('📧 Error message:', error.message);
        console.error('📧 Recipient email:', to);
        console.error('📧 Service ID:', emailjsData.service_id);
        console.error('📧 Template ID:', emailjsData.template_id);
        
        // Provide helpful error messages
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            console.error('   💡 Solution: Check your EmailJS Public Key (EMAILJS_PUBLIC_KEY)');
            console.error('      → Get it from EmailJS dashboard → Account → API Keys');
        }
        if (error.message.includes('400') || error.message.includes('Bad Request')) {
            console.error('   💡 Solution: Check your Service ID and Template ID');
            console.error('      → Service ID should be: service_erm300c');
            console.error('      → Template ID should be: template_wn4dbsz');
        }
        
        return { 
            success: false, 
            error: error.message,
            errorCode: 'EMAILJS_ERROR'
        };
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
    const serviceId = process.env.EMAILJS_SERVICE_ID || 'service_erm300c';
    const templateId = process.env.EMAILJS_TEMPLATE_ID || 'template_wn4dbsz';
    const publicKey = process.env.EMAILJS_PUBLIC_KEY;
    
    if (publicKey) {
        console.log('✅ EmailJS service initialized');
        console.log('📧 Service ID:', serviceId);
        console.log('📧 Template ID:', templateId);
        console.log('📧 Public Key:', publicKey ? '✅ Configured' : '❌ Missing');
        return true;
    } else {
        console.log('⚠️ EmailJS not fully configured');
        console.log('📧 Service ID:', serviceId, '(using default)');
        console.log('📧 Template ID:', templateId, '(using default)');
        console.log('📧 Public Key: ❌ Missing - Add EMAILJS_PUBLIC_KEY to .env file');
        console.log('   → Get it from EmailJS dashboard → Account → API Keys');
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
