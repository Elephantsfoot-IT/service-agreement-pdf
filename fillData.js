function fillData(html, data) {
  let content = ``;
  let returnHTML = html;
  const chuteCleaning = getChuteCleaningContent(data);
  const equipment = getEquipmentContent(data);
  const doorInspection = getDoorInspectionContent(data);
  const wasteRoomClean = getWasteRoomCleanContent(data);
  const wasteBinClean = getWasteBinCleanContent(data);
  const odourControl = getOdourControlContent(data);
  content = content + chuteCleaning + equipment + doorInspection + wasteRoomClean + wasteBinClean + odourControl;
  returnHTML = returnHTML.replace("{SERVICE-CONTENT}", content);
  returnHTML = returnHTML.replace("{SITE_NAME}", getCoverPageSitesNames(data));
  return returnHTML;
}


/**
 * @param {Array} arr - Your test object (array of site entries)
 * @returns {string[]} unique site names
 */
function getSitesNames(sites) {
  if (!Array.isArray(sites)) return [];
 
  return sites.flatMap(site =>
    (site.buildings ?? []).flatMap(b =>
      site.site_name
    )
  );
 }

 function getCoverPageSitesNames(data) {
  const sites = getSitesNames(data);
  let html = `
  <div style="display:flex; flex-direction:column; gap:5px;">
   {SITES}
  </div>
  `
  const siteNames = sites.map(site => ` 
    <div style=" font-size: 14px;">${site}</div>
  `).join("");
  return html.replace("{SITES}", siteNames);

 }
 



/**
 * Collect all chute_cleaning services with their site/building context.
 * @param {Array} sites - Your full payload (array of site objects).
 * @returns {Array<{
*   site_name: string,
*   site_id?: number|string,
*   building_id: string,
*   building_name: string|null,
*   ...s
* }>}
*/
function getChuteCleaningServices(sites,type) {
 if (!Array.isArray(sites)) return [];

 return sites.flatMap(site =>
   (site.buildings ?? []).flatMap(b =>
     (b.services ?? [])
       .filter(s => s.type === type)
       .map(s => ({
         site_name: site.site_name,
         site_id: site.simpro_site_id,       // optional, handy to keep
         building_id: b.id,
         building_name: b.name || null,
         ...s
       }))
   )
 );
}


const getChuteCleaningContent = (data) => {
  const chuteCleaningServices = getChuteCleaningServices(data,"chute_cleaning");
  if(chuteCleaningServices.length === 0) return "";
  let html = `
    <div
        class="service-section"
        style="
          border-top: none;
          border-bottom: 1px solid black;
          border-left: 1px solid black;
          border-right: 1px solid black;
        "
      >
        <div
          style="
            width: 30%;
            text-align: center;
            border-right: 1px solid black;
            min-height: 45px;
            padding-top: 5px;
          "
        >
          <b>Waste Chute Cleaning</b>
        </div>
        <div
          style="
            width: 15%;
            text-align: center;
            border-right: 1px solid black;
            min-height: 45px;
            padding-top: 5px;
          "
        >
         Quarterly
        </div>
        <div
          style="
            width: 35%;
            text-align: center;
            min-height: 45px;
            padding-top: 5px;
            border-right: 1px solid black;
          "
        >
         {SERVICE_ITEMS}
        </div>
        <div
          style="
            width: 20%;
            min-height: 45px;
            padding-top: 5px;
            display:flex;
            flex-direction:column;
            padding-bottom:20px;
            gap:10px;
          "
        >
          <div style="padding-left:10px;display:flex; flex-direction:row; align-items:center; gap:5px;"><div style="width:9px; height:9px; border:black solid 1px"></div>Quarterly</div>
          <div style="padding-left:10px;display:flex; flex-direction:row; align-items:center; gap:5px;"><div style="width:9px; height:9px; border:black solid 1px"></div>6 Monthly</div>
          <div style="padding-left:10px;display:flex; flex-direction:row; align-items:center; gap:5px;"><div style="width:9px; height:9px; border:black solid 1px"></div>Yearly</div>
         
        </div>
      </div>
    `;

    const items = chuteCleaningServices.map((service, i, arr) => {
      const isLast = i === arr.length - 1;
      return `
        <div
          class="avoid-break"
          style="
            ${isLast ? "border-bottom:none;" : "border-bottom:1px solid black;"}
            padding-right:5px;
            padding-right:10px;
            padding-left:10px;
            padding-bottom:10px;
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:10px;
          "
        >
          <div><b>${service.site_name}  ${service.building_name ? " - " + service.building_name : ""}</b></div>
          <div>${service.chutes} Chutes</div>
          <div>$${service.price} + GST (Per Chute)</div>
          <div><b>(Up to ${service.levels} Levels)</b></div>
          <div><b>*Any Extra Levels will be invoiced <br/> accordingly</b></div>
        </div>
      `;
    }).join("");
    return html.replace("{SERVICE_ITEMS}", items);
};

