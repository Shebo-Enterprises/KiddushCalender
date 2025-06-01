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
    const upcomingShabbosimList = await getUpcomingShabbosim(WEEKS_TO_SHOW); // from parsha-service.js
    // Fetch active custom sponsorable events
    const customSponsorablesList = await getActiveCustomSponsorables(configData.userId); // New helper function

    // 2. Combine and sort Shabbosim and Custom Events
    let combinedSponsorableItems = [];

    upcomingShabbosimList.forEach(shabbat => {
        if (shabbat && shabbat.shabbatDate) { // Ensure shabbat object and date are valid
            combinedSponsorableItems.push({
                id: shabbat.shabbatDate, // Use shabbatDate as a unique key for shabbat items
                type: 'shabbat',
                title: shabbat.parsha,
                date: shabbat.shabbatDate, // Primary date for sorting
                displayDateInfo: shabbat.weekendOf,
                startDate: shabbat.shabbatDate, // For consistent sorting property
            });
        }
    });

    customSponsorablesList.forEach(event => {
        combinedSponsorableItems.push({
            id: event.id, // Firestore document ID
            type: 'custom',
            title: event.title,
            description: event.description,
            date: event.startDate, // Primary date for sorting
            displayDateInfo: `From ${new Date(event.startDate + "T00:00:00Z").toLocaleDateString()} to ${new Date(event.endDate + "T00:00:00Z").toLocaleDateString()}`,
            startDate: event.startDate,
            endDate: event.endDate
        });
    });

    // Sort combined list by start date
    combinedSponsorableItems.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    db.collection("sponsorships")
        .where("status", "==", "approved")
        .where("configOwnerId", "==", configData.userId) // Filter by the owner of this calendar configuration
        .onSnapshot(async (querySnapshot) => {
            let html = "";
            
            // Create a map of existing approved sponsorships for quick lookup
            const approvedSponsorshipsMap = new Map();
            querySnapshot.forEach(doc => {
                const sponsorship = doc.data();
                let key;
                if (sponsorship.sponsorshipType === 'custom' && sponsorship.customSponsorableId) {
                    key = sponsorship.customSponsorableId;
                } else { // Default to shabbatDate for older entries or explicit shabbat type
                    key = sponsorship.shabbatDate;
                }

                if (key) {
                    if (!approvedSponsorshipsMap.has(key)) {
                        approvedSponsorshipsMap.set(key, []);
                    }
                    approvedSponsorshipsMap.get(key).push(sponsorship);
                }
            });

            // Iterate through the combined list and display status
            if (combinedSponsorableItems.length === 0) {
                entriesContainer.innerHTML = '<a href="#" class="list-group-item">No upcoming events or Shabbosim found.</a>';
                return;
            }

            combinedSponsorableItems.forEach(item => {
                let sponsorsList;
                // For shabbat type, item.id is shabbatDate. For custom type, item.id is customEvent.id.
                sponsorsList = approvedSponsorshipsMap.get(item.id);

                html += `<div class="list-group-item week-entry">
                            <h4 class="list-group-item-heading">${item.title} ${item.type === 'custom' ? '' : ''}</h4>
                            <p class="list-group-item-text">${item.type === 'shabbat' ? 'Weekend of:' : 'Dates:'} ${item.displayDateInfo}</p>`;
                if (item.type === 'custom' && item.description) {
                    html += `<p class="list-group-item-text text-muted"><small>${item.description}</small></p>`;
                }
                
                if (sponsorsList && sponsorsList.length > 0) {
                    html += `<p class="list-group-item-text" style="color: green;"><strong>Sponsored by:</strong></p>
                             <ul class="list-unstyled" style="padding-left: 20px;">`;
                    sponsorsList.forEach(s => {
                        html += `<li>${s.sponsorName}${s.occasion ? ` - ${s.occasion}` : ''}</li>`;
                    });
                    html += `</ul>`;
                } else {
                    html += `<p class="list-group-item-text" style="color: #c09853;"><strong>Open for Sponsorship</strong></p>`;
                }
                html += `</div>`;
            });

            entriesContainer.innerHTML = html || '<a href="#" class="list-group-item">No items to display.</a>';
        }, (error) => {
            console.error("Error fetching sponsorships for calendar:", error);
            entriesContainer.innerHTML = '<a href="#" class="list-group-item list-group-item-danger">Error loading sponsorships.</a>';
        });
}

