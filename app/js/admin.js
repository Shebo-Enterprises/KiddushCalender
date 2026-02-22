// js/admin.js

const configurationsListDiv = document.getElementById('configurations-list');
const createConfigForm = document.getElementById('create-config-form');
const pendingSponsorshipsListDiv = document.getElementById('pending-sponsorships-list');
const approvedSponsorshipsListDiv = document.getElementById('approved-sponsorships-list');
const peopleListDiv = document.getElementById('people-list');
const peopleSearchInput = document.getElementById('people-search');
const peopleFilterSelect = document.getElementById('people-filter');
const addPersonBtn = document.getElementById('add-person-btn');
const adminReserveKiddushForm = document.getElementById('admin-reserve-kiddush-form');
const adminShabbosSelect = document.getElementById('admin-shabbos-select');
const adminSelectedShabbosInfoDiv = document.getElementById('admin-selected-shabbos-info');
const adminSelectedShabbosInfoPanel = document.getElementById('admin-selected-shabbos-info-panel');
const adminReserveMessage = document.getElementById('admin-reserve-message'); // Added for clarity

// New elements for Custom Schedulable Events
const createCustomEventForm = document.getElementById('create-custom-event-form');
const customEventsListDiv = document.getElementById('custom-events-list');
const editingCustomEventIdInput = document.getElementById('editing-custom-event-id');

const adminReserveTypeSelect = document.getElementById('admin-reserve-type-select');
const adminShabbosSelectContainer = document.getElementById('admin-shabbos-select-container');
const adminCustomEventSelectContainer = document.getElementById('admin-custom-event-select-container');
const adminCustomEventSelect = document.getElementById('admin-custom-event-select');

// Payment option elements for config form
const configTypeSelect = document.getElementById('config-type');
const formPaymentOptionsDiv = document.getElementById('form-payment-options');
const configPaymentCheckEnabled = document.getElementById('config-payment-check-enabled');
const configCheckDetailsDiv = document.getElementById('config-check-details');
const configCheckAmountsDiv = document.getElementById('config-check-amounts'); // New div for check amounts
const configPaymentCardEnabled = document.getElementById('config-payment-card-enabled');
const configCardDetailsDiv = document.getElementById('config-card-details');
const editingConfigIdInput = document.getElementById('editing-config-id');


// Function to be called by auth.js after successful login
function loadAdminData() {
    loadConfigurations();
    loadCustomEvents(); // Load custom sponsorable events
    populateAdminShabbosSelector(); // Populate the Parsha selector for admin reservation
    loadSponsorships();
    loadPeople(); // Load people management
    populateAdminCustomEventSelector(); // Populate custom events for admin reservation
    resetConfigForm(); // Ensure form is in create mode initially
    initializeSidebarNavigation(); // Initialize sidebar navigation
    initializePeopleManagement(); // Initialize people management functionality
}

// Sidebar Navigation Functionality
function initializeSidebarNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.admin-section');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            // Remove active class from all links and sections
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            // Add active class to clicked link
            this.classList.add('active');

            // Show corresponding section
            const sectionId = this.getAttribute('data-section');
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });
}

if (configTypeSelect) {
    configTypeSelect.addEventListener('change', function () {
        if (this.value === 'form') {
            formPaymentOptionsDiv.style.display = 'block';
        } else {
            formPaymentOptionsDiv.style.display = 'none';
        }
    });
}
if (configPaymentCheckEnabled) {
    configPaymentCheckEnabled.addEventListener('change', function () {
        const displayStyle = this.checked ? 'block' : 'none';
        if (configCheckDetailsDiv) configCheckDetailsDiv.style.display = displayStyle;
        if (configCheckAmountsDiv) configCheckAmountsDiv.style.display = displayStyle;

    });
}
if (configPaymentCardEnabled) {
    configPaymentCardEnabled.addEventListener('change', function () {
        configCardDetailsDiv.style.display = this.checked ? 'block' : 'none';
    });
}

// Helper function to generate HTML for displaying payment settings
function generatePaymentDetailsHtml(config) {
    let paymentHtml = '';
    if (config.type === 'form') {
        if (config.paymentSettings) {
            const ps = config.paymentSettings;
            // Using a div to group payment settings for better structure and potential styling
            if (config.notificationEmail) {
                paymentHtml += `<p style="margin-bottom: 5px;"><small><strong>Notification Email:</strong> ${config.notificationEmail}</small></p>`;
            }
            paymentHtml += `<div class="payment-settings-details" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;">`; // prettier-ignore
            if (ps.check && ps.check.enabled) {
                paymentHtml += `<p style="margin-bottom: 5px;"><small><strong>Check Payments:</strong> Enabled (Payable to: <strong>${ps.check.payableTo || 'Not specified'}</strong>)</small></p>`;
                paymentHtml += `<div style="padding-left: 15px;"><p style="margin-bottom: 3px;"><small>Full Amount: <strong>${ps.check.fullAmount || 'N/A'}</strong></small></p>`;
                paymentHtml += `<p style="margin-bottom: 3px;"><small>Half Amount: <strong>${ps.check.halfAmount || 'N/A'}</strong></small></p></div>`;
            } else {
                paymentHtml += `<p style="margin-bottom: 5px;"><small><strong>Check Payments:</strong> Disabled</small></p>`;
            }
            paymentHtml += `<p style="margin-bottom: 5px;"><small><strong>Card Payments:</strong> ${ps.card && ps.card.enabled ? 'Enabled' : 'Disabled'}</small></p>`;
            if (ps.card && ps.card.enabled) {
                paymentHtml += `<div style="padding-left: 15px;">`; // Indent card details
                paymentHtml += `<p style="margin-bottom: 3px;"><small>Full Kiddush Price: <strong>${ps.card.fullKiddushPrice || 'N/A'}</strong>, Link: ${ps.card.fullKiddushLink ? `<a href="${ps.card.fullKiddushLink}" target="_blank" rel="noopener noreferrer">${ps.card.fullKiddushLink}</a>` : 'Not set'}</small></p>`;
                paymentHtml += `<p style="margin-bottom: 3px;"><small>Half Kiddush Price: <strong>${ps.card.halfKiddushPrice || 'N/A'}</strong>, Link: ${ps.card.halfKiddushLink ? `<a href="${ps.card.halfKiddushLink}" target="_blank" rel="noopener noreferrer">${ps.card.halfKiddushLink}</a>` : 'Not set'}</small></p>`;
                paymentHtml += `</div>`; // end indent
            }
            paymentHtml += `</div>`; // end payment-settings-details
        } else {
            paymentHtml = '<p style="margin-top:10px;"><small><em>No payment settings defined for this form.</em></small></p>';
        }
    }
    return paymentHtml;
}

