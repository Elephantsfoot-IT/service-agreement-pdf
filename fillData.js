// ============================================================================
// Service Agreement HTML Builder – Defensive, Commented Refactor
// ============================================================================
// This module renders contract HTML from a data object that may have
// missing/partial fields. All lookups are defensive and all placeholders
// default to "" (empty string) if not provided.
//
// Key improvements:
// - Safe placeholder replacement via safeReplaceAll()
// - Defensive access with optional chaining and defaults
// - Robust date/number formatting helpers
// - Clear JSDoc comments for all functions
// - No throws on missing/invalid data
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

// ============================================================================
// Small Safe Helpers
// ============================================================================

/**
 * Safely format a date for a given IANA time zone. Returns "" on failure.
 * @param {Date|number|string} date
 * @param {string} fmt
 * @returns {string}
 */
function safeFormatInSydney(date, fmt) {
  try {
    return formatInTimeZone(date, "Australia/Sydney", fmt);
  } catch {
    return "";
  }
}

/**
 * Replace ALL occurrences of a token in a string.
 * Falls back to original if inputs are not strings.
 * @param {string} html
 * @param {string} token e.g. "{COMPANY_NAME}"
 * @param {string} value
 * @returns {string}
 */
function safeReplaceAll(html, token, value = "") {
  if (typeof html !== "string" || typeof token !== "string") return html ?? "";
  const v = value == null ? "" : String(value);
  return html.split(token).join(v);
}

/**
 * Safe join with trimming and filtering falsy values.
 * @param {Array<string|undefined|null>} parts
 * @param {string} sep
 * @returns {string}
 */
function safeJoin(parts, sep = " ") {
  return (Array.isArray(parts) ? parts : [])
    .map((p) => (p ?? "").toString().trim())
    .filter(Boolean)
    .join(sep);
}

// ============================================================================
// Date & Number Utilities
// ============================================================================

/**
 * Format an ISO-like date string (YYYY-MM-DD / ISO timestamp) as DD/MM/YYYY.
 * Returns "" if invalid or missing.
 * @param {string} iso
 * @returns {string}
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
 * Convert a price-like value ("$300.00", "300", "300,00", number) to Number.
 * Returns 0 if it cannot be parsed.
 * @param {string|number} val
 * @returns {number}
 */
function getNumber(val) {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (val == null) return 0;
  // Keep digits, comma, dot; convert comma to dot only if it looks decimal.
  const cleaned = String(val).replace(/[^0-9.,-]/g, "");
  // If both comma and dot present, remove thousands separators (commas)
  const normalized =
    cleaned.includes(".") && cleaned.includes(",")
      ? cleaned.replace(/,/g, "")
      : cleaned.replace(",", ".");
  const num = parseFloat(normalized);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Format a number as AUD currency. Returns "$0.00" on invalid input.
 * @param {number} n
 * @returns {string}
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
    // Fallback if locale options unavailable in environment
    return `$${safe.toFixed(2)}`;
  }
}

// ============================================================================
// Discount & Totals Utilities
// ============================================================================

/**
 * Default discount rule based on the number of selected service frequencies.
 * - < 3 => 0%
 * - 4–5 => 5%
 * - >= 6 => 10%
 * @param {number} serviceCount
 * @returns {number} percentage (0, 5, 10)
 */
function getDiscountDefault(serviceCount) {
  const c = Number.isFinite(serviceCount) ? serviceCount : 0;
  if (c < 3) return 0;
  if (c >= 4 && c < 6) return 5;
  if (c >= 6) return 10;
  return 0;
}

/**
 * Get multiplier for frequency.
 * @param {string|null|undefined} frequency
 * @returns {number} 4 (quarterly), 2 (six-monthly), 1 (yearly), or 0 if missing
 */
function frequencyToMultiplier(frequency) {
  const f = (frequency ?? "").toString().trim().toLowerCase();
  
  if (!f) return 0;
  if (f === "none") return 0;
  if (f === "yearly") return 1;
  if (f === "six-monthly" || f === "6monthly" || f === "six monthly") return 2;
  // Default to quarterly if something is provided but not matched
  return 4;
}

/**
 * Annualized cost helper for all services except odour-control.
 * @param {Array} services
 * @param {string|null|undefined} frequency
 * @returns {number}
 */
function getServiceAnualCost(services, frequency) {
  const mult = frequencyToMultiplier(frequency);
  if (!mult || !Array.isArray(services) || services.length === 0) return 0;
  return services.reduce((acc, s) => acc + getNumber(s?.price) * mult, 0);
}

