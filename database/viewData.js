const { pool } = require('../config/database');

async function viewData() {
  console.log('📊 Viewing Database Data...\n');
  
  try {
    // Get all users
    console.log('👥 USERS:');
    console.log('='.repeat(80));
    const users = await pool.query(`
      SELECT id, wallet_address, email, role, hh_number, created_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    if (users.rows.length === 0) {
      console.log('   No users found.\n');
    } else {
      users.rows.forEach(user => {
        console.log(`   ID: ${user.id}`);
        console.log(`   Wallet: ${user.wallet_address}`);
        console.log(`   Email: ${user.email || 'N/A'}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   HH Number: ${user.hh_number || 'N/A'}`);
        console.log(`   Created: ${user.created_at}`);
        console.log('   ' + '-'.repeat(76));
      });
      console.log(`   Total: ${users.rows.length} users\n`);
    }
    
    // Get all patient profiles
    console.log('🏥 PATIENT PROFILES:');
    console.log('='.repeat(80));
    const patients = await pool.query(`
      SELECT pp.*, u.wallet_address, u.email 
      FROM patient_profiles pp
      JOIN users u ON pp.user_id = u.id
      ORDER BY pp.created_at DESC 
      LIMIT 10
    `);
    
    if (patients.rows.length === 0) {
      console.log('   No patient profiles found.\n');
    } else {
      patients.rows.forEach(patient => {
        console.log(`   Name: ${patient.full_name}`);
        console.log(`   HH Number: ${patient.hh_number}`);
        console.log(`   DOB: ${patient.date_of_birth}`);
        console.log(`   Blood Group: ${patient.blood_group || 'N/A'}`);
        console.log(`   Wallet: ${patient.wallet_address}`);
        console.log('   ' + '-'.repeat(76));
      });
      console.log(`   Total: ${patients.rows.length} patients\n`);
    }
    
    // Get all indexed records
    console.log('📄 INDEXED RECORDS:');
    console.log('='.repeat(80));
    const records = await pool.query(`
      SELECT record_id, patient_wallet, ipfs_cid, record_type, created_at 
      FROM record_index 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    if (records.rows.length === 0) {
      console.log('   No records found.\n');
    } else {
      records.rows.forEach(record => {
        console.log(`   Record ID: ${record.record_id}`);
        console.log(`   Patient: ${record.patient_wallet}`);
        console.log(`   IPFS CID: ${record.ipfs_cid}`);
        console.log(`   Type: ${record.record_type || 'N/A'}`);
        console.log(`   Created: ${record.created_at}`);
        console.log('   ' + '-'.repeat(76));
      });
      console.log(`   Total: ${records.rows.length} records\n`);
    }
    
    // Get access logs
    console.log('🔐 ACCESS LOGS:');
    console.log('='.repeat(80));
    const logs = await pool.query(`
      SELECT record_id, accessor_wallet, action, accessed_at 
      FROM access_logs 
      ORDER BY accessed_at DESC 
      LIMIT 10
    `);
    
    if (logs.rows.length === 0) {
      console.log('   No access logs found.\n');
    } else {
      logs.rows.forEach(log => {
        console.log(`   Record: ${log.record_id}`);
        console.log(`   Accessor: ${log.accessor_wallet}`);
        console.log(`   Action: ${log.action}`);
        console.log(`   Time: ${log.accessed_at}`);
        console.log('   ' + '-'.repeat(76));
      });
      console.log(`   Total: ${logs.rows.length} logs\n`);
    }
    
    // Get notifications
    console.log('🔔 NOTIFICATIONS:');
    console.log('='.repeat(80));
    const notifications = await pool.query(`
      SELECT user_wallet, title, message, type, is_read, created_at 
      FROM notifications 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    if (notifications.rows.length === 0) {
      console.log('   No notifications found.\n');
    } else {
      notifications.rows.forEach(notif => {
        console.log(`   User: ${notif.user_wallet}`);
        console.log(`   Title: ${notif.title}`);
        console.log(`   Message: ${notif.message}`);
        console.log(`   Type: ${notif.type}`);
        console.log(`   Read: ${notif.is_read ? 'Yes' : 'No'}`);
        console.log(`   Created: ${notif.created_at}`);
        console.log('   ' + '-'.repeat(76));
      });
      console.log(`   Total: ${notifications.rows.length} notifications\n`);
    }
    
    // Overall statistics
    console.log('📈 OVERALL STATISTICS:');
    console.log('='.repeat(80));
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM patient_profiles) as total_patients,
        (SELECT COUNT(*) FROM doctor_profiles) as total_doctors,
        (SELECT COUNT(*) FROM diagnostic_profiles) as total_diagnostics,
        (SELECT COUNT(*) FROM record_index) as total_records,
        (SELECT COUNT(*) FROM access_logs) as total_logs,
        (SELECT COUNT(*) FROM notifications) as total_notifications
    `);
    
    const s = stats.rows[0];
    console.log(`   👥 Total Users: ${s.total_users}`);
    console.log(`   🏥 Total Patients: ${s.total_patients}`);
    console.log(`   👨‍⚕️  Total Doctors: ${s.total_doctors}`);
    console.log(`   🔬 Total Diagnostics: ${s.total_diagnostics}`);
    console.log(`   📄 Total Records: ${s.total_records}`);
    console.log(`   🔐 Total Access Logs: ${s.total_logs}`);
    console.log(`   🔔 Total Notifications: ${s.total_notifications}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Error viewing data:', error.message);
    console.error('\n💡 Make sure you ran: npm run db:migrate');
  } finally {
    await pool.end();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  viewData();
}

module.exports = { viewData };
