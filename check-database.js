// Database check script to verify employee data
// Run this to check what's actually in the database

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

async function checkDatabase() {
    console.log('🔍 Checking Database Contents');
    console.log('==============================');
    
    try {
        // Check organizations
        console.log('\n🏢 Organizations:');
        const organizations = await Organization.find({});
        console.log(`   Total Organizations: ${organizations.length}`);
        organizations.forEach(org => {
            console.log(`   - ID: ${org._id}`);
            console.log(`   - Name: ${org.companyName}`);
            console.log(`   - Email: ${org.companyEmail}`);
        });
        
        // Check users (admins)
        console.log('\n👨‍💼 Users (Admins):');
        const users = await User.find({});
        console.log(`   Total Users: ${users.length}`);
        users.forEach(user => {
            console.log(`   - ID: ${user._id}`);
            console.log(`   - Email: ${user.email}`);
            console.log(`   - Role: ${user.role}`);
            console.log(`   - Organization: ${user.organization}`);
        });
        
        // Check employees
        console.log('\n👤 Employees:');
        const employees = await Employee.find({});
        console.log(`   Total Employees: ${employees.length}`);
        
        if (employees.length > 0) {
            employees.forEach(emp => {
                console.log(`   - ID: ${emp._id}`);
                console.log(`   - Name: ${emp.firstName} ${emp.lastName}`);
                console.log(`   - Email: ${emp.email}`);
                console.log(`   - Organization: ${emp.organization}`);
                console.log(`   - Status: ${emp.status}`);
                console.log(`   - Is Deleted: ${emp.isDeleted}`);
                console.log(`   - Admin ID: ${emp.adminId}`);
                console.log('   ---');
            });
        } else {
            console.log('   ⚠️ No employees found in database');
        }
        
        // Check for organization mismatches
        console.log('\n🔍 Checking Organization Associations:');
        
        if (users.length > 0 && employees.length > 0) {
            const adminOrg = users[0].organization;
            console.log(`   Admin Organization: ${adminOrg}`);
            
            const employeesInSameOrg = await Employee.find({ organization: adminOrg });
            console.log(`   Employees in same org: ${employeesInSameOrg.length}`);
            
            if (employeesInSameOrg.length === 0) {
                console.log('   ⚠️ ISSUE FOUND: No employees belong to admin organization');
                console.log('   🔧 This is likely why the listing returns empty');
            }
        }
        
        // Check for soft deleted employees
        console.log('\n🗑️ Checking Soft Deleted Employees:');
        const deletedEmployees = await Employee.find({ isDeleted: true });
        console.log(`   Soft Deleted Employees: ${deletedEmployees.length}`);
        
        // Check employee statuses
        console.log('\n📊 Employee Status Distribution:');
        const statusCounts = await Employee.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        statusCounts.forEach(status => {
            console.log(`   - ${status._id}: ${status.count}`);
        });
        
    } catch (error) {
        console.error('❌ Database check failed:', error.message);
    }
}

async function runCheck() {
    await connectDB();
    await checkDatabase();
    
    console.log('\n🏁 Database check completed!');
    console.log('\n📝 Common Issues:');
    console.log('1. Employee organization does not match admin organization');
    console.log('2. All employees are soft deleted (isDeleted: true)');
    console.log('3. Employee status is not what you expect');
    console.log('4. No employees exist in the database');
    
    process.exit(0);
}

runCheck().catch(console.error);
