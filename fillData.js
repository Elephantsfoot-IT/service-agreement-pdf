// ============================================================================
// Service Agreement HTML Builder – Defensive, Commented Refactor (Order Only)
// ============================================================================
// NOTE FROM AUTHOR: Per your request, this version ONLY reorders functions
// into a logical top-down flow and adds detailed comments above each function.
// No logic has been refactored or changed.
// ============================================================================

const { parseISO, format, isValid } = require("date-fns");
const { formatInTimeZone } = require("date-fns-tz");

// ---------------------------------------------------------------------------
// Constants (pure presentation defaults; tweak as needed)
// ---------------------------------------------------------------------------
const IMAGE_ZONE_PX = 160; // visual height reserved for signature image
const TODAY_AU = safeFormatInSydney(new Date(), "dd/MM/yyyy"); // "DD/MM/YYYY"
const BOX_PX = 12;
const BORDER = "black";
const STROKE = "black";
const STROKE_W = 2;

/* ===========================================================================
   Small Safe Helpers
   =========================================================================== */

/**
 * Safely format a date into a string for the Australia/Sydney timezone.
 * - Returns "" on any failure (invalid date, bad format, etc.).
 * - Used to produce a stable "today" value and any other zone-aware dates.
 *
 * @param {Date|number|string} date - A Date instance or a parseable date input.
 * @param {string} fmt - date-fns format string (e.g., "dd/MM/yyyy").
 * @returns {string} - Formatted date string or "" on failure.
 */
function safeFormatInSydney(date, fmt) {
  try {
    return formatInTimeZone(date, "Australia/Sydney", fmt);
  } catch {
    return "";
  }
}

/**
 * Replace ALL occurrences of a token in an HTML/string safely.
 * - If inputs are not strings, returns original `html` (or "").
 * - Avoids regex pitfalls by using naive split/join for exact token replacement.
 *
 * @param {string} html - The source HTML/text with placeholders.
 * @param {string} token - The placeholder token to replace, e.g. "{COMPANY_NAME}".
 * @param {string} [value=""] - Replacement value (coerced to string; nullish => "").
 * @returns {string} - Resulting string with all tokens replaced.
 */
function safeReplaceAll(html, token, value = "") {
  if (typeof html !== "string" || typeof token !== "string") return html ?? "";
  const v = value == null ? "" : String(value);
  return html.split(token).join(v);
}

/**
 * Safely join an array of strings with trimming and falsy filtering.
 * - Removes empty/whitespace-only parts.
 * - Returns "" for non-array inputs.
 *
 * @param {Array<string|undefined|null>} parts - List of parts to join.
 * @param {string} [sep=" "] - Separator for the join, defaults to single space.
 * @returns {string} - Joined and trimmed string.
 */
function safeJoin(parts, sep = " ") {
  return (Array.isArray(parts) ? parts : [])
    .map((p) => (p ?? "").toString().trim())
    .filter(Boolean)
    .join(sep);
}

/* ===========================================================================
   Date & Number Utilities
   =========================================================================== */

/**
 * Convert ISO-like date input (YYYY-MM-DD or ISO timestamp) into "DD/MM/YYYY".
 * - Returns "" for invalid or missing input.
 * - Defensive: parses via date-fns `parseISO` and checks `isValid`.
 *
 * @param {string} iso - ISO-like date string.
 * @returns {string} - "DD/MM/YYYY" or "".
 */
function toDDMMYYYY(iso) {
  if (!iso || typeof iso !== "string") return "";
  try {
    const d = parseISO(iso);
    return isValid(d) ? format(d, "dd/MM/yyyy") : "";
  } catch {
    return "";
  }
}

/**
 * Convert a price-like value to a JS Number.
 * - Accepts numbers, strings like "$300.00", "300", "1,250.50", "300,00".
 * - Returns 0 on any parse failure.
 *
 * @param {string|number} val - Price-like input.
 * @returns {number} - Parsed numeric value or 0.
 */
function getNumber(val) {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (val == null) return 0;
  const cleaned = String(val).replace(/[^0-9.,-]/g, "");
  const normalized =
    cleaned.includes(".") && cleaned.includes(",")
      ? cleaned.replace(/,/g, "")
      : cleaned.replace(",", ".");
  const num = parseFloat(normalized);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Format a number as AUD currency.
 * - Returns "$0.00" fallback if locale formatting fails or input invalid.
 *
 * @param {number} n - Numeric value to format.
 * @returns {string} - e.g. "$1,250.00".
 */
function formatMoney(n) {
  const safe = Number.isFinite(n) ? n : 0;
  try {
    return safe.toLocaleString("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 2,
    });
  } catch {
    return `$${safe.toFixed(2)}`;
  }
}

/* ===========================================================================
   Discount & Totals Utilities
   =========================================================================== */

/**
 * Default discount rule based on count of selected service frequencies.
 * - < 3 services  => 0%
 * - 4–5 services  => 5%
 * - >= 6 services => 10%
 *
 * @param {number} serviceCount - Number of selected services.
 * @returns {number} - Discount percentage (0, 5, or 10).
 */
function getDiscountDefault(serviceCount) {
  const c = Number.isFinite(serviceCount) ? serviceCount : 0;
  if (c < 3) return 0;
  if (c >= 4 && c < 6) return 5;
  if (c >= 6) return 10;
  return 0;
}

