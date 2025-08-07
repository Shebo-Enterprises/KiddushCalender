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
        // Apply custom styles from the configuration before rendering anything
        applyCustomStyles(configData);

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

/**
 * Applies custom color and font styles based on the configuration.
 * @param {object} configData - The configuration data from Firestore.
 */
function applyCustomStyles(configData) {
    const displaySettings = configData.displaySettings;
    if (!displaySettings) return;

    const { color, font } = displaySettings;
    let customCss = '';

    if (font) {
        customCss += `
            body, .btn, .form-control, .panel-title, .list-group-item-heading, h2, h4 {
                font-family: ${font};
            }
        `;
    }

    if (color && color !== '#000000') { // Ignore black as it's often a default picker value
        // Helper function to determine if a color is light or dark
        const isLightColor = (hex) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            // Formula for perceived brightness
            return (r * 299 + g * 587 + b * 114) / 1000 > 155;
        };
        const btnTextColor = isLightColor(color) ? '#333333' : '#ffffff';

        customCss += `
            .page-header h2,
            .list-group-item-heading,
            .panel-primary .panel-heading .panel-title, /* Make panel titles stand out */
            a {
                color: ${color};
            }
            .btn-primary,
            .btn-default,
            #toggle-view-btn {
                background-color: ${color};
                border-color: ${color};
                color: ${btnTextColor};
            }
            .btn-primary:hover,
            .btn-primary:focus,
            .btn-default:hover,
            #toggle-view-btn:hover {
                background-color: ${color}e6; /* Add some transparency for hover */
                border-color: ${color}e6;
                color: ${btnTextColor};
            }
            .list-group-item.week-entry, .panel-default {
                border-left-color: ${color};
                border-left-width: 4px;
            }
            .page-header {
                border-bottom-color: ${color};
            }
        `;
    }

    const styleElement = document.getElementById('dynamic-styles');
    if (styleElement) {
        styleElement.innerHTML = customCss;
    }
}