/**
 * Gather services of a given type from the sites array.
 * Returns { type, items } where each item carries site/building context.
 * @param {Array} sites
 * @param {string} type
 * @returns {{ type: string, items: Array }}
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
 * Compute the grand total for all services with optional discount.
 * Odour control = sum(units * unitPrice * frequencyMultiplier) ONLY if
 * odour frequency is selected.
 * @param {Object} params
 * @param {Array}  params.sites
 * @param {Object} params.frequencies
 * @param {Object<string, number>} params.odourControlUnits
 * @param {(n:number)=>number} [params.getDiscount]
 * @returns {number}
 */
function computeGrandTotal({
  sites = [],
  frequencies = {},
  odourControlUnits = {},
  getDiscount = getDiscountDefault,
}) {
  // Pull frequencies defensively
  const chuteCleaningFrequency = frequencies?.chuteCleaningFrequency ?? null;
  const equipmentMaintenanceFrequency =
    frequencies?.equipmentMaintenanceFrequency ?? null;
  const selfClosingHopperDoorInspectionFrequency =
    frequencies?.selfClosingHopperDoorInspectionFrequency ?? null;
  const wasteRoomCleaningFrequency =
    frequencies?.wasteRoomCleaningFrequency ?? null;
  const binCleaningFrequency = frequencies?.binCleaningFrequency ?? null;
  const odourControlFrequency = frequencies?.odourControlFrequency ?? null;

  // Collect services by type
  const chute = getServices(sites, "chute_cleaning");
  const equip = getServices(sites, "equipment_maintenance");
  const hopper = getServices(sites, "hopper_door_inspection");
  const waste = getServices(sites, "waste_room_pressure_clean");
  const bin = getServices(sites, "bin_cleaning");
  const odour = getServices(sites, "odour_control");

  // Annual totals (per rules)
  const chuteAnnual = getServiceAnualCost(chute.items, chuteCleaningFrequency);
  const equipAnnual = getServiceAnualCost(
    equip.items,
    equipmentMaintenanceFrequency
  );
  const hopperAnnual = getServiceAnualCost(
    hopper.items,
    selfClosingHopperDoorInspectionFrequency
  );
  const wasteAnnual = getServiceAnualCost(
    waste.items,
    wasteRoomCleaningFrequency
  );
  const binAnnual = getServiceAnualCost(bin.items, binCleaningFrequency);

  // Odour control = sum(qty * unitPrice * frequencyMultiplier) if frequency set
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

  // Discount based on how many frequencies are selected
  const serviceCount = [
    chuteCleaningFrequency,
    equipmentMaintenanceFrequency,
    selfClosingHopperDoorInspectionFrequency,
    wasteRoomCleaningFrequency,
    binCleaningFrequency,
    odourControlFrequency,
  ].filter((f) => f != null && String(f).trim() !== "").length;

  const discountPct = Number(getDiscount(Number(serviceCount))) || 0;
  const discountAmt = discountPct ? (subtotal * discountPct) / 100 : 0;

  // Never negative
  return Math.max(0, subtotal - discountAmt);
}

// ============================================================================
// Site/Name Helpers (for cover page)
// ============================================================================

/**
 * Flatten site names (one per building entry). Keeps duplicates if the same
 * site appears multiple times (mirrors the original logic).
 * @param {Array} sites
 * @returns {string[]}
 */
function getSitesNames(sites) {
  if (!Array.isArray(sites)) return [];
  return sites.flatMap((site) =>
    (site?.buildings ?? []).flatMap(() => site?.site_name ?? "")
  );
}

/**
 * Build the cover-page list of site names as HTML (defensive).
 * @param {Array} sites
 * @returns {string}
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

// ============================================================================
// HTML Builders – Service Sections
// ============================================================================

/** Internal: generic collector used by all sections here */
function getChuteCleaningServices(sites, type) {
  return getServices(sites, type).items || [];
}

