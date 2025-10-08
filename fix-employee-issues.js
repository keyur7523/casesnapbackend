// Fix script for common employee listing issues
// This script helps resolve organization mismatches and other issues

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Employee = require('./src/models/Employee');
const User = require('./src/models/User');
const Organization = require('./src/models/Organization');

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    }
}

async function fixEmployeeIssues() {
    console.log('🔧 Fixing Employee Listing Issues');
    console.log('=================================');
    
    try {
        // Get all admins and their organizations
        const admins = await User.find({ role: 'admin' });
        console.log(`\n👨‍💼 Found ${admins.length} admins`);
        
        if (admins.length === 0) {
            console.log('❌ No admins found. Please create an admin user first.');
            return;
        }
        
        const admin = admins[0];
        console.log(`   Admin: ${admin.email}`);
        console.log(`   Admin Organization: ${admin.organization}`);
        
        // Get all employees
        const employees = await Employee.find({});
        console.log(`\n👤 Found ${employees.length} employees`);
        
        if (employees.length === 0) {
            console.log('❌ No employees found. Please create some employees first.');
            return;
        }
        
        // Check for organization mismatches
        const employeesInSameOrg = employees.filter(emp => 
            emp.organization && emp.organization.toString() === admin.organization.toString()
        );
        
        console.log(`\n🔍 Employees in admin's organization: ${employeesInSameOrg.length}`);
        
        if (employeesInSameOrg.length === 0) {
            console.log('⚠️ ISSUE FOUND: No employees belong to admin organization');
            console.log('🔧 Fixing organization associations...');
            
            // Fix organization associations
            let fixedCount = 0;
            for (const employee of employees) {
                if (!employee.organization || employee.organization.toString() !== admin.organization.toString()) {
                    employee.organization = admin.organization;
                    employee.adminId = admin._id;
                    await employee.save();
                    fixedCount++;
                    console.log(`   ✅ Fixed employee: ${employee.firstName} ${employee.lastName}`);
                }
            }
            
            console.log(`\n✅ Fixed ${fixedCount} employee organization associations`);
        }
        
        // Check for soft deleted employees
        const deletedEmployees = employees.filter(emp => emp.isDeleted);
        console.log(`\n🗑️ Soft deleted employees: ${deletedEmployees.length}`);
        
        if (deletedEmployees.length > 0) {
            console.log('🔧 Restoring soft deleted employees...');
            for (const employee of deletedEmployees) {
                employee.isDeleted = false;
                employee.deletedAt = null;
                employee.status = 'active';
                await employee.save();
                console.log(`   ✅ Restored employee: ${employee.firstName} ${employee.lastName}`);
            }
        }
        
        // Check employee statuses
        console.log('\n📊 Employee Status Summary:');
        const statusCounts = await Employee.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        statusCounts.forEach(status => {
            console.log(`   - ${status._id}: ${status.count}`);
        });
        
        // Final verification
        console.log('\n🔍 Final Verification:');
        const finalEmployees = await Employee.find({ 
            organization: admin.organization,
            isDeleted: false 
        });
        
        console.log(`   Employees in admin org (not deleted): ${finalEmployees.length}`);
        
        if (finalEmployees.length > 0) {
            console.log('✅ Employee listing should now work!');
            console.log('\n📝 Next Steps:');
            console.log('1. Test the employee listing endpoint again');
            console.log('2. Check the frontend to see if employees appear');
            console.log('3. If still not working, check the server logs for debug information');
        } else {
            console.log('❌ Still no employees found. Please check:');
            console.log('1. Employee records exist in database');
            console.log('2. Organization IDs are correct');
            console.log('3. Employee status is not "terminated"');
        }
        
    } catch (error) {
        console.error('❌ Fix failed:', error.message);
    }
}

async function runFix() {
    await connectDB();
    await fixEmployeeIssues();
    
    console.log('\n🏁 Fix completed!');
    process.exit(0);
}

runFix().catch(console.error);