const getEquipmentContent = (data) => {
  const chuteCleaningServices = getChuteCleaningServices(data,"equipment_maintenance");
  if(chuteCleaningServices.length === 0) return "";
  let html = `
    <div
        class="service-section"
         style="
          border-top: 1px solid black;
          border-bottom: 1px solid black;
          border-left: 1px solid black;
          border-right: 1px solid black;
        "
      >
        <div
          style="
            width: 30%;
            text-align: center;
            border-right: 1px solid black;
            min-height: 45px;
            padding-top: 5px;
          "
        >
          <b>Equipment Preventative<br/>Maintenance</b>
        </div>
        <div
          style="
            width: 15%;
            text-align: center;
            border-right: 1px solid black;
            min-height: 45px;
            padding-top: 5px;
          "
        >
         Quarterly
        </div>
        <div
          style="
            width: 35%;
            text-align: center;
            min-height: 45px;
            padding-top: 5px;
            border-right: 1px solid black;
          "
        >
         {SERVICE_ITEMS}
        </div>
        <div
          style="
            width: 20%;
            min-height: 45px;
            padding-top: 5px;
            display:flex;
            flex-direction:column;
            padding-bottom:20px;
            gap:5px;
          "
        >
          <div style="padding-left:10px;display:flex; flex-direction:row; align-items:center; gap:5px;"><div style="width:9px; height:9px; border:black solid 1px"></div>Quarterly</div>
          <div style="padding-left:10px;display:flex; flex-direction:row; align-items:center; gap:5px;"><div style="width:9px; height:9px; border:black solid 1px"></div>6 Monthly</div>
          <div style="padding-left:10px;display:flex; flex-direction:row; align-items:center; gap:5px;"><div style="width:9px; height:9px; border:black solid 1px"></div>Yearly</div>
         
        </div>
      </div>
    `;
    const items = chuteCleaningServices.map((service, i, arr) => {
      const isLast = i === arr.length - 1;
      return `
        <div
          class="avoid-break"
          style="
            ${isLast ? "border-bottom:none;" : "border-bottom:1px solid black;"}
            padding-right:5px;
            padding-right:10px;
            padding-left:10px;
            padding-bottom:10px;
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:10px;
          "
        >
          <div><b>${service.site_name}  ${service.building_name ? " - " + service.building_name : ""}</b></div>
          <div style="text-transform: uppercase;"><b>${service.equipment_label ? service.equipment_label + ":" : ""}</b> $${service.price} + GST</div>
          <div><b>(Per System)</b></div>
        </div>
      `;
    }).join("");
    return html.replace("{SERVICE_ITEMS}", items);
};

const getDoorInspectionContent = (data) => {
  const doorInspectionServices = getChuteCleaningServices(data,"hopper_door_inspection");
  if(doorInspectionServices.length === 0) return "";
  let html = `
    <div
        class="service-section"
         style="
          border-top: 1px solid black;
          border-bottom: 1px solid black;
          border-left: 1px solid black;
          border-right: 1px solid black;
        "
      >
        <div
          style="
            width: 30%;
            text-align: center;
            border-right: 1px solid black;
            min-height: 45px;
            padding-top: 5px;
          "
        >
          <b>Self-Closing Hopper Door<br/>Inspection</b>
        </div>
        <div
          style="
            width: 15%;
            text-align: center;
            border-right: 1px solid black;
            min-height: 45px;
            padding-top: 5px;
          "
        >
         Quarterly
        </div>
        <div
          style="
            width: 35%;
            text-align: center;
            min-height: 45px;
            padding-top: 5px;
            border-right: 1px solid black;
          "
        >
         {SERVICE_ITEMS}
        </div>
        <div
          style="
            width: 20%;
            min-height: 45px;
            padding-top: 5px;
            display:flex;
            flex-direction:column;
            padding-bottom:20px;
            gap:5px;
          "
        >
          <div style="padding-left:10px;display:flex; flex-direction:row; align-items:center; gap:5px;"><div style="width:9px; height:9px; border:black solid 1px"></div>Quarterly</div>
          <div style="padding-left:10px;display:flex; flex-direction:row; align-items:center; gap:5px;"><div style="width:9px; height:9px; border:black solid 1px"></div>6 Monthly</div>
          <div style="padding-left:10px;display:flex; flex-direction:row; align-items:center; gap:5px;"><div style="width:9px; height:9px; border:black solid 1px"></div>Yearly</div>
         
        </div>
      </div>
    `;
    const items = doorInspectionServices.map((service, i, arr) => {
      const isLast = i === arr.length - 1;
      return `
        <div
          class="avoid-break"
          style="
            ${isLast ? "border-bottom:none;" : "border-bottom:1px solid black;"}
            padding-right:5px;
            padding-right:10px;
            padding-left:10px;
            padding-bottom:10px;
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:10px;
          "
        >
          <div><b>${service.site_name}  ${service.building_name ? " - " + service.building_name : ""}</b></div>
          <div>$${service.price} + GST</div>
        </div>
      `;
    }).join("");
  return html.replace("{SERVICE_ITEMS}", items);
};