// Helper function to generate HTML for displaying display settings
function generateDisplaySettingsHtml(config) {
    if (!config.displaySettings) return '';
    const { color, font } = config.displaySettings;
    let html = '<div class="display-settings-details" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;">';
    html += '<p style="margin-bottom: 5px;"><small><strong>Display Customization:</strong></small></p>';
    if (color) {
        html += `<p style="margin-bottom: 3px; padding-left: 15px;"><small>Primary Color: <span style="display: inline-block; width: 15px; height: 15px; background-color: ${color}; border: 1px solid #ccc; vertical-align: middle; border-radius: 3px;"></span> ${color}</small></p>`;
    }
    if (font) {
        const fontName = font.split(',')[0].replace(/'/g, '');
        html += `<p style="margin-bottom: 3px; padding-left: 15px;"><small>Font: ${fontName}</small></p>`;
    }
    html += '</div>';
    return html;
}
// Configurations Management
async function loadConfigurations() {
    if (!configurationsListDiv) return;
    configurationsListDiv.innerHTML = '<div class="text-center">Loading configurations...</div>';
    const currentUser = auth.currentUser;
    if (!currentUser) {
        configurationsListDiv.innerHTML = '<div class="alert alert-warning">Please login to see your configurations.</div>';
        return;
    }

    try {
        const snapshot = await db.collection("configurations").where("userId", "==", currentUser.uid).orderBy("createdAt", "desc").get();
        let html = '';
        if (snapshot.empty) {
            html = '<div class="alert alert-warning">No configurations found. Create one above.</div>';
        } else {
            snapshot.forEach(doc => {
                const config = doc.data();
                const embedUrl = `${window.location.origin}/app/public-display.html?configId=${doc.id}`;
                const paymentDisplayHtml = generatePaymentDetailsHtml(config);
                const displaySettingsHtml = generateDisplaySettingsHtml(config);
                html += `
                    <div class="panel panel-default config-item">
                        <div class="panel-heading"><h4 class="panel-title">${config.title} (Type: ${config.type})</h4></div>
                        <div class="panel-body">
                            <p><strong>ID:</strong> ${doc.id}</p>
                            <p><strong>Direct Link:</strong> <a href="${embedUrl}" target="_blank" rel="noopener noreferrer">${embedUrl}</a></p>
                            <p><strong>Embed Code:</strong> <code class="embed-code">&lt;iframe src="${embedUrl}" width="100%" height="1200px" style="border:0px solid #ccc;"&gt;&lt;/iframe&gt;</code></p>
                            ${displaySettingsHtml}
                            ${paymentDisplayHtml}
                            <button class="btn btn-primary btn-xs" onclick='editConfigurationPrep("${doc.id}")'>Edit</button>
                            <button class="btn btn-danger btn-xs" style="margin-left: 5px;" onclick="deleteConfiguration('${doc.id}')">Delete</button>
                        </div>
                    </div>`;
            });
        }
        configurationsListDiv.innerHTML = html;
    } catch (error) {
        console.error("Error loading configurations: ", error);
        configurationsListDiv.innerHTML = '<div class="alert alert-danger">Error loading configurations.</div>';
    }
}

async function editConfigurationPrep(configId) {
    if (!configId) return;
    try {
        const docRef = db.collection("configurations").doc(configId);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            const configData = docSnap.data();
            populateConfigFormForEdit(configId, configData);
            // Scroll to the form for better UX
            createConfigForm.scrollIntoView({ behavior: 'smooth' });
        } else {
            alert("Configuration not found for editing.");
        }
    } catch (error) {
        console.error("Error preparing config for edit:", error);
        alert("Error fetching configuration details for editing.");
    }
}

function populateConfigFormForEdit(configId, configData) {
    createConfigForm['config-title'].value = configData.title || '';
    createConfigForm['config-type'].value = configData.type || 'form';
    editingConfigIdInput.value = configId; // Mark as editing
    document.getElementById('config-notification-email').value = configData.notificationEmail || '';

    // Populate display settings
    document.getElementById('config-color').value = configData.displaySettings?.color || '#007bff';
    document.getElementById('config-font').value = configData.displaySettings?.font || "'Helvetica Neue', Helvetica, Arial, sans-serif";

    // Trigger change on type select to show/hide payment options
    configTypeSelect.dispatchEvent(new Event('change'));

    if (configData.type === 'form' && configData.paymentSettings) {
        const ps = configData.paymentSettings;
        configPaymentCheckEnabled.checked = ps.check?.enabled || false;
        configPaymentCheckEnabled.dispatchEvent(new Event('change')); // Show/hide details
        document.getElementById('config-payment-check-payableTo').value = ps.check?.payableTo || '';
        document.getElementById('config-payment-check-full-amount').value = ps.check?.fullAmount || '';
        document.getElementById('config-payment-check-half-amount').value = ps.check?.halfAmount || '';

        configPaymentCardEnabled.checked = ps.card?.enabled || false;
        configPaymentCardEnabled.dispatchEvent(new Event('change')); // Show/hide details
        document.getElementById('config-payment-card-fullPrice').value = ps.card?.fullKiddushPrice || '';
        document.getElementById('config-payment-card-fullLink').value = ps.card?.fullKiddushLink || '';
        document.getElementById('config-payment-card-halfPrice').value = ps.card?.halfKiddushPrice || '';
        document.getElementById('config-payment-card-halfLink').value = ps.card?.halfKiddushLink || '';
    } else {
        // Reset payment fields if not a form or no payment settings
        configPaymentCheckEnabled.checked = false;
        configPaymentCheckEnabled.dispatchEvent(new Event('change'));
        configPaymentCardEnabled.checked = false;
        configPaymentCardEnabled.dispatchEvent(new Event('change'));
    }

    createConfigForm.querySelector('button[type="submit"]').textContent = 'Update Configuration';
    const formHeading = createConfigForm.querySelector('h3');
    if (formHeading) {
        formHeading.textContent = `Edit Configuration: ${configData.title}`;
    }
}

if (createConfigForm) {
    createConfigForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = createConfigForm['config-title'].value;
        const type = createConfigForm['config-type'].value;
        const currentUser = auth.currentUser;

        if (!currentUser) {
            alert("You must be logged in to create a configuration.");
            return;
        }

        const configDataPayload = {
            title,
            type,
            userId: currentUser.uid,
            notificationEmail: document.getElementById('config-notification-email').value,
            displaySettings: {
                color: document.getElementById('config-color').value,
                font: document.getElementById('config-font').value,
            },
            // createdAt will be set only for new docs, or use lastUpdatedAt for updates
        };

        // Populate payment settings if it's a form
        if (type === 'form') {
            configDataPayload.paymentSettings = {
                check: {
                    enabled: document.getElementById('config-payment-check-enabled').checked,
                    payableTo: document.getElementById('config-payment-check-payableTo').value,
                    fullAmount: document.getElementById('config-payment-check-full-amount').value,
                    halfAmount: document.getElementById('config-payment-check-half-amount').value
                },
                card: {
                    enabled: document.getElementById('config-payment-card-enabled').checked,
                    fullKiddushPrice: document.getElementById('config-payment-card-fullPrice').value,
                    fullKiddushLink: document.getElementById('config-payment-card-fullLink').value,
                    halfKiddushPrice: document.getElementById('config-payment-card-halfPrice').value,
                    halfKiddushLink: document.getElementById('config-payment-card-halfLink').value
                },
                // misc: { enabled: false, title: '', instructions: '' } // Initialize if adding misc later
            };
        }

        const currentlyEditingId = editingConfigIdInput.value;

        try {
            if (currentlyEditingId) {
                // Update existing configuration
                configDataPayload.lastUpdatedAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection("configurations").doc(currentlyEditingId).update(configDataPayload);
                alert('Configuration updated successfully!');
            } else {
                // Create new configuration
                configDataPayload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection("configurations").add(configDataPayload);
                alert('Configuration created successfully!');
            }
            resetConfigForm();
            loadConfigurations();
        } catch (error) {
            console.error("Error saving configuration: ", error);
            alert('Error saving configuration.');
        }
    });
}

