const db = require('../db');

const updateMemberStatus = async () => {
  try {
    const result = await db.query(`
      UPDATE members
      SET status = 'Inactive'
      WHERE endDate < NOW() AND status = 'Active'
    `);
    console.log(`Updated ${result.rowCount} members to Inactive.`);
  } catch (error) {
    console.error('Error updating member statuses:', error);
  }
};

module.exports = { updateMemberStatus };