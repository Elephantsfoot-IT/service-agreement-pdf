// Service Agreement HTML Builder (cleaned)

const { parseISO, format, isValid } = require("date-fns");
const { formatInTimeZone } = require("date-fns-tz");

// constants
const IMAGE_ZONE_PX = 160;
const TODAY_AU = safeFormatInSydney(new Date(), "dd/MM/yyyy");
const BOX_PX = 12;
const BORDER = "black";
const STROKE = "black";
const STROKE_W = 2;

// ---- small helpers ----
function safeFormatInSydney(date, fmt) {
  try {
    return formatInTimeZone(date, "Australia/Sydney", fmt);
  } catch {
    return "";
  }
}

function safeReplaceAll(html, token, value = "") {
  if (typeof html !== "string" || typeof token !== "string") return html ?? "";
  const v = value == null ? "" : String(value);
  return html.split(token).join(v);
}

function safeJoin(parts, sep = " ") {
  return (Array.isArray(parts) ? parts : [])
    .map((p) => (p ?? "").toString().trim())
    .filter(Boolean)
    .join(sep);
}

// ---- date & number ----
function toDDMMYYYY(iso) {
  if (!iso || typeof iso !== "string") return "";
  try {
    const d = parseISO(iso);
    return isValid(d) ? format(d, "dd/MM/yyyy") : "";
  } catch {
    return "";
  }
}

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

function formatMoney(n) {
  const safe = Number.isFinite(n) ? n : 0;
  // If whole number, don't show decimals; if decimal, show 2 places
  const isWholeNumber = safe % 1 === 0;
  
  try {
    return safe.toLocaleString("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 2,
      minimumFractionDigits: isWholeNumber ? 0 : 2,
    });
  } catch {
    // If whole number, no decimals; otherwise 2 decimals
    return isWholeNumber 
      ? `$${safe.toString()}` 
      : `$${safe.toFixed(2)}`;
  }
}

// Add a helper function to format price numbers without .00
function formatPrice(n) {
  const safe = Number.isFinite(n) ? n : 0;
  // If whole number, no decimals; if decimal, show exactly 2 decimals
  const isWholeNumber = safe % 1 === 0;
  return isWholeNumber 
    ? safe.toString() 
    : safe.toFixed(2);
}

// ---- discounts & totals ----
function getDiscountDefault(serviceCount) {
  const c = Number.isFinite(serviceCount) ? serviceCount : 0;
  if (c < 3) return 0;
  if (c >= 4 && c < 6) return 5;
  if (c >= 6) return 10;
  return 0;
}

function frequencyToMultiplier(frequency) {
  const f = (frequency ?? "").toString().trim().toLowerCase();
  if (!f || f === "none") return 0;
  if (f === "yearly") return 1;
  if (f === "six-monthly" || f === "6monthly" || f === "six monthly") return 2;
  return 4;
}

function getServiceAnualCost(services, frequency) {
  const mult = frequencyToMultiplier(frequency);
  if (!mult || !Array.isArray(services) || services.length === 0) return 0;
  return services.reduce((acc, s) => acc + getNumber(s?.price) * mult, 0);
}

function getServiceAnualChuteCost(services, frequency) {
  const mult = frequencyToMultiplier(frequency);
  if (!mult || !Array.isArray(services) || services.length === 0) return 0;
  return services.reduce(
    (acc, s) => acc + getNumber(s?.price) * mult * getNumber(s?.chutes),
    0
  );
}

function getServiceAnualEquipmentCost(services, frequency) {
  const mult = frequencyToMultiplier(frequency);
  if (!mult || !Array.isArray(services) || services.length === 0) return 0;
  return services.reduce(
    (acc, s) => acc + getNumber(s?.price) * mult * getNumber(s?.quantity),
    0
  );
}

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

  const chuteAnnual = getServiceAnualChuteCost(
    chute.items,
    chuteCleaningFrequency
  );
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
  const binAnnual = getServiceAnualEquipmentCost(bin.items, binCleaningFrequency);

  const odourMult = frequencyToMultiplier(odourControlFrequency);
  const odourAnnual = odourMult
    ? (odour.items || []).reduce((acc, r) => {
        const qty = getNumber(odourControlUnits?.[r?.id] ?? 0);
        return acc + qty * getNumber(r?.price) * odourMult;
      }, 0)
    : 0;

  const subtotal =
    chuteAnnual + equipAnnual + hopperAnnual + wasteAnnual + binAnnual + odourAnnual;

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