const getWasteRoomCleanContent = (data) => {
  const wasteRoomCleanServices = getChuteCleaningServices(data,"waste_room_pressure_clean");
  if(wasteRoomCleanServices.length === 0) return "";
  let html = `
    <div
        class="service-section"
         style="
          border-top: 1px solid black;
          border-bottom: 1px solid black;
          border-left: 1px solid black;
          border-right: 1px solid black;
        "
      >
        <div
          style="
            width: 30%;
            text-align: center;
            border-right: 1px solid black;
            min-height: 45px;
            padding-top: 5px;
          "
        >
          <b>Waste Room High Pressure<br/>Clean</b>
        </div>
        <div
          style="
            width: 15%;
            text-align: center;
            border-right: 1px solid black;
            min-height: 45px;
            padding-top: 5px;
          "
        >
         Quarterly
        </div>
        <div
          style="
            width: 35%;
            text-align: center;
            min-height: 45px;
            padding-top: 5px;
            border-right: 1px solid black;
          "
        >
          {SERVICE_ITEMS}
        </div>
        <div
          style="
            width: 20%;
            min-height: 45px;
            padding-top: 5px;
            display:flex;
            flex-direction:column;
            padding-bottom:20px;
            gap:5px;
          "
        >
          <div style="padding-left:10px;display:flex; flex-direction:row; align-items:center; gap:5px;"><div style="width:9px; height:9px; border:black solid 1px"></div>Quarterly</div>
          <div style="padding-left:10px;display:flex; flex-direction:row; align-items:center; gap:5px;"><div style="width:9px; height:9px; border:black solid 1px"></div>6 Monthly</div>
          <div style="padding-left:10px;display:flex; flex-direction:row; align-items:center; gap:5px;"><div style="width:9px; height:9px; border:black solid 1px"></div>Yearly</div>
         
        </div>
      </div>
    `;

    const items = wasteRoomCleanServices.map((service, i, arr) => {
      const isLast = i === arr.length - 1;
      return `
        <div
          class="avoid-break"
          style="
            ${isLast ? "border-bottom:none;" : "border-bottom:1px solid black;"}
            padding-right:5px;
            padding-right:10px;
            padding-left:10px;
            padding-bottom:10px;
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:10px;
          "
        >
          <div><b>${service.site_name}  ${service.building_name ? " - " + service.building_name : ""}</b></div>
          <div>$${service.price} + GST</div>
          <div><b>${service.area_label}</b></div>
          <div><b>(Per Waste Room)</b></div>
        </div>
      `;
    }).join("");
    return html.replace("{SERVICE_ITEMS}", items);
};



