document.addEventListener('DOMContentLoaded', async () => {
    const settings = JSON.parse(localStorage.getItem('shulsign_settings')) || {};
    
    if (!settings.configId) {
        window.location.href = 'setup.html';
        return;
    }

    try {
        // 1. Fetch the main configuration from Firestore
        const configDoc = await db.collection("configurations").doc(settings.configId).get();
        if (!configDoc.exists) {
            alert("Error: Configuration ID not found. Please check your setup.");
            window.location.href = 'setup.html';
            return;
        }
        const configData = configDoc.data();

        // 2. Set the UI name and apply design
        document.getElementById('shul-name').textContent = configData.title || "Synagogue Display";
        if (settings.announcementText) {
            document.getElementById('ticker-text').textContent = settings.announcementText;
        }

        applyDesignSettings(settings);
        applyLayout(settings);

        // 3. Initialize background processes
        setInterval(updateClock, 1000);
        fetchZmanim(settings.zipCode || '10001');
        
        // Use the userId from the configuration to load the sponsorships
        loadSignageData(configData.userId, settings.rotationSpeed || 12, settings);

    } catch (error) {
        console.error("Initialization error:", error);
    }
});

function applyDesignSettings(s) {
    const style = document.getElementById('dynamic-design');
    const accent = s.accentColor || '#f39c12';
    const font = s.fontFamily || "'Helvetica Neue', Helvetica, Arial, sans-serif";

    // Dynamically load Google Font if selected
    if (s.fontFamily && !s.fontFamily.includes(',')) {
        const fontName = s.fontFamily.replace(/\s+/g, '+');
        if (!document.getElementById('google-font-link')) {
            const link = document.createElement('link');
            link.id = 'google-font-link';
            link.rel = 'stylesheet';
            link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;700&display=swap`;
            document.head.appendChild(link);
        }
    }

    style.innerHTML = `
        body { background-color: ${s.bgColor} !important; font-family: "${font}", sans-serif !important; }
        .signage-header { border-bottom-color: ${accent} !important; }
        .zman-time, .panel-heading, #shul-name { color: ${accent} !important; }
        #live-clock { font-size: ${s.clockSize || 4}em; }
        .zmanim-panel .panel-body { font-size: ${s.zmanimSize || 1.8}em; }
        .events-panel .panel-body { font-size: ${s.eventsSize || 2.5}em; }
        ${s.sidebarImage ? `.zmanim-panel::after { content: ""; display: block; height: 200px; background: url('${s.sidebarImage}') no-repeat center; background-size: contain; margin-top: 20px; }` : ''}
    `;
}

function applyLayout(s) {
    const container = document.getElementById('main-row');
    const layoutType = s.layout;
    
    if (layoutType === 'flipped') container.style.flexDirection = 'row-reverse';
    if (layoutType === 'vertical') container.style.flexDirection = 'column';

    // Widget Visibility
    if (s.showClock === false) document.querySelector('.signage-header').style.display = 'none';
    if (s.showZmanim === false) {
        const zCol = document.getElementById('zmanim-col');
        if (zCol) zCol.style.display = 'none';
        const eCol = document.getElementById('events-col');
        if (eCol) eCol.className = 'col-xs-12';
    }
    if (s.showTicker === false) document.querySelector('.signage-footer').style.display = 'none';
}

function updateClock() {
    const now = new Date();
    document.getElementById('live-clock').textContent = now.toLocaleTimeString();
}

async function fetchZmanim(location) {
    // Hebcal Zmanim API
    const url = `https://www.hebcal.com/zmanim?cfg=json&zip=${location}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        const times = data.times;
        
        const list = document.getElementById('zmanim-list');
        const relevant = [
            { label: 'Alot HaShachar', key: 'alotHaShachar' },
            { label: 'Sunrise', key: 'sunrise' },
            { label: 'Sof Zman Krias Shema', key: 'sofZmanShma' },
            { label: 'Sof Zman Tefillah', key: 'sofZmanTfilla' },
            { label: 'Chatzot', key: 'chatzot' },
            { label: 'Mincha Gedola', key: 'minchaGedola' },
            { label: 'Sunset', key: 'sunset' }
        ];

        list.innerHTML = relevant.map(z => {
            const time = new Date(times[z.key]);
            if (z.key === 'sunrise' && data.location) {
                // Populate Hebrew Date while we have the data
                document.getElementById('hebrew-date').textContent = data.location.hebdate || "";
            }
            return `<div class="zman-item">
                <span>${z.label}</span>
                <span class="zman-time">${time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>`;
        }).join('');

        if (data.location) {
            // Optionally fetch Hebrew Date here as well
        }
    } catch (e) {
        console.error("Zmanim error", e);
    }
}

async function loadSignageData(userId, speedInSeconds, settings) {
    const display = document.getElementById('event-display');
    console.log("Fetching sponsorships for owner ID:", userId);
    
    const displayMode = settings.displayMode || 'cycle-all';

    const renderAnnouncement = () => {
        display.innerHTML = `
            <div class="event-item text-center">
                <h2 style="font-size: 1.2em; color: #3498db;">${settings.customAnnouncementTitle || 'Welcome'}</h2>
                <hr>
                <p>${settings.customAnnouncementText || 'Visit our website to sponsor a Kiddush or event!'}</p>
                ${settings.mainImage ? `<img src="${settings.mainImage}" style="max-width: 100%; max-height: 250px; margin-top: 20px; border-radius: 8px;">` : ''}
            </div>`;
    };

    if (displayMode === 'information-only') {
        renderAnnouncement();
        return;
    }

    try {
        // Fetch approved sponsorships for this owner
        const snapshot = await db.collection("sponsorships")
            .where("configOwnerId", "==", userId)
            .where("status", "==", "approved")
            .get();

        let items = [];
        snapshot.forEach(doc => items.push(doc.data()));
        console.log("Found sponsorships count:", items.length);

        // Filter for upcoming dates (simple client side filter for display)
        const today = new Date().toISOString().split('T')[0];
        const upcoming = items.filter(i => !i.shabbatDate || i.shabbatDate >= today);
        console.log("Upcoming sponsorships after filter:", upcoming.length);

        // Build rotation deck based on mode
        let deck = [];
        upcoming.forEach(item => deck.push({ type: 'sponsorship', data: item }));
        
        if (displayMode === 'cycle-all' || deck.length === 0) {
            deck.push({ type: 'announcement' });
        }

        if (deck.length === 1) {
            const slide = deck[0];
            if (slide.type === 'announcement') renderAnnouncement();
            else {
                const item = slide.data;
                let title = item.parsha ? `Parshat ${item.parsha}` : (item.customSponsorableTitle || "Special Event");
                display.innerHTML = `
                    <div class="event-item text-center">
                        <h2 style="font-size: 1.5em; color: #3498db;">${title}</h2>
                        <hr>
                        <p>Sponsored by:</p>
                        <div class="sponsor-name">${item.sponsorName}</div>
                        ${item.occasion ? `<div class="occasion-text">"${item.occasion}"</div>` : ''}
                    </div>`;
            }
            return;
        }

        let currentIndex = 0;
        
        const rotateContent = () => {
            const currentSlide = deck[currentIndex];
            if (currentSlide.type === 'announcement') {
                renderAnnouncement();
            } else {
                const item = currentSlide.data;
                let title = item.parsha ? `Parshat ${item.parsha}` : (item.customSponsorableTitle || "Special Event");
                display.innerHTML = `
                    <div class="event-item text-center">
                        <h2 style="font-size: 1.5em; color: #3498db;">${title}</h2>
                        <hr>
                        <p>Sponsored by:</p>
                        <div class="sponsor-name">${item.sponsorName}</div>
                        ${item.occasion ? `<div class="occasion-text">"${item.occasion}"</div>` : ''}
                    </div>`;
            }

            currentIndex = (currentIndex + 1) % deck.length;
        };

        rotateContent();
        setInterval(rotateContent, speedInSeconds * 1000); 

    } catch (error) {
        console.error("Firestore Error:", error);
        if (error.code === 'failed-precondition') {
            display.innerHTML = "<div class='alert alert-danger' style='font-size:0.5em'>Error: Firestore Index Required. Please check the browser console for the link.</div>";
        } else {
            display.innerHTML = "<div class='alert alert-danger' style='font-size:0.5em'>Error loading sponsorships: " + error.message + "</div>";
        }
    }
}