function resetConfigForm() {
    if (createConfigForm) createConfigForm.reset();
    if (editingConfigIdInput) editingConfigIdInput.value = ''; // Clear editing ID
    if (configTypeSelect) configTypeSelect.value = 'form'; // Default to form
    if (formPaymentOptionsDiv) formPaymentOptionsDiv.style.display = 'block'; // Show payment options for default 'form' type
    if (document.getElementById('config-notification-email')) document.getElementById('config-notification-email').value = '';
    if (configPaymentCheckEnabled) configPaymentCheckEnabled.checked = false;
    if (document.getElementById('config-payment-check-full-amount')) document.getElementById('config-payment-check-full-amount').value = '';
    if (document.getElementById('config-payment-check-half-amount')) document.getElementById('config-payment-check-half-amount').value = '';
    if (configCheckDetailsDiv) configCheckDetailsDiv.style.display = 'none';
    if (configPaymentCardEnabled) configPaymentCardEnabled.checked = false;
    if (configCardDetailsDiv) configCardDetailsDiv.style.display = 'none';
    // Reset display settings
    if (document.getElementById('config-color')) document.getElementById('config-color').value = '#007bff';
    if (document.getElementById('config-font')) document.getElementById('config-font').value = "'Helvetica Neue', Helvetica, Arial, sans-serif";

    if (createConfigForm) createConfigForm.querySelector('button[type="submit"]').textContent = 'Create Configuration';
    const formHeading = createConfigForm.querySelector('h3');
    if (formHeading) {
        formHeading.textContent = 'Create New Configuration';
    }
}

async function deleteConfiguration(configId) {
    if (confirm(`Are you sure you want to delete configuration ${configId}? This cannot be undone.`)) {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            alert("Authentication error. Please login again.");
            return;
        }
        try {
            const configDocRef = db.collection("configurations").doc(configId);
            const configDoc = await configDocRef.get();
            if (configDoc.exists && configDoc.data().userId === currentUser.uid) {
                await configDocRef.delete();
                loadConfigurations();
                alert('Configuration deleted.');
            } else {
                alert("Error: You do not have permission to delete this configuration or it does not exist.");
            }
        } catch (error) {
            console.error("Error deleting configuration: ", error); alert('Error deleting configuration.');
        }
    }
}

// Custom Schedulable Events Management
if (createCustomEventForm) {
    createCustomEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentUser = auth.currentUser;
        if (!currentUser) {
            alert("You must be logged in.");
            return;
        }

        const title = createCustomEventForm['custom-event-title'].value;
        const description = createCustomEventForm['custom-event-description'].value;
        const startDate = createCustomEventForm['custom-event-start-date'].value;
        const endDate = createCustomEventForm['custom-event-end-date'].value;
        const editingId = editingCustomEventIdInput.value;

        if (!title || !startDate || !endDate) {
            alert("Please provide a title, start date, and end date for the custom event.");
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            alert("Start date cannot be after end date.");
            return;
        }

        const eventData = {
            title,
            description,
            startDate,
            endDate,
            userId: currentUser.uid,
        };

        try {
            if (editingId) {
                eventData.lastUpdatedAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection("customSponsorables").doc(editingId).update(eventData);
                alert("Custom event updated successfully!");
            } else {
                eventData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection("customSponsorables").add(eventData);
                alert("Custom event created successfully!");
            }
            resetCustomEventForm();
            loadCustomEvents();
            populateAdminCustomEventSelector(); // Refresh dropdown for admin reservations
        } catch (error) {
            console.error("Error saving custom event:", error);
            alert("Error saving custom event.");
        }
    });
}

function resetCustomEventForm() {
    if (createCustomEventForm) createCustomEventForm.reset();
    if (editingCustomEventIdInput) editingCustomEventIdInput.value = '';
    const formHeading = createCustomEventForm.querySelector('h3'); // Assuming h3 for heading
    if (formHeading) formHeading.textContent = 'Create New Custom Event';
    createCustomEventForm.querySelector('button[type="submit"]').textContent = 'Create Event';
}

async function loadCustomEvents() {
    if (!customEventsListDiv) return;
    customEventsListDiv.innerHTML = '<div class="text-center">Loading custom events...</div>';
    const currentUser = auth.currentUser;
    if (!currentUser) {
        customEventsListDiv.innerHTML = '<div class="alert alert-warning">Please login to see custom events.</div>';
        return;
    }

    try {
        const snapshot = await db.collection("customSponsorables").where("userId", "==", currentUser.uid).orderBy("startDate", "desc").get();
        let html = '';
        if (snapshot.empty) {
            html = '<div class="alert alert-info">No custom events found. Create one above.</div>';
        } else {
            snapshot.forEach(doc => {
                const event = doc.data();
                html += `
                    <div class="panel panel-default custom-event-item">
                        <div class="panel-heading"><h4 class="panel-title">${event.title}</h4></div>
                        <div class="panel-body">
                            <p><strong>Dates:</strong> ${new Date(event.startDate + "T00:00:00Z").toLocaleDateString()} - ${new Date(event.endDate + "T00:00:00Z").toLocaleDateString()}</p>
                            ${event.description ? `<p><strong>Description:</strong> ${event.description}</p>` : ''}
                            <button class="btn btn-primary btn-xs" onclick='editCustomEventPrep("${doc.id}")'>Edit</button>
                            <button class="btn btn-danger btn-xs" style="margin-left: 5px;" onclick="deleteCustomEvent('${doc.id}')">Delete</button>
                        </div>
                    </div>`;
            });
        }
        customEventsListDiv.innerHTML = html;
    } catch (error) {
        console.error("Error loading custom events: ", error);
        customEventsListDiv.innerHTML = '<div class="alert alert-danger">Error loading custom events.</div>';
    }
}

async function editCustomEventPrep(eventId) {
    const docSnap = await db.collection("customSponsorables").doc(eventId).get();
    if (docSnap.exists) {
        const data = docSnap.data();
        createCustomEventForm['custom-event-title'].value = data.title;
        createCustomEventForm['custom-event-description'].value = data.description || '';
        createCustomEventForm['custom-event-start-date'].value = data.startDate;
        createCustomEventForm['custom-event-end-date'].value = data.endDate;
        editingCustomEventIdInput.value = eventId;
        createCustomEventForm.querySelector('h3').textContent = `Edit Custom Event: ${data.title}`;
        createCustomEventForm.querySelector('button[type="submit"]').textContent = 'Update Event';
        createCustomEventForm.scrollIntoView({ behavior: 'smooth' });
    }
}

