document.addEventListener('DOMContentLoaded', async () => {
    const loadingMsg = document.getElementById('loading-message');
    const contentDiv = document.getElementById('confirmation-content');
    const errorMsg = document.getElementById('error-message');
    
    // Get ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const sponsorshipId = urlParams.get('id');

    if (!sponsorshipId) {
        showError("No sponsorship ID provided in the URL.");
        return;
    }

    try {
        if (typeof db === 'undefined') {
            showError("System error: Database connection not initialized.");
            return;
        }

        // Fetch Sponsorship
        const docRef = db.collection("sponsorships").doc(sponsorshipId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            showError("Sponsorship record not found.");
            return;
        }

        const data = docSnap.data();
        
        // Fetch Configuration to get styles and payment settings
        // We assume the user has a "form" config which holds global payment settings
        let configData = {};
        try {
            const configSnap = await db.collection("configurations")
                .where("userId", "==", data.configOwnerId)
                .where("type", "==", "form")
                .limit(1)
                .get();
            
            if (!configSnap.empty) {
                configData = configSnap.docs[0].data();
            }
        } catch (err) {
            console.warn("Could not fetch configuration details:", err);
        }

        renderDetails(data, configData);
        
        loadingMsg.style.display = 'none';
        contentDiv.style.display = 'block';

    } catch (error) {
        console.error("Error loading confirmation page:", error);
        showError("An error occurred while loading the details.");
    }

    function showError(msg) {
        loadingMsg.style.display = 'none';
        contentDiv.style.display = 'none';
        errorMsg.textContent = msg;
        errorMsg.style.display = 'block';
    }

    function renderDetails(sponsorship, config) {
        // Basic Details
        document.getElementById('detail-name').textContent = sponsorship.sponsorName;
        document.getElementById('detail-occasion').textContent = sponsorship.occasion;
        
        let eventText = '';
        if (sponsorship.sponsorshipType === 'custom') {
            eventText = sponsorship.customSponsorableTitle || 'Custom Event';
        } else {
            eventText = `Parsha ${sponsorship.parsha || ''} (${sponsorship.shabbatDate || ''})`;
        }
        document.getElementById('detail-event').textContent = eventText;

        let typeText = sponsorship.kiddushType === 'half' ? 'Half Sponsorship' : 'Full Sponsorship';
        if (!sponsorship.kiddushType) typeText = 'Standard Sponsorship';
        document.getElementById('detail-type').textContent = typeText;

        // Status
        const statusEl = document.getElementById('sponsorship-status');
        const statusAlert = document.getElementById('status-alert');
        const status = sponsorship.status || 'pending';
        
        statusEl.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        
        if (status === 'approved') {
            statusAlert.className = 'alert alert-success';
            statusAlert.innerHTML = '<strong>Status: Approved</strong> - Thank you for your support!';
        } else if (status === 'pending') {
            statusAlert.className = 'alert alert-warning';
            statusAlert.innerHTML = '<strong>Status: Pending</strong> - This sponsorship is awaiting review.';
        } else {
            statusAlert.className = 'alert alert-info';
        }

        // Contact Email Footer
        document.getElementById('contact-email-display').textContent = config.notificationEmail || 'the office';

        // Setup Invoice PDF Data
        setupInvoice(sponsorship, config, eventText);

        // Payment Section Logic
        const paymentSection = document.getElementById('payment-section');
        const paymentContent = document.getElementById('payment-content');
        const paymentSettings = config.paymentSettings;
        
        if (paymentSettings) {
            let paymentHtml = '';
            const kType = sponsorship.kiddushType; // 'full' or 'half'
            
            // Check Payment Info
            if (paymentSettings.check && paymentSettings.check.enabled) {
                 let amount = kType === 'half' ? paymentSettings.check.halfAmount : paymentSettings.check.fullAmount;
                 paymentHtml += `
                    <div class="row" style="margin-bottom: 15px;">
                        <div class="col-xs-12">
                            <p><strong>To Pay by Check:</strong></p>
                            <ul class="list-unstyled" style="padding-left: 10px;">
                                <li>Make payable to: <strong>${paymentSettings.check.payableTo || 'Congregation'}</strong></li>
                                ${amount ? `<li>Amount: <strong>$${amount}</strong></li>` : ''}
                            </ul>
                        </div>
                    </div>`;
            }

            // Card Payment Info
            if (paymentSettings.card && paymentSettings.card.enabled) {
                let link = kType === 'half' ? paymentSettings.card.halfKiddushLink : paymentSettings.card.fullKiddushLink;
                let price = kType === 'half' ? paymentSettings.card.halfKiddushPrice : paymentSettings.card.fullKiddushPrice;

                if (link) {
                    paymentHtml += `
                        <div class="row">
                            <div class="col-xs-12">
                                <p><strong>To Pay by Credit Card:</strong></p>
                                <p>
                                    <a href="${link}" target="_blank" class="btn btn-success">Pay ${price ? '$'+price : 'Securely'} Online</a>
                                </p>
                            </div>
                        </div>`;
                }
            }

            if (paymentHtml) {
                paymentContent.innerHTML = paymentHtml;
                paymentSection.style.display = 'block';
            }
        }
    }

    function setupInvoice(sponsorship, config, eventText) {
        const btn = document.getElementById('download-invoice-btn');
        
        // Populate Invoice Fields
        document.getElementById('inv-org-name').textContent = config.title || 'Kiddush Sponsorship';
        document.getElementById('inv-org-email').textContent = config.notificationEmail || '';
        
        const subDate = sponsorship.submittedAt ? (sponsorship.submittedAt.toDate ? sponsorship.submittedAt.toDate() : new Date(sponsorship.submittedAt)) : new Date();
        document.getElementById('inv-date').textContent = subDate.toLocaleDateString();
        document.getElementById('inv-number').textContent = sponsorshipId.substring(0, 8).toUpperCase();
        
        document.getElementById('inv-sponsor-name').textContent = sponsorship.sponsorName;
        document.getElementById('inv-sponsor-email').textContent = sponsorship.contactEmail;

        // Determine Price
        let price = '0.00';
        let currency = '$';
        const kType = sponsorship.kiddushType;
        
        if (config.paymentSettings) {
             if (config.paymentSettings.card && config.paymentSettings.card.enabled) {
                 if (kType === 'half') price = config.paymentSettings.card.halfKiddushPrice || price;
                 else price = config.paymentSettings.card.fullKiddushPrice || price;
             } else if (config.paymentSettings.check && config.paymentSettings.check.enabled) {
                 if (kType === 'half') price = config.paymentSettings.check.halfAmount || price;
                 else price = config.paymentSettings.check.fullAmount || price;
             }
        }

        let typeDesc = kType === 'half' ? 'Half Sponsorship' : (kType === 'full' ? 'Full Sponsorship' : 'Sponsorship');
        const description = `${typeDesc} for ${eventText}\nOccasion: ${sponsorship.occasion}`;
        
        document.getElementById('inv-description').innerHTML = description.replace(/\n/g, '<br>');
        document.getElementById('inv-amount').textContent = currency + price;
        document.getElementById('inv-total').textContent = currency + price;

        const statusUpper = (sponsorship.status || 'pending').toUpperCase();
        document.getElementById('inv-status-note').textContent = `STATUS: ${statusUpper}`;

        // Button Action
        btn.addEventListener('click', () => {
            const element = document.getElementById('invoice-element');
            const opt = {
                margin:       0.5,
                filename:     `invoice-${sponsorshipId.substring(0, 8)}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2 },
                jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
            };
            html2pdf().set(opt).from(element).save();
        });

        // Auto-download if mode is invoice
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('mode') === 'invoice') {
            setTimeout(() => btn.click(), 1000);
        }
    }
});