// ============================================================================
// Imports & Constants
// ============================================================================
const { parseISO, format, isValid } = require("date-fns");
const { formatInTimeZone } = require("date-fns-tz");

const IMAGE_ZONE_PX = 160; // visual height reserved for signature image
const TODAY_AU = formatInTimeZone(new Date(), "Australia/Sydney", "dd/MM/yyyy");
const BOX_PX = 12;
const BORDER = "black";
const STROKE = "black";
const STROKE_W = 2;

// ============================================================================
// Date & Number Utilities
// ============================================================================

/**
 * Format an ISO date string (YYYY-MM-DD / ISO timestamp) as DD/MM/YYYY.
 * @param {string} iso
 * @returns {string}
 */
function toDDMMYYYY(iso) {
  if (!iso) return "";
  const d = parseISO(iso);
  return isValid(d) ? format(d, "dd/MM/yyyy") : "";
}

/**
 * Convert a price-like value ("$300.00", "300", number) to a Number.
 * Returns 0 if it cannot be parsed.
 * @param {string|number} val
 * @returns {number}
 */
function getNumber(val) {
  if (typeof val === "number") return val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Format a number as AUD currency for display.
 * @param {number} n
 * @returns {string}
 */
function formatMoney(n) {
  return n.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  });
}

// ============================================================================
// Discount & Totals Utilities
// ============================================================================

/**
 * Default discount rule based on the number of selected service frequencies.
 * - < 3 => 0%
 * - 4–5 => 5%
 * - >= 6 => 10%
 * Adjust as needed.
 * @param {number} serviceCount
 * @returns {number} percentage (0, 5, 10)
 */
function getDiscountDefault(serviceCount) {
  if (serviceCount < 3) return 0;
  if (serviceCount >= 4 && serviceCount < 6) return 5;
  if (serviceCount >= 6) return 10;
  return 0;
}

/**
 * Annualized cost helper for all services except odour-control.
 * Frequency: "quarterly" => 4, "six-monthly" => 2, "yearly" => 1
 * @param {Array} services
 * @param {string|null} frequency
 * @returns {number}
 */
function getServiceAnualCost(services, frequency) {
  if (!frequency) return 0;
  const frequencyValue =
    frequency === "yearly" ? 1 : frequency === "six-monthly" ? 2 : 4; // default to quarterly
  return (services || []).reduce(
    (acc, s) => acc + getNumber(s.price) * frequencyValue,
    0
  );
}

/**
 * Gather services of a given type from the sites array.
 * Returns { type, items } where each item carries site/building context.
 * @param {Array} sites
 * @param {string} type
 * @returns {{ type: string, items: Array }}
 */
function getServices(sites, type) {
  const items = (sites || []).flatMap((site) =>
    (site.buildings || []).flatMap((b) =>
      (b.services || [])
        .filter((s) => s && s.type === type)
        .map((s) => ({
          site_name: site.site_name,
          site_id: site.simpro_site_id,
          building_id: b.id,
          building_name: b.name || null,
          ...s,
        }))
    )
  );
  return { type, items };
}

/**
 * Compute the grand total for all services with optional discount.
 * Odour control = sum(units * unitPrice) ONLY if odour frequency is selected.
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
  const {
    chuteCleaningFrequency,
    equipmentMaintenanceFrequency,
    selfClosingHopperDoorInspectionFrequency,
    wasteRoomCleaningFrequency,
    binCleaningFrequency,
    odourControlFrequency,
  } = frequencies;

  // Collect services by type
  const chute = getServices(sites, "chute_cleaning");
  const equip = getServices(sites, "equipment_maintenance");
  const hopper = getServices(sites, "hopper_door_inspection");
  const waste = getServices(sites, "waste_room_pressure_clean");
  const bin = getServices(sites, "bin_cleaning");
  const odour = getServices(sites, "odour_control");

  // Annual totals (per your rules)
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

  // Odour control = sum(qty * unitPrice) if frequency is selected
  const odourAnnual = odourControlFrequency
    ? (odour.items || []).reduce((acc, r) => {
      const frequencyValue =odourControlFrequency === "yearly" ? 1 : odourControlFrequency === "six-monthly" ? 2 : 4;
        const qty = odourControlUnits[r.id] || 0;
        return acc + qty * getNumber(r.price) * frequencyValue;
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
  ].filter((f) => f != null && f !== "").length;

  const discountPct = getDiscount(Number(serviceCount)) || 0;
  const discountAmt = discountPct ? (subtotal * discountPct) / 100 : 0;

  return Math.max(0, subtotal - discountAmt);
}

// ============================================================================
// Site/Name Helpers (for cover page)
// ============================================================================

/**
 * Flatten site names (one per building entry). Keeps duplicates if the same
 * site appears multiple times (as in your original logic).
 * @param {Array} sites
 * @returns {string[]}
 */
