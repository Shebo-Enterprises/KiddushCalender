// js/design.js
// Powers app/design.html: lets an admin pick a page template and add optional
// custom content (header banner, announcement bar, footer message) to a
// calendar/form configuration, with a live preview of the public page.

// Display names + a sensible default background per theme (used to prefill
// the background color picker and for the "Use theme default" reset button).
const THEME_INFO = {
    classic: { name: 'Classic', defaultBg: '#ffffff' },
    cards: { name: 'Modern Cards', defaultBg: '#ffffff' },
    minimal: { name: 'Minimal Clean', defaultBg: '#ffffff' },
    elegant: { name: 'Elegant', defaultBg: '#fdfbf6' },
    dark: { name: 'Dark Mode', defaultBg: '#12141c' },
    neubrutalist: { name: 'Neubrutalist', defaultBg: '#fef9e7' },
    pastel: { name: 'Soft Pastel', defaultBg: '#f2eefb' },
    glass: { name: 'Glass', defaultBg: '#4b6cb7' },
    material: { name: 'Material (Hand-crafted)', defaultBg: '#fafafa' },
    sunset: { name: 'Sunset', defaultBg: '#ff9966' },
    nature: { name: 'Nature', defaultBg: '#eef3ea' },
    // Real CDN frameworks. bs5 fully restyles our markup natively; the other
    // three load their real CDN asset plus a compatibility skin (see
    // css/templates.css) since their class systems don't target ours.
    bs5: { name: 'Bootstrap 5', defaultBg: '#ffffff' },
    materialize: { name: 'Materialize', defaultBg: '#fafafa' },
    semantic: { name: 'Semantic UI', defaultBg: '#ffffff' },
    tailwind: { name: 'Tailwind', defaultBg: '#f9fafb' },
    // Bootswatch CDN skins — background color has no effect on these (the CDN
    // stylesheet owns the palette), so defaultBg here is only cosmetic.
    'bw-cerulean': { name: 'Cerulean', defaultBg: '#ffffff' },
    'bw-cosmo': { name: 'Cosmo', defaultBg: '#ffffff' },
    'bw-cyborg': { name: 'Cyborg', defaultBg: '#060606' },
    'bw-darkly': { name: 'Darkly', defaultBg: '#222222' },
    'bw-flatly': { name: 'Flatly', defaultBg: '#ffffff' },
    'bw-journal': { name: 'Journal', defaultBg: '#ffffff' },
    'bw-lumen': { name: 'Lumen', defaultBg: '#f8f8f8' },
    'bw-paper': { name: 'Material Design (Paper)', defaultBg: '#ffffff' },
    'bw-readable': { name: 'Readable', defaultBg: '#ffffff' },
    'bw-sandstone': { name: 'Sandstone', defaultBg: '#f8f5f0' },
    'bw-simplex': { name: 'Simplex', defaultBg: '#ffffff' },
    'bw-slate': { name: 'Slate', defaultBg: '#272b30' },
    'bw-spacelab': { name: 'Spacelab', defaultBg: '#ffffff' },
    'bw-superhero': { name: 'Superhero', defaultBg: '#2b3e50' },
    'bw-united': { name: 'United', defaultBg: '#ffffff' },
    'bw-yeti': { name: 'Yeti', defaultBg: '#ffffff' }
};