// ---- cover page helpers ----
function getSitesNames(sites) {
  if (!Array.isArray(sites)) return [];
  return sites.flatMap((site) =>
    (site?.buildings ?? []).flatMap(() => site?.site_name ?? "")
  );
}

function getCoverPageSitesNames(sites) {
  if (!Array.isArray(sites)) return "";

  const siteGroups = sites
    .filter((site) => site?.site_name)
    .map((site) => {
      const siteName = site.site_name;
      const buildings = (site?.buildings ?? [])
        .map((b) => b?.name)
        .filter(Boolean);
      
      const buildingsList = buildings.length > 0 
        ? buildings.join(", ")
        : "";

      return {
        siteName,
        buildingsList,
      };
    })
    .filter((group) => group.siteName);

  const html = siteGroups
    .map((group) => {
      const siteDiv = `<div style="font-size:14px;"><b>${group.siteName}</b></div>`;
      const buildingsDiv = group.buildingsList
        ? `<div style="font-size:14px; padding-left:10px;">${group.buildingsList}</div>`
        : "";
      return siteDiv + buildingsDiv;
    })
    .join("");

  return `
    <div style="display:flex; flex-direction:column; gap:5px;">
      ${html}
    </div>
  `;
}

// ---- shared collectors / UI bits ----
function getChuteCleaningServices(sites, type) {
  return getServices(sites, type).items || [];
}

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