/**
 * Common frequency checklist builder (defensive)
 * @param {string|null|undefined} frequency
 * @param {Object} [opts]
 * @param {string[]} [opts.hide]
 * @param {string[]} [opts.visible]
 * @returns {string}
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

  // Visibility rules
  let filtered = items;
  if (Array.isArray(opts.visible) && opts.visible.length) {
    const vis = new Set(opts.visible.map(norm));
    filtered = filtered.filter((it) => vis.has(it.key));
  } else if (Array.isArray(opts.hide) && opts.hide.length) {
    const hide = new Set(opts.hide.map(norm));
    filtered = filtered.filter((it) => !hide.has(it.key));
  }

  // Nothing to show? return an empty container to keep layout stable
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

// -- Waste Chute Cleaning -----------------------------------------------------
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
            padding-right:10px;
            padding-left:10px;
            padding-bottom:10px;
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:10px;
          "
        >
          <div><b>${siteName}${bName}</b></div>
          <div>${chutes ? `${chutes} Chutes` : ""}</div>
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
      <div style="width:35%; text-align:center; min-height:45px; padding-top:5px; border-right:1px solid black;">
        ${items}
      </div>
      ${frequencyChecklistHTML(frequency, {
        visible: ["quarterly", "yearly", "six-monthly"],
      })}
    </div>
  `;
};

// -- Equipment Preventative Maintenance --------------------------------------
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
            padding-right:10px;
            padding-left:10px;
            padding-bottom:10px;
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
      <div style="width:35%; text-align:center; min-height:45px; padding-top:5px; border-right:1px solid black;">
        ${items}
      </div>
       ${frequencyChecklistHTML(frequency, {
         visible: ["quarterly", "yearly", "six-monthly"],
       })}
    </div>
  `;
};

// -- Self-Closing Hopper Door Inspection -------------------------------------
const getDoorInspectionContent = (sites, frequency) => {
  if (frequency == null) return "";
  const services = getChuteCleaningServices(sites, "hopper_door_inspection");
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
            padding-right:10px;
            padding-left:10px;
            padding-bottom:10px;
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
        <b>Self-Closing Hopper Door<br/>Inspection</b>
      </div>
      <div style="width:15%; text-align:center; border-right:1px solid black; min-height:45px; padding-top:5px;">
        Quarterly
      </div>
      <div style="width:35%; text-align:center; min-height:45px; padding-top:5px; border-right:1px solid black;">
        ${items}
      </div>
      ${frequencyChecklistHTML(frequency, {
        visible: ["quarterly", "yearly", "six-monthly"],
      })}
    </div>
  `;
};

// -- Waste Room High Pressure Clean ------------------------------------------
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
            padding-right:10px;
            padding-left:10px;
            padding-bottom:10px;
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
      <div style="width:35%; text-align:center; min-height:45px; padding-top:5px; border-right:1px solid black;">
        ${items}
      </div>
     ${frequencyChecklistHTML(frequency, {
       visible: ["quarterly", "yearly", "six-monthly"],
     })}
    </div>
  `;
};

// -- Odour Control ------------------------------------------------------------
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
            padding-right:10px;
            padding-left:10px;
            padding-bottom:10px;
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
              unit || ""
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
      <div style="width:35%; text-align:center; min-height:45px; padding-top:5px; border-right:1px solid black;">
        ${items}
      </div>
      ${frequencyChecklistHTML(frequency, { visible: ["quarterly"] })}
    </div>
  `;
};
// -- Wheelie Bin Cleaning -----------------------------------------------------
/**
 * Render the Wheelie Bin Cleaning section.
 * Defensive: returns "" if frequency is null/undefined or no services exist.
 * @param {Array} sites
 * @param {string|null|undefined} frequency
 * @returns {string}
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
            padding-right:10px;
            padding-left:10px;
            padding-bottom:10px;
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
      <div style="width:35%; text-align:center; min-height:45px; padding-top:5px; border-right:1px solid black;">
        ${items}
      </div>
      ${frequencyChecklistHTML(frequency, {
        visible: ["quarterly", "yearly", "six-monthly"],
      })}
    </div>
  `;
};

// ============================================================================
// Main Templating – fillData()
// ============================================================================

/**
 * Fill your HTML template with data. Expects the placeholders you used:
 * {COMPANY_NAME}, {ABN}, {ADDRESS}, {ACCOUNTS_EMAILS}, {ACCOUNT_PHONE},
 * {START_DATE}, {END_DATE}, {CONTRACT_TOTAL}, {SERVICE-CONTENT},
 * {SITE_NAME}, {NAME}, {SIGNATURE}, {DATE}
 *
 * All replacements are defensive; missing data produces "".
 *
 * @param {string} html
 * @param {Object} data
 * @returns {string}
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
      "Australia",
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
  });
  const contractTotal = (grand === 0 || !grand) ? "" : formatMoney(grand * 2);

  // Service sections (each builder is defensive)
  const sites = d?.serviceAgreement?.sites || [];
  const servicesHTML =
    getChuteCleaningContent(sites, d?.chuteCleaningFrequency ?? null) +
    getEquipmentContent(sites, d?.equipmentMaintenanceFrequency ?? null) +
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

  const salesperson = d?.salesperson ?? "";

  // Signature box (image scaled to fit within fixed-height area)
  const signatureHTML = trimmedDataURL
    ? `<div style="height:${IMAGE_ZONE_PX}px; display:flex; align-items:center; justify-content:flex-start;">
         <img src="${trimmedDataURL}" alt="Signature"
              style="display:block; max-height:100%; max-width:100%; height:auto; width:auto; object-fit:contain;" />
       </div>`
    : `<div style="height:${IMAGE_ZONE_PX}px;"></div>`;

  // Today (AU)
  const today = TODAY_AU;

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

  return out;
}

// ============================================================================
// Exports
// ============================================================================
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
