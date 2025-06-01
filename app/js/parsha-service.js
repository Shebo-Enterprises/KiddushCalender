// js/parsha-service.js

/**
 * Fetches Shabbat information (Parsha, weekend dates) for a given target date's week.
 * @param {Date} targetDate - The date for which to find the corresponding Shabbat week info. Defaults to today.
 * @returns {Promise<Object>} A promise that resolves to an object with parsha, weekendOf, and shabbatDate.
 */
async function getShabbatInfoForDate(targetDate = new Date()) {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1; // JS months are 0-indexed
    const day = targetDate.getDate();

    // Hebcal API endpoint for Shabbat times and Parsha for the week of the given date
    const hebcalURL = `https://www.hebcal.com/shabbat?cfg=json&gy=${year}&gm=${month}&gd=${day}&a=on&leyning=off`;

    try {
        const response = await fetch(hebcalURL);
        if (!response.ok) {
            throw new Error(`Hebcal API error: ${response.statusText} (status ${response.status})`);
        }
        const data = await response.json();

        let parshaName = "N/A";
        let weekendDateStr = "N/A";
        let shabbatApiDate = null; // YYYY-MM-DD format from API for the Parsha

        const parshaItem = data.items?.find(item => item.category === "parashat");
        if (parshaItem) {
            parshaName = parshaItem.title; // e.g., "Parashat Pinchas"
            shabbatApiDate = parshaItem.date; // This is the date of Shabbat (Saturday), e.g., "2024-07-20"

            const shabbatDateObj = new Date(shabbatApiDate + "T00:00:00Z"); // Parse as UTC then display in local

            const fridayDateObj = new Date(shabbatDateObj);
            fridayDateObj.setUTCDate(shabbatDateObj.getUTCDate() - 1);

            const options = { month: 'short', day: 'numeric', timeZone: 'UTC' };
            const yearOption = { year: 'numeric', timeZone: 'UTC' };
            weekendDateStr = `${fridayDateObj.toLocaleDateString(undefined, options)} - ${shabbatDateObj.toLocaleDateString(undefined, {...options, ...yearOption})}`;
        } else {
            console.warn("No Parsha item found for the week of", targetDate.toDateString());
        }

        return { parsha: parshaName, weekendOf: weekendDateStr, shabbatDate: shabbatApiDate };
    } catch (error) {
        console.error("Error fetching Shabbat info:", error);
        return { parsha: "Error fetching Parsha", weekendOf: "Error fetching date", shabbatDate: null };
    }
}

/**
 * Fetches a list of upcoming Shabbosim information.
 * @param {number} numberOfWeeks - How many weeks into the future to fetch.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of Shabbat info objects.
 */
async function getUpcomingShabbosim(numberOfWeeks = 12) {
    const upcomingShabbosim = [];
    const today = new Date();

    for (let i = 0; i < numberOfWeeks; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + (i * 7));
        
        // Ensure we are targeting a day that will reliably get us the *next* Shabbat if today is Shabbat.
        // For instance, by setting it to Sunday of the current week iteration.
        // Or, getShabbatInfoForDate should be robust enough.
        // Let's assume getShabbatInfoForDate correctly finds the Shabbat for the week of targetDate.

        const shabbatInfo = await getShabbatInfoForDate(targetDate);
        if (shabbatInfo && shabbatInfo.shabbatDate) {
            // Avoid duplicates if multiple calls in a week resolve to the same Shabbat
            if (!upcomingShabbosim.find(s => s.shabbatDate === shabbatInfo.shabbatDate)) {
                upcomingShabbosim.push(shabbatInfo);
            }
        }
    }
    return upcomingShabbosim.sort((a, b) => new Date(a.shabbatDate) - new Date(b.shabbatDate)); // Ensure sorted
}

/**
 * Fetches all Shabbosim for the current Hebrew year.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of Shabbat info objects.
 */
async function getShabbosimForYear() {
    const today = new Date();
    const currentYear = today.getFullYear();
    // Hebcal API can give all events for a year. We'll filter for parshiyot.
    // Using ?v=1&maj=on&min=on&nx=on&year=now&month=x&ss=on&mf=on&c=on&geo=none&M=on&lg=s&yt=G&cfg=json
    // A simpler way for just parshiyot for a year:
    const hebcalURL = `https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&min=off&mod=off&nx=off&year=${currentYear}&month=x&ss=off&mf=off&c=off&leyning=off&i=off&s=on`;
    // And for next year to cover the full Hebrew year cycle
    const hebcalURLNextYear = `https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&min=off&mod=off&nx=off&year=${currentYear + 1}&month=x&ss=off&mf=off&c=off&leyning=off&i=off&s=on`;

    const allShabbosim = [];

    try {
        for (const url of [hebcalURL, hebcalURLNextYear]) {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Hebcal API error: ${response.statusText}`);
            const data = await response.json();
            data.items?.forEach(item => {
                if (item.category === "parashat" && item.date && item.title) {
                    // To get weekendOf, we'd ideally call getShabbatInfoForDate, but that's many API calls.
                    // For simplicity here, we'll just store date and parsha. The form can format it.
                    allShabbosim.push({ parsha: item.title, shabbatDate: item.date, weekendOf: `Weekend of ${new Date(item.date + "T00:00:00Z").toLocaleDateString()}` });
                }
            });
        }
    } catch (error) {
        console.error("Error fetching Shabbosim for year:", error);
        return []; // Return empty on error
    }
    // Filter out past Shabbosim and sort
    const todayStr = today.toISOString().split('T')[0];
    return allShabbosim
        .filter(s => s.shabbatDate >= todayStr)
        .sort((a, b) => new Date(a.shabbatDate) - new Date(b.shabbatDate))
        .filter((item, index, self) => index === self.findIndex(t => t.shabbatDate === item.shabbatDate)); // Deduplicate
}