/**
 * Formats a date string into a user-friendly format like 'Today, 10:23 AM' or 'Yesterday, 9:00 AM'.
 * @param {string} dateString - The date string to format.
 * @returns {string} - The formatted date string.
 */
export const formatTransactionDate = (dateString) => {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const transactionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    const timeString = date.toLocaleTimeString([], timeOptions);

    if (transactionDate.getTime() === today.getTime()) {
        return `Today, ${timeString}`;
    } else if (transactionDate.getTime() === yesterday.getTime()) {
        return `Yesterday, ${timeString}`;
    } else {
        const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
        return `${date.toLocaleDateString([], dateOptions)}, ${timeString}`;
    }
};