async function renderCalendar(container, configData) {
    const pageTitle = configData.title || "Kiddush Calendar";
    let currentView = 'upcoming'; // 'upcoming' or 'past'
    let unsubscribeSponsorshipsListener = null;

    // 1. Set up the static HTML structure with a toggle button
    container.innerHTML = `
        <div class="page-header">
            <h2 id="calendar-title">${pageTitle} - Upcoming</h2>
        </div>
        <div id="calendar-controls" class="text-right" style="margin-bottom: 15px;">
            <button id="toggle-view-btn" class="btn btn-default">View Past Sponsorships</button>
        </div>
        <div id="calendar-entries" class="list-group">
            <p class="list-group-item text-center">Loading...</p>
        </div>
    `;

    const entriesContainer = document.getElementById('calendar-entries');
    const calendarTitleEl = document.getElementById('calendar-title');
    const toggleBtn = document.getElementById('toggle-view-btn');

    // 2. Function to display UPCOMING events (adapted from original logic)
    const displayUpcoming = async () => {
        if (unsubscribeSponsorshipsListener) unsubscribeSponsorshipsListener(); // Detach previous listener
        entriesContainer.innerHTML = '<p class="list-group-item text-center">Loading upcoming events...</p>';
        
        const WEEKS_TO_SHOW = 12;
        const [upcomingShabbosimList, customSponsorablesList] = await Promise.all([
            getUpcomingShabbosim(WEEKS_TO_SHOW),
            getActiveCustomSponsorables(configData.userId)
        ]);

        let combinedSponsorableItems = [];
        upcomingShabbosimList.forEach(shabbat => {
            if (shabbat && shabbat.shabbatDate) {
                combinedSponsorableItems.push({ id: shabbat.shabbatDate, type: 'shabbat', title: shabbat.parsha, displayDateInfo: shabbat.weekendOf, startDate: shabbat.shabbatDate });
            }
        });
        customSponsorablesList.forEach(event => {
            combinedSponsorableItems.push({ id: event.id, type: 'custom', title: event.title, description: event.description, displayDateInfo: `From ${new Date(event.startDate + "T00:00:00Z").toLocaleDateString()} to ${new Date(event.endDate + "T00:00:00Z").toLocaleDateString()}`, startDate: event.startDate });
        });
        combinedSponsorableItems.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        unsubscribeSponsorshipsListener = db.collection("sponsorships")
            .where("status", "==", "approved")
            .where("configOwnerId", "==", configData.userId)
            .onSnapshot(querySnapshot => {
                const approvedSponsorshipsMap = new Map();
                querySnapshot.forEach(doc => {
                    const s = doc.data();
                    const key = s.sponsorshipType === 'custom' ? s.customSponsorableId : s.shabbatDate;
                    if (key) {
                        if (!approvedSponsorshipsMap.has(key)) approvedSponsorshipsMap.set(key, []);
                        approvedSponsorshipsMap.get(key).push(s);
                    }
                });

                if (combinedSponsorableItems.length === 0) {
                    entriesContainer.innerHTML = '<a href="#" class="list-group-item">No upcoming events or Shabbosim found.</a>';
                    return;
                }

                const html = combinedSponsorableItems.map(item => {
                    const sponsorsList = approvedSponsorshipsMap.get(item.id);
                    let sponsorsHtml = `<p class="list-group-item-text" style="color: #c09853;"><strong>Open for Sponsorship</strong></p>`;
                    if (sponsorsList && sponsorsList.length > 0) {
                        const sponsorItems = sponsorsList.map(s => `<li>${s.sponsorName}${s.occasion ? ` - ${s.occasion}` : ''}</li>`).join('');
                        sponsorsHtml = `<p class="list-group-item-text" style="color: green;"><strong>Sponsored by:</strong></p><ul class="list-unstyled" style="padding-left: 20px;">${sponsorItems}</ul>`;
                    }
                    const descriptionHtml = item.type === 'custom' && item.description ? `<p class="list-group-item-text text-muted"><small>${item.description}</small></p>` : '';
                    return `
                        <div class="list-group-item week-entry">
                            <h4 class="list-group-item-heading">${item.title}</h4>
                            <p class="list-group-item-text">${item.type === 'shabbat' ? 'Weekend of:' : 'Dates:'} ${item.displayDateInfo}</p>
                            ${descriptionHtml}
                            ${sponsorsHtml}
                        </div>
                    `;
                }).join('');
                entriesContainer.innerHTML = html || '<a href="#" class="list-group-item">No items to display.</a>';
            }, error => {
                console.error("Error fetching sponsorships:", error);
                entriesContainer.innerHTML = '<a href="#" class="list-group-item list-group-item-danger">Error loading sponsorships.</a>';
            });
    };

    // 3. Function to display PAST sponsorships
    const displayPast = async () => {
        if (unsubscribeSponsorshipsListener) unsubscribeSponsorshipsListener(); // Detach listener
        entriesContainer.innerHTML = '<p class="list-group-item text-center">Loading past sponsorships...</p>';
        const todayStr = new Date().toISOString().split('T')[0];

        try {
            // Due to the data model, we can only reliably query past Shabbat sponsorships.
            const snapshot = await db.collection("sponsorships")
                .where("configOwnerId", "==", configData.userId)
                .where("status", "==", "approved")
                .where("shabbatDate", "<", todayStr)
                .orderBy("shabbatDate", "desc")
                .limit(50) // Prevent loading excessive data
                .get();
            
            if (snapshot.empty) {
                entriesContainer.innerHTML = '<div class="list-group-item"><p>No past sponsorships found.</p></div>';
                return;
            }
            
            const html = snapshot.docs.map(doc => {
                const s = doc.data();
                const shabbatDate = new Date(s.shabbatDate + 'T00:00:00Z');
                const formattedDate = shabbatDate.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' });
                return `
                    <div class="list-group-item">
                        <h4 class="list-group-item-heading">${s.parsha || 'Kiddush'} - ${formattedDate}</h4>
                        <p class="list-group-item-text"><strong>Sponsored by:</strong> ${s.sponsorName}</p>
                        ${s.occasion ? `<p class="list-group-item-text"><strong>For:</strong> ${s.occasion}</p>` : ''}
                    </div>
                `;
            }).join('');
            
            entriesContainer.innerHTML = html;
        } catch (error) {
            console.error("Error fetching past sponsorships:", error);
            entriesContainer.innerHTML = '<div class="list-group-item list-group-item-danger">Could not load past sponsorships.</div>';
        }
    };
    
    // 4. Controller function to switch views
    const updateView = () => {
        if (currentView === 'upcoming') {
            calendarTitleEl.textContent = `${pageTitle} - Upcoming`;
            toggleBtn.textContent = 'View Past Sponsorships';
            displayUpcoming();
        } else {
            calendarTitleEl.textContent = `${pageTitle} - Past`;
            toggleBtn.textContent = 'View Upcoming Sponsorships';
            displayPast();
        }
    };

    // 5. Add event listener to the button
    toggleBtn.addEventListener('click', () => {
        currentView = currentView === 'upcoming' ? 'past' : 'upcoming';
        updateView();
    });

    // 6. Initial load
    updateView();
}

