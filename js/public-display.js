// js/public-display.js

document.addEventListener('DOMContentLoaded', async () => {
    const displayContainer = document.getElementById('display-container');
    if (!displayContainer) {
        console.error("Display container not found.");
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const configId = urlParams.get('configId');

    if (!configId) {
        displayContainer.innerHTML = "<p class='alert alert-danger text-center'>Error: Configuration ID not provided in the URL.</p>";
        console.error("Configuration ID not provided.");
        return;
    }

    try {
        if (typeof db === 'undefined') {
            console.error("Firestore 'db' is not initialized. Check firebase-init.js");
            displayContainer.innerHTML = "<p class='alert alert-danger text-center'>Error: Database not initialized.</p>";
            return;
        }

        const configDocRef = db.collection("configurations").doc(configId);
        const configDoc = await configDocRef.get();

        if (!configDoc.exists) {
            displayContainer.innerHTML = `<p class='alert alert-danger text-center'>Error: Configuration with ID '${configId}' not found.</p>`;
            console.error("Configuration not found:", configId);
            return;
        }

        const configData = configDoc.data();

        if (configData.type === "calendar") {
            await renderCalendar(displayContainer, configData);
        } else if (configData.type === "form") {
            await renderForm(displayContainer, configData);
        } else {
            displayContainer.innerHTML = "<p class='alert alert-danger text-center'>Error: Unknown configuration type.</p>";
            console.error("Unknown configuration type:", configData.type);
        }

    } catch (error) {
        displayContainer.innerHTML = "<p class='alert alert-danger text-center'>Error loading content. Please try again later.</p>";
        console.error("Error loading public display:", error);
    }
});

async function renderCalendar(container, configData) {
    container.innerHTML = `<div class="page-header"><h2>${configData.title || "Kiddush Calendar"}</h2></div><div id="calendar-entries" class="list-group"><p class="list-group-item text-center">Loading sponsorships...</p></div>`;
    const entriesContainer = document.getElementById('calendar-entries');
    const WEEKS_TO_SHOW = 12; // Show next 12 weeks

    // 1. Fetch all upcoming Shabbosim for the defined range
    const upcomingShabbosimList = await getUpcomingShabbosim(WEEKS_TO_SHOW);

    db.collection("sponsorships")
        .where("status", "==", "approved")
        .where("configOwnerId", "==", configData.userId) // Filter by the owner of this calendar configuration
        // We don't orderBy("shabbatDate") here because we'll be merging with a pre-sorted list of all Shabbosim
        .onSnapshot(async (querySnapshot) => {
            let html = "";
            
            // 2. Create a map of existing approved sponsorships for quick lookup
            const approvedSponsorshipsMap = new Map();
            querySnapshot.forEach(doc => {
                const sponsorship = doc.data();
                if (!approvedSponsorshipsMap.has(sponsorship.shabbatDate)) {
                    approvedSponsorshipsMap.set(sponsorship.shabbatDate, []);
                }
                approvedSponsorshipsMap.get(sponsorship.shabbatDate).push(sponsorship);
            });

            // 3. Iterate through the upcoming Shabbosim list and display status
            if (upcomingShabbosimList.length === 0) {
                entriesContainer.innerHTML = '<a href="#" class="list-group-item">Could not load upcoming Shabbos dates.</a>';
                return;
            }

            upcomingShabbosimList.forEach(shabbat => {
                const sponsorsList = approvedSponsorshipsMap.get(shabbat.shabbatDate);

                html += `<div class="list-group-item week-entry">
                            <h4 class="list-group-item-heading">${shabbat.parsha}</h4>
                            <p class="list-group-item-text">Weekend of: ${shabbat.weekendOf}</p>`;
                
                if (sponsorsList && sponsorsList.length > 0) {
                    html += `<p class="list-group-item-text" style="color: green;"><strong>Sponsored by:</strong></p>
                             <ul class="list-unstyled" style="padding-left: 20px;">`;
                    sponsorsList.forEach(s => {
                        html += `<li>${s.sponsorName} - ${s.occasion}</li>`;
                    });
                    html += `</ul>`;
                } else {
                    html += `<p class="list-group-item-text" style="color: #c09853;"><strong>Open for Sponsorship</strong></p>`;
                    // Optionally, add a link to the sponsorship form if this config has an associated form
                    // This would require knowing the configId of a relevant form.
                }
                html += `</div>`;
            });

            entriesContainer.innerHTML = html;
        }, (error) => {
            console.error("Error fetching sponsorships for calendar:", error);
            entriesContainer.innerHTML = '<a href="#" class="list-group-item list-group-item-danger">Error loading sponsorships.</a>';
        });
}

async function renderForm(container, configData) {
    // Fetch all Shabbosim for the year for the dropdown
    const allYearShabbosim = await getShabbosimForYear();
    let shabbosOptionsHTML = '<option value="">Select a Shabbos/Parsha</option>';
    if (allYearShabbosim.length > 0) {
        allYearShabbosim.forEach(shabbat => {
            // We need to format weekendOf string here if not already done in getShabbosimForYear
            // For now, using a simplified version.
            const dateObj = new Date(shabbat.shabbatDate + "T00:00:00Z");
            const displayDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
            shabbosOptionsHTML += `<option value="${shabbat.shabbatDate}|${shabbat.parsha}">${shabbat.parsha} - ${displayDate}</option>`;
        });
    } else {
        shabbosOptionsHTML = '<option value="">Could not load Shabbos dates</option>';
    }

    container.innerHTML = `
        <div class="page-header"><h2>${configData.title || "Sponsor a Kiddush"}</h2></div>
        
        <form id="publicSponsorshipForm">
            <!-- Hidden inputs will be populated by dropdown selection -->
            <input type="hidden" id="formShabbatDate" value="">
            <input type="hidden" id="formParsha" value="">

            <div class="form-group">
                <label for="shabbos-select">Select Parsha/Shabbos:</label>
                <select class="form-control" id="shabbos-select" required>
                    ${shabbosOptionsHTML}
                </select>
            </div>
             <div class="panel panel-default" id="selected-shabbos-info-panel" style="display:none;">
                <div class="panel-body" id="selected-shabbos-info"></div>
            </div>
            <div class="form-group">
                <label for="sponsorName">Sponsor Name:</label>
                <input type="text" class="form-control" id="sponsorName" name="sponsorName" required>
            </div>
            <div class="form-group">
                <label for="occasion">Occasion:</label>
                <input type="text" class="form-control" id="occasion" name="occasion" required>
            </div>
            <div class="form-group">
                <label for="contactEmail">Contact Email:</label>
                <input type="email" class="form-control" id="contactEmail" name="contactEmail" required>
            </div>
            <button type="submit" class="btn btn-primary">Submit Sponsorship</button>
        </form>
        <div id="form-message" class="alert" style="margin-top: 15px; display: none;"></div>
    `;

    const shabbosSelect = document.getElementById('shabbos-select');
    const formShabbatDateInput = document.getElementById('formShabbatDate');
    const formParshaInput = document.getElementById('formParsha');
    const selectedShabbosInfoDiv = document.getElementById('selected-shabbos-info');
    const selectedShabbosInfoPanel = document.getElementById('selected-shabbos-info-panel');


    shabbosSelect.addEventListener('change', async function() {
        const selectedValue = this.value;
        if (selectedValue) {
            const [selectedDate, selectedParsha] = selectedValue.split('|');
            formShabbatDateInput.value = selectedDate;
            formParshaInput.value = selectedParsha;
            // Optionally, fetch and display weekendOf for the selected date if not already part of the option text
            const shabbatDetail = await getShabbatInfoForDate(new Date(selectedDate + "T00:00:00Z")); // to get formatted weekendOf
            selectedShabbosInfoDiv.innerHTML = `<p><strong>Parsha:</strong> ${selectedParsha}</p><p><strong>Weekend of:</strong> ${shabbatDetail.weekendOf}</p>`;
            selectedShabbosInfoPanel.style.display = 'block';
        } else {
            formShabbatDateInput.value = '';
            formParshaInput.value = '';
            selectedShabbosInfoPanel.style.display = 'none';
        }
    });

    document.getElementById('publicSponsorshipForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formMessage = document.getElementById('form-message');
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
                sponsorName: e.target.sponsorName.value,
                occasion: e.target.occasion.value,
                contactEmail: e.target.contactEmail.value,
                shabbatDate: shabbatDate,
                parsha: parsha,
                submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: "pending",
                configOwnerId: configData.userId // Store the userId of the configuration owner
            });
            formMessage.textContent = "Sponsorship submitted for review! Thank you.";
            formMessage.className = 'alert alert-success';
            e.target.reset();
            formShabbatDateInput.value = ''; // Clear hidden fields
            formParshaInput.value = '';
            selectedShabbosInfoPanel.style.display = 'none'; // Hide info panel
            // The dropdown will reset to its default "Select..." option
        } catch (error) {
            console.error("Error submitting sponsorship from public form: ", error);
            formMessage.textContent = "Submission failed. Please try again or contact support.";
            formMessage.className = 'alert alert-danger';
        }
    });
}