/**
 * Convert a frequency label to an annual multiplier.
 * - "yearly" => 1
 * - "six-monthly"/"6monthly"/"six monthly" => 2
 * - anything else non-empty => 4 (assumed "quarterly")
 * - null/empty/"none" => 0
 *
 * @param {string|null|undefined} frequency - Frequency label.
 * @returns {number} - Multiplier (0, 1, 2, or 4).
 */
function frequencyToMultiplier(frequency) {
  const f = (frequency ?? "").toString().trim().toLowerCase();

  if (!f) return 0;
  if (f === "none") return 0;
  if (f === "yearly") return 1;
  if (f === "six-monthly" || f === "6monthly" || f === "six monthly") return 2;
  return 4;
}

/**
 * Compute annualized cost for a list of services, given a frequency.
 * - Sums price * multiplier for each service.
 * - Returns 0 if multiplier is 0 or services is empty.
 *
 * @param {Array} services - Array of service objects with `price`.
 * @param {string|null|undefined} frequency - Frequency selection.
 * @returns {number} - Annualized cost.
 */
function getServiceAnualCost(services, frequency) {
  const mult = frequencyToMultiplier(frequency);
  if (!mult || !Array.isArray(services) || services.length === 0) return 0;
  return services.reduce((acc, s) => acc + getNumber(s?.price) * mult, 0);
}

function getServiceAnualChuteCost(services, frequency) {
  const mult = frequencyToMultiplier(frequency);
  if (!mult || !Array.isArray(services) || services.length === 0) return 0;
  return services.reduce((acc, s) => acc + getNumber(s?.price) * mult * getNumber(s?.chutes), 0);
}

function getServiceAnualEquipmentCost(services, frequency) {
  const mult = frequencyToMultiplier(frequency);
  if (!mult || !Array.isArray(services) || services.length === 0) return 0;
  return services.reduce((acc, s) => acc + getNumber(s?.price) * mult * getNumber(s?.quantity), 0);
}

/**
 * Gather all services of a specific `type` from an array of `sites`.
 * - Flattens `sites -> buildings -> services` into an array, attaching
 *   site/building metadata for rendering and calculation purposes.
 *
 * @param {Array} sites - `serviceAgreement.sites` array.
 * @param {string} type - Service type to filter by (e.g., "chute_cleaning").
 * @returns {{ type: string, items: Array }} - Wrapper object with `items` list.
 */
function getServices(sites, type) {
  if (!Array.isArray(sites) || !type) return { type, items: [] };
  const items = sites.flatMap((site) =>
    (site?.buildings ?? []).flatMap((b) =>
      (b?.services ?? [])
        .filter((s) => s && s.type === type)
        .map((s) => ({
          site_name: site?.site_name ?? "",
          site_id: site?.simpro_site_id ?? null,
          building_id: b?.id ?? null,
          building_name: b?.name || null,
          ...s,
        }))
    )
  );
  return { type, items };
}

/**
 * Compute the grand total for the contract, including odour control logic
 * and optional incentives-based discount.
 * - Annualizes each service type based on its selected frequency.
 * - Odour control multiplies unit price by unit count and frequency multiplier.
 * - Applies discount if `incentives` is truthy and discount rule returns > 0.
 *
 * @param {Object} params
 * @param {Array}  params.sites - Sites used to gather services.
 * @param {Object} params.frequencies - Selected frequencies by type.
 * @param {Object<string, number>} params.odourControlUnits - Units keyed by service id.
 * @param {(n:number)=>number} [params.getDiscount] - Discount rule (default provided).
 * @param {any} params.incentives - Truthy to enable discount, falsy to skip.
 * @returns {number} - Non-negative grand total.
 */
function computeGrandTotal({
  sites = [],
  frequencies = {},
  odourControlUnits = {},
  getDiscount = getDiscountDefault,
  incentives,
}) {
  const chuteCleaningFrequency = frequencies?.chuteCleaningFrequency ?? null;
  const equipmentMaintenanceFrequency =
    frequencies?.equipmentMaintenanceFrequency ?? null;
  const selfClosingHopperDoorInspectionFrequency =
    frequencies?.selfClosingHopperDoorInspectionFrequency ?? null;
  const wasteRoomCleaningFrequency =
    frequencies?.wasteRoomCleaningFrequency ?? null;
  const binCleaningFrequency = frequencies?.binCleaningFrequency ?? null;
  const odourControlFrequency = frequencies?.odourControlFrequency ?? null;

  const chute = getServices(sites, "chute_cleaning");
  const equip = getServices(sites, "equipment_maintenance");
  const hopper = getServices(sites, "hopper_door_inspection");
  const waste = getServices(sites, "waste_room_pressure_clean");
  const bin = getServices(sites, "bin_cleaning");
  const odour = getServices(sites, "odour_control");

  const chuteAnnual = getServiceAnualChuteCost(chute.items, chuteCleaningFrequency);
  const equipAnnual = getServiceAnualEquipmentCost(
    equip.items,
    equipmentMaintenanceFrequency
  );
  const hopperAnnual = getServiceAnualChuteCost(
    hopper.items,
    selfClosingHopperDoorInspectionFrequency
  );
  const wasteAnnual = getServiceAnualCost(
    waste.items,
    wasteRoomCleaningFrequency
  );
  const binAnnual = getServiceAnualCost(bin.items, binCleaningFrequency);

  const odourMult = frequencyToMultiplier(odourControlFrequency);
  const odourAnnual = odourMult
    ? (odour.items || []).reduce((acc, r) => {
        const qty = getNumber(odourControlUnits?.[r?.id] ?? 0);
        return acc + qty * getNumber(r?.price) * odourMult;
      }, 0)
    : 0;

  const subtotal =
    chuteAnnual +
    equipAnnual +
    hopperAnnual +
    wasteAnnual +
    binAnnual +
    odourAnnual;

  const serviceCount = [
    chuteCleaningFrequency,
    equipmentMaintenanceFrequency,
    selfClosingHopperDoorInspectionFrequency,
    wasteRoomCleaningFrequency,
    binCleaningFrequency,
    odourControlFrequency,
  ].filter(
    (f) => f != null && String(f).trim() !== "" && String(f).trim() !== "none"
  ).length;

  const discountPct = Number(getDiscount(Number(serviceCount))) || 0;
  const discountAmt =
    discountPct && incentives ? (subtotal * discountPct) / 100 : 0;

  return Math.max(0, subtotal - discountAmt);
}

