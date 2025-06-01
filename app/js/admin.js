// js/admin.js

const configurationsListDiv = document.getElementById('configurations-list');
const createConfigForm = document.getElementById('create-config-form');
const pendingSponsorshipsListDiv = document.getElementById('pending-sponsorships-list');
const approvedSponsorshipsListDiv = document.getElementById('approved-sponsorships-list');
const adminReserveKiddushForm = document.getElementById('admin-reserve-kiddush-form');
const adminShabbosSelect = document.getElementById('admin-shabbos-select');
const adminSelectedShabbosInfoDiv = document.getElementById('admin-selected-shabbos-info');
const adminSelectedShabbosInfoPanel = document.getElementById('admin-selected-shabbos-info-panel');

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
    populateAdminShabbosSelector(); // Populate the Parsha selector for admin reservation
    loadSponsorships();
    resetConfigForm(); // Ensure form is in create mode initially
}

if (configTypeSelect) {
    configTypeSelect.addEventListener('change', function() {
        if (this.value === 'form') {
            formPaymentOptionsDiv.style.display = 'block';
        } else {
            formPaymentOptionsDiv.style.display = 'none';
        }
    });
}
if(configPaymentCheckEnabled){
    configPaymentCheckEnabled.addEventListener('change', function() {
        const displayStyle = this.checked ? 'block' : 'none';
        if(configCheckDetailsDiv) configCheckDetailsDiv.style.display = displayStyle;
        if(configCheckAmountsDiv) configCheckAmountsDiv.style.display = displayStyle;

    });
}
if(configPaymentCardEnabled){
    configPaymentCardEnabled.addEventListener('change', function() {
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
                html += `
                    <div class="panel panel-default config-item">
                        <div class="panel-heading"><h4 class="panel-title">${config.title} (Type: ${config.type})</h4></div>
                        <div class="panel-body">
                            <p><strong>ID:</strong> ${doc.id}</p>
                            <p><strong>Direct Link:</strong> <a href="${embedUrl}" target="_blank" rel="noopener noreferrer">${embedUrl}</a></p>
                            <p><strong>Embed Code:</strong> <code class="embed-code">&lt;iframe src="${embedUrl}" width="100%" height="600px" style="border:1px solid #ccc;"&gt;&lt;/iframe&gt;</code></p>                            
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

if (adminShabbosSelect) {
    adminShabbosSelect.addEventListener('change', async function() {
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

if (adminReserveKiddushForm) {
    adminReserveKiddushForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const adminReserveMessage = document.getElementById('admin-reserve-message');
        adminReserveMessage.textContent = 'Reserving...';

        const currentUser = auth.currentUser;
        if (!currentUser) {
            adminReserveMessage.textContent = "Error: You must be logged in.";
            return;
        }

        const selectedShabbosValue = adminShabbosSelect.value;
        if (!selectedShabbosValue) {
            adminReserveMessage.textContent = "Error: Please select a Parsha/Shabbos.";
            return;
        }
        const [shabbatDate, parsha] = selectedShabbosValue.split('|');
        const sponsorName = document.getElementById('admin-sponsor-name').value;
        const occasion = document.getElementById('admin-occasion').value;
        const contactEmail = document.getElementById('admin-contact-email').value;

        try {
            await db.collection("sponsorships").add({
                sponsorName, occasion, contactEmail, shabbatDate, parsha,
                status: "approved", // Directly approved
                configOwnerId: currentUser.uid, // Associated with the admin user
                submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                reservedByAdmin: true // Optional flag
            });
            adminReserveMessage.textContent = "Kiddush reserved successfully!";
            adminReserveKiddushForm.reset();
            if(adminSelectedShabbosInfoPanel) adminSelectedShabbosInfoPanel.style.display = 'none';
            // loadSponsorships(); // Sponsorships list will update via onSnapshot
        } catch (error) {
            console.error("Error reserving Kiddush by admin:", error);
            adminReserveMessage.textContent = "Error reserving Kiddush. Please try again.";
        }
    });
}

// Sponsorships Management
async function loadSponsorships() {
    if (pendingSponsorshipsListDiv) {
        pendingSponsorshipsListDiv.innerHTML = '<div class="list-group-item">Loading pending sponsorships...</div>';
        const currentUser = auth.currentUser; // Define currentUser here
        if (!currentUser) {
            pendingSponsorshipsListDiv.innerHTML = '<div class="list-group-item alert alert-warning">Please login to manage sponsorships.</div>';
            if (approvedSponsorshipsListDiv) approvedSponsorshipsListDiv.innerHTML = '<div class="list-group-item alert alert-warning">Please login to manage sponsorships.</div>';
            return;
        }
        db.collection("sponsorships").where("status", "==", "pending").orderBy("submittedAt", "desc")
            .where("configOwnerId", "==", currentUser.uid)
            .onSnapshot(snapshot => {
                renderSponsorships(snapshot, pendingSponsorshipsListDiv, true);
            }, error => {
                console.error("Error fetching pending sponsorships: ", error);
                pendingSponsorshipsListDiv.innerHTML = '<div class="list-group-item list-group-item-danger">Error loading pending sponsorships.</div>';
            });
    }

    if (approvedSponsorshipsListDiv) {
        approvedSponsorshipsListDiv.innerHTML = '<div class="list-group-item">Loading approved sponsorships...</div>';
        const currentUser = auth.currentUser; // Also define currentUser here for this block
        if (!currentUser) {
            // This check might be redundant if the one above already returned, but good for safety
            approvedSponsorshipsListDiv.innerHTML = '<div class="list-group-item alert alert-warning">Please login to manage sponsorships.</div>';
            return;
        }
        db.collection("sponsorships").where("status", "==", "approved").orderBy("shabbatDate", "desc")
            .where("configOwnerId", "==", currentUser.uid)
            .onSnapshot(snapshot => {
                renderSponsorships(snapshot, approvedSponsorshipsListDiv, false);
            }, error => {
                console.error("Error fetching approved sponsorships: ", error);
                approvedSponsorshipsListDiv.innerHTML = '<div class="list-group-item list-group-item-danger">Error loading approved sponsorships.</div>';
            });
    }
}

function renderSponsorships(snapshot, container, isPending) {
    if (!container) return;
    if (snapshot.empty) {
        container.innerHTML = `<div class="list-group-item">No ${isPending ? 'pending' : 'approved'} sponsorships.</div>`;
        return;
    }
    let html = '';
    snapshot.forEach(doc => {
        const s = doc.data();
        const submittedDate = s.submittedAt ? s.submittedAt.toDate().toLocaleDateString() : 'N/A';
        html += ` <a href="#" class="list-group-item sponsorship-item">
                    <h4 class="list-group-item-heading">Sponsor: ${s.sponsorName}</h4>
                    <p class="list-group-item-text"><strong>Occasion:</strong> ${s.occasion}</p>
                    <p class="list-group-item-text"><strong>Parsha:</strong> ${s.parsha} (Shabbat: ${s.shabbatDate})</p>
                    <p class="list-group-item-text"><strong>Contact:</strong> ${s.contactEmail || 'N/A'}</p>
                    <p class="list-group-item-text"><strong>Submitted:</strong> ${submittedDate}</p>
                    <div style="margin-top: 10px;">
                        ${isPending ? `
                            <button class="btn btn-success btn-xs" onclick="updateSponsorshipStatus('${doc.id}', 'approved')">Approve</button>
                            <button class="btn btn-warning btn-xs" onclick="updateSponsorshipStatus('${doc.id}', 'rejected')">Reject</button>
                        ` : `<span class="label label-success">Approved</span>`}
                        <button class="btn btn-danger btn-xs" style="margin-left: 5px;" onclick="deleteSponsorship('${doc.id}')">Delete</button>
                    </div>
                </a>`;
    });
    container.innerHTML = html;
}

async function updateSponsorshipStatus(sponsorshipId, newStatus) {
    if (!sponsorshipId || !newStatus) return;
    try {
        await db.collection("sponsorships").doc(sponsorshipId).update({
            status: newStatus
        });
        alert(`Sponsorship ${newStatus}.`);
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

// Initial load if user is already logged in (e.g. page refresh)
auth.onAuthStateChanged(user => {
    if (user && typeof loadAdminData === 'function') {
        loadAdminData();
    }
});
