// filepath: /Users/khangtrinh/CWS/auto-follow-up/test.js
const fs = require("fs");
const path = require("path");
const { renderPdfFromHtmlFile } = require("./renderPdf");
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);

// Optional: pass output filename as first CLI arg
const outName = process.argv[2] || "service-agreement.pdf";
const outPath = path.resolve(__dirname, outName);

const dummydata = {
  page: 3,
  progress: 3,
  signatureDate: "23/10/2025",
  signFullName: "Khang Trinh",
  signTitle: "CEO",
  conditionAgree: true,
  trimmedDataURL: "",
  accountFirstName: "Khang",
  accountLastName: "Trinh",
  accountTitle: "",
  accountEmail: "invoices@hammond.com.au",
  accountPhone: "0282808444",
  accountMobile: "",
  postalStreetAddress: "LEVEL 4, 207B Pacific Highway",
  postalCity: "ST LEONARDS",
  postalState: "NSW",
  postalPostcode: "2065",
  postalCountry: "",
  QuoteContact: false,
  JobContact: false,
  InvoiceContact: false,
  StatementContact: false,
  PrimaryQuoteContact: false,
  PrimaryJobContact: false,
  PrimaryInvoiceContact: false,
  PrimaryStatementContact: false,
  businessStreetAddress: "LEVEL 4, 207B Pacific Highway",
  businessCity: "ST LEONARDS",
  businessPostcode: "2065",
  businessState: "NSW",
  companyName: "Hasdasd",
  abn: "48000026219",
  sameAddres: false,
  companyDetailsEdited: false,
  odourControlUnits: {
    "195e901a-fcf0-48b3-8aa5-ecaee2e826c4": 1,
    "9db786e4-dbeb-44f4-be59-e5869cfa30e7": 1,
    "0589de8e-34d1-4927-a90d-9f8dfdb3ade0": 1,
  },
  additionalContacts: [],
  serviceAgreement: {
    id: "36e42754-6829-44ad-877c-7949948d3eb0",
  created_at: "2025-10-23T14:29:37",
  simpro_customer_id: null,
  updated_at: "2025-10-24T10:54:54",
  status: "New",
  sites: [
    {
      mode: "new",
      buildings: [
        {
          id: "dd36be0f-2515-40d9-afcf-68875655b09a",
          name: "Building A",
          services: [
            {
              id: "9c04c821-c190-4d9f-8b07-add7c492829a",
              type: "chute_cleaning",
              price: "450.00",
              chutes: "2",
              levels: "12",
            },
            {
              id: "c8588d01-db8b-4db0-940a-0232e38ec749",
              type: "hopper_door_inspection",
              price: "400.00",
              chutes: "2",
              levels: "12",
            },
            {
              id: "325da7e2-52d3-4863-b982-9fe8f41c5a8f",
              area: "31-50",
              type: "waste_room_pressure_clean",
              price: "550.00",
              area_label: "31 m² – 50 m²",
            },
            {
              id: "195e901a-fcf0-48b3-8aa5-ecaee2e826c4",
              type: "odour_control",
              price: "299",
              default_qty: "1",
            },
            {
              id: "c74abc57-1534-41cc-bd0a-4e73ca9a8511",
              type: "equipment_maintenance",
              price: "$310.00",
              quantity: "3",
              equipment: "linear",
              equipment_label: "Linear",
            },
            {
              id: "e996260e-2a0b-4572-8562-5a1e98c33602",
              type: "equipment_maintenance",
              price: "$310.00",
              quantity: "1",
              equipment: "carousel",
              equipment_label: "Carousel",
            },
            {
              id: "f90f61fc-b3c1-4470-b441-3c3eee28def6",
              type: "bin_cleaning",
              price: "12.00",
              bin_size: "240L",
              quantity: "14",
            },
            {
              id: "10dedff5-6977-4047-afd1-6506558a8aa8",
              type: "bin_cleaning",
              price: "34.00",
              bin_size: "660L",
              quantity: "24",
            },
          ],
        },
        {
          id: "bd72e911-770a-4dfa-a504-0589b2e9aa30",
          name: "Building B",
          services: [
            {
              id: "ad7ecc1e-529e-4c0d-bc51-79dac2f67a2c",
              type: "chute_cleaning",
              price: "450.00",
              chutes: "1",
              levels: "14",
            },
            {
              id: "7842a10b-b54e-406a-a004-0c0998e6d192",
              type: "hopper_door_inspection",
              price: "400.00",
              chutes: "1",
              levels: "14",
            },
            {
              id: "772f03e4-b42b-446d-a994-8f4a837ffa16",
              area: "0-30",
              type: "waste_room_pressure_clean",
              price: "425.00",
              area_label: "0 m² – 30 m²",
            },
            {
              id: "9db786e4-dbeb-44f4-be59-e5869cfa30e7",
              type: "odour_control",
              price: "299",
              default_qty: "1",
            },
            {
              id: "d7130411-7de0-42f9-88d8-ed6ebdbf4bcb",
              type: "equipment_maintenance",
              price: "$310.00",
              quantity: "1",
              equipment: "linear",
              equipment_label: "Linear",
            },
            {
              id: "d50bbb34-fbc6-4d3c-8163-bf16aea526c2",
              type: "bin_cleaning",
              price: "12.00",
              bin_size: "240L",
              quantity: "14",
            },
          ],
        },
      ],
      site_name: "112-116 Canterbury Road",
      site_address: {
        City: "Bankstown",
        State: "NSW",
        Address: "112-116 Canterbury Road",
        Country: "",
        PostalCode: "2200",
      },
      simpro_site_id: "136bf4fe-17d1-4f15-98a0-c1e65c0a9c7d",
      primary_contact: {
        ID: "3bd85f98-4196-4113-9fb1-70570a31d948",
        Email: "",
        Position: "",
        CellPhone: "0435888555",
        GivenName: "Khang",
        WorkPhone: "",
        FamilyName: "Trinh",
      },
    },
    {
      mode: "new",
      buildings: [
        {
          id: "6ac09cc7-183e-44ff-a9f2-37b7efe74aa7",
          name: "",
          services: [
            {
              id: "95c7de26-e9c0-4984-9242-ca749f0009a1",
              type: "chute_cleaning",
              price: "450.00",
              chutes: "1",
              levels: "15",
            },
            {
              id: "accbec2c-33bf-4899-a62d-de554c6d00f1",
              type: "hopper_door_inspection",
              price: "400.00",
              chutes: "1",
              levels: "15",
            },
            {
              id: "bfedf60c-b02c-4075-84bd-3c8f88acb96b",
              area: "0-30",
              type: "waste_room_pressure_clean",
              price: "425.00",
              area_label: "0 m² – 30 m²",
            },
            {
              id: "0589de8e-34d1-4927-a90d-9f8dfdb3ade0",
              type: "odour_control",
              price: "299",
              default_qty: "1",
            },
            {
              id: "bf9f93d7-17d4-4651-91f3-2cf08db2ea50",
              type: "bin_cleaning",
              price: "12.00",
              bin_size: "240L",
              quantity: "12",
            },
            {
              id: "74886bf6-b9ea-4ff2-88e5-2c76eca930e4",
              type: "equipment_maintenance",
              price: "$310.00",
              quantity: "5",
              equipment: "linear-compactor",
              equipment_label: "Linear/ Compactor",
            },
            {
              id: "79d729d0-fcfc-4f2f-a0b6-d80493261445",
              type: "equipment_maintenance",
              price: "$710.00",
              quantity: "1",
              equipment: "stationary-auger-shredder",
              equipment_label: "Stationary Auger with Shredder",
            },
          ],
        },
      ],
      site_name: "440 Collins Street",
      site_address: {
        City: "Melbourne",
        State: "VIC",
        Address: "440 Collins Street",
        Country: "",
        PostalCode: "3000",
      },
      simpro_site_id: "208fcc0a-8098-40ee-8144-b7ff509f0db8",
      primary_contact: {
        ID: "dc1f5f33-7915-481b-8f70-4a85bb8dc522",
        Email: "",
        Position: "",
        CellPhone: "0435888555",
        GivenName: "khang",
        WorkPhone: "",
        FamilyName: "trinh",
      },
    },
  ],
  expire_at: "2025-12-22T14:27:42",
  start_date: "2025-10-23",
  end_date: "2027-10-23",
  incentives: true,
  company_details: {
    abn: "",
    companyName: "Testing",
    businessStreetAddress: "",
    businessCity: "",
    businessState: "",
    businessPostcode: "",
    businessCountry: "",
  },
  billing_details: {
    accountFirstName: "",
    accountLastName: "",
    accountEmail: "",
    accountPhone: "",
    accountMobile: "",
    postalStreetAddress: "",
    postalCity: "",
    postalState: "",
    postalPostcode: "",
    postalCountry: "",
  },
  quote_for: "Testing",
  salesperson: "Laura Harrison",
  opened_at: null,
  accepted_at: null,
  pre_selection: {
    binCleaningFrequency: null,
    odourControlFrequency: null,
    chuteCleaningFrequency: null,
    wasteRoomCleaningFrequency: null,
    equipmentMaintenanceFrequency: null,
    selfClosingHopperDoorInspectionFrequency: null,
  },
  },

  chuteCleaningFrequency: "quarterly",
  equipmentMaintenanceFrequency: "quarterly",
  wasteRoomCleaningFrequency: "quarterly",
  odourControlFrequency: "quarterly",
  selfClosingHopperDoorInspectionFrequency: "quarterly",
  binCleaningFrequency: "quarterly",
  businessCountry: "Australia",
};

const mockEvent = { data: dummydata };
const mockContext = {
  functionName: "testFunction",
  memoryLimitInMB: "1003",
  logGroupName: "/aws/lambda/testFunction",
  logStreamName: "2025/05/15/[$LATEST]abcdef1234567890",
  awsRequestId: "12345678-1234-1234-1234-123456789012",
  invokedFunctionArn:
    "arn:aws:lambda:us-east-1:123456789012:function:testFunction",
};

(async () => {
  try {
    // Render PDF directly instead of calling handler
    const htmlPath = path.resolve(__dirname, "service-agreement.html");
    const pdfBuffer = await renderPdfFromHtmlFile(htmlPath, dummydata);
    
    // Save PDF to file
    await fs.promises.writeFile(outPath, pdfBuffer);
    console.log(`PDF saved to: ${outPath}`);
    
    // Open in Firefox
    try {
      await execAsync(`open -a Firefox "${outPath}"`);
      console.log("Opening PDF in Firefox...");
    } catch (openError) {
      console.error("Failed to open in Firefox:", openError.message);
      console.log(`PDF saved at: ${outPath}`);
    }
  } catch (error) {
    console.error("Error generating PDF:", error);
    process.exit(1);
  }
})();
