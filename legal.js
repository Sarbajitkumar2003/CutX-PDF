
/* =========================================
   CUTX PDF — LEGAL PAGES & COOKIE CONSENT
   File: legal.js
========================================= */

"use strict";

(() => {
    const CONSENT_KEY = "cutx_pdf_cookie_preferences_v1";

    const popup = document.getElementById("consentPopup");
    const viewer = document.getElementById("legalViewer");
    const title = document.getElementById("legalTitle");
    const content = document.getElementById("legalContent");

    const acceptAllBtn = document.getElementById("acceptAllCookies");
    const essentialBtn = document.getElementById("essentialOnly");
    const openSettingsBtn = document.getElementById("openCookieSettings");
    const settingsInViewer = document.getElementById("legalCookieSettings");
    const closeBtn = document.getElementById("closeLegal");
    const closeBottomBtn = document.getElementById("closeLegalBottom");
    const closeConsentBtn = document.getElementById("closeConsent");

    if (!popup || !viewer || !title || !content) {
        console.error(
            "CutX PDF: Legal UI elements are missing from index.html."
        );
        return;
    }

    /* -----------------------------------------
       POLICY CONTENT
       Ensure these policies match your actual
       business, services and data practices.
    ----------------------------------------- */

    const policies = {
        terms: {
            title: "Terms & Conditions",
            html: `
                <p>
                    Welcome to CutX PDF. By using this website, you agree
                    to these terms. If you do not agree, please stop using
                    the website.
                </p>

                <h3>1. Website services</h3>
                <p>
                    CutX PDF provides PDF-related tools and document
                    processing features. Available features may change,
                    become temporarily unavailable or be discontinued.
                </p>

                <h3>2. Acceptable use</h3>
                <p>
                    You must not use the website for unlawful activities,
                    infringe other people's rights, interfere with website
                    security or attempt to disrupt its operation.
                </p>

                <h3>3. Your documents</h3>
                <p>
                    You are responsible for having the rights and permission
                    needed to process any document you provide. Keep your
                    own backup of important files.
                </p>

                <h3>4. Accuracy and availability</h3>
                <p>
                    We aim to provide useful tools, but we cannot guarantee
                    that every feature will always be available or every
                    output will be error-free. Check processed files before
                    relying on them.
                </p>

                <h3>5. Third-party services</h3>
                <p>
                    The website may use third-party libraries or services.
                    Those services may have their own terms and privacy
                    practices.
                </p>

                <h3>6. Intellectual property</h3>
                <p>
                    Website branding, design and original content may be
                    protected by applicable intellectual-property laws.
                    Do not copy or reuse protected content without permission.
                </p>

                <h3>7. Liability</h3>
                <p>
                    To the extent permitted by applicable law, CutX PDF
                    is not responsible for indirect losses arising from
                    website use. Nothing in these terms excludes rights
                    or liabilities that cannot legally be excluded.
                </p>

                <h3>8. Changes</h3>
                <p>
                    These terms may be updated as the website develops.
                    Updates will be handled in accordance with applicable
                    law and any required notice or consent.
                </p>

                <h3>9. Contact</h3>
                <p>
                    For questions about these terms, use the contact
                    details published on the CutX PDF website.
                </p>
            `
        },

        privacy: {
            title: "Privacy Policy",
            html: `
                <p>
                    This policy explains how CutX PDF may handle information
                    when you visit or use the website. It should be reviewed
                    before launch to ensure it accurately describes the
                    actual technical setup.
                </p>

                <h3>1. Information you provide</h3>
                <p>
                    If you contact us, we may receive information you choose
                    to send, such as your email address and message. Avoid
                    sending sensitive personal information unless necessary.
                </p>

                <h3>2. PDF documents</h3>
                <p>
                    Processing depends on the tool being used. Some tools
                    process files in your browser; other features or future
                    integrations may send information to a server or a
                    third-party service. Review each tool's implementation
                    before uploading confidential documents.
                </p>

                <h3>3. Technical information</h3>
                <p>
                    Hosting providers and security systems may process
                    technical information such as IP addresses, browser
                    details, request logs and security events. Analytics
                    tools, if enabled, may collect additional usage data.
                </p>

                <h3>4. Cookies and local storage</h3>
                <p>
                    The website uses browser local storage to remember
                    cookie preferences. Cookies or similar technologies
                    may also be used for analytics or advertising if those
                    features are implemented and enabled. See our Cookie
                    Policy for more information.
                </p>

                <h3>5. Third-party providers</h3>
                <p>
                    Website hosting, fonts, document-processing libraries,
                    analytics and advertising providers may process data
                    according to their own practices. The published policy
                    should identify the providers actually in use.
                </p>

                <h3>6. Data sharing and retention</h3>
                <p>
                    Information may be processed by service providers when
                    needed to operate, secure or support the website, or
                    where required by law. Retention depends on the type
                    of information and the service involved.
                </p>

                <h3>7. Your choices and rights</h3>
                <p>
                    Depending on applicable law, you may have rights to
                    access, correct, delete or otherwise manage personal
                    information. You can change saved cookie preferences
                    through Cookie Settings.
                </p>

                <h3>8. Children's privacy</h3>
                <p>
                    The website is not intended to collect personal
                    information from children in violation of applicable law.
                </p>

                <h3>9. Policy updates</h3>
                <p>
                    This policy may be updated when services or legal
                    obligations change. Publish an accurate last-revised
                    date with the final policy.
                </p>

                <h3>10. Contact</h3>
                <p>
                    For privacy requests, use the contact details published
                    on CutX PDF. Add a working privacy contact method before
                    launching the website.
                </p>
            `
        },

        cookies: {
            title: "Cookie Policy",
            html: `
                <p>
                    This policy explains cookies and similar technologies
                    that may be used by CutX PDF. The final policy must
                    match the technologies actually enabled on the website.
                </p>

                <h3>1. What are cookies?</h3>
                <p>
                    Cookies are small pieces of information stored by a
                    website in your browser. Similar technologies can store
                    preferences or help measure website usage.
                </p>

                <h3>2. Essential storage</h3>
                <p>
                    CutX PDF uses browser local storage to remember the
                    cookie preference selected by the visitor. This
                    preference record does not itself prove that optional
                    analytics or advertising technologies are blocked.
                </p>

                <h3>3. Analytics cookies</h3>
                <p>
                    If analytics are enabled, they may help measure visits
                    and understand how people use the website. Identify
                    the actual provider and its practices in this policy.
                </p>

                <h3>4. Advertising cookies</h3>
                <p>
                    If advertising is enabled, advertising providers may
                    use cookies or similar technologies to deliver or
                    measure advertisements, subject to applicable settings
                    and consent requirements.
                </p>

                <h3>5. Managing preferences</h3>
                <p>
                    Use Cookie Settings to change the preference saved by
                    this website. Browser settings may also allow you to
                    delete or restrict cookies. Blocking some technologies
                    may affect website features.
                </p>

                <h3>6. Important technical note</h3>
                <p>
                    Choosing "Essential only" saves that choice in the
                    browser. It does not automatically block other scripts.
                    Analytics and advertising integrations must be configured
                    separately to respect the saved preference.
                </p>

                <h3>7. Contact</h3>
                <p>
                    For questions about cookies, use the contact details
                    published on CutX PDF.
                </p>
            `
        }
    };

    /* -----------------------------------------
       STORAGE
    ----------------------------------------- */

    function readPreferences() {
        try {
            const raw = localStorage.getItem(CONSENT_KEY);

            if (!raw) return null;

            const preferences = JSON.parse(raw);

            if (
                !preferences ||
                typeof preferences !== "object" ||
                !["all", "essential"].includes(preferences.choice)
            ) {
                return null;
            }

            return preferences;
        } catch (error) {
            console.warn(
                "CutX PDF: Could not read cookie preferences.",
                error
            );

            return null;
        }
    }

    function savePreferences(mode) {
        const preferences = {
            necessary: true,
            analytics: mode === "all",
            advertising: mode === "all",
            choice: mode,
            updatedAt: new Date().toISOString()
        };

        try {
            localStorage.setItem(
                CONSENT_KEY,
                JSON.stringify(preferences)
            );
        } catch (error) {
            console.warn(
                "CutX PDF: Could not save cookie preferences.",
                error
            );

            showStorageWarning();
            return;
        }

        hidePopup();
        hideViewer();

        document.dispatchEvent(
            new CustomEvent("cutxpdf:consentchange", {
                detail: { ...preferences }
            })
        );
    }

    function showStorageWarning() {
        alert(
            "Your cookie preference could not be saved. " +
            "Please check your browser's storage settings and try again."
        );
    }

    /* -----------------------------------------
       POPUP / POLICY VIEWER
    ----------------------------------------- */

    function showPopup() {
        hideViewer();

        popup.hidden = false;
        document.body.style.overflow = "hidden";

        acceptAllBtn?.focus();
    }

    function hidePopup() {
        popup.hidden = true;

        if (viewer.hidden) {
            document.body.style.overflow = "";
        }
    }

    function openPolicy(policyKey) {
        const policy = policies[policyKey];

        if (!policy) return;

        hidePopup();

        title.textContent = policy.title;

        // Policy HTML is static and authored in this file.
        content.innerHTML = policy.html;

        viewer.hidden = false;
        document.body.style.overflow = "hidden";

        closeBtn?.focus();
    }

    function hideViewer() {
        viewer.hidden = true;

        if (popup.hidden) {
            document.body.style.overflow = "";
        }
    }

    function closePolicy() {
        hideViewer();

        if (!readPreferences()) {
            showPopup();
        } else {
            document.body.style.overflow = "";
        }
    }

    function openCookieSettings() {
        showPopup();
    }

    /* -----------------------------------------
       BUTTON EVENTS
    ----------------------------------------- */

    closeConsentBtn?.addEventListener("click", () => {
        // Closing the notice does not save or imply consent.
        hidePopup();
    });

    acceptAllBtn?.addEventListener("click", () => {
        savePreferences("all");
    });

    essentialBtn?.addEventListener("click", () => {
        savePreferences("essential");
    });

    openSettingsBtn?.addEventListener(
        "click",
        openCookieSettings
    );

    settingsInViewer?.addEventListener(
        "click",
        openCookieSettings
    );

    closeBtn?.addEventListener("click", closePolicy);
    closeBottomBtn?.addEventListener("click", closePolicy);

    document.querySelectorAll("[data-legal]").forEach(button => {
        button.addEventListener("click", () => {
            openPolicy(button.dataset.legal);
        });
    });

    /* Close policy when clicking its backdrop. */

    viewer.addEventListener("click", event => {
        if (event.target === viewer) {
            closePolicy();
        }
    });

    /* Keyboard support. */

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            if (!viewer.hidden) {
                closePolicy();
            } else if (!popup.hidden) {
                hidePopup();
            }
        }
    });

    /* -----------------------------------------
       FIRST VISIT
    ----------------------------------------- */

    if (!readPreferences()) {
        showPopup();
    }

    /* -----------------------------------------
       PUBLIC API
       Example:
       window.CutXPDF.openCookieSettings()
    ----------------------------------------- */

    window.CutXPDF = window.CutXPDF || {};

    window.CutXPDF.openCookieSettings = openCookieSettings;
    window.CutXPDF.getCookiePreferences = readPreferences;

})();
