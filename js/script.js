<script>
  /* ==============================================================
     19. SMALL HELPERS AND SHARED SETTINGS
     ============================================================== */

  // Short helper for finding an element by its ID.
  const byId = (id) => document.getElementById(id);

  // Text shown when an item has no description yet.
  const PLACEHOLDER_DESCRIPTION = "No description has been added yet.";

  // The emoji used when an item does not have an image.
  const CATEGORY_EMOJI = {
    Hat: "🧢",
    Plushie: "🧸",
    "T-Shirt": "👕",
    Hoodie: "🥋",
    Poster: "🖼️",
    Collectible: "⭐",
    Keychain: "🔑",
    Sticker: "🏷️",
    Other: "📦",
  };

  // The current state of the site: menu, filters, and opened item.
  let mobileNavOpen = false;
  let currentTypeFilter = "all";
  let currentGameFilter = "all";
  let currentItemId = null;

  // Turn a name into a safe URL fragment such as "gta-shirt-gta-v".
  function slugify(text) {
    return (
      String(text)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "item"
    );
  }

  // Prevent catalogue text from being interpreted as HTML.
  function escapeHTML(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character],
    );
  }

  // Only allow normal HTTP or HTTPS links to be opened.
  function safeExternalUrl(value) {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  // Give every raw item a complete, predictable set of fields.
  function normaliseItem(item = {}, fallbackId = "") {
    return {
      id: String(item.id || fallbackId || "item"),
      name: item.name || "Untitled catalogue item",
      game: item.game || "Rockstar Games",
      category: item.category || "Other",
      description: item.description || "",
      year: item.year || "Not specified",
      rarity: item.rarity || "Not specified",
      availability: item.availability || "Not specified",
      image: item.image || "",
      extraImages: Array.isArray(item.extraImages)
        ? item.extraImages.filter(Boolean)
        : typeof item.extraImages === "string" && item.extraImages.trim()
        ? item.extraImages.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      link: item.link || "",
    };
  }

  // Add a unique ID to every item, even if two items have the same name.
  function getItems() {
    if (typeof ITEMS === "undefined" || !Array.isArray(ITEMS)) {
      return [];
    }
    const usedIds = {};

    return ITEMS.map((rawItem) => {
      let id = slugify(`${rawItem.name}-${rawItem.game}`);
      usedIds[id] = (usedIds[id] || 0) + 1;

      if (usedIds[id] > 1) {
        id = `${id}-${usedIds[id]}`;
      }

      return normaliseItem(rawItem, id);
    });
  }

  // HTML used when an item's image is missing or fails to load.
  function placeholderImageMarkup(
    category,
    label = "Image coming soon",
    hidden = false,
  ) {
    return `
      <div class="image-placeholder" ${hidden ? "hidden" : ""}>
        <span class="placeholder-icon">${CATEGORY_EMOJI[category] || "★"}</span>
        <span class="placeholder-label">${label}</span>
      </div>
    `;
  }

  // Create image HTML plus a fallback placeholder for broken image links.
  function imageMarkup(source, altText, category, eager = false) {
    if (!source) {
      return placeholderImageMarkup(category);
    }

    return `
      <img
        src="${escapeHTML(source)}"
        alt="${escapeHTML(altText)}"
        loading="${eager ? "eager" : "lazy"}"
        decoding="async"
        referrerpolicy="no-referrer"
        onerror="this.hidden = true; this.nextElementSibling.hidden = false;"
      />
      ${placeholderImageMarkup(category, "Image coming soon", true)}
    `;
  }

  /* ==============================================================
     20. NAVIGATION
     ============================================================== */

  // Open or close the mobile navigation drawer.
  function toggleMobileNav() {
    mobileNavOpen = !mobileNavOpen;
    byId("mobileNav")?.classList.toggle("open", mobileNavOpen);
    byId("hamburger")?.classList.toggle("open", mobileNavOpen);
    byId("hamburger")?.setAttribute("aria-expanded", String(mobileNavOpen));
  }

  // Close the mobile menu after selecting a page.
  function goToMobilePage(pageName) {
    showPage(pageName);
    if (mobileNavOpen) {
      toggleMobileNav();
    }
  }

  // Show one page and mark its navigation button as active.
  function showPage(pageName) {
    document.querySelectorAll(".page").forEach((page) => {
      page.classList.toggle("active", page.id === `page-${pageName}`);
    });

    document.querySelectorAll(".nav-link, .mobile-nav-link").forEach((link) => {
      link.classList.remove("active");
    });

    byId(`nav-${pageName}`)?.classList.add("active");
    byId(`mnav-${pageName}`)?.classList.add("active");
    window.scrollTo(0, 0);

    if (pageName === "catalogue") {
      renderCatalogue();
    }

    if (pageName === "home") {
      renderHome();
    }

    // Keep the browser address linked to the visible page.
    if (pageName !== "item") {
      const newHash = pageName === "home" ? "" : `#${pageName}`;
      history.replaceState(null, "", `${location.pathname}${newHash}`);
    }
  }

  /* ==============================================================
     21. HOME PAGE RENDERING
     ============================================================== */

  // Fill the home page's numbers and latest-items grid.
  function renderHome() {
    const items = getItems();
    const uniqueGames = new Set(items.map((item) => item.game).filter(Boolean));
    const uniqueCats = new Set(items.map((item) => item.category).filter(Boolean));
    const latestItems = [...items].reverse().slice(0, 4);

    if (byId("homeStatItems")) byId("homeStatItems").textContent = items.length;
    if (byId("homeStatGames")) byId("homeStatGames").textContent = uniqueGames.size;
    if (byId("homeStatCats")) byId("homeStatCats").textContent = uniqueCats.size || 0;
    if (byId("itemCount")) {
      byId("itemCount").textContent = `${items.length} item${
        items.length === 1 ? "" : "s"
      }`;
    }
    if (byId("homeGrid")) {
      byId("homeGrid").innerHTML = latestItems.map(cardHTML).join("");
    }
  }

  // Build one catalogue card.
  function cardHTML(rawItem) {
    const item = normaliseItem(rawItem);

    return `
      <article class="merch-card">
        <a class="card-image" href="#item/${item.id}" aria-label="View ${escapeHTML(
          item.name,
        )}">
          ${imageMarkup(item.image, item.name, item.category)}
        </a>
        <a class="card-body" href="#item/${item.id}">
          <div class="card-game">${escapeHTML(item.game)}</div>
          <div class="card-name">${escapeHTML(item.name)}</div>
          <div class="card-description">
            ${escapeHTML(item.description || PLACEHOLDER_DESCRIPTION)}
          </div>
          <div class="card-footer">
            <span class="card-category">${escapeHTML(item.category)}</span>
          </div>
        </a>
      </article>
    `;
  }

  /* ==============================================================
     22. CATALOGUE FILTERING AND SEARCH
     ============================================================== */

  // Change the selected item-type filter.
  function setTypeFilter(value, clickedButton) {
    currentTypeFilter = value;
    document
      .querySelectorAll("#typeFilterBar .filter-pill")
      .forEach((button) => button.classList.remove("active"));
    clickedButton?.classList.add("active");
    renderCatalogue();
  }

  // Change the selected game filter.
  function setGameFilter(value, clickedButton) {
    currentGameFilter = value;
    document
      .querySelectorAll("#gameFilterBar .filter-pill")
      .forEach((button) => button.classList.remove("active"));
    clickedButton?.classList.add("active");
    renderCatalogue();
  }

  // Create one type filter button for each category in the catalogue data.
  function populateTypeFilters(items) {
    const filterBar = byId("typeFilterBar");
    if (!filterBar) return;
    const types = [...new Set(items.map((item) => item.category).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b),
    );

    if (!types.includes(currentTypeFilter)) {
      currentTypeFilter = "all";
    }

    filterBar
      .querySelectorAll('[data-generated-type-filter="true"]')
      .forEach((button) => button.remove());

    types.forEach((type) => {
      const button = document.createElement("button");
      button.className = `filter-pill${
        currentTypeFilter === type ? " active" : ""
      }`;
      button.dataset.generatedTypeFilter = "true";
      button.textContent = type;
      button.onclick = () => setTypeFilter(type, button);
      filterBar.appendChild(button);
    });

    filterBar
      .querySelector(".filter-pill")
      ?.classList.toggle("active", currentTypeFilter === "all");
  }

  // Create one game filter button for each game in the catalogue data.
  function populateGameFilters(items) {
    const filterBar = byId("gameFilterBar");
    if (!filterBar) return;
    const games = [...new Set(items.map((item) => item.game).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b),
    );

    if (!games.includes(currentGameFilter)) {
      currentGameFilter = "all";
    }

    filterBar
      .querySelectorAll('[data-generated-game-filter="true"]')
      .forEach((button) => button.remove());

    games.forEach((game) => {
      const button = document.createElement("button");
      button.className = `filter-pill${
        currentGameFilter === game ? " active" : ""
      }`;
      button.dataset.generatedGameFilter = "true";
      button.textContent = game;
      button.onclick = () => setGameFilter(game, button);
      filterBar.appendChild(button);
    });

    filterBar
      .querySelector(".filter-pill")
      ?.classList.toggle("active", currentGameFilter === "all");
  }

  // Render cards that match the current filters and search text.
  function renderCatalogue() {
    const catalogueEl = byId("catalogue");
    if (!catalogueEl) return;

    const items = getItems();
    const searchInput = byId("searchInput");
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";

    populateTypeFilters(items);
    populateGameFilters(items);
    
    if (byId("itemCount")) {
      byId("itemCount").textContent = `${items.length} item${
        items.length === 1 ? "" : "s"
      }`;
    }

    const filteredItems = items.filter((item) => {
      const matchesType =
        currentTypeFilter === "all" || item.category === currentTypeFilter;
      const matchesGame =
        currentGameFilter === "all" || item.game === currentGameFilter;
      const searchableText = [
        item.name,
        item.game,
        item.category,
        item.description,
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch = !searchTerm || searchableText.includes(searchTerm);

      return matchesType && matchesGame && matchesSearch;
    });

    if (filteredItems.length === 0) {
      catalogueEl.innerHTML = `
        <div class="empty-state">
          <span class="big-star">★</span>
          <h3>No Items Found</h3>
          <p>Try a different filter or search term.</p>
        </div>
      `;
      return;
    }

    catalogueEl.innerHTML = filteredItems.map(cardHTML).join("");
  }

  /* ==============================================================
     23. ITEM DETAIL PAGE
     ============================================================== */

  // Create the expanded detail view for one item.
  function renderItemPage(itemId) {
    const item = normaliseItem(
      getItems().find((entry) => entry.id === itemId),
      itemId,
    );
    const allImages = [item.image, ...item.extraImages].filter(Boolean);
    const detailWrap = document.querySelector(".item-detail-wrap");
    if (!detailWrap) return;

    currentItemId = item.id;

    detailWrap.innerHTML = `
      <button class="btn-back" onclick="showPage('catalogue')">
        ← Back to Catalogue
      </button>

      <div class="item-hero" id="itemPageHero">
        ${imageMarkup(allImages[0], item.name, item.category, true)}
      </div>

      <div
        class="view-thumbs"
        id="itemPageThumbs"
        style="${allImages.length > 1 ? "" : "display: none"}"
      ></div>

      <div class="item-detail-body">
        <div class="item-detail-main">
          <div class="item-game-label">${escapeHTML(item.game)}</div>
          <h1 class="item-detail-name">${escapeHTML(item.name)}</h1>

          <span class="item-detail-section-label">Description</span>
          <p class="item-detail-description">
            ${escapeHTML(item.description || PLACEHOLDER_DESCRIPTION)}
          </p>

          <div class="item-detail-share">
            <span class="item-detail-share-label">Share this item:</span>
            <button class="btn-copy-link" id="btnCopyLink" onclick="copyItemLink()">
              Copy Link
            </button>
          </div>
        </div>

        <aside class="item-detail-sidebar" id="itemPageSidebar">
          <!-- Labels are inserted below. -->
        </aside>
      </div>
    `;

    const labels = [
      { key: "Associated Game", value: item.game, className: "" },
      { key: "Year of Release", value: item.year, className: "gold" },
      { key: "Category", value: item.category, className: "" },
      { key: "Rarity", value: item.rarity, className: "gold" },
      { key: "Availability", value: item.availability, className: "pill" },
    ];

    if (byId("itemPageSidebar")) {
      byId("itemPageSidebar").innerHTML = labels
        .map(
          (label) => `
            <div class="item-label-block">
              <span class="item-label-key">${label.key}</span>
              <div class="item-label-value ${label.className}">
                ${escapeHTML(label.value)}
              </div>
            </div>
          `,
        )
        .join("");
    }

    addSourceLink(item);
    setupThumbnailButtons(item, allImages);

    let activeImgIndex = 0;
    const hero = byId("itemPageHero");
    if (hero) {
      hero.onclick = () => openLightbox(allImages, activeImgIndex);
    }
  }

  // Add the optional source/buy link beneath the item details.
  function addSourceLink(item) {
    const link = safeExternalUrl(item.link);
    if (!link) return;

    const sidebar = byId("itemPageSidebar");
    if (!sidebar) return;

    const sourceBlock = document.createElement("div");
    sourceBlock.className = "item-label-block";
    sourceBlock.innerHTML = `
      <span class="item-label-key">Source</span>
      <a
        href="${escapeHTML(link)}"
        target="_blank"
        rel="noopener noreferrer"
        style="color: var(--gold); word-break: break-all; font-size: 0.8rem;"
      >
        ${escapeHTML(link)}
      </a>
    `;
    sidebar.appendChild(sourceBlock);

    const viewLink = document.createElement("a");
    viewLink.className = "view-link";
    viewLink.href = link;
    viewLink.target = "_blank";
    viewLink.rel = "noopener noreferrer";
    viewLink.textContent = "View / Buy This Item →";
    sidebar.appendChild(viewLink);
  }

  // Make extra item images clickable thumbnails.
  function setupThumbnailButtons(item, allImages, onSelect) {
    if (allImages.length <= 1) return;

    const thumbnails = byId("itemPageThumbs");
    const hero = byId("itemPageHero");
    if (!thumbnails || !hero) return;

    thumbnails.innerHTML = allImages
      .map(
        (source, index) => `
          <button
            class="view-thumb ${index === 0 ? "active" : ""}"
            data-source="${escapeHTML(source)}"
            data-index="${index}"
            aria-label="Show image ${index + 1}"
          >
            <img
              src="${escapeHTML(source)}"
              alt="${escapeHTML(item.name)} thumbnail ${index + 1}"
              loading="lazy"
              decoding="async"
              referrerpolicy="no-referrer"
            />
          </button>
        `,
      )
      .join("");

    thumbnails.querySelectorAll(".view-thumb").forEach((thumbnail) => {
      thumbnail.addEventListener("click", () => {
        const idx = parseInt(thumbnail.dataset.index, 10) || 0;
        if (onSelect) onSelect(idx);
        thumbnails
          .querySelectorAll(".view-thumb")
          .forEach((button) => button.classList.remove("active"));
        thumbnail.classList.add("active");
        hero.innerHTML = imageMarkup(
          thumbnail.dataset.source,
          item.name,
          item.category,
          true,
        );
      });
    });
  }

  /* ==============================================================
     LIGHTBOX MODAL AND ZOOM CONTROLS
     ============================================================== */
  let lightboxImages = [];
  let lightboxIndex = 0;
  let isZoomed = false;

  function openLightbox(images, startIndex = 0) {
    lightboxImages = images.filter(Boolean);
    if (!lightboxImages.length) return;
    lightboxIndex = Math.max(0, Math.min(startIndex, lightboxImages.length - 1));
    isZoomed = false;
    updateLightbox();
    const modal = byId("lightboxModal");
    if (modal) {
      modal.classList.add("active");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }
  }

  function closeLightbox() {
    const modal = byId("lightboxModal");
    if (!modal) return;
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    const wrap = byId("lightboxImgWrap");
    if (wrap) wrap.classList.remove("zoomed");
    isZoomed = false;
  }

  function updateLightbox() {
    const img = byId("lightboxImg");
    const counter = byId("lightboxCounter");
    const prevBtn = byId("lightboxPrev");
    const nextBtn = byId("lightboxNext");
    const wrap = byId("lightboxImgWrap");
    const hint = byId("lightboxHint");

    if (!img) return;
    img.src = lightboxImages[lightboxIndex];
    if (counter) counter.textContent = `${lightboxIndex + 1} / ${lightboxImages.length}`;
    if (prevBtn) prevBtn.style.display = lightboxImages.length > 1 ? "flex" : "none";
    if (nextBtn) nextBtn.style.display = lightboxImages.length > 1 ? "flex" : "none";

    if (wrap) wrap.classList.remove("zoomed");
    isZoomed = false;
    if (hint) hint.textContent = "Click image to zoom";
  }

  function toggleZoom() {
    const wrap = byId("lightboxImgWrap");
    const hint = byId("lightboxHint");
    isZoomed = !isZoomed;
    if (wrap) wrap.classList.toggle("zoomed", isZoomed);
    if (hint) hint.textContent = isZoomed ? "Click to unzoom" : "Click image to zoom";
  }

  function nextLightboxImage() {
    if (lightboxImages.length <= 1) return;
    lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
    updateLightbox();
  }

  function prevLightboxImage() {
    if (lightboxImages.length <= 1) return;
    lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
    updateLightbox();
  }

  document.addEventListener("DOMContentLoaded", () => {
    byId("lightboxClose")?.addEventListener("click", closeLightbox);
    byId("lightboxPrev")?.addEventListener("click", (e) => {
      e.stopPropagation();
      prevLightboxImage();
    });
    byId("lightboxNext")?.addEventListener("click", (e) => {
      e.stopPropagation();
      nextLightboxImage();
    });
    byId("lightboxImgWrap")?.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleZoom();
    });
    byId("lightboxModal")?.addEventListener("click", (e) => {
      if (e.target.id === "lightboxModal" || e.target.classList.contains("lightbox-content")) {
        closeLightbox();
      }
    });
    document.addEventListener("keydown", (e) => {
      const modal = byId("lightboxModal");
      if (!modal || !modal.classList.contains("active")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prevLightboxImage();
      if (e.key === "ArrowRight") nextLightboxImage();
    });
  });

  // Copy a shareable item URL to the clipboard.
  function copyItemLink() {
    const url = `${location.origin}${location.pathname}#item/${currentItemId}`;
    const button = byId("btnCopyLink");

    navigator.clipboard
      .writeText(url)
      .then(() => {
        if (button) {
          button.textContent = "Copied!";
          button.classList.add("copied");
          setTimeout(() => {
            button.textContent = "Copy Link";
            button.classList.remove("copied");
          }, 1800);
        }
      })
      .catch(() => {
        window.prompt("Copy this link:", url);
      });
  }

  /* ==============================================================
     24. URL ROUTING AND STARTUP
     ============================================================== */

  // Display the correct page when a visitor opens a saved item link.
  function handleRoute() {
    const hash = location.hash;

    if (hash.startsWith("#item/")) {
      document.querySelectorAll(".page").forEach((page) => {
        page.classList.remove("active");
      });
      document
        .querySelectorAll(".nav-link, .mobile-nav-link")
        .forEach((link) => link.classList.remove("active"));
      byId("page-item")?.classList.add("active");
      renderItemPage(hash.slice(6));
      window.scrollTo(0, 0);
      return;
    }

    if (["#catalogue", "#about", "#contact"].includes(hash)) {
      showPage(hash.slice(1));
      return;
    }

    showPage("home");
  }

  // Safely check app version meta tag and handle version caching.
  function applyVersionStrategy() {
    const versionMeta = document.querySelector('meta[name="rph-version"]');
    if (!versionMeta) return false;

    const appVersion = versionMeta.content;
    const storageKey = "rph_app_version";
    const previousVersion = localStorage.getItem(storageKey);

    localStorage.setItem(storageKey, appVersion);

    if (
      previousVersion &&
      previousVersion !== appVersion &&
      !location.search.includes(`v=${appVersion}`)
    ) {
      const query = `?v=${encodeURIComponent(appVersion)}`;
      location.replace(`${location.pathname}${query}${location.hash}`);
      return true;
    }

    return false;
  }

  // Listen for browser back/forward navigation between hash routes.
  window.addEventListener("hashchange", handleRoute);

  // Initialize the application after catalog data is ready.
  function initApp() {
    if (!applyVersionStrategy()) {
      renderHome();
      renderCatalogue();
      handleRoute();
    }
  }

  // Load catalog.js dynamically (tries root first, falls back to /js folder)
  function loadCatalogScript(pathIndex = 0) {
    const paths = ["catalog.js", "js/catalog.js"];
    if (pathIndex >= paths.length) {
      console.error("Could not load catalog.js from any location");
      initApp();
      return;
    }

    const catalogScript = document.createElement("script");
    catalogScript.src = paths[pathIndex] + "?v=" + Date.now();
    catalogScript.onload = initApp;
    catalogScript.onerror = function () {
      loadCatalogScript(pathIndex + 1);
    };
    document.head.appendChild(catalogScript);
  }

  loadCatalogScript();
</script>