function getSitesNames(sites) {
  if (!Array.isArray(sites)) return [];
  return sites.flatMap((site) =>
    (site.buildings ?? []).flatMap(() => site.site_name)
  );
}

/**
 * Build the cover-page list of site names as HTML.
 * @param {Array} sites
 * @returns {string}
 */
function getCoverPageSitesNames(sites) {
  const siteNames = getSitesNames(sites)
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

// -- Waste Chute Cleaning -----------------------------------------------------
const getChuteCleaningContent = (sites, frequency) => {
  if (frequency === null) return "";
  const services = getChuteCleaningServices(sites, "chute_cleaning");
  if (!services.length) return "";

  const items = services
    .map((service, i, arr) => {
      const isLast = i === arr.length - 1;
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
          <div><b>${service.site_name}${
        service.building_name ? " - " + service.building_name : ""
      }</b></div>
          <div>${service.chutes} Chutes</div>
          <div>$${service.price} + GST (Per Chute)</div>
          <div><b>(Up to ${service.levels} Levels)</b></div>
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
  if (frequency === null) return "";
  const services = getChuteCleaningServices(sites, "equipment_maintenance");
  if (!services.length) return "";

  const items = services
    .map((service, i, arr) => {
      const isLast = i === arr.length - 1;
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
          <div><b>${service.site_name}${
        service.building_name ? " - " + service.building_name : ""
      }</b></div>
          <div style="text-transform:uppercase;"><b>${
            service.equipment_label ? service.equipment_label + ":" : ""
          }</b> $${service.price} + GST</div>
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
  if (frequency === null) return "";
  const services = getChuteCleaningServices(sites, "hopper_door_inspection");
  if (!services.length) return "";

  const items = services
    .map((service, i, arr) => {
      const isLast = i === arr.length - 1;
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
          <div><b>${service.site_name}${
        service.building_name ? " - " + service.building_name : ""
      }</b></div>
          <div>$${service.price} + GST</div>
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
  if (frequency === null) return "";
  const services = getChuteCleaningServices(sites, "waste_room_pressure_clean");
  if (!services.length) return "";

  const items = services
    .map((service, i, arr) => {
      const isLast = i === arr.length - 1;
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
          <div><b>${service.site_name}${
        service.building_name ? " - " + service.building_name : ""
      }</b></div>
          <div>$${service.price} + GST</div>
          <div><b>${service.area_label}</b></div>
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

// -- Wheelie Bin Cleaning -----------------------------------------------------
const getWasteBinCleanContent = (sites, frequency) => {
  if (frequency === null) return "";
  const services = getChuteCleaningServices(sites, "bin_cleaning");
  if (!services.length) return "";

  const items = services
    .map((service, i, arr) => {
      const isLast = i === arr.length - 1;
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
          <div><b>${service.site_name}${
        service.building_name ? " - " + service.building_name : ""
      }</b></div>
          <div>$${service.price} + GST</div>
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

// -- Odour Control ------------------------------------------------------------
const getOdourControlContent = (sites, frequency, units) => {
  if (frequency === null) return "";
  const services = getChuteCleaningServices(sites, "odour_control");
  if (!services.length) return "";

  const items = services
    .map((service, i, arr) => {
      const isLast = i === arr.length - 1;
      const unit = units[service.id];
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
          <div><b>${service.site_name}${
        service.building_name ? " - " + service.building_name : ""
      }</b></div>
          <div>$${service.price} + GST</div>
          <div>(Per Unit, No Installation cost. Min 2 year contract)</div>
          <div><b>*240V 10AMP Outlet Must be Supplied in Waste Room</b></div>
          <div style="display:flex; flex-direction:row; align-items:center; gap:10px;">
            <div style="width:55px; height:30px; border:1px solid black; display: flex; justify-content: center; align-items: center; font-weight: bold;">${unit}</div>
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
      ${frequencyChecklistHTML(frequency, {
        visible: ["quarterly"],
      })}
    </div>
  `;
};

/**
 * Render a 3-option frequency checklist, ticking exactly one based on `frequency`.
 * You can hide rows with `hide: [...]` or explicitly set which to show via `visible: [...]`.
 *
 * @param {string|null|undefined} frequency - "quarterly" | "six-monthly" | "yearly" (case/space tolerant)
 * @param {Object} [opts]
 * @param {string[]} [opts.hide]    - e.g. ["yearly"]           -> hide these rows
 * @param {string[]} [opts.visible] - e.g. ["quarterly","yearly"] -> only show these rows
 * @returns {string} HTML
 */
function frequencyChecklistHTML(frequency, opts = {}) {
  const norm = (s) =>
    (s || "").toString().trim().toLowerCase().replace(/\s+/g, "-");

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

// ============================================================================
// Main Templating – fillData()
// ============================================================================

/**
 * Fill your HTML template with data. Expects the placeholders you used:
 * {COMPANY_NAME}, {ABN}, {ADDRESS}, {ACCOUNTS_EMAILS}, {ACCOUNT_PHONE},
 * {START_DATE}, {END_DATE}, {CONTRACT_TOTAL}, {SERVICE-CONTENT},
 * {SITE_NAME}, {NAME}, {SIGNATURE}, {DATE}
 *
 * @param {string} html
 * @param {Object} data
 * @returns {string}
 */
function fillData(html, data) {
  let returnHTML = html;

  // -- Company basics
  returnHTML = returnHTML.replace("{COMPANY_NAME}", data.companyName);
  returnHTML = returnHTML.replace("{ABN}", data.abn);
  returnHTML = returnHTML.replace(
    "{ADDRESS}",
    `${data.businessStreetAddress}, ${data.businessCity} ${data.businessPostcode} ${data.businessState}, Australia`
  );
  returnHTML = returnHTML.replace("{ACCOUNTS_EMAILS}", data.accountEmail);

  // -- Phones (conditionally show Mobile/Phone)
  const phoneLine = [
    data?.accountMobile?.trim() && `Mobile: ${data.accountMobile.trim()}`,
    data?.accountPhone?.trim() && `Phone: ${data.accountPhone.trim()}`,
  ]
    .filter(Boolean)
    .join(" | ");
  returnHTML = returnHTML.replace("{ACCOUNT_PHONE}", phoneLine || "");

  // -- Dates
  returnHTML = returnHTML.replace(
    "{START_DATE}",
    toDDMMYYYY(data.serviceAgreement.start_date) || ""
  );
  returnHTML = returnHTML.replace(
    "{END_DATE}",
    toDDMMYYYY(data.serviceAgreement.end_date) || ""
  );

  // -- Totals (grand total for entire contract * 2, per your original)
  const grand = computeGrandTotal({
    sites: data.serviceAgreement?.sites || [],
    frequencies: {
      chuteCleaningFrequency: data.chuteCleaningFrequency,
      equipmentMaintenanceFrequency: data.equipmentMaintenanceFrequency,
      selfClosingHopperDoorInspectionFrequency:
        data.selfClosingHopperDoorInspectionFrequency,
      wasteRoomCleaningFrequency: data.wasteRoomCleaningFrequency,
      binCleaningFrequency: data.binCleaningFrequency,
      odourControlFrequency: data.odourControlFrequency,
    },
    odourControlUnits: data.odourControlUnits || {},
    getDiscount: getDiscountDefault,
  });
  returnHTML = returnHTML.replace("{CONTRACT_TOTAL}", formatMoney(grand * 2));

  // -- Service sections
  const servicesHTML =
    getChuteCleaningContent(
      data.serviceAgreement.sites,
      data.chuteCleaningFrequency
    ) +
    getEquipmentContent(
      data.serviceAgreement.sites,
      data.equipmentMaintenanceFrequency
    ) +
    getDoorInspectionContent(
      data.serviceAgreement.sites,
      data.selfClosingHopperDoorInspectionFrequency
    ) +
    getWasteRoomCleanContent(
      data.serviceAgreement.sites,
      data.wasteRoomCleaningFrequency
    ) +
    getWasteBinCleanContent(
      data.serviceAgreement.sites,
      data.binCleaningFrequency
    ) +
    getOdourControlContent(
      data.serviceAgreement.sites,
      data.odourControlFrequency,
      data.odourControlUnits
    );

  returnHTML = returnHTML.replace("{SERVICE-CONTENT}", servicesHTML);

  // -- Cover page site names
  returnHTML = returnHTML.replace(
    "{SITE_NAME}",
    getCoverPageSitesNames(data.serviceAgreement.sites)
  );

  // -- Signatory
  returnHTML = returnHTML.replace("{NAME}", data.signFullName || "");

  // Signature box (image scaled to fit within fixed-height area)
  const signatureHTML = data.trimmedDataURL
    ? `<div style="height:${IMAGE_ZONE_PX}px; display:flex; align-items:center; justify-content:flex-start;">
         <img src="${data.trimmedDataURL}" alt="Signature"
              style="display:block; max-height:100%; max-width:100%; height:auto; width:auto; object-fit:contain;" />
       </div>`
    : `<div style="height:${IMAGE_ZONE_PX}px;"></div>`;
  returnHTML = returnHTML.replace("{SIGNATURE}", signatureHTML);

  // -- Today (AU)
  returnHTML = returnHTML.replace("{DATE}", TODAY_AU);

  return returnHTML;
}

// ============================================================================
// Exports
// ============================================================================
module.exports = {
  fillData,
  // exporting helpers too (handy for tests)
  toDDMMYYYY,
  formatMoney,
  getNumber,
  getServices,
  getServiceAnualCost,
  getDiscountDefault,
  computeGrandTotal,
};