async function deleteCustomEvent(eventId) {
    if (confirm("Are you sure you want to delete this custom event? This cannot be undone.")) {
        try {
            await db.collection("customSponsorables").doc(eventId).delete();
            alert("Custom event deleted.");
            loadCustomEvents();
            populateAdminCustomEventSelector(); // Refresh dropdown
        } catch (error) {
            console.error("Error deleting custom event:", error);
            alert("Error deleting custom event.");
        }
    }
}

// Admin Reserve Kiddush Functionality
async function populateAdminShabbosSelector() {
    if (!adminShabbosSelect) return;

    try {
        const allYearShabbosim = await getShabbosimForYear(); // From parsha-service.js
        let shabbosOptionsHTML = '<option value="">Select a Shabbos/Parsha</option>';
        if (allYearShabbosim.length > 0) {
            allYearShabbosim.forEach(shabbat => {
                const dateObj = new Date(shabbat.shabbatDate + "T00:00:00Z");
                const displayDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
                shabbosOptionsHTML += `<option value="${shabbat.shabbatDate}|${shabbat.parsha}">${shabbat.parsha} - ${displayDate}</option>`;
            });
        } else {
            shabbosOptionsHTML = '<option value="">Could not load Shabbos dates</option>';
        }
        adminShabbosSelect.innerHTML = shabbosOptionsHTML;
    } catch (error) {
        console.error("Error populating admin Shabbos selector:", error);
        adminShabbosSelect.innerHTML = '<option value="">Error loading dates</option>';
    }
}

async function populateAdminCustomEventSelector() {
    if (!adminCustomEventSelect) return;
    adminCustomEventSelect.innerHTML = '<option value="">Loading custom events...</option>';
    const currentUser = auth.currentUser;
    if (!currentUser) {
        adminCustomEventSelect.innerHTML = '<option value="">Login to see events</option>';
        return;
    }
    try {
        const today = new Date().toISOString().split('T')[0];
        const snapshot = await db.collection("customSponsorables")
            .where("userId", "==", currentUser.uid)
            .where("endDate", ">=", today) // Only show active or future events
            .orderBy("endDate").orderBy("startDate").get();
        let optionsHtml = '<option value="">Select a Custom Event</option>';
        snapshot.forEach(doc => {
            const event = doc.data();
            optionsHtml += `<option value="${doc.id}|${event.title}">${event.title} (${new Date(event.startDate + "T00:00:00Z").toLocaleDateString()} - ${new Date(event.endDate + "T00:00:00Z").toLocaleDateString()})</option>`;
        });
        adminCustomEventSelect.innerHTML = optionsHtml || '<option value="">No active custom events found</option>';
    } catch (error) {
        console.error("Error populating admin custom event selector:", error);
        adminCustomEventSelect.innerHTML = '<option value="">Error loading events</option>';
    }
}

if (adminShabbosSelect) {
    adminShabbosSelect.addEventListener('change', async function () {
        const selectedValue = this.value;
        if (selectedValue && adminSelectedShabbosInfoDiv && adminSelectedShabbosInfoPanel) {
            const [selectedDate, selectedParsha] = selectedValue.split('|');
            const shabbatDetail = await getShabbatInfoForDate(new Date(selectedDate + "T00:00:00Z"));
            adminSelectedShabbosInfoDiv.innerHTML = `<p><strong>Parsha:</strong> ${selectedParsha}</p><p><strong>Weekend of:</strong> ${shabbatDetail.weekendOf}</p>`;
            adminSelectedShabbosInfoPanel.style.display = 'block';
        } else if (adminSelectedShabbosInfoPanel) {
            adminSelectedShabbosInfoPanel.style.display = 'none';
        }
    });
}

if (adminReserveTypeSelect) {
    adminReserveTypeSelect.addEventListener('change', function () {
        if (this.value === 'shabbat') {
            if (adminShabbosSelectContainer) adminShabbosSelectContainer.style.display = 'block';
            if (adminCustomEventSelectContainer) adminCustomEventSelectContainer.style.display = 'none';
        } else if (this.value === 'custom') {
            if (adminShabbosSelectContainer) adminShabbosSelectContainer.style.display = 'none';
            if (adminCustomEventSelectContainer) adminCustomEventSelectContainer.style.display = 'block';
        } else {
            if (adminShabbosSelectContainer) adminShabbosSelectContainer.style.display = 'none';
            if (adminCustomEventSelectContainer) adminCustomEventSelectContainer.style.display = 'none';
        }
    });
    // Trigger change for initial state
    adminReserveTypeSelect.dispatchEvent(new Event('change'));
}

if (adminReserveKiddushForm) {
    adminReserveKiddushForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (adminReserveMessage) adminReserveMessage.textContent = 'Reserving...';

        const currentUser = auth.currentUser;
        if (!currentUser) {
            if (adminReserveMessage) adminReserveMessage.textContent = "Error: You must be logged in.";
            return;
        }

        const sponsorName = document.getElementById('admin-sponsor-name').value;
        const occasion = document.getElementById('admin-occasion').value;
        const contactEmail = document.getElementById('admin-contact-email').value;
        const reserveType = adminReserveTypeSelect.value;

        let sponsorshipDetails = {
            sponsorName, occasion, contactEmail,
            status: "approved", // Directly approved
            configOwnerId: currentUser.uid, // Associated with the admin user
            submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
            reservedByAdmin: true
        };

        if (reserveType === 'shabbat') {
            const selectedShabbosValue = adminShabbosSelect.value;
            if (!selectedShabbosValue) {
                if (adminReserveMessage) adminReserveMessage.textContent = "Error: Please select a Parsha/Shabbos.";
                return;
            }
            const [shabbatDate, parsha] = selectedShabbosValue.split('|');
            sponsorshipDetails.shabbatDate = shabbatDate;
            sponsorshipDetails.parsha = parsha;
            sponsorshipDetails.sponsorshipType = "shabbat";
        } else if (reserveType === 'custom') {
            const selectedCustomEventValue = adminCustomEventSelect.value;
            if (!selectedCustomEventValue) {
                if (adminReserveMessage) adminReserveMessage.textContent = "Error: Please select a Custom Event.";
                return;
            }
            const [customEventId, customEventTitle] = selectedCustomEventValue.split('|');
            sponsorshipDetails.customSponsorableId = customEventId;
            sponsorshipDetails.customSponsorableTitle = customEventTitle; // For context
            sponsorshipDetails.sponsorshipType = "custom";
        } else {
            if (adminReserveMessage) adminReserveMessage.textContent = "Error: Please select a reservation type.";
            return;
        }

        try {
            await db.collection("sponsorships").add(sponsorshipDetails);
            if (adminReserveMessage) adminReserveMessage.textContent = "Kiddush/Event reserved successfully!";
            adminReserveKiddushForm.reset();
            if (adminSelectedShabbosInfoPanel) adminSelectedShabbosInfoPanel.style.display = 'none';
            // Reset custom event selector and info panel if you add one
            if (adminCustomEventSelect) adminCustomEventSelect.value = '';
            if (adminReserveTypeSelect) adminReserveTypeSelect.value = ''; // Reset type selector
            adminReserveTypeSelect.dispatchEvent(new Event('change')); // Trigger hide/show
            // loadSponsorships(); // Sponsorships list will update via onSnapshot
        } catch (error) {
            console.error("Error reserving Kiddush by admin:", error);
            if (adminReserveMessage) adminReserveMessage.textContent = "Error reserving. Please try again.";
        }
    });
}

