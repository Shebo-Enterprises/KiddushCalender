// js/embed.js
document.addEventListener('DOMContentLoaded', async () => {
    const entriesContainer = document.getElementById('calendar-entries');
    if (!entriesContainer) {
        console.error("Calendar entries container not found.");
        return;
    }

    try {
        // Assumes 'db' is initialized in firebase-init.js
        db.collection("sponsorships")
            .where("status", "==", "approved")
            .orderBy("shabbatDate")
            .onSnapshot(async (querySnapshot) => {
                if (querySnapshot.empty) {
                    entriesContainer.innerHTML = '<a href="#" class="list-group-item">No approved sponsorships at this time.</a>';
                    return;
                }
                let html = "";
                const sponsorshipsByDate = {};
                querySnapshot.forEach(doc => {
                    const sponsorship = doc.data();
                    if (!sponsorshipsByDate[sponsorship.shabbatDate]) {
                        sponsorshipsByDate[sponsorship.shabbatDate] = {
                            parsha: sponsorship.parsha, // Use stored parsha
                            sponsors: []
                        };
                    }
                    sponsorshipsByDate[sponsorship.shabbatDate].sponsors.push(sponsorship);
                });

                for (const dateKey in sponsorshipsByDate) {
                    const entry = sponsorshipsByDate[dateKey];
                    // Fetch fresh weekendOf string for display consistency
                    const shabbatInfo = await getShabbatInfoForDate(new Date(dateKey + "T00:00:00Z"));

                    html += `<div class="list-group-item week-entry">
                                <h4 class="list-group-item-heading">${entry.parsha || shabbatInfo.parsha}</h4>
                                <p class="list-group-item-text">Weekend of: ${shabbatInfo.weekendOf}</p>
                                <p class="list-group-item-text"><strong>Sponsored by:</strong></p><ul class="list-unstyled" style="padding-left: 20px;">`;
                    entry.sponsors.forEach(s => {
                        html += `<li>${s.sponsorName} - ${s.occasion}</li>`;
                    });
                    html += `</ul></div>`;
                }
                entriesContainer.innerHTML = html || '<a href="#" class="list-group-item">No approved sponsorships.</a>';
            }, (error) => {
                console.error("Error fetching sponsorships for calendar:", error);
                entriesContainer.innerHTML = '<a href="#" class="list-group-item list-group-item-danger">Error loading sponsorships.</a>';
            });
    } catch (error) {
        console.error("Error initializing calendar display:", error);
        entriesContainer.innerHTML = '<a href="#" class="list-group-item list-group-item-danger">Error initializing calendar.</a>';
    }
});