// fix-existing-roles.js
// Script to remove 'employee' module from existing roles

require('dotenv').config();
const mongoose = require('mongoose');
const Role = require('./src/models/Role');
const Module = require('./src/models/Module');

async function fixExistingRoles() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGO_URI, {
            dbName: 'casesnap'
        });
        console.log('✅ Connected to MongoDB\n');

        // Get all active modules
        const activeModules = await Module.find({ isActive: true }).select('name');
        const validModuleNames = activeModules.map(m => m.name);
        console.log('📦 Valid modules:', validModuleNames.join(', '));
        console.log('');

        // Find all roles
        const roles = await Role.find({});
        console.log(`🔍 Found ${roles.length} roles to check\n`);

        let updatedCount = 0;

        for (const role of roles) {
            let needsUpdate = false;
            const updatedPermissions = [];

            // Check each permission
            for (const permission of role.permissions || []) {
                // Only keep permissions for valid modules (remove 'employee' and any other invalid modules)
                if (validModuleNames.includes(permission.module)) {
                    updatedPermissions.push(permission);
                } else {
                    console.log(`  ❌ Removing invalid module "${permission.module}" from role "${role.name}"`);
                    needsUpdate = true;
                }
            }
            
            // If role has no permissions after cleanup, add default permissions for all active modules
            if (needsUpdate && updatedPermissions.length === 0 && role.name === 'SUPER_ADMIN') {
                console.log(`  ⚠️  SUPER_ADMIN has no valid permissions, adding all active modules...`);
                activeModules.forEach(module => {
                    updatedPermissions.push({
                        module: module.name,
                        actions: ['create', 'read', 'update', 'delete']
                    });
                });
            }

            // Update role if needed
            if (needsUpdate) {
                role.permissions = updatedPermissions;
                await role.save();
                updatedCount++;
                console.log(`  ✅ Updated role "${role.name}" (${role._id})`);
                console.log(`     New permissions:`, updatedPermissions.map(p => p.module).join(', '));
                console.log('');
            }
        }

        console.log(`\n✅ Fix completed!`);
        console.log(`   - Total roles checked: ${roles.length}`);
        console.log(`   - Roles updated: ${updatedCount}`);
        console.log(`   - Roles unchanged: ${roles.length - updatedCount}`);

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

fixExistingRoles();