/* ===========================================================================
   Site/Name Helpers (Cover Page)
   =========================================================================== */

/**
 * Return an array of site names, repeated per building (mirrors original logic).
 * - Useful for building a bulleted list on the cover page.
 *
 * @param {Array} sites - `serviceAgreement.sites` array.
 * @returns {string[]} - Array of site names (may include duplicates).
 */
function getSitesNames(sites) {
  if (!Array.isArray(sites)) return [];
  return sites.flatMap((site) =>
    (site?.buildings ?? []).flatMap(() => site?.site_name ?? "")
  );
}

/**
 * Build cover page HTML with site names, one per row (defensive).
 * - Uses `getSitesNames()` and wraps each name in a simple div.
 *
 * @param {Array} sites - `serviceAgreement.sites` array.
 * @returns {string} - HTML snippet.
 */
function getCoverPageSitesNames(sites) {
  const siteNames = getSitesNames(sites)
    .filter(Boolean)
    .map((site) => `<div style="font-size:14px;">${site}</div>`)
    .join("");

  return `
    <div style="display:flex; flex-direction:column; gap:5px;">
      ${siteNames}
    </div>
  `;
}

/* ===========================================================================
   HTML Builders – Shared & Collectors
   =========================================================================== */

/**
 * Internal collector that returns flat services for a given `type`.
 * - Convenience wrapper to keep section functions concise.
 *
 * @param {Array} sites - `serviceAgreement.sites` array.
 * @param {string} type - Service type (e.g., "chute_cleaning").
 * @returns {Array} - Flat list of services with site/building context.
 */
function getChuteCleaningServices(sites, type) {
  return getServices(sites, type).items || [];
}

/**
 * Common frequency checklist builder for UI.
 * - Visualizes Quarterly / 6 Monthly / Yearly with ticked boxes.
 * - Supports `visible` or `hide` filters to control which rows appear.
 *
 * @param {string|null|undefined} frequency - Selected frequency label.
 * @param {Object} [opts]
 * @param {string[]} [opts.hide] - Keys to hide (normalized).
 * @param {string[]} [opts.visible] - Keys to show (normalized).
 * @returns {string} - HTML snippet of the checklist column.
 */
function frequencyChecklistHTML(frequency, opts = {}) {
  const norm = (s) =>
    (s ?? "").toString().trim().toLowerCase().replace(/\s+/g, "-");

  const f = norm(frequency);
  const isQuarterly = f === "quarterly";
  const isSixMonthly = f === "six-monthly" || f === "6monthly";
  const isYearly = f === "yearly";

  const items = [
    { key: "quarterly", label: "Quarterly", checked: isQuarterly },
    { key: "six-monthly", label: "6 Monthly", checked: isSixMonthly },
    { key: "yearly", label: "Yearly", checked: isYearly },
  ];

  let filtered = items;
  if (Array.isArray(opts.visible) && opts.visible.length) {
    const vis = new Set(opts.visible.map(norm));
    filtered = filtered.filter((it) => vis.has(it.key));
  } else if (Array.isArray(opts.hide) && opts.hide.length) {
    const hide = new Set(opts.hide.map(norm));
    filtered = filtered.filter((it) => !hide.has(it.key));
  }

  if (!filtered.length) {
    return `<div style="width:20%; min-height:45px; padding-top:5px; display:flex; flex-direction:column; padding-bottom:20px; gap:10px;"></div>`;
  }

  const box = (checked) => `
    <span style="
      width:${BOX_PX}px;
      height:${BOX_PX}px;
      border:1px solid ${BORDER};
      display:inline-block;
      position:relative;
    ">
      ${
        checked
          ? `
        <svg viewBox="0 0 100 100" preserveAspectRatio="none"
             style="position:absolute; inset:0; width:100%; height:100%; pointer-events:none;">
          <line x1="0" y1="0" x2="100" y2="100" stroke="${STROKE}" stroke-width="${
              (STROKE_W / BOX_PX) * 100
            }"/>
          <line x1="100" y1="0" x2="0" y2="100" stroke="${STROKE}" stroke-width="${
              (STROKE_W / BOX_PX) * 100
            }"/>
        </svg>
      `
          : ""
      }
    </span>
  `;

  const rows = filtered
    .map(
      (it) => `
    <div style="padding-left:10px;display:flex;align-items:center;gap:5px;">
      ${box(it.checked)}${it.label}
    </div>`
    )
    .join("");

  return `
    <div style="width:20%; min-height:45px; padding-top:5px; display:flex; flex-direction:column; padding-bottom:20px; gap:10px;">
      ${rows}
    </div>
  `;
}

