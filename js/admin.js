// js/admin.js

const configurationsListDiv = document.getElementById('configurations-list');
const createConfigForm = document.getElementById('create-config-form');
const pendingSponsorshipsListDiv = document.getElementById('pending-sponsorships-list');
const approvedSponsorshipsListDiv = document.getElementById('approved-sponsorships-list');

// Function to be called by auth.js after successful login
function loadAdminData() {
    loadConfigurations();
    loadSponsorships();
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
                const embedUrl = `${window.location.origin}/public-display.html?configId=${doc.id}`;
                html += `
                    <div class="panel panel-default config-item">
                        <div class="panel-heading"><h4 class="panel-title">${config.title} (Type: ${config.type})</h4></div>
                        <div class="panel-body">
                            <p><strong>ID:</strong> ${doc.id}</p>
                            <p><strong>Embed Code:</strong> <code class="embed-code">&lt;iframe src="${embedUrl}" width="100%" height="600px" style="border:1px solid #ccc;"&gt;&lt;/iframe&gt;</code></p>
                            <button class="btn btn-danger btn-xs" onclick="deleteConfiguration('${doc.id}')">Delete</button>
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

        try {
            await db.collection("configurations").add({ title, type, userId: currentUser.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            createConfigForm.reset();
            loadConfigurations();
            alert('Configuration created successfully!');
        } catch (error) {
            console.error("Error creating configuration: ", error); alert('Error creating configuration.');
        }
    });
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