async function renderForm(container, configData) {
    // Fetch all Shabbosim for the year for the dropdown
    const allYearShabbosim = await getShabbosimForYear(); // from parsha-service.js
    // Fetch active custom sponsorable events for this config's owner
    const activeCustomEvents = await getActiveCustomSponsorables(configData.userId); // New helper function

    let sponsorableOptionsHTML = '<option value="">Select an Event or Parsha/Shabbos</option>';

    if (allYearShabbosim.length > 0) {
        sponsorableOptionsHTML += '<optgroup label="Parshios / Shabbosim">';
        allYearShabbosim.forEach(shabbat => {
            if (shabbat && shabbat.shabbatDate && shabbat.parsha) { // Basic validation
                const dateObj = new Date(shabbat.shabbatDate + "T00:00:00Z");
                const displayDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
                // Value format: type|date|parsha
                sponsorableOptionsHTML += `<option value="shabbat|${shabbat.shabbatDate}|${shabbat.parsha}">${shabbat.parsha} - ${displayDate}</option>`;
            }
        });
        sponsorableOptionsHTML += '</optgroup>';
    }

    if (activeCustomEvents.length > 0) {
        sponsorableOptionsHTML += '<optgroup label="Custom Events">';
        activeCustomEvents.forEach(event => {
            const startDateStr = new Date(event.startDate + "T00:00:00Z").toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const endDateStr = new Date(event.endDate + "T00:00:00Z").toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            // Value format: type|eventId|eventTitle
            sponsorableOptionsHTML += `<option value="custom|${event.id}|${event.title}">${event.title} (${startDateStr} - ${endDateStr})</option>`;
        });
        sponsorableOptionsHTML += '</optgroup>';
    }

    if (allYearShabbosim.length === 0 && activeCustomEvents.length === 0) {
        sponsorableOptionsHTML = '<option value="">Could not load sponsorable items</option>';
    } else {
        // No specific message needed if one of them loaded
    }

    container.innerHTML = `
        <div class="page-header"><h2>${configData.title || "Sponsor a Kiddush"}</h2></div>
        
        <form id="publicSponsorshipForm">
            <input type="hidden" id="formSponsorshipType" value="">
            <input type="hidden" id="formShabbatDate" value="">
            <input type="hidden" id="formParsha" value="">
            <input type="hidden" id="formCustomEventId" value="">
            <input type="hidden" id="formCustomEventTitle" value="">

            <div class="form-group">
                <label for="shabbos-select">Select Parsha/Shabbos:</label>
                <select class="form-control" id="shabbos-select" required>
                    ${sponsorableOptionsHTML}
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

            <!-- Payment Options Display -->
            ${configData.paymentSettings ? `
            <div id="payment-options-display" style="margin-top: 20px;">
                <p class="alert alert-info"><small><strong>Important:</strong> Please ensure payment arrangements are completed as per the options below for your sponsorship to be approved. If paying online, complete the payment after submitting this form.</small></p>
                <h4>Payment Information</h4>
                ${configData.paymentSettings.check && configData.paymentSettings.check.enabled ? `
                    <div class="panel panel-default">
                        <div class="panel-heading"><h5 class="panel-title">Pay by Check</h5></div>
                        <div class="panel-body">
                            <p>Please make checks payable to: <strong>${configData.paymentSettings.check.payableTo}</strong>.</p>
                            ${configData.paymentSettings.check.fullAmount ? `<p>For a full sponsorship, the amount is: <strong>$${configData.paymentSettings.check.fullAmount}</strong>.</p>` : ''}
                            ${configData.paymentSettings.check.halfAmount ? `<p>For a half (co-sponsored) sponsorship, the amount is: <strong>$${configData.paymentSettings.check.halfAmount}</strong>.</p>` : ''}
                            ${!(configData.paymentSettings.check.fullAmount || configData.paymentSettings.check.halfAmount) ? '<p>Please contact us for the check amount.</p>' : ''}
                            <p>You can mail or drop off the check at the office.</p>
                        </div>
                    </div>
                ` : ''}
                ${configData.paymentSettings.card && configData.paymentSettings.card.enabled ? `
                    <div class="panel panel-default">
                        <div class="panel-heading"><h5 class="panel-title">Pay by Credit/Debit Card</h5></div>
                        <div class="panel-body">
                            ${configData.paymentSettings.card.fullKiddushPrice && configData.paymentSettings.card.fullKiddushLink ?
                                `<p><a href="${configData.paymentSettings.card.fullKiddushLink}" target="_blank" rel="noopener noreferrer" class="btn btn-info">Pay for Full Kiddush ($${configData.paymentSettings.card.fullKiddushPrice})</a></p>` : ''}
                            ${configData.paymentSettings.card.halfKiddushPrice && configData.paymentSettings.card.halfKiddushLink ?
                                `<p style="margin-top:10px;"><a href="${configData.paymentSettings.card.halfKiddushLink}" target="_blank" rel="noopener noreferrer" class="btn btn-info">Pay for Half Kiddush ($${configData.paymentSettings.card.halfKiddushPrice})</a></p>` : ''}
                            <p style="margin-top:10px;"><small>You will be redirected to a secure payment page.</small></p>
                        </div>
                    </div>
                ` : ''}
                ${configData.paymentSettings.misc && configData.paymentSettings.misc.enabled ? `
                     <div class="panel panel-default">
                        <div class="panel-heading"><h5 class="panel-title">${configData.paymentSettings.misc.title || 'Other Payment Options'}</h5></div>
                        <div class="panel-body">
                            <p>${configData.paymentSettings.misc.instructions || 'Please contact us for details.'}</p>
                        </div>
                    </div>
                ` : ''}
            </div>
            ` : ''}
        </form>
        <div id="form-message" class="alert" style="margin-top: 15px; display: none;"></div>
    `;

    const shabbosSelect = document.getElementById('shabbos-select');
    const formSponsorshipTypeInput = document.getElementById('formSponsorshipType');
    const formShabbatDateInput = document.getElementById('formShabbatDate');
    const formParshaInput = document.getElementById('formParsha');
    const formCustomEventIdInput = document.getElementById('formCustomEventId');
    const formCustomEventTitleInput = document.getElementById('formCustomEventTitle');
    const selectedShabbosInfoDiv = document.getElementById('selected-shabbos-info');
    const selectedShabbosInfoPanel = document.getElementById('selected-shabbos-info-panel');


    shabbosSelect.addEventListener('change', async function() {
        const selectedValue = this.value;
        // Reset all hidden fields first
        formSponsorshipTypeInput.value = '';
        formShabbatDateInput.value = '';
        formParshaInput.value = '';
        formCustomEventIdInput.value = '';
        formCustomEventTitleInput.value = '';

        if (selectedValue) {
            const parts = selectedValue.split('|');
            const type = parts[0];
            formSponsorshipTypeInput.value = type;

            if (type === 'shabbat') {
                const [_, selectedDate, selectedParsha] = parts;
                formShabbatDateInput.value = selectedDate;
                formParshaInput.value = selectedParsha;
                const shabbatDetail = await getShabbatInfoForDate(new Date(selectedDate + "T00:00:00Z"));
                selectedShabbosInfoDiv.innerHTML = `<p><strong>Parsha:</strong> ${selectedParsha}</p><p><strong>Weekend of:</strong> ${shabbatDetail.weekendOf}</p>`;
                selectedShabbosInfoPanel.style.display = 'block';
            } else if (type === 'custom') {
                const [_, eventId, eventTitle] = parts;
                formCustomEventIdInput.value = eventId;
                formCustomEventTitleInput.value = eventTitle;
                const eventDetail = activeCustomEvents.find(e => e.id === eventId); // activeCustomEvents is in scope from renderForm
                if (eventDetail) {
                    const startDateStr = new Date(eventDetail.startDate + "T00:00:00Z").toLocaleDateString();
                    const endDateStr = new Date(eventDetail.endDate + "T00:00:00Z").toLocaleDateString();
                    selectedShabbosInfoDiv.innerHTML = `<p><strong>Event:</strong> ${eventTitle}</p><p><strong>Dates:</strong> ${startDateStr} - ${endDateStr}</p>${eventDetail.description ? `<p><strong>Description:</strong> ${eventDetail.description}</p>` : ''}`;
                } else {
                    selectedShabbosInfoDiv.innerHTML = `<p><strong>Event:</strong> ${eventTitle}</p><p>Details not found.</p>`;
                }
                selectedShabbosInfoPanel.style.display = 'block';
            } else {
                selectedShabbosInfoPanel.style.display = 'none';
            }
        } else {
            selectedShabbosInfoPanel.style.display = 'none';
        }
    });

    document.getElementById('publicSponsorshipForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const sponsorshipForm = e.target;
        const formMessage = document.getElementById('form-message');
        formMessage.textContent = "Submitting...";
        formMessage.className = 'alert alert-info';
        formMessage.style.display = 'block';

        const sponsorshipType = formSponsorshipTypeInput.value;

        if (!sponsorshipType) {
            formMessage.textContent = "Error: Please select an Event or Parsha/Shabbos from the dropdown.";
            formMessage.className = 'alert alert-danger';
            return;
        }

        if (!sponsorshipForm.sponsorName.value || !sponsorshipForm.occasion.value || !sponsorshipForm.contactEmail.value) {
            formMessage.textContent = "Error: Please fill out Sponsor Name, Occasion, and Contact Email.";
            formMessage.className = 'alert alert-danger';
            return;
        }

        let emailSubjectDetails = "";
        let emailBodyDetails = "";

        try {
            const sponsorshipData = {
                sponsorName: sponsorshipForm.sponsorName.value.trim(),
                occasion: sponsorshipForm.occasion.value.trim(),
                contactEmail: sponsorshipForm.contactEmail.value.trim(),
                sponsorshipType: sponsorshipType,
                submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: "pending",
                configOwnerId: configData.userId, // Store the userId of the configuration owner
                formTitle: configData.title || "Kiddush Sponsorship Form" // Store form title for email context
                // We are not capturing which payment method they *intend* to use on this form yet.
                // This version just displays the options. Capturing selection would be a next step.
            };

            if (sponsorshipType === 'shabbat') {
                const shabbatDate = formShabbatDateInput.value;
                const parsha = formParshaInput.value;
                if (!shabbatDate || !parsha || parsha === "N/A" || parsha === "Error fetching Parsha") {
                    formMessage.textContent = "Error: Could not determine Shabbat information. Please re-select a Parsha/Shabbos.";
                    formMessage.className = 'alert alert-danger';
                    return;
                }
                sponsorshipData.shabbatDate = shabbatDate;
                sponsorshipData.parsha = parsha;
                emailSubjectDetails = `${sponsorshipData.sponsorName} for ${sponsorshipData.parsha}`;
            } else if (sponsorshipType === 'custom') {
                const customEventId = formCustomEventIdInput.value;
                const customEventTitle = formCustomEventTitleInput.value;
                if (!customEventId || !customEventTitle) {
                    formMessage.textContent = "Error: Could not determine Custom Event information. Please re-select an event.";
                    formMessage.className = 'alert alert-danger';
                    return;
                }
                sponsorshipData.customSponsorableId = customEventId;
                sponsorshipData.customSponsorableTitle = customEventTitle;
                emailSubjectDetails = `${sponsorshipData.sponsorName} for ${sponsorshipData.customSponsorableTitle}`;
            }

            await db.collection("sponsorships").add(sponsorshipData);

            if (configData.notificationEmail) {
                const formDataForEmail = new FormData();
                formDataForEmail.append('_captcha', 'false');
                formDataForEmail.append('_subject', `New Sponsorship: ${emailSubjectDetails}`);
                formDataForEmail.append('Form Title', sponsorshipData.formTitle);
                formDataForEmail.append('Sponsor Name', sponsorshipData.sponsorName);
                formDataForEmail.append('Occasion', sponsorshipData.occasion);
                formDataForEmail.append('Contact Email', sponsorshipData.contactEmail);
                formDataForEmail.append('Parsha', sponsorshipData.parsha);
                formDataForEmail.append('Shabbat Date', sponsorshipData.shabbatDate);
                formDataForEmail.append('Status', 'Pending Review');
                if (sponsorshipType === 'shabbat') {
                    formDataForEmail.append('Item Sponsored', `Parsha: ${sponsorshipData.parsha} (Date: ${sponsorshipData.shabbatDate})`);
                } else if (sponsorshipType === 'custom') {
                    formDataForEmail.append('Item Sponsored', `Custom Event: ${sponsorshipData.customSponsorableTitle} (ID: ${sponsorshipData.customSponsorableId})`);
                }
                formDataForEmail.append('_replyto', sponsorshipData.contactEmail); // Set reply-to for convenience
                
                const formSubmitURL = `https://formsubmit.co/${configData.notificationEmail}`;
                console.log("Attempting to send email via FormSubmit to:", formSubmitURL);

                fetch(formSubmitURL, {
                    method: 'POST',
                    body: formDataForEmail
                })
                .then(response => {
                    console.log('FormSubmit response status:', response.status);
                    return response.text(); // Use .text() to see raw response
                })
                .then(text => console.log('FormSubmit response text:', text))
                .catch(error => console.error('FormSubmit fetch/network error:', error));
            }
            formMessage.textContent = "Sponsorship submitted for review! Thank you.";
            formMessage.className = 'alert alert-success';
            sponsorshipForm.reset();
            if(formShabbatDateInput) formShabbatDateInput.value = ''; // Clear hidden fields
            if(formParshaInput) formParshaInput.value = '';
            if(formSponsorshipTypeInput) formSponsorshipTypeInput.value = '';
            if(formCustomEventIdInput) formCustomEventIdInput.value = '';
            if(formCustomEventTitleInput) formCustomEventTitleInput.value = '';
            selectedShabbosInfoPanel.style.display = 'none'; // Hide info panel
        } catch (error) {
            console.error("Error submitting sponsorship from public form: ", error);
            formMessage.textContent = "Submission failed. Please try again or contact support.";
            formMessage.className = 'alert alert-danger';
        }
    });
}

// Helper function to fetch active custom sponsorable events for a user
async function getActiveCustomSponsorables(userId) {
    const customSponsorables = [];
    if (!userId) return customSponsorables;
    try {
        const today = new Date().toISOString().split('T')[0];
        const snapshot = await db.collection("customSponsorables")
            .where("userId", "==", userId)
            .where("endDate", ">=", today)
            .orderBy("endDate").orderBy("startDate").get(); // Corrected: First orderBy must be on 'endDate'
        snapshot.forEach(doc => customSponsorables.push({ id: doc.id, ...doc.data() }));
    } catch (error) { console.error("Error fetching active custom sponsorable events:", error); }
    return customSponsorables;
}