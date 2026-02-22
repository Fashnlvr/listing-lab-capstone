// ===============================
// STORAGE KEYS
// ===============================
const LISTINGS_KEY = "listingLab:listings:v1";
const DRAFT_KEY = "listingLab:draft:v1";

// ===============================
// HELPERS
// ===============================
function $(sel) { return document.querySelector(sel); }
function pageHas(sel) { return !!document.querySelector(sel); }

function uid() {
  // GitHub Pages-friendly unique-ish id
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function getListings() {
  const raw = localStorage.getItem(LISTINGS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveListings(listings) {
  localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
}

function addListing(listing) {
  const listings = getListings();
  listings.unshift(listing);
  saveListings(listings);
}

function removeListing(id) {
  const listings = getListings().filter(l => l.id !== id);
  saveListings(listings);
}

function getListingById(id) {
  return getListings().find(l => l.id === id);
}

function saveDraft(draft) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function loadDraft() {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

// ===============================
// POC-STYLE PRICING LOGIC
// (simple but believable, and matches your POC vibe)
// ===============================
const BASE_RANGES = {
  tops:      [12, 28],
  bottoms:   [18, 45],
  dresses:   [22, 60],
  shoes:     [25, 80],
  bags:      [30, 120],
  outerwear: [28, 90],
  default:   [15, 40],
};

const CONDITION_MULT = {
  "new": 1.25,
  "like-new": 1.10,
  "good": 1.00,
  "fair": 0.75,
};

const PREMIUM_BRANDS = new Set([
  "coach","marc jacobs","kate spade","calpak","spanx","ray-ban","diff eyewear",
  "levis","levi's","abercrombie",
]);

function normalize(s) {
  return String(s || "").trim().toLowerCase();
}

function getSuggestedRange(category, condition, brand) {
  const base = BASE_RANGES[category] || BASE_RANGES.default;
  const mult = CONDITION_MULT[condition] || 1.0;

  let low = base[0] * mult;
  let high = base[1] * mult;

  const b = normalize(brand);
  if (b && PREMIUM_BRANDS.has(b)) {
    low *= 1.15;
    high *= 1.15;
  }

  // round to clean dollars
  low = Math.round(low);
  high = Math.round(high);

  // keep sane ordering
  if (high < low) [low, high] = [high, low];

  return [low, high];
}

function isPriceValid(price, suggestedRange) {
  if (!Number.isFinite(price) || price <= 0) return { ok: false, msg: "Enter a valid price." };
  if (!suggestedRange) return { ok: true, msg: "" };

  const [low, high] = suggestedRange;
  if (price < low) return { ok: true, msg: ` (below range — could sell faster)` };
  if (price > high) return { ok: true, msg: ` (above range — may take longer)` };
  return { ok: true, msg: ` (in range)` };
}

// ===============================
// EXPORT SUMMARY (POC feel)
// ===============================
function buildExportSummary(listing) {
  const lines = [];

  if (listing.itemName) lines.push(`Title: ${listing.itemName}`);
  if (listing.brand) lines.push(`Brand: ${listing.brand}`);
  if (listing.category) lines.push(`Category: ${prettyCategory(listing.category)}`);
  if (listing.condition) lines.push(`Condition: ${prettyCondition(listing.condition)}`);
  if (Number.isFinite(listing.price)) lines.push(`Price: $${Number(listing.price).toFixed(2)}`);

  if (listing.notes) {
    lines.push("");
    lines.push(`Notes: ${listing.notes}`);
  }

  // small footer line like your “export-ready” vibe
  lines.push("");
  lines.push("— Prepared in Listing Lab");

  return lines.join("\n");
}

function prettyCategory(v) {
  const map = {
    tops: "Tops",
    bottoms: "Bottoms",
    dresses: "Dresses",
    shoes: "Shoes",
    bags: "Bags",
    outerwear: "Outerwear",
  };
  return map[v] || v;
}

function prettyCondition(v) {
  const map = {
    "new": "New",
    "like-new": "Like New",
    "good": "Good",
    "fair": "Fair",
  };
  return map[v] || v;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ===============================
// NEW LISTING PAGE INIT (POC UI)
// ===============================
function initNewListingPage() {
  if (!pageHas("#listingForm")) return;

  const form = $("#listingForm");
  const errorBox = $("#formError");
  const statusBox = $("#formStatus");
  const completenessText = $("#completenessText");
  const suggestedRangeEl = $("#suggestedRange");
  const priceCheckEl = $("#priceCheck");
  const exportPreview = $("#exportPreview");
  const listingPhotoPlaceholder = $("#listingPhotoPlaceholder");
  const listingPhotoInitials = $("#listingPhotoInitials");
  const listingCardTitle = $("#listingCardTitle");
  const listingCardMeta = $("#listingCardMeta");
  const listingCardPrice = $("#listingCardPrice");
  const listingCardNotes = $("#listingCardNotes");

  const fields = {
    itemName: $("#itemName"),
    brand: $("#brand"),
    category: $("#category"),
    condition: $("#condition"),
    price: $("#price"),
    notes: $("#notes"),
  };

  function setError(message) {
    errorBox.textContent = message || "";
    if (message) statusBox.textContent = "";
  }

  function setStatus(message) {
    statusBox.textContent = message || "";
    if (message) errorBox.textContent = "";
  }

  function getFormState() {
    const priceNum = Number(fields.price.value);
    return {
      itemName: fields.itemName.value.trim(),
      brand: fields.brand.value.trim(),
      category: fields.category.value,
      condition: fields.condition.value,
      price: Number.isFinite(priceNum) ? priceNum : NaN,
      notes: fields.notes.value.trim(),
    };
  }

  function setFormState(state) {
    fields.itemName.value = state.itemName || "";
    fields.brand.value = state.brand || "";
    fields.category.value = state.category || "";
    fields.condition.value = state.condition || "";
    fields.price.value = Number.isFinite(state.price) ? String(state.price) : "";
    fields.notes.value = state.notes || "";
  }

  function updateCompleteness(state) {
    let score = 0;
    if (state.itemName) score++;
    if (state.category) score++;
    if (state.condition) score++;
    if (Number.isFinite(state.price) && state.price > 0) score++;
    completenessText.textContent = `${score}/4`;
  }

  function updatePricingAndPreview() {
    const state = getFormState();
    updateCompleteness(state);

    let range = null;
    if (state.category && state.condition) {
      range = getSuggestedRange(state.category, state.condition, state.brand);
      suggestedRangeEl.textContent = `$${range[0]} – $${range[1]}`;
    } else {
      suggestedRangeEl.textContent = "—";
    }

    const check = isPriceValid(state.price, range);
    priceCheckEl.textContent = check.msg;

    const title = state.itemName || "Untitled item";
    const brand = state.brand || "No brand";
    const category = state.category ? prettyCategory(state.category) : "No category";
    const condition = state.condition ? prettyCondition(state.condition) : "No condition";
    const price = Number.isFinite(state.price) && state.price > 0 ? `$${state.price.toFixed(2)}` : "$0.00";
    const notesPreview = state.notes || "Description preview will appear here.";
    const initials = (state.itemName || "LL")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(word => word[0]?.toUpperCase() || "")
      .join("") || "LL";

    if (listingCardTitle) listingCardTitle.textContent = title;
    if (listingCardMeta) listingCardMeta.textContent = `${brand} • ${category} • ${condition}`;
    if (listingCardPrice) listingCardPrice.textContent = price;
    if (listingCardNotes) listingCardNotes.textContent = notesPreview;
    if (listingPhotoInitials) listingPhotoInitials.textContent = initials;
    if (listingPhotoPlaceholder) {
      listingPhotoPlaceholder.setAttribute("aria-label", `Placeholder photo for ${title}`);
    }

    // live export preview
    exportPreview.textContent = buildExportSummary(state);
  }

  // Initial render
  updatePricingAndPreview();

  // Live update like POC
  Object.values(fields).forEach(el => {
    el.addEventListener("input", updatePricingAndPreview);
    el.addEventListener("change", updatePricingAndPreview);
  });

  // Draft controls (POC behavior)
  $("#saveDraftBtn").addEventListener("click", () => {
    saveDraft(getFormState());
    setStatus("Draft saved.");
  });

  $("#loadDraftBtn").addEventListener("click", () => {
    const d = loadDraft();
    if (!d) {
      setError("No draft found.");
      return;
    }
    setFormState(d);
    setStatus("Draft loaded.");
    updatePricingAndPreview();
  });

  $("#clearDraftBtn").addEventListener("click", () => {
    clearDraft();
    setStatus("Draft cleared.");
  });

  // Copy export preview
  $("#copyBtn").addEventListener("click", async () => {
    const ok = await copyText(exportPreview.textContent || "");
    if (ok) setStatus("Summary copied.");
    else setError("Copy failed. Try selecting the text manually.");
  });

  // Save listing (MVP flow)
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    setError("");
    setStatus("");

    const state = getFormState();

    if (!state.itemName) return setError("Item Name is required.");
    if (!Number.isFinite(state.price) || state.price <= 0) return setError("Enter a valid price.");

    const listing = {
      id: uid(),
      ...state,
      createdAt: new Date().toISOString(),
    };

    addListing(listing);
    // optional: keep draft in sync
    saveDraft(state);

    window.location.href = "dashboard.html";
  });
}

// ===============================
// DASHBOARD INIT
// ===============================
function initDashboardPage() {
  if (!pageHas("#listingsTableBody")) return;

  const tbody = $("#listingsTableBody");
  const emptyState = $("#emptyState");
  const dashboardStatus = $("#dashboardStatus");

  function render() {
    const listings = getListings();
    tbody.innerHTML = "";

    if (!listings.length) {
      emptyState.textContent = "No listings saved yet. Create one to get started.";
      return;
    }

    emptyState.textContent = "";

    listings.forEach(l => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td><a href="listing.html?id=${encodeURIComponent(l.id)}">${escapeHtml(l.itemName)}</a></td>
        <td>${escapeHtml(l.brand || "")}</td>
        <td>${escapeHtml(prettyCategory(l.category || ""))}</td>
        <td>${escapeHtml(prettyCondition(l.condition || ""))}</td>
        <td>$${Number(l.price).toFixed(2)}</td>
        <td>${escapeHtml(formatDate(l.createdAt))}</td>
        <td>
          <button class="link-btn" data-del="${escapeHtml(l.id)}" aria-label="Delete ${escapeHtml(l.itemName || "listing")}">Delete</button>
        </td>
      `;

      tr.querySelector("[data-del]").addEventListener("click", () => {
        if (!window.confirm(`Delete "${l.itemName || "this listing"}"?`)) return;
        removeListing(l.id);
        dashboardStatus.textContent = `${l.itemName || "Listing"} deleted.`;
        render();
      });

      tbody.appendChild(tr);
    });
  }

  render();

  const exportBtn = $("#exportBtn");
  exportBtn.addEventListener("click", () => {
    const listings = getListings();
    if (!listings.length) {
      dashboardStatus.textContent = "No listings to export yet.";
      return;
    }
    exportCSV(listings);
    dashboardStatus.textContent = "CSV export started.";
  });
}

// ===============================
// LISTING DETAIL INIT
// ===============================
function initListingDetailPage() {
  if (!pageHas("#detailExport")) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const titleEl = $("#listingTitle");
  const metaEl = $("#listingMeta");
  const exportEl = $("#detailExport");
  const msgEl = $("#detailMsg");

  if (!id) {
    titleEl.textContent = "Listing not found";
    exportEl.textContent = "";
    metaEl.textContent = "";
    return;
  }

  const listing = getListingById(id);
  if (!listing) {
    titleEl.textContent = "Listing not found";
    exportEl.textContent = "";
    metaEl.textContent = "";
    return;
  }

  titleEl.textContent = listing.itemName || "Listing";
  metaEl.textContent = `${listing.brand || "No brand"} • ${prettyCategory(listing.category)} • ${prettyCondition(listing.condition)} • $${Number(listing.price).toFixed(2)} • ${formatDate(listing.createdAt)}`;
  exportEl.textContent = buildExportSummary(listing);

  $("#detailCopyBtn").addEventListener("click", async () => {
    const ok = await copyText(exportEl.textContent || "");
    msgEl.textContent = ok ? "Copied." : "Copy failed. Try selecting the text manually.";
  });

  $("#detailDeleteBtn").addEventListener("click", () => {
    if (!window.confirm(`Delete "${listing.itemName || "this listing"}"?`)) return;
    removeListing(listing.id);
    window.location.href = "dashboard.html";
  });
}

// ===============================
// CSV EXPORT
// ===============================
function exportCSV(listings) {
  if (!listings.length) return;

  const headers = ["itemName","brand","category","condition","price","notes","createdAt"];
  const escape = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;

  const lines = [
    headers.map(escape).join(","),
    ...listings.map(l => headers.map(h => escape(l[h])).join(","))
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "listing-lab-export.csv";
  a.click();

  URL.revokeObjectURL(url);
}

// ===============================
// SAFE HTML OUTPUT
// ===============================
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  initNewListingPage();
  initDashboardPage();
  initListingDetailPage();
});
