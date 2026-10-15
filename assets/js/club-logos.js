document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("clubs-container");
  const JSON_URL =
    "https://raw.githubusercontent.com/cmitiiser/mailmedia/main/ClubLogos/index.json";

  const COPY_ICON = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>`;

  const CHECK_ICON = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>`;

  const DOWNLOAD_ICON = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>`;

  try {
    const res = await fetch(`${JSON_URL}?t=${Date.now()}`);
    if (!res.ok) throw new Error("Could not load club logos directory.");
    const clubs = await res.json();

    if (!clubs.length) {
      container.innerHTML = '<p class="brand-loading">No club logos found.</p>';
      return;
    }

    container.innerHTML = clubs
      .map((club) => {
        const allAssets = [];
        Object.entries(club.formats || {}).forEach(([fmt, items]) => {
          items.forEach((item) => {
            allAssets.push({
              ...item,
              format: fmt,
            });
          });
        });

        if (!allAssets.length) return "";

        const assetCards = allAssets
          .map((asset) => {
            const hasSize = asset.size && asset.format.toLowerCase() !== "svg";
            const labelText = hasSize
              ? `${asset.format.toUpperCase()} · ${asset.size}`
              : asset.format.toUpperCase();

            return `
              <article class="asset-card">
                <div class="asset-stage">
                  <img src="${asset.url}" alt="${club.name} ${asset.variant}" loading="lazy" />
                </div>
                <div class="asset-meta">
                  <span class="asset-format">${labelText}</span>
                  <div class="asset-actions">
                    <button type="button" class="asset-action-btn btn-copy" data-url="${asset.url}" title="Copy raw link" aria-label="Copy raw link">
                      ${COPY_ICON}
                    </button>
                    <a href="${asset.url}" download="${asset.filename}" class="asset-action-btn" title="Download file" aria-label="Download file" target="_blank" rel="noopener">
                      ${DOWNLOAD_ICON}
                    </a>
                  </div>
                </div>
              </article>
            `;
          })
          .join("");

        return `
          <section class="club-group">
            <header class="club-head">
              <h2>${club.name}</h2>
            </header>
            <div class="club-grid">
              ${assetCards}
            </div>
          </section>
        `;
      })
      .join("");

    container.querySelectorAll(".btn-copy").forEach((btn) => {
      btn.addEventListener("click", () => {
        navigator.clipboard.writeText(btn.dataset.url);
        btn.innerHTML = CHECK_ICON;
        setTimeout(() => {
          btn.innerHTML = COPY_ICON;
        }, 1400);
      });
    });
  } catch (err) {
    container.innerHTML = `<p class="brand-loading error">${err.message}</p>`;
  }
});