// Sponsorships Management
async function loadSponsorships() {
    if (pendingSponsorshipsListDiv) {
        pendingSponsorshipsListDiv.innerHTML = '<div class="alert alert-info">Loading pending sponsorships...</div>';
        const currentUser = auth.currentUser; // Define currentUser here
        if (!currentUser) {
            pendingSponsorshipsListDiv.innerHTML = '<div class="alert alert-warning">Please login to manage sponsorships.</div>';
            if (approvedSponsorshipsListDiv) approvedSponsorshipsListDiv.innerHTML = '<div class="alert alert-warning">Please login to manage sponsorships.</div>';
            return;
        }
        db.collection("sponsorships")
            .where("configOwnerId", "==", currentUser.uid)
            .where("status", "==", "pending")
            .orderBy("submittedAt", "desc")
            .onSnapshot(snapshot => {
                console.log('[PENDING] Total docs received:', snapshot.docs.length);
                console.log('[PENDING] Current user UID:', currentUser.uid);
                snapshot.docs.forEach((doc, index) => {
                    const data = doc.data();
                    console.log(`[PENDING] Doc ${index}:`, {
                        id: doc.id,
                        configOwnerId: data.configOwnerId,
                        status: data.status,
                        type: data.type,
                        sponsorshipType: data.sponsorshipType,
                        sponsorName: data.sponsorName
                    });
                });

                // Filter out person documents
                const filteredDocs = snapshot.docs.filter(doc => doc.data().type !== 'person');
                console.log('[PENDING] Filtered docs count:', filteredDocs.length);

                const filteredSnapshot = {
                    ...snapshot,
                    docs: filteredDocs,
                    empty: filteredDocs.length === 0,
                    forEach: (callback) => filteredDocs.forEach(callback)
                };
                renderSponsorships(filteredSnapshot, pendingSponsorshipsListDiv, true);
            }, error => {
                console.error("Error fetching pending sponsorships: ", error);
                pendingSponsorshipsListDiv.innerHTML = '<div class="alert alert-danger">Error loading pending sponsorships.</div>';
            });
    }

    if (approvedSponsorshipsListDiv) {
        approvedSponsorshipsListDiv.innerHTML = '<div class="alert alert-info">Loading approved sponsorships...</div>';
        const currentUser = auth.currentUser; // Also define currentUser here for this block
        if (!currentUser) {
            // This check might be redundant if the one above already returned, but good for safety
            approvedSponsorshipsListDiv.innerHTML = '<div class="alert alert-warning">Please login to manage sponsorships.</div>';
            return;
        }
        db.collection("sponsorships")
            .where("configOwnerId", "==", currentUser.uid)
            .where("status", "==", "approved")
            .orderBy("submittedAt", "desc") // Order by submission time; shabbatDate is not reliable for custom events
            .onSnapshot(snapshot => {
                // Filter out person documents
                const filteredDocs = snapshot.docs.filter(doc => doc.data().type !== 'person');
                const filteredSnapshot = {
                    ...snapshot,
                    docs: filteredDocs,
                    empty: filteredDocs.length === 0,
                    forEach: (callback) => filteredDocs.forEach(callback)
                };
                renderSponsorships(filteredSnapshot, approvedSponsorshipsListDiv, false);
            }, error => {
                console.error("Error fetching approved sponsorships: ", error);
                approvedSponsorshipsListDiv.innerHTML = '<div class="alert alert-danger">Error loading approved sponsorships.</div>';
            });
    }
}

function renderSponsorships(snapshot, container, isPending) {
    console.log(`[RENDER] Called for ${isPending ? 'PENDING' : 'APPROVED'} sponsorships`);
    console.log('[RENDER] Container exists:', !!container);
    console.log('[RENDER] Snapshot empty:', snapshot.empty);
    console.log('[RENDER] Docs count:', snapshot.docs?.length || 0);

    if (!container) return;

    if (snapshot.empty) {
        container.innerHTML = `<div class="alert alert-info">No ${isPending ? 'pending' : 'approved'} sponsorships found.</div>`;
        return;
    }

    let html = `
        <div class="table-responsive">
            <table class="table table-striped table-bordered sponsorship-table">
                <thead>
                    <tr>
                        <th>Sponsor Name</th>
                        <th>Occasion</th>
                        <th>For</th>
                        <th>Contact Email</th>
                        <th>Submitted Date</th>
                        ${isPending ? '<th>Status</th>' : ''}
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>`;


    snapshot.forEach(doc => {
        const s = doc.data();
        console.log('[RENDER] Processing doc:', doc.id, s);

        let itemTitle = '';
        if (s.sponsorshipType === 'custom' && s.customSponsorableTitle) {
            itemTitle = `Custom Event: ${s.customSponsorableTitle}`;
        } else {
            itemTitle = `Parsha: ${s.parsha}<br><small class="text-muted">Shabbat: ${s.shabbatDate}</small>`;
        }

        // Handle submittedAt - it could be a Firestore Timestamp or a string
        let submittedDate = 'N/A';
        if (s.submittedAt) {
            if (typeof s.submittedAt.toDate === 'function') {
                // It's a Firestore Timestamp
                submittedDate = s.submittedAt.toDate().toLocaleDateString();
            } else if (typeof s.submittedAt === 'string') {
                // It's an ISO string
                submittedDate = new Date(s.submittedAt).toLocaleDateString();
            }
        }

        html += `
            <tr>
                <td><strong>${s.sponsorName}</strong></td>
                <td>${s.occasion}</td>
                <td>${itemTitle}</td>
                <td>${s.contactEmail || '<em class="text-muted">N/A</em>'}</td>
                <td>${submittedDate}</td>
                ${isPending ? '<td><span class="label label-warning">Pending</span></td>' : ''}
                <td class="sponsorship-actions">
                    ${isPending ? `
                        <button class="btn btn-success btn-xs" onclick="updateSponsorshipStatus('${doc.id}', 'approved')" title="Approve">
                            <i class="glyphicon glyphicon-ok"></i> Approve
                        </button>
                     
                    ` : `
                        <span class="label label-success">Approved</span>
                        <button class="btn btn-primary btn-xs" onclick="editSponsorship('${doc.id}')" title="Edit" style="margin-left: 5px;">
                            <i class="glyphicon glyphicon-pencil"></i> Edit
                        </button>
                    `}
                    <button class="btn btn-danger btn-xs" onclick="deleteSponsorship('${doc.id}')" title="Delete">
                        <i class="glyphicon glyphicon-trash"></i> Delete
                    </button>
                </td>
            </tr>`;
    });

    html += `
                </tbody>
            </table>
        </div>`;

    console.log('[RENDER] Generated HTML length:', html.length);
    console.log('[RENDER] About to set innerHTML on container:', container.id);
    container.innerHTML = html;
    console.log('[RENDER] innerHTML set successfully');
}

