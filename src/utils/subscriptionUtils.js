// utils/subscriptionUtils.js
// Subscription status and expiry helpers

/**
 * Returns true when subscription is expired.
 * @param {Date|string|null|undefined} subscriptionExpiresAt
 * @returns {boolean}
 */
const isSubscriptionExpired = (subscriptionExpiresAt) => {
    if (!subscriptionExpiresAt) return false;
    const expiryDate = new Date(subscriptionExpiresAt);
    if (Number.isNaN(expiryDate.getTime())) return false;
    return expiryDate.getTime() < Date.now();
};

/**
 * Validate organization subscription state.
 * @param {Object|null|undefined} organization
 * @returns {{ valid: boolean, reason: string|null }}
 */
const validateOrganizationSubscription = (organization) => {
    if (!organization) {
        return { valid: false, reason: 'Organization not found for this user' };
    }

    const status = (organization.subscriptionStatus || 'active').toLowerCase().trim();
    if (status !== 'active') {
        return {
            valid: false,
            reason: `Your subscription is ${status}. Please contact support or renew your plan.`
        };
    }

    if (isSubscriptionExpired(organization.subscriptionExpiresAt)) {
        return {
            valid: false,
            reason: 'Your subscription plan has expired. Please renew your plan to continue.'
        };
    }

    return { valid: true, reason: null };
};

module.exports = {
    isSubscriptionExpired,
    validateOrganizationSubscription
};