document.addEventListener('DOMContentLoaded', () => {
    const loadingMessage = document.getElementById('loading-message');
    const authRequiredMessage = document.getElementById('auth-required-message');
    const designerContent = document.getElementById('designer-content');

    const configTitleDisplay = document.getElementById('config-title-display');
    const configTypeDisplay = document.getElementById('config-type-display');
    const viewLiveLink = document.getElementById('view-live-link');

    const templateGallery = document.getElementById('template-gallery');
    const moreThemesGallery = document.getElementById('more-themes-gallery');
    const selectedTemplateIdInput = document.getElementById('selected-template-id');
    const selectedThemeNameEl = document.getElementById('selected-theme-name');

    const designColorInput = document.getElementById('design-color');
    const designBgColorInput = document.getElementById('design-bg-color');
    const resetBgColorBtn = document.getElementById('reset-bg-color-btn');
    const designFontInput = document.getElementById('design-font');
    let bgColorTouched = false;

    const headerEnabledInput = document.getElementById('header-enabled');
    const headerFields = document.getElementById('header-fields');
    const headerImageUrlInput = document.getElementById('header-image-url');
    const headerTaglineInput = document.getElementById('header-tagline');

    const announcementEnabledInput = document.getElementById('announcement-enabled');
    const announcementFields = document.getElementById('announcement-fields');
    const announcementTextInput = document.getElementById('announcement-text');

    const footerEnabledInput = document.getElementById('footer-enabled');
    const footerFields = document.getElementById('footer-fields');
    const footerTextInput = document.getElementById('footer-text');

    const saveDesignBtn = document.getElementById('save-design-btn');
    const saveStatus = document.getElementById('save-status');
    const previewFrame = document.getElementById('preview-frame');
    const refreshPreviewBtn = document.getElementById('refresh-preview-btn');

    const urlParams = new URLSearchParams(window.location.search);
    const configId = urlParams.get('id');

    let configDocRef = null;
    let configData = null;

    function toggleFieldset(checkbox, fieldsEl) {
        fieldsEl.classList.toggle('hidden', !checkbox.checked);
    }
    headerEnabledInput.addEventListener('change', () => toggleFieldset(headerEnabledInput, headerFields));
    announcementEnabledInput.addEventListener('change', () => toggleFieldset(announcementEnabledInput, announcementFields));
    footerEnabledInput.addEventListener('change', () => toggleFieldset(footerEnabledInput, footerFields));

function selectTemplate(templateId) {
        selectedTemplateIdInput.value = templateId;
        [templateGallery, moreThemesGallery].forEach(gallery => {
            gallery.querySelectorAll('.template-card[data-template-id]').forEach(c => {
                c.classList.toggle('selected', c.getAttribute('data-template-id') === templateId);
            });
        });
        const info = THEME_INFO[templateId] || { name: templateId, defaultBg: '#ffffff' };
        selectedThemeNameEl.textContent = info.name;
        if (!bgColorTouched) {
            designBgColorInput.value = info.defaultBg;
        }
    }

    function handleGalleryClick(e) {
        const card = e.target.closest('.template-card[data-template-id]');
        if (!card) return;
        selectTemplate(card.getAttribute('data-template-id'));
        // If the click came from inside the "More Themes" modal, close it.
        const modal = card.closest('#moreThemesModal');
        if (modal && window.jQuery) {
            window.jQuery(modal).modal('hide');
        }
    }
    templateGallery.addEventListener('click', handleGalleryClick);
    moreThemesGallery.addEventListener('click', handleGalleryClick);

    designBgColorInput.addEventListener('input', () => { bgColorTouched = true; });
    resetBgColorBtn.addEventListener('click', () => {
        bgColorTouched = false;
        const info = THEME_INFO[selectedTemplateIdInput.value] || { defaultBg: '#ffffff' };
        designBgColorInput.value = info.defaultBg;
    });

    function refreshPreview() {
        if (!configId) return;
        previewFrame.src = `public-display.html?configId=${configId}&t=${Date.now()}`;
    }
    refreshPreviewBtn.addEventListener('click', refreshPreview);

    function populateForm(data) {
        configTitleDisplay.textContent = data.title || '(untitled)';
        configTypeDisplay.textContent = data.type ? `(${data.type})` : '';
        viewLiveLink.href = `public-display.html?configId=${configId}`;

        const ds = data.displaySettings || {};
        designColorInput.value = ds.color || '#007bff';
        designFontInput.value = ds.font || "'Helvetica Neue', Helvetica, Arial, sans-serif";

        const ts = data.templateSettings || {};
        const templateId = ts.templateId || 'classic';
        bgColorTouched = !!ts.bgColor;
        selectTemplate(templateId);
        if (ts.bgColor) {
            designBgColorInput.value = ts.bgColor;
        }

        headerEnabledInput.checked = !!ts.headerEnabled;
        headerImageUrlInput.value = ts.headerImageUrl || '';
        headerTaglineInput.value = ts.headerTagline || '';
        toggleFieldset(headerEnabledInput, headerFields);

        announcementEnabledInput.checked = !!ts.announcementEnabled;
        announcementTextInput.value = ts.announcementText || '';
        toggleFieldset(announcementEnabledInput, announcementFields);

        footerEnabledInput.checked = !!ts.footerEnabled;
        footerTextInput.value = ts.footerText || '';
        toggleFieldset(footerEnabledInput, footerFields);

        refreshPreview();
    }

    async function loadConfig(user) {
        if (!configId) {
            loadingMessage.innerHTML = '<div class="alert alert-danger">No configuration ID was provided in the URL.</div>';
            return;
        }
        try {
            configDocRef = db.collection('configurations').doc(configId);
            const docSnap = await configDocRef.get();
            if (!docSnap.exists) {
                loadingMessage.innerHTML = '<div class="alert alert-danger">Configuration not found.</div>';
                return;
            }
            configData = docSnap.data();
            if (configData.userId !== user.uid) {
                loadingMessage.innerHTML = '<div class="alert alert-danger">You do not have permission to design this page.</div>';
                return;
            }
            populateForm(configData);
            loadingMessage.classList.add('hidden');
            designerContent.classList.remove('hidden');
        } catch (error) {
            console.error('Error loading configuration for design:', error);
            loadingMessage.innerHTML = '<div class="alert alert-danger">Error loading configuration.</div>';
        }
    }

    saveDesignBtn.addEventListener('click', async () => {
        if (!configDocRef) return;
        saveDesignBtn.disabled = true;
        saveStatus.textContent = 'Saving...';
        saveStatus.className = 'text-muted';

        const templateSettings = {
            templateId: selectedTemplateIdInput.value || 'classic',
            bgColor: bgColorTouched ? designBgColorInput.value : '',
            headerEnabled: headerEnabledInput.checked,
            headerImageUrl: headerImageUrlInput.value.trim(),
            headerTagline: headerTaglineInput.value.trim(),
            announcementEnabled: announcementEnabledInput.checked,
            announcementText: announcementTextInput.value.trim(),
            footerEnabled: footerEnabledInput.checked,
            footerText: footerTextInput.value.trim()
        };

        const displaySettings = {
            color: designColorInput.value,
            font: designFontInput.value
        };

        try {
            await configDocRef.update({
                templateSettings,
                displaySettings,
                lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            saveStatus.textContent = 'Saved!';
            saveStatus.className = 'text-success';
            refreshPreview();
        } catch (error) {
            console.error('Error saving design settings:', error);
            saveStatus.textContent = 'Error saving changes.';
            saveStatus.className = 'text-danger';
        } finally {
            saveDesignBtn.disabled = false;
            setTimeout(() => { saveStatus.textContent = ''; }, 4000);
        }
    });

    auth.onAuthStateChanged(user => {
        if (user) {
            authRequiredMessage.classList.add('hidden');
            loadConfig(user);
        } else {
            loadingMessage.classList.add('hidden');
            designerContent.classList.add('hidden');
            authRequiredMessage.classList.remove('hidden');
        }
    });
});