async function updateSponsorshipStatus(sponsorshipId, newStatus) {
    if (!sponsorshipId || newStatus !== 'approved') return;
    try {
        await db.collection("sponsorships").doc(sponsorshipId).update({
            status: newStatus
        });
        alert('Sponsorship approved.');
        // Real-time listeners will refresh the lists automatically
    } catch (error) {
        console.error(`Error updating sponsorship ${sponsorshipId} to ${newStatus}: `, error);
        alert('Error updating sponsorship status.');
    }
}

async function deleteSponsorship(sponsorshipId) {
    if (confirm(`Are you sure you want to delete sponsorship ${sponsorshipId}? This cannot be undone.`)) {
        try {
            await db.collection("sponsorships").doc(sponsorshipId).delete();
            alert('Sponsorship deleted.');
            // Real-time listeners will refresh the lists automatically
        } catch (error) {
            console.error("Error deleting sponsorship: ", error);
            alert('Error deleting sponsorship.');
        }
    }
}

// Edit Sponsorship Functions
async function editSponsorship(sponsorshipId) {
    if (!sponsorshipId) return;

    try {
        const docRef = db.collection("sponsorships").doc(sponsorshipId);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            const sponsorshipData = docSnap.data();
            populateSponsorshipEditForm(sponsorshipId, sponsorshipData);
            $('#edit-sponsorship-modal').modal('show');
        } else {
            alert("Sponsorship not found.");
        }
    } catch (error) {
        console.error("Error fetching sponsorship for edit:", error);
        alert("Error loading sponsorship details.");
    }
}

function populateSponsorshipEditForm(sponsorshipId, sponsorshipData) {
    // Set the sponsorship ID in the hidden field
    document.getElementById('edit-sponsorship-id').value = sponsorshipId;

    // Populate the form fields with sponsorship data
    document.getElementById('edit-sponsor-name').value = sponsorshipData.sponsorName || '';
    document.getElementById('edit-occasion').value = sponsorshipData.occasion || '';
    document.getElementById('edit-contact-email').value = sponsorshipData.contactEmail || '';

    // Display sponsorship type
    const typeDisplay = document.getElementById('edit-sponsorship-type-display');
    const shabbatDetails = document.getElementById('edit-shabbat-details');
    const customEventDetails = document.getElementById('edit-custom-event-details');

    if (sponsorshipData.sponsorshipType === 'shabbat') {
        typeDisplay.textContent = 'Shabbat Kiddush';
        shabbatDetails.style.display = 'block';
        customEventDetails.style.display = 'none';

        // Populate Shabbat details
        document.getElementById('edit-shabbat-date').textContent = sponsorshipData.shabbatDate || 'N/A';
        document.getElementById('edit-parsha').textContent = sponsorshipData.parsha || 'N/A';
    } else if (sponsorshipData.sponsorshipType === 'custom') {
        typeDisplay.textContent = 'Custom Event';
        shabbatDetails.style.display = 'none';
        customEventDetails.style.display = 'block';

        // Populate custom event details
        document.getElementById('edit-custom-event-title').textContent = sponsorshipData.customSponsorableTitle || 'N/A';
    } else {
        typeDisplay.textContent = 'Unknown';
        shabbatDetails.style.display = 'none';
        customEventDetails.style.display = 'none';
    }
}

// Initialize the save button for the edit sponsorship modal
document.addEventListener('DOMContentLoaded', function () {
    const saveSponsorshipBtn = document.getElementById('save-sponsorship-btn');
    if (saveSponsorshipBtn) {
        saveSponsorshipBtn.addEventListener('click', saveSponsorshipChanges);
    }
});

async function saveSponsorshipChanges() {
    const sponsorshipId = document.getElementById('edit-sponsorship-id').value;
    if (!sponsorshipId) {
        alert('Error: Sponsorship ID not found.');
        return;
    }

    const updatedData = {
        sponsorName: document.getElementById('edit-sponsor-name').value,
        occasion: document.getElementById('edit-occasion').value,
        contactEmail: document.getElementById('edit-contact-email').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection("sponsorships").doc(sponsorshipId).update(updatedData);
        $('#edit-sponsorship-modal').modal('hide');
        alert('Sponsorship updated successfully.');
        // Real-time listeners will refresh the lists automatically
    } catch (error) {
        console.error("Error updating sponsorship:", error);
        alert('Error updating sponsorship. Please try again.');
    }
}

// People Management
let allPeople = []; // Store all people data for filtering
let filteredPeople = []; // Store currently filtered people for index references
let allSponsorships = []; // Store all sponsorships for people aggregation

function initializePeopleManagement() {
    // Initialize search and filter functionality
    if (peopleSearchInput) {
        peopleSearchInput.addEventListener('input', filterAndRenderPeople);
    }
    if (peopleFilterSelect) {
        peopleFilterSelect.addEventListener('change', filterAndRenderPeople);
    }

    // Initialize add person button
    if (addPersonBtn) {
        addPersonBtn.addEventListener('click', openAddPersonModal);
    }

    // Initialize modal event handlers
    const editPersonBtn = document.getElementById('edit-person-btn');
    const savePersonBtn = document.getElementById('save-person-btn');
    const saveNewPersonBtn = document.getElementById('save-new-person-btn');

    if (editPersonBtn) {
        editPersonBtn.addEventListener('click', openEditPersonModal);
    }

    if (savePersonBtn) {
        savePersonBtn.addEventListener('click', savePersonChanges);
    }

    if (saveNewPersonBtn) {
        saveNewPersonBtn.addEventListener('click', saveNewPerson);
    }
}