// ---- service sections ----
const getChuteCleaningContent = (sites, frequency) => {
  if (frequency == null) return "";
  const services = getChuteCleaningServices(sites, "chute_cleaning");
  if (!services.length) return "";

  // Group services by site
  const groupedBySite = {};
  for (const service of services) {
    const siteName = service?.site_name ?? "";
    if (!groupedBySite[siteName]) {
      groupedBySite[siteName] = [];
    }
    groupedBySite[siteName].push(service);
  }

  const siteGroups = Object.entries(groupedBySite);
  const items = siteGroups
    .map(([siteName, siteServices], siteIdx) => {
      const isLastSite = siteIdx === siteGroups.length - 1;
      const siteHeader = `
        <div
          class="avoid-break"
          style="
          ${isLastSite && siteServices.length === 0 ? "border-bottom:none;" : "border-bottom:1px solid black;"}
            background-color: #f5c644;
            color: #ffffff;
            padding:10px;
            padding-bottom:5px;
          "
        >
          <div><b>${siteName}</b></div>
        </div>
      `;

      const buildingItems = siteServices
        .map((service, buildingIdx) => {
          const isLastBuilding = buildingIdx === siteServices.length - 1;
          const isLastItem = isLastSite && isLastBuilding;
          const price = getNumber(service?.price);
          const levels = service?.levels ?? "";
          const bName = service?.building_name ?? "";
          
          return `
            <div
              class="avoid-break"
              style="
                ${isLastItem ? "border-bottom:none;" : "border-bottom:1px solid black;"}
                padding:10px;
                padding-left:20px;
                display:flex;
                flex-direction:column;
                align-items:center;
                gap:10px;
              "
            >
              <div><b>${bName}</b></div>
              <div>${price ? `$${formatPrice(price)} + GST (Per Chute)` : ""}</div>
              <div><b>${levels ? `(Up to ${levels} Levels)` : ""}</b></div>
              <div><b>*Any Extra Levels will be invoiced <br/> accordingly</b></div>
            </div>
          `;
        })
        .join("");

      return siteHeader + buildingItems;
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

function summarizeEquipmentMaintenanceByBuilding(sites) {
  const results = [];
  for (const site of sites ?? []) {
    const siteName = (site?.site_name || "Unknown Site").trim();
    const buildings = site?.buildings ?? [];
    for (const b of buildings) {
      const rawBName = (b?.name ?? "").trim();
      const buildingName = rawBName || "";
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
        .map((e) => ({
          equipment: e.equipment,
          equipmentLabel: e.equipmentLabel || null,
          count: e.count,
          maxPrice: Number(
            (Number.isFinite(e.maxPrice) ? e.maxPrice : 0)
          ),
        }))
        .sort((a, b) => String(a.equipment).localeCompare(String(b.equipment)));
      if (equipment.length > 0) {
        results.push({ site_name: siteName, building_name: buildingName, equipment });
      }
    }
  }
  return results;
}

const getEquipmentContentGroupBySite = (sites, frequency) => {
  if (frequency == null) return "";
  const services = summarizeEquipmentMaintenanceByBuilding(sites);

  // Group services by site
  const groupedBySite = {};
  for (const service of services) {
    const siteName = service?.site_name ?? "";
    if (!groupedBySite[siteName]) {
      groupedBySite[siteName] = [];
    }
    groupedBySite[siteName].push(service);
  }

  const siteGroups = Object.entries(groupedBySite);
  const items = siteGroups
    .map(([siteName, siteServices], siteIdx) => {
      const isLastSite = siteIdx === siteGroups.length - 1;
      const siteHeader = `
        <div
          class="avoid-break"
          style="
           ${isLastSite && siteServices.length === 0 ? "border-bottom:none;" : "border-bottom:1px solid black;"}
            background-color: #f5c644;
            color: white;
            padding:10px;
            padding-bottom:5px;
          "
        >
          <div><b>${siteName}</b></div>
        </div>
      `;

      const buildingItems = siteServices
        .map((service, buildingIdx) => {
          const isLastBuilding = buildingIdx === siteServices.length - 1;
          const isLastItem = isLastSite && isLastBuilding;
          const buildingName = service?.building_name || "";
          const equipmentLines =
            (service?.equipment || [])
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
                ${isLastItem ? "border-bottom:none;" : "border-bottom:1px solid black;"}
                padding:10px;
                padding-left:20px;
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

      return siteHeader + buildingItems;
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

const getDoorInspectionContent = (sites, frequency) => {
  if (frequency == null) return "";
  const services = getChuteCleaningServices(sites, "hopper_door_inspection");
  if (!services.length) return "";

  // Group services by site
  const groupedBySite = {};
  for (const service of services) {
    const siteName = service?.site_name ?? "";
    if (!groupedBySite[siteName]) {
      groupedBySite[siteName] = [];
    }
    groupedBySite[siteName].push(service);
  }

  const siteGroups = Object.entries(groupedBySite);
  const items = siteGroups
    .map(([siteName, siteServices], siteIdx) => {
      const isLastSite = siteIdx === siteGroups.length - 1;
      const isFirstSite = siteIdx === 0;
      const siteHeader = `
        <div
          class="avoid-break"
          style="
            ${isFirstSite ? "border-top:1px solid black;" : ""}
            ${isLastSite && siteServices.length === 0 ? "border-bottom:none;" : "border-bottom:1px solid black;"}
            background-color: #f5c644;
            color: #ffffff;
            padding:10px;
            padding-bottom:5px;
          "
        >
          <div><b>${siteName}</b></div>
        </div>
      `;

      const buildingItems = siteServices
        .map((service, buildingIdx) => {
          const isLastBuilding = buildingIdx === siteServices.length - 1;
          const isLastItem = isLastSite && isLastBuilding;
          const price = getNumber(service?.price);
          const levels = service?.levels ?? "";
          const bName = service?.building_name ?? "";
          
          return `
            <div
              class="avoid-break"
              style="
                ${isLastItem ? "border-bottom:none;" : "border-bottom:1px solid black;"}
                padding:10px;
                padding-left:20px;
                display:flex;
                flex-direction:column;
                align-items:center;
                gap:10px;
              "
            >
              <div><b>${bName}</b></div>
              <div>${price ? `$${formatPrice(price)} + GST (Per Chute)` : ""}</div>
              <div><b>${levels ? `(Up to ${levels} Levels)` : ""}</b></div>
              <div><b>*Any Extra Levels will be invoiced <br/> accordingly</b></div>
            </div>
          `;
        })
        .join("");

      return siteHeader + buildingItems;
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

const getWasteRoomCleanContent = (sites, frequency) => {
  if (frequency == null) return "";
  const services = getChuteCleaningServices(sites, "waste_room_pressure_clean");
  if (!services.length) return "";

  // Group services by site
  const groupedBySite = {};
  for (const service of services) {
    const siteName = service?.site_name ?? "";
    if (!groupedBySite[siteName]) {
      groupedBySite[siteName] = [];
    }
    groupedBySite[siteName].push(service);
  }

  const siteGroups = Object.entries(groupedBySite);
  const items = siteGroups
    .map(([siteName, siteServices], siteIdx) => {
      const isLastSite = siteIdx === siteGroups.length - 1;
      const siteHeader = `
        <div
          class="avoid-break"
          style="
           ${isLastSite && siteServices.length === 0 ? "border-bottom:none;" : "border-bottom:1px solid black;"}
            background-color: #f5c644;
            color: #ffffff;
            padding:10px;
            padding-bottom:5px;
          "
        >
          <div><b>${siteName}</b></div>
        </div>
      `;

      const buildingItems = siteServices
        .map((service, buildingIdx) => {
          const isLastBuilding = buildingIdx === siteServices.length - 1;
          const isLastItem = isLastSite && isLastBuilding;
          const price = getNumber(service?.price);
          const areaLabel = service?.area_label ?? "";
          const bName = service?.building_name ?? "";
          
          return `
            <div
              class="avoid-break"
              style="
                ${isLastItem ? "border-bottom:none;" : "border-bottom:1px solid black;"}
                padding:10px;
                padding-left:20px;
                display:flex;
                flex-direction:column;
                align-items:center;
                gap:10px;
              "
            >
              <div><b>${bName}</b></div>
              <div>${price ? `$${formatPrice(price)} + GST` : ""}</div>
              <div><b>${areaLabel}</b></div>
              <div><b>(Per Waste Room)</b></div>
            </div>
          `;
        })
        .join("");

      return siteHeader + buildingItems;
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

function summarizeBinCleaningByBuilding(sites) {
  const results = [];
  for (const site of sites ?? []) {
    const siteName = (site?.site_name || "Unknown Site").trim();
    const buildings = site?.buildings ?? [];
    for (const b of buildings) {
      const rawBName = (b?.name ?? "").trim();
      const buildingName = rawBName || "";
      const services = b?.services ?? [];
      
      let totalQuantity = 0;
      let totalPrice = 0;
      
      for (const s of services) {
        if (!s || s.type !== "bin_cleaning") continue;
        const quantity = Number(s.quantity ?? 0);
        const priceNumRaw = getNumber(s.price);
        const priceNum = Number.isFinite(priceNumRaw) ? priceNumRaw : 0;
        
        totalQuantity += quantity;
        totalPrice += priceNum * quantity;
      }
      
      if (totalQuantity > 0) {
        results.push({ 
          site_name: siteName,
          building_name: buildingName, 
          totalQuantity,
          totalPrice: Number(totalPrice.toFixed(2))
        });
      }
    }
  }
  return results;
}

const getBinCleaningContentGroupBySite = (sites, frequency) => {
  if (frequency == null) return "";
  const services = summarizeBinCleaningByBuilding(sites);

  // Group services by site
  const groupedBySite = {};
  for (const service of services) {
    const siteName = service?.site_name ?? "";
    if (!groupedBySite[siteName]) {
      groupedBySite[siteName] = [];
    }
    groupedBySite[siteName].push(service);
  }

  const siteGroups = Object.entries(groupedBySite);
  const items = siteGroups
    .map(([siteName, siteServices], siteIdx) => {
      const isLastSite = siteIdx === siteGroups.length - 1;
      const isFirstSite = siteIdx === 0;
      const siteHeader = `
        <div
          class="avoid-break"
          style="
            ${isFirstSite ? "border-top:1px solid black;" : ""}
            ${isLastSite && siteServices.length === 0 ? "border-bottom:none;" : "border-bottom:1px solid black;"}
            background-color: #f5c644;
            color: #ffffff;
            padding:10px;
            padding-bottom:5px;
          "
        >
          <div><b>${siteName}</b></div>
        </div>
      `;

      const buildingItems = siteServices
        .map((service, buildingIdx) => {
          const isLastBuilding = buildingIdx === siteServices.length - 1;
          const isLastItem = isLastSite && isLastBuilding;
          const buildingName = service?.building_name || "";
          const totalQuantity = service?.totalQuantity ?? 0;
          const totalPrice = service?.totalPrice ?? 0;

          return `
            <div
              class="avoid-break"
              style="
                ${isLastItem ? "border-bottom:none;" : "border-bottom:1px solid black;"}
                padding:10px;
                padding-left:20px;
                display:flex;
                flex-direction:column;
                align-items:center;
                gap:6px;
              "
            >
              <div><b>${buildingName}</b></div>
              <div style="text-align:center; display:flex; flex-direction:column; gap:6px;">
                <div>${totalQuantity} x ${totalQuantity === 1 ? "bin" : "bins"}</div>
                <div>${formatMoney(totalPrice)} + GST</div>
              </div>
            </div>
          `;
        })
        .join("");

      return siteHeader + buildingItems;
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

const getOdourControlContent = (sites, frequency, units) => {
  if (frequency == null) return "";
  const services = getChuteCleaningServices(sites, "odour_control");
  if (!services.length) return "";

  // Group services by site
  const groupedBySite = {};
  for (const service of services) {
    const siteName = service?.site_name ?? "";
    if (!groupedBySite[siteName]) {
      groupedBySite[siteName] = [];
    }
    groupedBySite[siteName].push(service);
  }

  const siteGroups = Object.entries(groupedBySite);
  const items = siteGroups
    .map(([siteName, siteServices], siteIdx) => {
      const isLastSite = siteIdx === siteGroups.length - 1;
      const siteHeader = `
        <div
          class="avoid-break"
          style="
            ${isLastSite && siteServices.length === 0 ? "border-bottom:none;" : "border-bottom:1px solid black;"}
            background-color: #f5c644;
            color: #ffffff;
            padding:10px;
            padding-bottom:5px;
          "
        >
          <div><b>${siteName}</b></div>
        </div>
      `;

      const buildingItems = siteServices
        .map((service, buildingIdx) => {
          const isLastBuilding = buildingIdx === siteServices.length - 1;
          const isLastItem = isLastSite && isLastBuilding;
          const price = getNumber(service?.price);
          const bName = service?.building_name ?? "";
          const unit = getNumber(units?.[service?.id] ?? "");
          
          return `
            <div
              class="avoid-break"
              style="
                ${isLastItem ? "border-bottom:none;" : "border-bottom:1px solid black;"}
                padding:10px;
                padding-left:20px;
                display:flex;
                flex-direction:column;
                align-items:center;
                gap:10px;
              "
            >
              <div><b>${bName}</b></div>
              <div>${price ? `$${formatPrice(price)} + GST` : ""}</div>
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

      return siteHeader + buildingItems;
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

// ---- unscheduled rates ----
function getUnscheduledRatesContent(unscheduledRates) {
  if (!unscheduledRates) return "";

  const rates = {
    normalWorkingHours: unscheduledRates?.normalWorkingHours,
    afterHoursWeekday: unscheduledRates?.afterHoursWeekday,
    afterHoursWeekend: unscheduledRates?.afterHoursWeekend,
    wasteBlockage: unscheduledRates?.wasteBlockage,
  };

  const fmt = (price) => {
    const num = parseFloat(price);
    return Number.isFinite(num) ? num.toFixed(2) : String(price ?? "");
  };

  return `
    <div class="section" style="border: 1px solid black; border-top: none">
      <div
        style="
          width: 33.33%;
          text-align: center;
          border-right: 1px solid black;
          height: 45px;
          padding-top: 5px;
        "
      >
        <b>
          <div>Normal Working Hours</div>
          <div style="margin-top: 10px">(8.30am – 4.30pm)</div>
        </b>
      </div>
      <div
        style="
          width: 33.33%;
          text-align: center;
          border-right: 1px solid black;
          height: 45px;
          padding-top: 5px;
        "
      >
        $${fmt(rates.normalWorkingHours?.callOutFee)} + GST
      </div>
      <div
        style="
          width: 33.33%;
          text-align: center;
          height: 45px;
          padding-top: 5px;
        "
      >
        $${fmt(rates.normalWorkingHours?.hourlyRate)} + GST
      </div>
    </div>
    <div class="section" style="border: 1px solid black; border-top: none">
      <div
        style="
          width: 33.33%;
          text-align: center;
          border-right: 1px solid black;
          height: 60px;
          padding-top: 5px;
        "
      >
        <b>
          <div>After Hours</div>
          <div style="margin-top: 10px">
            (Monday to Friday from 4:30pm and Saturday)
          </div>
        </b>
      </div>
      <div
        style="
          width: 33.33%;
          text-align: center;
          border-right: 1px solid black;
          height: 60px;
          padding-top: 5px;
        "
      >
        <div>$${fmt(rates.afterHoursWeekday?.callOutFee)} + GST*</div>
        <div style="margin-top: 10px">(3 hours including travel)</div>
      </div>
      <div
        style="
          width: 33.33%;
          text-align: center;
          height: 60px;
          padding-top: 5px;
        "
      >
        <div>$${fmt(rates.afterHoursWeekday?.hourlyRate)} + GST</div>
        <div style="margin-top: 10px">(Any time thereafter)</div>
      </div>
    </div>
    <div class="section" style="border: 1px solid black; border-top: none">
      <div
        style="
          width: 33.33%;
          text-align: center;
          border-right: 1px solid black;
          height: 50px;
          padding-top: 5px;
        "
      >
        <b>
          <div>After Hours</div>
          <div style="margin-top: 10px">(Sunday and Public Holidays)</div>
        </b>
      </div>
      <div
        style="
          width: 33.33%;
          text-align: center;
          border-right: 1px solid black;
          height: 50px;
          padding-top: 5px;
        "
      >
        $${fmt(rates.afterHoursWeekend?.callOutFee)} + GST*
        <div style="margin-top: 10px">(3 hours including travel)</div>
      </div>
      <div
        style="
          width: 33.33%;
          text-align: center;
          height: 50px;
          padding-top: 5px;
        "
      >
        $${fmt(rates.afterHoursWeekend?.hourlyRate)} + GST
        <div style="margin-top: 10px">(Any time thereafter)</div>
      </div>
    </div>
    <div class="section" style="border: 1px solid black; border-top: none">
      <div
        style="
          width: 33.33%;
          text-align: center;
          border-right: 1px solid black;
          height: 60px;
          padding-top: 5px;
        "
      >
        <b>
          <div>Waste Blockage</div>
          <div style="margin-top: 10px">
            (Normal Working Hours 8.30am – <br />4.30pm)
          </div>
        </b>
      </div>
      <div
        style="
          width: 33.33%;
          text-align: center;
          border-right: 1px solid black;
          height: 60px;
          padding-top: 5px;
        "
      >
        $${fmt(rates.wasteBlockage?.callOutFee)} + GST*
        <div style="margin-top: 10px">(3 hours including travel)</div>
      </div>
      <div
        style="
          width: 33.33%;
          text-align: center;
          height: 60px;
          padding-top: 5px;
        "
      >
        $${fmt(rates.wasteBlockage?.hourlyRate)} + GST*
        <div style="margin-top: 10px">(Any time thereafter)</div>
      </div>
    </div>
  `;
}

// ---- incentives ----
const getIncentivesContent = ({ frequencies = {} } = {}) => {
  const norm = (v) => String(v ?? "").trim().toLowerCase();
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

// ---- main template fill ----
function fillData(html, data) {
  const d = data ?? {};

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
  const phoneLine = safeJoin(
    [
      d?.accountMobile?.trim()
        ? `Mobile: ${d.accountMobile.trim()}`
        : undefined,
      d?.accountPhone?.trim() ? `Phone: ${d.accountPhone.trim()}` : undefined,
    ],
    " | "
  );

  const startDate = toDDMMYYYY(d?.serviceAgreement?.start_date ?? "");
  const endDate = toDDMMYYYY(d?.serviceAgreement?.end_date ?? "");
  const proposalExpiryDate = toDDMMYYYY(d?.serviceAgreement?.expire_at ?? "");

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
    getBinCleaningContentGroupBySite(sites, d?.binCleaningFrequency ?? null) +
    getOdourControlContent(
      sites,
      d?.odourControlFrequency ?? null,
      d?.odourControlUnits || {}
    );

  const siteNamesHTML = getCoverPageSitesNames(sites);
  const signName = d?.signFullName ?? "";
  const trimmedDataURL = d?.trimmedDataURL ?? "";
  const salesperson = d?.serviceAgreement?.salesperson ?? "";
  const signatureHTML = trimmedDataURL
    ? `<div style="height:${IMAGE_ZONE_PX}px; display:flex; align-items:center; justify-content:flex-start;">
         <img src="${trimmedDataURL}" alt="Signature"
              style="display:block; max-height:100%; max-width:100%; height:auto; width:auto; object-fit:contain;" />
       </div>`
    : `<div style="height:${IMAGE_ZONE_PX}px;"></div>`;
  
  const signatureDate = d.signatureDate

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

  const unscheduledRatesHTML = getUnscheduledRatesContent(d?.unscheduledRates);

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
  out = safeReplaceAll(out, "{DATE}", signatureDate);
  out = safeReplaceAll(out, "{SALESPERSON}", salesperson);
  out = safeReplaceAll(out, "{INCENTIVES-CONTENT}", incentivesHTML);
  out = safeReplaceAll(out, "{UNSCHEDULED-RATES-CONTENT}", unscheduledRatesHTML);
  out = safeReplaceAll(out, "{PROPOSAL_EXPIRY_DATE}", proposalExpiryDate);

  return out;
}

// ---- exports ----
module.exports = {
  fillData,
  toDDMMYYYY,
  formatMoney,
  getNumber,
  getServices,
  getServiceAnualCost,
  getDiscountDefault,
  computeGrandTotal,
  frequencyChecklistHTML,
};
