/**
 * Round Timeout Watcher
 * 
 * Background service that runs every 15 minutes to:
 * 1. Detect FL rounds whose timeout_at has passed and status is still active
 * 2. Mark them as 'failed' in fl_rounds
 * 3. Create an in-app admin notification so the admin knows to start a new round
 * 
 * Does NOT auto-start the next round — that remains a deliberate admin action.
 */

const db = require('./databaseService');

const CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const WARN_AHEAD_MS     = 2 * 60 * 60 * 1000; // Warn admin 2 hours before expiry

let watcherInterval = null;

async function getAdminWallet() {
    try {
        const res = await db.query(
            `SELECT wallet_address FROM users WHERE role = 'admin' LIMIT 1`
        );
        return res.rows[0]?.wallet_address || null;
    } catch {
        return null;
    }
}

async function createAdminNotification(adminWallet, title, message, type = 'fl_alert') {
    if (!adminWallet) return;
    try {
        await db.query(
            `INSERT INTO notifications (user_wallet, title, message, type)
             VALUES ($1, $2, $3, $4)`,
            [adminWallet, title, message, type]
        );
    } catch (err) {
        console.warn('[RoundWatcher] Failed to create notification:', err.message);
    }
}

async function checkRounds() {
    const now = new Date();

    try {
        // ── 1. Find rounds that have ALREADY expired and are still active ──────
        const expiredResult = await db.query(
            `SELECT r.round_id, r.model_id, r.round_number, r.timeout_at,
                    r.current_participants, m.disease
             FROM fl_rounds r
             LEFT JOIN fl_models m ON r.model_id = m.model_id
             WHERE r.status IN ('initiated', 'training', 'aggregating')
               AND r.timeout_at IS NOT NULL
               AND r.timeout_at < NOW()`
        );

        if (expiredResult.rows.length > 0) {
            const adminWallet = await getAdminWallet();

            for (const round of expiredResult.rows) {
                // Mark as failed in DB
                await db.query(
                    `UPDATE fl_rounds SET status = 'failed', end_time = CURRENT_TIMESTAMP
                     WHERE round_id = $1`,
                    [round.round_id]
                );

                const expiredAt = new Date(round.timeout_at).toLocaleString();
                const contributors = round.current_participants || 0;

                console.warn(
                    `[RoundWatcher] ⏰ Round ${round.round_id} (${round.disease}, Round #${round.round_number}) ` +
                    `expired at ${expiredAt} with ${contributors} contribution(s). Marked as failed.`
                );

                // Create admin notification
                await createAdminNotification(
                    adminWallet,
                    `⏰ Round Expired — ${round.disease?.toUpperCase()} Model`,
                    `Round #${round.round_number} (ID: ${round.round_id}) expired at ${expiredAt} ` +
                    `with ${contributors} contribution(s). ` +
                    `${contributors > 0 ? 'You can still complete it manually, or ' : ''}` +
                    `start a new round to continue training.`,
                    'fl_round_expired'
                );
            }
        }

        // ── 2. Find rounds expiring within the next 2 hours (warn-ahead) ───────
        const warningResult = await db.query(
            `SELECT r.round_id, r.model_id, r.round_number, r.timeout_at,
                    r.current_participants, m.disease
             FROM fl_rounds r
             LEFT JOIN fl_models m ON r.model_id = m.model_id
             WHERE r.status IN ('initiated', 'training')
               AND r.timeout_at IS NOT NULL
               AND r.timeout_at > NOW()
               AND r.timeout_at < NOW() + INTERVAL '2 hours'`
        );

        if (warningResult.rows.length > 0) {
            const adminWallet = await getAdminWallet();

            for (const round of warningResult.rows) {
                const msLeft = new Date(round.timeout_at).getTime() - now.getTime();
                const minsLeft = Math.round(msLeft / 60000);

                // Only notify once per round (check if warning already exists)
                const existingWarn = await db.query(
                    `SELECT id FROM notifications
                     WHERE type = 'fl_round_warning'
                       AND message LIKE $1
                       AND created_at > NOW() - INTERVAL '3 hours'`,
                    [`%ID: ${round.round_id}%`]
                );

                if (existingWarn.rows.length === 0) {
                    const expiresAt = new Date(round.timeout_at).toLocaleString();
                    console.log(
                        `[RoundWatcher] ⚠️ Round ${round.round_id} (${round.disease}) ` +
                        `expires in ${minsLeft} minutes at ${expiresAt}`
                    );

                    await createAdminNotification(
                        adminWallet,
                        `⚠️ Round Expiring Soon — ${round.disease?.toUpperCase()} Model`,
                        `Round #${round.round_number} (ID: ${round.round_id}) expires in ${minsLeft} minute(s) ` +
                        `at ${expiresAt} with ${round.current_participants || 0} contribution(s). ` +
                        `Consider completing it now or waiting for more participants.`,
                        'fl_round_warning'
                    );
                }
            }
        }

    } catch (err) {
        console.error('[RoundWatcher] Check failed:', err.message);
    }
}

/**
 * Start the background watcher.
 * Call this once when the server starts (in app.js or the FL route file).
 */
function startRoundTimeoutWatcher() {
    if (watcherInterval) return; // Already running

    console.log('[RoundWatcher] ✅ Started — checking every 15 minutes for expired rounds');

    // Run immediately on startup, then on interval
    checkRounds();
    watcherInterval = setInterval(checkRounds, CHECK_INTERVAL_MS);
}

function stopRoundTimeoutWatcher() {
    if (watcherInterval) {
        clearInterval(watcherInterval);
        watcherInterval = null;
        console.log('[RoundWatcher] Stopped.');
    }
}

module.exports = { startRoundTimeoutWatcher, stopRoundTimeoutWatcher };