async function loadPeople() {
    if (!peopleListDiv) return;
    peopleListDiv.innerHTML = '<div class="alert alert-info">Loading people...</div>';

    const currentUser = auth.currentUser;
    if (!currentUser) {
        peopleListDiv.innerHTML = '<div class="alert alert-warning">Please login to manage people.</div>';
        return;
    }

    try {
        // Load all sponsorships for this admin user
        // Remove orderBy to avoid composite index requirement
        const sponsorshipsSnapshot = await db.collection("sponsorships")
            .where("configOwnerId", "==", currentUser.uid)
            .get();

        allSponsorships = [];
        sponsorshipsSnapshot.forEach(doc => {
            const data = doc.data();
            // Only include actual sponsorships, not person documents
            if (data.type !== 'person') {
                allSponsorships.push({ id: doc.id, ...data });
            }
        });

        // Sort sponsorships by submission date (newest first) on client side
        allSponsorships.sort((a, b) => {
            if (!a.submittedAt && !b.submittedAt) return 0;
            if (!a.submittedAt) return 1;
            if (!b.submittedAt) return -1;
            return b.submittedAt.toDate() - a.submittedAt.toDate();
        });

        // Aggregate people from sponsorships
        const peopleMap = new Map();

        allSponsorships.forEach(sponsorship => {
            const email = sponsorship.contactEmail?.toLowerCase().trim();
            const name = sponsorship.sponsorName?.trim();

            if (!email && !name) return; // Skip if no identifying information

            // Use email as primary key, fallback to name if no email
            const key = email || name.toLowerCase();

            if (!peopleMap.has(key)) {
                peopleMap.set(key, {
                    email: email || '',
                    name: name || 'Unknown',
                    phone: '',
                    notes: '',
                    sponsorships: [],
                    totalSponsorships: 0,
                    pendingSponsorships: 0,
                    approvedSponsorships: 0,
                    lastSponsorshipDate: null
                });
            }

            const person = peopleMap.get(key);
            person.sponsorships.push(sponsorship);
            person.totalSponsorships++;

            if (sponsorship.status === 'pending') {
                person.pendingSponsorships++;
            } else if (sponsorship.status === 'approved') {
                person.approvedSponsorships++;
            }

            // Update last sponsorship date
            if (sponsorship.submittedAt) {
                const sponsorshipDate = sponsorship.submittedAt.toDate();
                if (!person.lastSponsorshipDate || sponsorshipDate > person.lastSponsorshipDate) {
                    person.lastSponsorshipDate = sponsorshipDate;
                }
            }

            // Update name if current sponsorship has a name and stored person doesn't
            if (name && (!person.name || person.name === 'Unknown')) {
                person.name = name;
            }
        });

        // Load manually added people from sponsorships collection (stored with type: 'person')
        try {
            const peopleSnapshot = await db.collection("sponsorships")
                .where("configOwnerId", "==", currentUser.uid)
                .where("type", "==", "person")
                .get();

            peopleSnapshot.forEach(doc => {
                const personData = doc.data();
                const key = personData.email?.toLowerCase().trim() || personData.name?.toLowerCase().trim();

                if (key && peopleMap.has(key)) {
                    // Update existing person with additional data
                    const person = peopleMap.get(key);
                    person.phone = personData.phone || person.phone;
                    person.notes = personData.notes || person.notes;
                    person.personDocId = doc.id;
                    if (personData.email && !person.email) {
                        person.email = personData.email;
                    }
                } else if (key) {
                    // Add manually created person who has no sponsorships yet
                    peopleMap.set(key, {
                        email: personData.email || '',
                        name: personData.name || 'Unknown',
                        phone: personData.phone || '',
                        notes: personData.notes || '',
                        sponsorships: [],
                        totalSponsorships: 0,
                        pendingSponsorships: 0,
                        approvedSponsorships: 0,
                        lastSponsorshipDate: null,
                        personDocId: doc.id,
                        isManuallyAdded: true
                    });
                }
            });
        } catch (error) {
            console.log("People collection doesn't exist yet or error loading:", error);
        }

        allPeople = Array.from(peopleMap.values());
        filterAndRenderPeople();

    } catch (error) {
        console.error("Error loading people: ", error);
        peopleListDiv.innerHTML = '<div class="alert alert-danger">Error loading people.</div>';
    }
}

function filterAndRenderPeople() {
    if (!peopleListDiv) return;

    filteredPeople = [...allPeople];

    // Apply search filter
    const searchTerm = peopleSearchInput?.value.toLowerCase().trim() || '';
    if (searchTerm) {
        filteredPeople = filteredPeople.filter(person =>
            person.name.toLowerCase().includes(searchTerm) ||
            person.email.toLowerCase().includes(searchTerm)
        );
    }

    // Apply status filter
    const statusFilter = peopleFilterSelect?.value || 'all';
    if (statusFilter === 'active') {
        filteredPeople = filteredPeople.filter(person => person.approvedSponsorships > 0);
    } else if (statusFilter === 'pending') {
        filteredPeople = filteredPeople.filter(person => person.pendingSponsorships > 0);
    } else if (statusFilter === 'manual') {
        filteredPeople = filteredPeople.filter(person => person.isManuallyAdded && person.totalSponsorships === 0);
    }

    renderPeopleTable(filteredPeople);
}

function renderPeopleTable(people) {
    if (!peopleListDiv) return;

    if (people.length === 0) {
        peopleListDiv.innerHTML = '<div class="alert alert-info">No people found matching your criteria.</div>';
        return;
    }

    let html = `
        <div class="table-responsive">
            <table class="table table-striped table-bordered people-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Total Sponsorships</th>
                        <th>Pending</th>
                        <th>Approved</th>
                        <th>Last Sponsorship</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>`;

    people.forEach((person, index) => {
        const lastSponsorshipText = person.lastSponsorshipDate
            ? person.lastSponsorshipDate.toLocaleDateString()
            : 'Never';

        // Use index instead of name/email to avoid special character issues
        const personIndex = index;

        html += `
            <tr>
                <td><strong><a href="#" onclick="showPersonDetailsByIndex(${personIndex})" style="text-decoration: none;">${person.name}</a></strong></td>
                <td>${person.email || '<em class="text-muted">No email</em>'}</td>
                <td><span class="badge">${person.totalSponsorships}</span></td>
                <td><span class="badge badge-warning">${person.pendingSponsorships}</span></td>
                <td><span class="badge badge-success">${person.approvedSponsorships}</span></td>
                <td>${lastSponsorshipText}</td>
                <td class="people-actions">
                    <button class="btn btn-info btn-xs" onclick="showPersonDetailsByIndex(${personIndex})" title="View Details">
                        <i class="glyphicon glyphicon-eye-open"></i> View
                    </button>
                    <button class="btn btn-primary btn-xs" onclick="editPersonByIndex(${personIndex})" title="Edit">
                        <i class="glyphicon glyphicon-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger btn-xs" onclick="deletePersonByIndex(${personIndex})" title="Delete Person">
                        <i class="glyphicon glyphicon-trash"></i> Delete
                    </button>
                </td>
            </tr>`;
    });

    html += `
                </tbody>
            </table>
        </div>`;

    peopleListDiv.innerHTML = html;
}

// Helper functions using index to avoid special character issues
function showPersonDetailsByIndex(index) {
    const person = filteredPeople[index];
    if (!person) {
        alert('Person not found');
        return;
    }
    showPersonDetails(person);
}

function editPersonByIndex(index) {
    const person = filteredPeople[index];
    if (!person) {
        alert('Person not found');
        return;
    }
    editPerson(person);
}

function deletePersonByIndex(index) {
    const person = filteredPeople[index];
    if (!person) {
        alert('Person not found');
        return;
    }
    deletePerson(person);
}

