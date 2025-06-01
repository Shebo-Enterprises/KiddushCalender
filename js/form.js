// js/form.js
document.addEventListener('DOMContentLoaded', async () => {
    const weeklyInfoDiv = document.getElementById('weekly-info-form');
    const formShabbatDateInput = document.getElementById('formShabbatDate');
    const formParshaInput = document.getElementById('formParsha');
    const sponsorshipForm = document.getElementById('publicSponsorshipForm');
    const formMessage = document.getElementById('form-message');

    if (!weeklyInfoDiv || !sponsorshipForm || !formShabbatDateInput || !formParshaInput || !formMessage) {
        console.error("One or more form elements are missing from the DOM.");
        if (weeklyInfoDiv) weeklyInfoDiv.innerHTML = "<p class='text-danger'>Error: Form elements missing.</p>";
        return;
    }

    async function loadWeeklyInfo() {
        try {
            const shabbatInfo = await getShabbatInfoForDate(); // Defaults to current week
            weeklyInfoDiv.innerHTML = `
                <p><strong>This Week's Parsha:</strong> ${shabbatInfo.parsha}</p>
                <p><strong>Weekend of:</strong> ${shabbatInfo.weekendOf}</p>
            `;
            formShabbatDateInput.value = shabbatInfo.shabbatDate || '';
            formParshaInput.value = shabbatInfo.parsha || '';
        } catch (error) {
            console.error("Error loading weekly info for form:", error);
            weeklyInfoDiv.innerHTML = "<p class='text-danger'>Error loading weekly information.</p>";
        }
    }

    await loadWeeklyInfo();

    sponsorshipForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        formMessage.textContent = "Submitting...";
        formMessage.className = 'alert alert-info';
        formMessage.style.display = 'block';

        const shabbatDate = formShabbatDateInput.value;
        const parsha = formParshaInput.value;

        if (!shabbatDate || !parsha || parsha === "N/A" || parsha === "Error fetching Parsha") {
            formMessage.textContent = "Error: Could not determine Shabbat information. Please refresh and try again.";
            formMessage.className = 'alert alert-danger';
            return;
        }

        try {
            await db.collection("sponsorships").add({
                sponsorName: sponsorshipForm.sponsorName.value,
                occasion: sponsorshipForm.occasion.value,
                contactEmail: sponsorshipForm.contactEmail.value,
                shabbatDate: shabbatDate,
                parsha: parsha,
                submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: "pending",
            });
            formMessage.textContent = "Sponsorship submitted for review! Thank you.";
            formMessage.className = 'alert alert-success';
            sponsorshipForm.reset();
            await loadWeeklyInfo(); // Refresh weekly info in case date changed
        } catch (error) {
            console.error("Error submitting sponsorship from public form: ", error);
            formMessage.textContent = "Submission failed. Please try again or contact support.";
            formMessage.className = 'alert alert-danger';
        }
    });
});