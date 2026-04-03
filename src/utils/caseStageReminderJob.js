const Case = require('../models/Case');
const Notification = require('../models/Notification');

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const POLL_INTERVAL_MS = 6 * 60 * 60 * 1000;

const startOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

const getDayDiff = (fromDate, toDate) => {
    const from = startOfDay(fromDate).getTime();
    const to = startOfDay(toDate).getTime();
    return Math.round((to - from) / MS_PER_DAY);
};

const buildReminderPayload = (dayDiff) => {
    if (dayDiff === 5) {
        return {
            type: 'case_stage_reminder_5_days',
            title: 'Case hearing in 5 days'
        };
    }
    if (dayDiff === 2) {
        return {
            type: 'case_stage_reminder_2_days',
            title: 'Case hearing in 2 days'
        };
    }
    if (dayDiff === 1) {
        return {
            type: 'case_stage_reminder_1_day',
            title: 'Case hearing tomorrow'
        };
    }
    if (dayDiff < 0) {
        return {
            type: 'case_stage_followup_after_date',
            title: 'Update next stage details'
        };
    }
    return null;
};

const wasReminderAlreadySent = (dayDiff, reminderMeta = {}) => {
    if (dayDiff === 5) return Boolean(reminderMeta.before5DaysSentAt);
    if (dayDiff === 2) return Boolean(reminderMeta.before2DaysSentAt);
    if (dayDiff === 1) return Boolean(reminderMeta.before1DaySentAt);
    if (dayDiff < 0) return Boolean(reminderMeta.afterDateSentAt);
    return true;
};

const markReminderSent = (dayDiff, reminderMeta = {}) => {
    const now = new Date();
    if (dayDiff === 5) reminderMeta.before5DaysSentAt = now;
    if (dayDiff === 2) reminderMeta.before2DaysSentAt = now;
    if (dayDiff === 1) reminderMeta.before1DaySentAt = now;
    if (dayDiff < 0) reminderMeta.afterDateSentAt = now;
    return reminderMeta;
};

const runCaseStageReminderCycle = async () => {
    const today = new Date();

    const activeCases = await Case.find({
        status: 'active',
        deletedAt: null,
        'stages.nextDate': { $ne: null }
    });

    for (const caseDoc of activeCases) {
        let caseChanged = false;
        const stages = Array.isArray(caseDoc.stages) ? caseDoc.stages : [];

        for (const stage of stages) {
            if (!stage.nextDate) continue;

            const dayDiff = getDayDiff(today, stage.nextDate);
            const reminder = buildReminderPayload(dayDiff);
            if (!reminder) continue;

            const reminderMeta = stage.reminderMeta || {};
            if (wasReminderAlreadySent(dayDiff, reminderMeta)) continue;

            const recipientId = stage.confirmedBy || caseDoc.assignedTo;
            if (!recipientId) continue;

            const caseLabel = caseDoc.caseNumber || caseDoc._id;
            const prepText = stage.nextDatePreparation
                ? ` Preparation: ${stage.nextDatePreparation}`
                : '';

            await Notification.create({
                userId: recipientId,
                organization: caseDoc.organization,
                type: reminder.type,
                title: reminder.title,
                message: `${caseLabel} - ${stage.stageName}.${prepText}`.trim(),
                relatedEntityType: 'case',
                relatedEntityId: caseDoc._id.toString(),
                createdBy: stage.createdBy || caseDoc.createdBy
            });

            stage.reminderMeta = markReminderSent(dayDiff, reminderMeta);
            caseChanged = true;
        }

        if (caseChanged) {
            await caseDoc.save();
        }
    }
};

const startCaseStageReminderJob = () => {
    runCaseStageReminderCycle()
        .then(() => {
            console.log('⏰ Case stage reminder job initialized');
        })
        .catch((err) => {
            console.error('⚠️ Initial case stage reminder cycle failed:', err.message);
        });

    setInterval(async () => {
        try {
            await runCaseStageReminderCycle();
        } catch (err) {
            console.error('⚠️ Case stage reminder cycle failed:', err.message);
        }
    }, POLL_INTERVAL_MS);
};

module.exports = {
    startCaseStageReminderJob,
    runCaseStageReminderCycle
};