async function renderForm(container, configData) {
    // Fetch all Shabbosim for the year for the dropdown
    const allYearShabbosim = await getShabbosimForYear(); // from parsha-service.js
    // Fetch active custom sponsorable events for this config's owner
    const activeCustomEvents = await getActiveCustomSponsorables(configData.userId); // New helper function

    const { paymentSettings } = configData;
    const hasCardFull = paymentSettings?.card?.enabled && paymentSettings?.card?.fullKiddushPrice && paymentSettings?.card?.fullKiddushLink;
    const hasCardHalf = paymentSettings?.card?.enabled && paymentSettings?.card?.halfKiddushPrice && paymentSettings?.card?.halfKiddushLink;
    const hasCheckFull = paymentSettings?.check?.enabled && paymentSettings?.check?.fullAmount;
    const hasCheckHalf = paymentSettings?.check?.enabled && paymentSettings?.check?.halfAmount;

    let sponsorshipTypeOptionsHTML = '';
    if (hasCardFull || hasCheckFull) {
        sponsorshipTypeOptionsHTML += `
            <label class="radio-inline">
                <input type="radio" name="kiddushType" id="kiddushTypeFull" value="full" required> Full Sponsorship
            </label>
        `;
    }
    if (hasCardHalf || hasCheckHalf) {
        sponsorshipTypeOptionsHTML += `
            <label class="radio-inline">
                <input type="radio" name="kiddushType" id="kiddushTypeHalf" value="half" required> Half Sponsorship
            </label>
        `;
    }

    let paymentMethodOptionsHTML = '';
    const canPayByCard = paymentSettings?.card?.enabled && (paymentSettings?.card?.fullKiddushLink || paymentSettings?.card?.halfKiddushLink);
    const canPayByCheck = paymentSettings?.check?.enabled && paymentSettings?.check?.payableTo;

    if (canPayByCard) {
        paymentMethodOptionsHTML += `
            <label class="radio-inline">
                <input type="radio" name="paymentMethod" id="paymentMethodCard" value="card" required> Pay by Card
            </label>`;
    }
    if (canPayByCheck) {
        paymentMethodOptionsHTML += `
            <label class="radio-inline">
                <input type="radio" name="paymentMethod" id="paymentMethodCheck" value="check" required> Pay by Check
            </label>`;
    }

    const hasAnyPaymentOptions = sponsorshipTypeOptionsHTML && paymentMethodOptionsHTML;

    let paymentSectionHTML = '';
    if (hasAnyPaymentOptions) {
        paymentSectionHTML = `
            <div class="form-group">
                <label>Sponsorship Type:</label>
                <div>${sponsorshipTypeOptionsHTML}</div>
            </div>
            <div class="form-group">
                <label>Payment Method:</label>
                <div>${paymentMethodOptionsHTML}</div>
            </div>
        `;
    } else {
        // Fallback for when no payment options are configured, but the form is active.
        paymentSectionHTML = `
            <div class="panel panel-info">
                <div class="panel-heading"><h3 class="panel-title">Payment Information</h3></div>
                <div class="panel-body">
                    <p>After submitting, please contact the office to arrange for payment for your sponsorship.</p>
                </div>
            </div>`;
    }

    const checkInstructionsHTML = (canPayByCheck && paymentSettings?.check?.payableTo) ? `
        <div id="check-payment-info" class="panel panel-default" style="display:none; margin-top:20px;">
            <div class="panel-heading"><h5 class="panel-title">Payment by Check Instructions</h5></div>
            <div class="panel-body">
                <p>Please make checks payable to: <strong>${paymentSettings.check.payableTo}</strong>.</p>
                <div id="check-amount-info-full" style="display:none;">
                    <p>For a full sponsorship, the amount is: <strong>$${paymentSettings.check.fullAmount}</strong>.</p>
                </div>
                <div id="check-amount-info-half" style="display:none;">
                     <p>For a half (co-sponsored) sponsorship, the amount is: <strong>$${paymentSettings.check.halfAmount}</strong>.</p>
                </div>
                <p>You can mail or drop off the check at the office.</p>
                <hr>
                <p class="text-success"><strong>Your sponsorship has been submitted for review. Please complete payment to finalize.</strong></p>
            </div>
        </div>
    ` : '';


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
                    <p class="help-block">If you have sponsored before, please use the same email address to link your sponsorships.</p>
            </div>
            
            <!-- Dynamically generated payment selection -->
            ${paymentSectionHTML}

            <button type="submit" class="btn btn-primary">Submit Sponsorship</button>
        </form>
        <div id="form-message" class="alert" style="margin-top: 15px; display: none;"></div>
        ${checkInstructionsHTML}
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
        // Hide check info panel during resubmission
        const checkInfoPanel = document.getElementById('check-payment-info');
        if(checkInfoPanel) checkInfoPanel.style.display = 'none';
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

        const selectedKiddushType = sponsorshipForm.kiddushType ? sponsorshipForm.kiddushType.value : null;
        const selectedPaymentMethod = sponsorshipForm.paymentMethod ? sponsorshipForm.paymentMethod.value : null;

        let emailSubjectDetails = "";
        let paymentLink = '';


        try {
            const sponsorshipData = {
                sponsorName: sponsorshipForm.sponsorName.value.trim(),
                occasion: sponsorshipForm.occasion.value.trim(),
                contactEmail: sponsorshipForm.contactEmail.value.trim(),
                sponsorshipType: sponsorshipType,
                submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: "pending",
                configOwnerId: configData.userId, 
                formTitle: configData.title || "Kiddush Sponsorship Form",
                paymentMethod: selectedPaymentMethod,
                kiddushType: selectedKiddushType
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

            const docRef = await db.collection("sponsorships").add(sponsorshipData);

            if (configData.notificationEmail) {
                const formDataForEmail = new FormData();
                formDataForEmail.append('_captcha', 'false');
                formDataForEmail.append('_subject', `New Sponsorship: ${emailSubjectDetails}`);
                formDataForEmail.append('Form Title', sponsorshipData.formTitle);
                formDataForEmail.append('Sponsor Name', sponsorshipData.sponsorName);
                formDataForEmail.append('Occasion', sponsorshipData.occasion);
                formDataForEmail.append('Contact Email', sponsorshipData.contactEmail);
                formDataForEmail.append('Payment Method', sponsorshipData.paymentMethod);
                formDataForEmail.append('Kiddush Type', sponsorshipData.kiddushType);
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
            
            // PAYMENT REDIRECT/DISPLAY LOGIC
            sponsorshipForm.style.display = 'none'; // Hide form on success
            formMessage.style.display = 'none'; // Hide initial "submitting" message

            if (selectedPaymentMethod === 'card') {
                if (selectedKiddushType === 'full') {
                    paymentLink = configData.paymentSettings?.card?.fullKiddushLink;
                } else if (selectedKiddushType === 'half') {
                    paymentLink = configData.paymentSettings?.card?.halfKiddushLink;
                }

                if (paymentLink) {
                    // Display a final message and then redirect
                    formMessage.textContent = "Sponsorship submitted! Redirecting to payment page...";
                    formMessage.className = 'alert alert-success';
                    formMessage.style.display = 'block';
                    setTimeout(() => {
                        window.location.href = paymentLink;
                    }, 3000); // 3-second delay
                } else {
                     formMessage.textContent = "Sponsorship submitted! However, the payment link is not configured. Please contact support.";
                     formMessage.className = 'alert alert-warning';
                     formMessage.style.display = 'block';
                }
            } else if (selectedPaymentMethod === 'check') {
                // Show the check payment info panel
                if(checkInfoPanel) {
                    checkInfoPanel.style.display = 'block';
                    const fullAmountInfo = document.getElementById('check-amount-info-full');
                    const halfAmountInfo = document.getElementById('check-amount-info-half');
                    if(fullAmountInfo) fullAmountInfo.style.display = selectedKiddushType === 'full' ? 'block' : 'none';
                    if(halfAmountInfo) halfAmountInfo.style.display = selectedKiddushType === 'half' ? 'block' : 'none';
                }
            } else {
                // Fallback for no payment options configured
                formMessage.textContent = "Sponsorship submitted for review! Please contact the office to arrange payment. Thank you.";
                formMessage.className = 'alert alert-success';
                formMessage.style.display = 'block';
            }

            // Don't reset the form, as it's now hidden
            sponsorshipForm.reset();
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