/* ===========================================================================
   HTML Builders – Individual Service Sections
   =========================================================================== */

/**
 * Render the "Waste Chute Cleaning" section.
 * - Shows site + building names, price per chute, and level notes.
 *
 * @param {Array} sites - Sites array.
 * @param {string|null|undefined} frequency - Selected frequency.
 * @returns {string} - HTML block or "" if frequency is null.
 */
const getChuteCleaningContent = (sites, frequency) => {
  if (frequency == null) return "";
  const services = getChuteCleaningServices(sites, "chute_cleaning");
  if (!services.length) return "";

  const items = services
    .map((service, i, arr) => {
      const isLast = i === arr.length - 1;
      const price = getNumber(service?.price);
      const chutes = service?.chutes ?? "";
      const levels = service?.levels ?? "";
      const siteName = service?.site_name ?? "";
      const bName = service?.building_name ? ` - ${service.building_name}` : "";
      return `
        <div
          class="avoid-break"
          style="
            ${isLast ? "border-bottom:none;" : "border-bottom:1px solid black;"}
            padding:10px;
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:10px;
          "
        >
          <div><b>${siteName}${bName}</b></div>
          <div>${price ? `$${price} + GST (Per Chute)` : ""}</div>
          <div><b>${levels ? `(Up to ${levels} Levels)` : ""}</b></div>
          <div><b>*Any Extra Levels will be invoiced <br/> accordingly</b></div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="service-section"
         style="border:1px solid black; border-top:none;">
      <div style="width:30%; text-align:center; border-right:1px solid black; min-height:45px; padding-top:5px;">
        <b>Waste Chute Cleaning</b>
      </div>
      <div style="width:15%; text-align:center; border-right:1px solid black; min-height:45px; padding-top:5px;">
        Quarterly
      </div>
      <div style="width:35%; text-align:center; min-height:45px; border-right:1px solid black;">
        ${items}
      </div>
      ${frequencyChecklistHTML(frequency, {
        visible: ["quarterly", "yearly", "six-monthly"],
      })}
    </div>
  `;
};

/**
 * Summarize equipment maintenance lines per site, grouped by equipment.
 * - Produces an array of `{ site_name, equipment: [{ equipment, equipmentLabel, count, sum, sumFormatted }] }`.
 * - NOTE: Keeps original behavior including final sort using `a.site`/`b.site`.
 *
 * @param {Array} sites - Sites array.
 * @returns {Array} - Grouped equipment summary per site.
 */
function summarizeEquipmentMaintenanceByBuilding(sites) {
  const results = [];

  for (const site of sites ?? []) {
    const siteName = (site?.site_name || "Unknown Site").trim();
    const buildings = site?.buildings ?? [];

    for (const b of buildings) {
      const rawBName = (b?.name ?? "").trim();
      const buildingDisplay = rawBName ? `${siteName} - ${rawBName}` : siteName;

      const agg = Object.create(null);
      const services = b?.services ?? [];

      for (const s of services) {
        if (!s || s.type !== "equipment_maintenance") continue;

        const equipmentKey = s.equipment || "unknown-equipment";
        const label = s.equipment_label ?? null;
        const priceNumRaw = getNumber(s.price);
        const priceNum = Number.isFinite(priceNumRaw) ? priceNumRaw : 0;

        if (!agg[equipmentKey]) {
          agg[equipmentKey] = {
            equipment: equipmentKey,
            equipmentLabel: label,
            count: 0,
            maxPrice: -Infinity,
          };
        }
        const entry = agg[equipmentKey];
        entry.count += Number(s.quantity ?? 0);
        if (priceNum > entry.maxPrice) entry.maxPrice = priceNum;
        if (!entry.equipmentLabel && label) entry.equipmentLabel = label;
      }

      const equipment = Object.values(agg)
        .map(e => ({
          equipment: e.equipment,
          equipmentLabel: e.equipmentLabel || null,
          count: e.count,
          maxPrice: Number((Number.isFinite(e.maxPrice) ? e.maxPrice : 0).toFixed(2)),
        }))
        .sort((a, b) => String(a.equipment).localeCompare(String(b.equipment)));

      results.push({ building_name: buildingDisplay, equipment });
    }
  }

  results.sort((a, b) => String(a.building_name).localeCompare(String(b.building_name)));
  return results;
}


/**
 * Render the "Equipment Preventative Maintenance" section grouped by site.
 * - Uses `summarizeEquipmentMaintenanceBySite()` to list counts and totals.
 * - For each equipment line: shows "count x <b>label</b>" on first line,
 *   and "<sum> + GST" on the next line.
 *
 * @param {Array} sites - Sites array.
 * @param {string|null|undefined} frequency - Selected frequency (controls visibility only).
 * @returns {string} - HTML block or "" if frequency is null.
 */
const getEquipmentContentGroupBySite = (sites, frequency) => {
  if (frequency == null) return "";

  const services = summarizeEquipmentMaintenanceByBuilding(sites);

  const items = services
    .map((service, i, arr) => {
      const isLast = i === arr.length - 1;
      const buildingName = service?.building_name || "";

      const equipmentLines = (service?.equipment || [])
        .map((e) => {
          const label = e?.equipmentLabel || e?.equipment || "Equipment";
          const count = e?.count ?? 0;
          const maxPrice = Number(e?.maxPrice || 0);
          return `<div>${count} x <b>${label}</b><div>${formatMoney(maxPrice)} + GST (Per System)</div></div>`;
        })
        .join("") || ``;

      return `
        <div
          class="avoid-break"
          style="
            ${isLast ? "border-bottom:none;" : "border-bottom:1px solid black;"}
            padding:10px;
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:6px;
          "
        >
          <div><b>${buildingName}</b></div>
          <div style="text-align:center; display:flex; flex-direction:column; gap:6px;">
            ${equipmentLines}
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="service-section" style="border:1px solid black;">
      <div style="width:30%; text-align:center; border-right:1px solid black; min-height:45px; padding-top:5px;">
        <b>Equipment Preventative<br/>Maintenance</b>
      </div>
      <div style="width:15%; text-align:center; border-right:1px solid black; min-height:45px; padding-top:5px;">
        Quarterly
      </div>
      <div style="width:35%; text-align:center; min-height:45px; border-right:1px solid black;">
        ${items}
      </div>
      ${frequencyChecklistHTML(frequency, {
        visible: ["quarterly", "yearly", "six-monthly"],
      })}
    </div>
  `;
};

/**
 * Render the "Equipment Preventative Maintenance" section (per building rows).
 * - Original per-service layout (not grouped by site).
 *
 * @param {Array} sites - Sites array.
 * @param {string|null|undefined} frequency - Selected frequency.
 * @returns {string} - HTML block or "" if frequency is null.
 */
const getEquipmentContent = (sites, frequency) => {
  if (frequency == null) return "";
  const services = getChuteCleaningServices(sites, "equipment_maintenance");
  if (!services.length) return "";

  const items = services
    .map((service, i, arr) => {
      const isLast = i === arr.length - 1;
      const price = getNumber(service?.price);
      const label = service?.equipment_label
        ? `${service.equipment_label.toUpperCase()}:`
        : "";
      const siteName = service?.site_name ?? "";
      const bName = service?.building_name ? ` - ${service.building_name}` : "";
      return `
        <div
          class="avoid-break"
          style="
            ${isLast ? "border-bottom:none;" : "border-bottom:1px solid black;"}
            padding:10px;
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:10px;
          "
        >
          <div><b>${siteName}${bName}</b></div>
          <div style="text-transform:uppercase;"><b>${label}</b> ${
        price ? `$${price} + GST` : ""
      }</div>
          <div><b>(Per System)</b></div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="service-section" style="border:1px solid black;">
      <div style="width:30%; text-align:center; border-right:1px solid black; min-height:45px; padding-top:5px;">
        <b>Equipment Preventative<br/>Maintenance</b>
      </div>
      <div style="width:15%; text-align:center; border-right:1px solid black; min-height:45px; padding-top:5px;">
        Quarterly
      </div>
      <div style="width:35%; text-align:center; min-height:45px; border-right:1px solid black;">
        ${items}
      </div>
       ${frequencyChecklistHTML(frequency, {
         visible: ["quarterly", "yearly", "six-monthly"],
       })}
    </div>
  `;
};

/**
 * Render the "Self-Closing Hopper Door Inspection" section.
 * - Lists site/building and price.
 *
 * @param {Array} sites - Sites array.
 * @param {string|null|undefined} frequency - Selected frequency.
 * @returns {string} - HTML block or "" if frequency is null.
 */
const getDoorInspectionContent = (sites, frequency) => {
  if (frequency == null) return "";
  const services = getChuteCleaningServices(sites, "hopper_door_inspection");
  if (!services.length) return "";

  const items = services
  .map((service, i, arr) => {
    const isLast = i === arr.length - 1;
    const price = getNumber(service?.price);
    const chutes = service?.chutes ?? "";
    const levels = service?.levels ?? "";
    const siteName = service?.site_name ?? "";
    const bName = service?.building_name ? ` - ${service.building_name}` : "";
    return `
      <div
        class="avoid-break"
        style="
          ${isLast ? "border-bottom:none;" : "border-bottom:1px solid black;"}
          padding:10px;
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:10px;
        "
      >
        <div><b>${siteName}${bName}</b></div>
        <div>${price ? `$${price} + GST (Per Chute)` : ""}</div>
        <div><b>${levels ? `(Up to ${levels} Levels)` : ""}</b></div>
        <div><b>*Any Extra Levels will be invoiced <br/> accordingly</b></div>
      </div>
    `;
  })
  .join("");

  return `
    <div class="service-section" style="border:1px solid black;">
      <div style="width:30%; text-align:center; border-right:1px solid black; min-height:45px; padding-top:5px;">
        <b>Self-Closing Hopper Door<br/>Inspection</b>
      </div>
      <div style="width:15%; text-align:center; border-right:1px solid black; min-height:45px; padding-top:5px;">
        Quarterly
      </div>
      <div style="width:35%; text-align:center; min-height:45px; border-right:1px solid black;">
        ${items}
      </div>
      ${frequencyChecklistHTML(frequency, {
        visible: ["quarterly", "yearly", "six-monthly"],
      })}
    </div>
  `;
};

/**
 * Render the "Waste Room High Pressure Clean" section.
 * - Shows site/building, price, area label, and per-room note.
 *
 * @param {Array} sites - Sites array.
 * @param {string|null|undefined} frequency - Selected frequency.
 * @returns {string} - HTML block or "" if frequency is null.
 */
const getWasteRoomCleanContent = (sites, frequency) => {
  if (frequency == null) return "";
  const services = getChuteCleaningServices(sites, "waste_room_pressure_clean");
  if (!services.length) return "";

  const items = services
    .map((service, i, arr) => {
      const isLast = i === arr.length - 1;
      const price = getNumber(service?.price);
      const areaLabel = service?.area_label ?? "";
      const siteName = service?.site_name ?? "";
      const bName = service?.building_name ? ` - ${service.building_name}` : "";
      return `
        <div
          class="avoid-break"
          style="
            ${isLast ? "border-bottom:none;" : "border-bottom:1px solid black;"}
           padding:10px;
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:10px;
          "
        >
          <div><b>${siteName}${bName}</b></div>
          <div>${price ? `$${price} + GST` : ""}</div>
          <div><b>${areaLabel}</b></div>
          <div><b>(Per Waste Room)</b></div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="service-section" style="border:1px solid black;">
      <div style="width:30%; text-align:center; border-right:1px solid black; min-height:45px; padding-top:5px;">
        <b>Waste Room High Pressure<br/>Clean</b>
      </div>
      <div style="width:15%; text-align:center; border-right:1px solid black; min-height:45px; padding-top:5px;">
        Quarterly
      </div>
      <div style="width:35%; text-align:center; min-height:45px; border-right:1px solid black;">
        ${items}
      </div>
     ${frequencyChecklistHTML(frequency, {
       visible: ["quarterly", "yearly", "six-monthly"],
     })}
    </div>
  `;
};

/**
 * Render the "EF Neutraliser (Odour Management System)" section.
 * - Shows per-unit price, contract notes, and a units box for each entry.
 *
 * @param {Array} sites - Sites array.
 * @param {string|null|undefined} frequency - Selected frequency.
 * @param {Object} units - Map of serviceId -> unit count.
 * @returns {string} - HTML block or "" if frequency is null.
 */
const getOdourControlContent = (sites, frequency, units) => {
  if (frequency == null) return "";
  const services = getChuteCleaningServices(sites, "odour_control");
  if (!services.length) return "";

  const items = services
    .map((service, i, arr) => {
      const isLast = i === arr.length - 1;
      const price = getNumber(service?.price);
      const siteName = service?.site_name ?? "";
      const bName = service?.building_name ? ` - ${service.building_name}` : "";
      const unit = getNumber(units?.[service?.id] ?? "");
      return `
        <div
          class="avoid-break"
          style="
            ${isLast ? "border-bottom:none;" : "border-bottom:1px solid black;"}
            padding:10px;
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:10px;
          "
        >
          <div><b>${siteName}${bName}</b></div>
          <div>${price ? `$${price} + GST` : ""}</div>
          <div>(Per Unit, No Installation cost. Min 2 year contract)</div>
          <div><b>*240V 10AMP Outlet Must be Supplied in Waste Room</b></div>
          <div style="display:flex; flex-direction:row; align-items:center; gap:10px;">
            <div style="width:55px; height:30px; border:1px solid black; display: flex; justify-content: center; align-items: center; font-weight: bold;">${
              frequency == "none" ? "" : unit || ""
            }</div>
            <div>UNITS</div>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="service-section" style="border:1px solid black;">
      <div style="width:30%; text-align:center; border-right:1px solid black; min-height:45px; padding-top:5px;">
        <b>EF Neutraliser <br/><br/>(Odour Management System)</b>
      </div>
      <div style="width:15%; text-align:center; border-right:1px solid black; min-height:45px; padding-top:5px;">
        Quarterly
      </div>
      <div style="width:35%; text-align:center; min-height:45px; border-right:1px solid black;">
        ${items}
      </div>
      ${frequencyChecklistHTML(frequency, { visible: ["quarterly"] })}
    </div>
  `;
};

/**
 * Render the "Wheelie Bin Cleaning" section.
 * - Shows site/building and price.
 *
 * @param {Array} sites - Sites array.
 * @param {string|null|undefined} frequency - Selected frequency.
 * @returns {string} - HTML block or "" if frequency is null.
 */
const getWasteBinCleanContent = (sites, frequency) => {
  if (frequency == null) return "";
  const services = getChuteCleaningServices(sites, "bin_cleaning");
  if (!services.length) return "";

  const items = services
    .map((service, i, arr) => {
      const isLast = i === arr.length - 1;
      const price = getNumber(service?.price);
      const siteName = service?.site_name ?? "";
      const bName = service?.building_name ? ` - ${service.building_name}` : "";
      return `
        <div
          class="avoid-break"
          style="
            ${isLast ? "border-bottom:none;" : "border-bottom:1px solid black;"}
            padding:10px;
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:10px;
          "
        >
          <div><b>${siteName}${bName}</b></div>
          <div>${price ? `$${price} + GST` : ""}</div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="service-section" style="border:1px solid black;">
      <div style="width:30%; text-align:center; border-right:1px solid black; min-height:45px; padding-top:5px;">
        <b>Wheelie Bin Cleaning</b>
      </div>
      <div style="width:15%; text-align:center; border-right:1px solid black; min-height:45px; padding-top:5px;">
        Quarterly
      </div>
      <div style="width:35%; text-align:center; min-height:45px; border-right:1px solid black;">
        ${items}
      </div>
      ${frequencyChecklistHTML(frequency, {
        visible: ["quarterly", "yearly", "six-monthly"],
      })}
    </div>
  `;
};

/**
 * Build the "Incentives" section based on selected service frequencies.
 * - Returns empty string if < 3 services selected.
 * - Tiers:
 *    3 => BASIC
 *    4–5 => ESSENTIAL
 *    6+ => PREMIUM
 *
 * @param {Object} params
 * @param {Object} params.frequencies - Selected frequencies object.
 * @returns {string} - HTML snippet or "".
 */
const getIncentivesContent = ({ frequencies = {} } = {}) => {
  const norm = (v) =>
    String(v ?? "")
      .trim()
      .toLowerCase();

  const isSelected = (v) => {
    const n = norm(v);
    return n !== "" && n !== "none";
  };

  const serviceCount = [
    frequencies?.chuteCleaningFrequency,
    frequencies?.equipmentMaintenanceFrequency,
    frequencies?.selfClosingHopperDoorInspectionFrequency,
    frequencies?.wasteRoomCleaningFrequency,
    frequencies?.binCleaningFrequency,
    frequencies?.odourControlFrequency,
  ].filter(isSelected).length;

  if (serviceCount < 3) return "";

  let tier = "";
  let incentives = [];

  if (serviceCount === 3) {
    tier = "BASIC";
    incentives = [
      "Price Lock Guarantee (24 Months)",
      "Priority Response Within 8 Hours",
      "Priority Booking",
    ];
  } else if (serviceCount > 3 && serviceCount < 6) {
    tier = "ESSENTIAL";
    incentives = [
      "Price Lock Guarantee (24 Months)",
      "Priority Response Within 8 Hours",
      "Priority Booking",
      "Flexible 21-Day Payment Terms",
      "10% Discounts on Parts",
      "5% Service Pricing Discounts",
    ];
  } else {
    tier = "PREMIUM";
    incentives = [
      "Price Lock Guarantee (24 Months)",
      "Priority Response Within 8 Hours",
      "Priority Booking",
      "Flexible 21-Day Payment Terms",
      "15% Discounts on Parts",
      "10% Service Pricing Discounts",
      "Complimentary Odour Control (First 3 Months)",
    ];
  }

  const tableHeader = `
    <div class="section" style="margin-top:40px;">
      <div><u><b>INCENTIVES:</b></u></div>
    </div>
    <div
      class="section"
      style="
        margin-top:5px;
        border:1px solid black;
        background-color:#f5c644;
        color:white;
        display:flex;
      "
    >
      <div
        style="
          width:30%;
          text-align:center;
          border-right:1px solid black;
          min-height:22px;
          padding-top:5px;
          padding-left:10px;
        "
      >
        <b>TIER</b>
      </div>
      <div
        style="
          width:70%;
          text-align:center;
          min-height:22px;
          padding-top:5px;
          padding-left:10px;
        "
      >
        <b>INCENTIVES</b>
      </div>
    </div>
  `;

  const rowTemplate = ({ tierText, incentiveText }) => `
    <div
      class="section"
      style="
        border:1px solid black;
        color:black;
        border-top:none;
        display:flex;
      "
    >
      <div
        style="
          width:30%;
          text-align:left;
          border-right:1px solid black;
          min-height:22px;
          padding-top:5px;
          padding-left:10px;
        "
      >
        ${tierText}
      </div>
      <div
        style="
          width:70%;
          text-align:left;
          min-height:22px;
          padding-top:5px;
          padding-left:10px;
        "
      >
        ${incentiveText}
      </div>
    </div>
  `;

  const rows = (incentives || [])
    .map((inc, i) =>
      rowTemplate({
        tierText: i === 0 ? `<b>${tier}</b>` : "",
        incentiveText: inc || "",
      })
    )
    .join("");

  return tableHeader + rows;
};

/* ===========================================================================
   Main Templating – fillData()
   =========================================================================== */

/**
 * Fill an HTML template string with data from a Service Agreement object.
 * - Replaces known placeholders with formatted values.
 * - Builds and injects all service section HTML blocks.
 * - All operations are defensive; missing values yield "" rather than throw.
 *
 * @param {string} html - The HTML template containing placeholders.
 * @param {Object} data - Data object with company, agreement, and frequency info.
 * @returns {string} - Final HTML string with placeholders replaced.
 */
function fillData(html, data) {
  const d = data ?? {};

  // Company basics
  const companyName = d?.companyName ?? "";
  const abn = d?.abn ?? "";
  const address = safeJoin(
    [
      d?.businessStreetAddress,
      d?.businessCity,
      d?.businessPostcode,
      d?.businessState,
      d?.businessStreetAddress &&
      d?.businessCity &&
      d?.businessPostcode &&
      d?.businessState
        ? "Australia"
        : "",
    ],
    ", "
  );
  const accountsEmail = d?.accountEmail ?? "";

  // Phones (conditionally show Mobile/Phone, joined with " | ")
  const phoneLine = safeJoin(
    [
      d?.accountMobile?.trim()
        ? `Mobile: ${d.accountMobile.trim()}`
        : undefined,
      d?.accountPhone?.trim() ? `Phone: ${d.accountPhone.trim()}` : undefined,
    ],
    " | "
  );

  // Dates
  const startDate = toDDMMYYYY(d?.serviceAgreement?.start_date ?? "");
  const endDate = toDDMMYYYY(d?.serviceAgreement?.end_date ?? "");

  // Totals (grand total for entire contract * 2, per original)
  const grand = computeGrandTotal({
    sites: d?.serviceAgreement?.sites || [],
    frequencies: {
      chuteCleaningFrequency: d?.chuteCleaningFrequency ?? null,
      equipmentMaintenanceFrequency: d?.equipmentMaintenanceFrequency ?? null,
      selfClosingHopperDoorInspectionFrequency:
        d?.selfClosingHopperDoorInspectionFrequency ?? null,
      wasteRoomCleaningFrequency: d?.wasteRoomCleaningFrequency ?? null,
      binCleaningFrequency: d?.binCleaningFrequency ?? null,
      odourControlFrequency: d?.odourControlFrequency ?? null,
    },
    odourControlUnits: d?.odourControlUnits || {},
    getDiscount: getDiscountDefault,
    incentives: d?.serviceAgreement?.incentives ?? null,
  });
  const contractTotal = grand === 0 || !grand ? "" : formatMoney(grand * 2);

  // Service sections (each builder is defensive)
  const sites = d?.serviceAgreement?.sites || [];
  const servicesHTML =
    getChuteCleaningContent(sites, d?.chuteCleaningFrequency ?? null) +
    getEquipmentContentGroupBySite(
      sites,
      d?.equipmentMaintenanceFrequency ?? null
    ) +
    getDoorInspectionContent(
      sites,
      d?.selfClosingHopperDoorInspectionFrequency ?? null
    ) +
    getWasteRoomCleanContent(sites, d?.wasteRoomCleaningFrequency ?? null) +
    getWasteBinCleanContent(sites, d?.binCleaningFrequency ?? null) +
    getOdourControlContent(
      sites,
      d?.odourControlFrequency ?? null,
      d?.odourControlUnits || {}
    );

  // Cover page site names
  const siteNamesHTML = getCoverPageSitesNames(sites);

  // Signatory
  const signName = d?.signFullName ?? "";
  const trimmedDataURL = d?.trimmedDataURL ?? "";
  const salesperson = d?.serviceAgreement?.salesperson ?? "";

  // Signature box (image scaled to fit within fixed-height area)
  const signatureHTML = trimmedDataURL
    ? `<div style="height:${IMAGE_ZONE_PX}px; display:flex; align-items:center; justify-content:flex-start;">
         <img src="${trimmedDataURL}" alt="Signature"
              style="display:block; max-height:100%; max-width:100%; height:auto; width:auto; object-fit:contain;" />
       </div>`
    : `<div style="height:${IMAGE_ZONE_PX}px;"></div>`;

  // Today (AU)
  const today = TODAY_AU;

  let incentivesHTML = "";
  if (d?.serviceAgreement?.incentives) {
    incentivesHTML = getIncentivesContent({
      frequencies: {
        chuteCleaningFrequency: d?.chuteCleaningFrequency ?? null,
        equipmentMaintenanceFrequency: d?.equipmentMaintenanceFrequency ?? null,
        selfClosingHopperDoorInspectionFrequency:
          d?.selfClosingHopperDoorInspectionFrequency ?? null,
        wasteRoomCleaningFrequency: d?.wasteRoomCleaningFrequency ?? null,
        binCleaningFrequency: d?.binCleaningFrequency ?? null,
        odourControlFrequency: d?.odourControlFrequency ?? null,
      },
    });
  }

  // Perform safe replacements
  let out = String(html ?? "");
  out = safeReplaceAll(out, "{COMPANY_NAME}", companyName);
  out = safeReplaceAll(out, "{ABN}", abn);
  out = safeReplaceAll(out, "{ADDRESS}", address);
  out = safeReplaceAll(out, "{ACCOUNTS_EMAILS}", accountsEmail);
  out = safeReplaceAll(out, "{ACCOUNT_PHONE}", phoneLine);
  out = safeReplaceAll(out, "{START_DATE}", startDate);
  out = safeReplaceAll(out, "{END_DATE}", endDate);
  out = safeReplaceAll(out, "{CONTRACT_TOTAL}", contractTotal);
  out = safeReplaceAll(out, "{SERVICE-CONTENT}", servicesHTML);
  out = safeReplaceAll(out, "{SITE_NAME}", siteNamesHTML);
  out = safeReplaceAll(out, "{NAME}", signName);
  out = safeReplaceAll(out, "{SIGNATURE}", signatureHTML);
  out = safeReplaceAll(out, "{DATE}", today);
  out = safeReplaceAll(out, "{SALESPERSON}", salesperson);
  out = safeReplaceAll(out, "{INCENTIVES-CONTENT}", incentivesHTML);

  return out;
}

/* ===========================================================================
   Exports
   =========================================================================== */

module.exports = {
  fillData,
  // exporting helpers too (handy for tests or reuse)
  toDDMMYYYY,
  formatMoney,
  getNumber,
  getServices,
  getServiceAnualCost,
  getDiscountDefault,
  computeGrandTotal,
  frequencyChecklistHTML, // exported for testing if needed
};