const getWasteBinCleanContent = (data) => {
  const wasteBinCleanServices = getChuteCleaningServices(data,"bin_cleaning");
  if(wasteBinCleanServices.length === 0) return "";
  let html = `
    <div
        class="service-section"
         style="
          border-top: 1px solid black;
          border-bottom: 1px solid black;
          border-left: 1px solid black;
          border-right: 1px solid black;
        "
      >
        <div
          style="
            width: 30%;
            text-align: center;
            border-right: 1px solid black;
            min-height: 45px;
            padding-top: 5px;
          "
        >
          <b>Wheelie Bin Cleaning</b>
        </div>
        <div
          style="
            width: 15%;
            text-align: center;
            border-right: 1px solid black;
            min-height: 45px;
            padding-top: 5px;
          "
        >
         Quarterly
        </div>
        <div
          style="
            width: 35%;
            text-align: center;
            min-height: 45px;
            padding-top: 5px;
            border-right: 1px solid black;
            
          "
        >
         {SERVICE_ITEMS}
        </div>
        <div
          style="
            width: 20%;
            min-height: 45px;
            padding-top: 5px;
            display:flex;
            flex-direction:column;
            padding-bottom:20px;
            gap:5px;
          "
        >
          <div style="padding-left:10px;display:flex; flex-direction:row; align-items:center; gap:5px;"><div style="width:9px; height:9px; border:black solid 1px"></div>Quarterly</div>
          <div style="padding-left:10px;display:flex; flex-direction:row; align-items:center; gap:5px;"><div style="width:9px; height:9px; border:black solid 1px"></div>6 Monthly</div>
          <div style="padding-left:10px;display:flex; flex-direction:row; align-items:center; gap:5px;"><div style="width:9px; height:9px; border:black solid 1px"></div>Yearly</div>
         
        </div>
      </div>
    `;
    const items = wasteBinCleanServices.map((service, i, arr) => {
      const isLast = i === arr.length - 1;
      return `
        <div
          class="avoid-break"
          style="
            ${isLast ? "border-bottom:none;" : "border-bottom:1px solid black;"}
            padding-right:5px;
            padding-right:10px;
            padding-left:10px;
            padding-bottom:10px;
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:10px;
          "
        >
          <div><b>${service.site_name}  ${service.building_name ? " - " + service.building_name : ""}</b></div>
          <div>$${service.price} + GST</div>
        </div>
      `;
    }).join("");
  return html.replace("{SERVICE_ITEMS}", items);
};

const getOdourControlContent = (data) => {
  const odourControlServices = getChuteCleaningServices(data,"odour_control");
  if(odourControlServices.length === 0) return "";
  let html =  `
  <div
      class="service-section"
       style="
          border-top: 1px solid black;
          border-bottom: 1px solid black;
          border-left: 1px solid black;
          border-right: 1px solid black;
        "
    >
      <div
        style="
          width: 30%;
          text-align: center;
          border-right: 1px solid black;
          min-height: 45px;
          padding-top: 5px;
        "
      >
        <b>EF Neutraliser <br/><br/>(Odour Management System)</b>
      </div>
      <div
        style="
          width: 15%;
          text-align: center;
          border-right: 1px solid black;
          min-height: 45px;
          padding-top: 5px;
        "
      >
       Quarterly
      </div>
      <div
        style="
          width: 35%;
          text-align: center;
          min-height: 45px;
          padding-top: 5px;
          border-right: 1px solid black;
        "
      >
       {SERVICE_ITEMS}
      </div>
      <div
        style="
          width: 20%;
          min-height: 45px;
          padding-top: 5px;
          display:flex;
          flex-direction:column;
          padding-bottom:20px;
          gap:5px;
        "
      >
        <div style="padding-left:10px;display:flex; flex-direction:row; align-items:center; gap:5px;"><div style="width:9px; height:9px; border:black solid 1px"></div>Quarterly</div>
        <div style="padding-left:10px;display:flex; flex-direction:row; align-items:center; gap:5px;"><div style="width:9px; height:9px; border:black solid 1px"></div>6 Monthly</div>
        <div style="padding-left:10px;display:flex; flex-direction:row; align-items:center; gap:5px;"><div style="width:9px; height:9px; border:black solid 1px"></div>Yearly</div>
       
      </div>
    </div>
  `;

  const items = odourControlServices.map((service, i, arr) => {
    const isLast = i === arr.length - 1;
    return `
      <div
        class="avoid-break"
        style="
          ${isLast ? "border-bottom:none;" : "border-bottom:1px solid black;"}
          padding-right:5px;
          padding-right:10px;
          padding-left:10px;
          padding-bottom:10px;
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:10px;
        "
      >
        <div><b>${service.site_name}  ${service.building_name ? " - " + service.building_name : ""}</b></div>
        <div>$${service.price} + GST</div>
        <div>(Per Unit, No Installation cost. Min 2 year contract)</div>
        <div><b>*240V 10AMP Outlet Must be Supplied in Waste Room</b></div>
        <div style="display:flex; flex-direction:row; align-items:center; gap:10px;">
        <div style="width:55px; height:30px; border:black solid 1px"></div>
        <div>UNITS</div>
        </div>
      </div>
    `;
  }).join("");
  return html.replace("{SERVICE_ITEMS}", items);
};



module.exports = { fillData };
