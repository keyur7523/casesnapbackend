// verify-user-role.js
// Script to verify user's actual role from Role collection

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Role = require('./src/models/Role');

async function verifyUserRole() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGO_URI, {
            dbName: 'casesnap'
        });
        console.log('✅ Connected to MongoDB (database: casesnap)\n');

        // User ID from your example
        const userId = '69674e5ab5d1ef31653d983e';
        const roleId = '69674e5ab5d1ef31653d9840';

        console.log('🔍 Verifying User Role...\n');
        console.log('User ID:', userId);
        console.log('Role ID:', roleId);
        console.log('');

        // Get user with role populated
        const user = await User.findById(userId).populate('role');
        
        if (!user) {
            console.log('❌ User not found');
            return;
        }

        console.log('📋 User Details:');
        console.log('   Name:', `${user.firstName} ${user.lastName}`);
        console.log('   Email:', user.email);
        console.log('   legacyRole:', user.legacyRole, '(deprecated - not used by RBAC)');
        console.log('   role (ObjectId):', user.role ? user.role._id : 'Not assigned');
        console.log('');

        if (user.role) {
            console.log('✅ Role Found - Full Details:');
            console.log('   Role ID:', user.role._id);
            console.log('   Role Name:', user.role.name);
            console.log('   Priority:', user.role.priority);
            console.log('   Is System Role:', user.role.isSystemRole);
            console.log('   Description:', user.role.description);
            console.log('');
            console.log('   Permissions:');
            user.role.permissions.forEach((perm, index) => {
                console.log(`   ${index + 1}. Module: ${perm.module}`);
                console.log(`      Actions: ${perm.actions.join(', ')}`);
            });
        } else {
            console.log('❌ Role not assigned to user');
            console.log('   Checking Role collection directly...');
            
            const role = await Role.findById(roleId);
            if (role) {
                console.log('   ✅ Role exists in database:');
                console.log('   Name:', role.name);
                console.log('   Priority:', role.priority);
                console.log('   But user.role is not set!');
            } else {
                console.log('   ❌ Role not found in database');
            }
        }

        console.log('\n📝 Summary:');
        if (user.role && user.role.name === 'SUPER_ADMIN') {
            console.log('✅ User IS SUPER_ADMIN');
            console.log('   - Priority:', user.role.priority);
            console.log('   - Has full permissions on all modules');
        } else {
            console.log('⚠️ User role status unclear');
            console.log('   - Check if role is properly assigned');
        }

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

verifyUserRole();