function showPersonDetails(person) {

    let html = `
        <div class="row">
            <div class="col-md-6">
                <h4>Personal Information</h4>
                <p><strong>Name:</strong> ${person.name}</p>
                <p><strong>Email:</strong> ${person.email || '<em class="text-muted">Not provided</em>'}</p>
                <p><strong>Phone:</strong> ${person.phone || '<em class="text-muted">Not provided</em>'}</p>
                ${person.notes ? `<p><strong>Notes:</strong> ${person.notes}</p>` : ''}
            </div>
            <div class="col-md-6">
                <h4>Sponsorship Summary</h4>
                <p><strong>Total Sponsorships:</strong> ${person.totalSponsorships}</p>
                <p><strong>Approved:</strong> <span class="text-success">${person.approvedSponsorships}</span></p>
                <p><strong>Pending:</strong> <span class="text-warning">${person.pendingSponsorships}</span></p>
                <p><strong>Last Sponsorship:</strong> ${person.lastSponsorshipDate ? person.lastSponsorshipDate.toLocaleDateString() : 'Never'}</p>
            </div>
        </div>
        <hr>
        <h4>Sponsorship History</h4>`;

    if (person.sponsorships.length === 0) {
        html += '<p class="text-muted">No sponsorships found.</p>';
    } else {
        person.sponsorships.forEach(sponsorship => {
            let itemTitle = '';
            if (sponsorship.sponsorshipType === 'custom' && sponsorship.customSponsorableTitle) {
                itemTitle = `Custom Event: ${sponsorship.customSponsorableTitle}`;
            } else {
                itemTitle = `Parsha: ${sponsorship.parsha} (${sponsorship.shabbatDate})`;
            }

            const submittedDate = sponsorship.submittedAt ? sponsorship.submittedAt.toDate().toLocaleDateString() : 'Unknown';

            html += `
                <div class="sponsorship-history-item ${sponsorship.status}">
                    <div class="row">
                        <div class="col-md-8">
                            <h5>${sponsorship.occasion}</h5>
                            <p><strong>For:</strong> ${itemTitle}</p>
                            <p><strong>Submitted:</strong> ${submittedDate}</p>
                        </div>
                        <div class="col-md-4 text-right">
                            <span class="label label-${sponsorship.status === 'approved' ? 'success' : sponsorship.status === 'pending' ? 'warning' : 'danger'}">${sponsorship.status.toUpperCase()}</span>
                        </div>
                    </div>
                </div>`;
        });
    }

    document.getElementById('person-detail-content').innerHTML = html;
    document.getElementById('personDetailModalLabel').textContent = `${person.name} - Details`;

    // Store current person for editing
    window.currentPersonForEdit = person;

    $('#personDetailModal').modal('show');
}

function editPerson(person) {

    // Store current person for editing
    window.currentPersonForEdit = person;

    // Populate edit form
    document.getElementById('edit-person-email').value = person.email || '';
    document.getElementById('edit-person-name').value = person.name || '';
    document.getElementById('edit-person-email-field').value = person.email || '';
    document.getElementById('edit-person-phone').value = person.phone || '';
    document.getElementById('edit-person-notes').value = person.notes || '';

    document.getElementById('editPersonModalLabel').textContent = `Edit ${person.name}`;

    $('#editPersonModal').modal('show');
}

function openEditPersonModal() {
    if (window.currentPersonForEdit) {
        $('#personDetailModal').modal('hide');
        setTimeout(() => {
            editPerson(window.currentPersonForEdit);
        }, 300);
    }
}

async function savePersonChanges() {
    if (!window.currentPersonForEdit) {
        alert('No person selected for editing');
        return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
        alert('You must be logged in to save changes');
        return;
    }

    const person = window.currentPersonForEdit;
    const updatedData = {
        email: document.getElementById('edit-person-email-field').value.trim(),
        name: document.getElementById('edit-person-name').value.trim(),
        phone: document.getElementById('edit-person-phone').value.trim(),
        notes: document.getElementById('edit-person-notes').value.trim(),
        configOwnerId: currentUser.uid,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (!updatedData.name) {
        alert('Name is required');
        return;
    }

    try {
        // Save to sponsorships collection
        if (person.personDocId) {
            // Update existing document
            await db.collection("sponsorships").doc(person.personDocId).update(updatedData);
        } else {
            // Create new document
            const docRef = await db.collection("sponsorships").add({
                ...updatedData,
                type: 'person',
                status: 'manual',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            person.personDocId = docRef.id;
        }

        // Update local data
        person.name = updatedData.name;
        person.email = updatedData.email;
        person.phone = updatedData.phone;
        person.notes = updatedData.notes;

        $('#editPersonModal').modal('hide');
        alert('Person updated successfully!');

        // Refresh the people list
        filterAndRenderPeople();

    } catch (error) {
        console.error("Error saving person: ", error);
        alert('Error saving person. Please try again.');
    }
}

function openAddPersonModal() {
    // Clear the form
    document.getElementById('add-person-name').value = '';
    document.getElementById('add-person-email').value = '';
    document.getElementById('add-person-phone').value = '';
    document.getElementById('add-person-notes').value = '';

    $('#addPersonModal').modal('show');
}

async function saveNewPerson() {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        alert('You must be logged in to add a person');
        return;
    }

    const name = document.getElementById('add-person-name').value.trim();
    const email = document.getElementById('add-person-email').value.trim();
    const phone = document.getElementById('add-person-phone').value.trim();
    const notes = document.getElementById('add-person-notes').value.trim();

    if (!name) {
        alert('Name is required');
        return;
    }

    // Check if person already exists
    const existingPerson = allPeople.find(p =>
        (email && p.email && p.email.toLowerCase() === email.toLowerCase()) ||
        (p.name && p.name.toLowerCase() === name.toLowerCase())
    );

    if (existingPerson) {
        alert('A person with this name or email already exists');
        return;
    }

    const personData = {
        name,
        email,
        phone,
        notes,
        configOwnerId: currentUser.uid,
        userId: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        isManuallyAdded: true,
        type: 'person', // Special type to distinguish from sponsorships
        status: 'manual' // Use status field like sponsorships
    };

    try {
        // Store in sponsorships collection with special type to reuse existing permissions
        const docRef = await db.collection("sponsorships").add(personData);

        // Add to local data
        const newPerson = {
            email: email || '',
            name: name,
            phone: phone || '',
            notes: notes || '',
            sponsorships: [],
            totalSponsorships: 0,
            pendingSponsorships: 0,
            approvedSponsorships: 0,
            lastSponsorshipDate: null,
            personDocId: docRef.id,
            isManuallyAdded: true
        };

        allPeople.push(newPerson);

        $('#addPersonModal').modal('hide');
        alert('Person added successfully!');

        // Refresh the people list
        filterAndRenderPeople();

    } catch (error) {
        console.error("Error adding person: ", error);
        alert('Error adding person. Please try again.');
    }
}

async function deletePerson(person) {
    if (!person.personDocId) {
        alert('Cannot delete this person - no database record found');
        return;
    }

    const hasSponsorship = person.totalSponsorships > 0;
    let confirmMessage = `Are you sure you want to delete ${person.name}?`;

    if (hasSponsorship) {
        confirmMessage += `\n\nWarning: This person has ${person.totalSponsorships} sponsorship(s). Deleting them will not remove their sponsorships, but you will lose their contact information and notes.`;
    }

    if (!confirm(confirmMessage)) {
        return;
    }

    try {
        // Delete from sponsorships collection
        await db.collection("sponsorships").doc(person.personDocId).delete();

        // Remove from local data
        const index = allPeople.findIndex(p => p.personDocId === person.personDocId);
        if (index > -1) {
            allPeople.splice(index, 1);
        }

        alert('Person deleted successfully!');

        // Refresh the people list
        filterAndRenderPeople();

    } catch (error) {
        console.error("Error deleting person: ", error);
        alert('Error deleting person. Please try again.');
    }
}

// Initial load if user is already logged in (e.g. page refresh)
auth.onAuthStateChanged(user => {
    if (user && typeof loadAdminData === 'function') {
        loadAdminData();
    }
});