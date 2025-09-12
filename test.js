// filepath: /Users/khangtrinh/CWS/auto-follow-up/test.js
const fs = require("fs");
const path = require("path");
const { handler } = require("./index");

// Optional: pass output filename as first CLI arg
const outName = process.argv[2] || "service-agreement.pdf";
const outPath = path.resolve(__dirname, outName);

const dummydata = [
  {
    mode: "new",
    buildings: [
      {
        id: "1232ef78-462b-4b95-823a-cd8ac32fc7f6",
        name: "",
        services: [
          {
            id: "d74829b8-1dd8-4939-a90f-7135cecd8462",
            type: "chute_cleaning",
            price: "850.00",
            chutes: "2",
            levels: "89",
          },
          {
            id: "47e9de4f-27a8-4f57-b20c-b8c2f5922d3a",
            type: "hopper_door_inspection",
            price: "200.00",
          },
          {
            id: "a04a3000-8756-469b-8501-35fed7dacea9",
            area: "61-80",
            type: "waste_room_pressure_clean",
            price: "600.00",
            area_label: "61 m² – 80 m²",
          },
          {
            id: "e759ec61-d56a-4840-a0ee-338c51c98d50",
            type: "odour_control",
            price: "200.00",
          },
          {
            id: "834eaf6c-0d6e-439b-b7f3-603c683ee084",
            type: "bin_cleaning",
            price: "200.00",
          },
          {
            id: "501aacca-69cd-48c8-b7b6-faa8e6344637",
            type: "equipment_maintenance",
            price: "$310.00",
            equipment: "linear-compactor",
            equipment_label: "Linear With Compactor",
          },
        ],
      },
    ],
    site_name: "IT SITE",
    site_address: {
      City: "",
      State: "",
      Address: "",
      Country: "",
      PostalCode: "",
    },
    simpro_site_id: "a9df146b-8c13-4dde-b5a7-718fe3c7080b",
  },
  {
    mode: "new",
    buildings: [
      {
        id: "1232ef78-462b-4b95-823a-cd8ac32fc7f6",
        name: "",
        services: [
          {
            id: "d74829b8-1dd8-4939-a90f-7135cecd8462",
            type: "chute_cleaning",
            price: "850.00",
            chutes: "2",
            levels: "89",
          },
          {
            id: "47e9de4f-27a8-4f57-b20c-b8c2f5922d3a",
            type: "hopper_door_inspection",
            price: "200.00",
          },
          {
            id: "a04a3000-8756-469b-8501-35fed7dacea9",
            area: "61-80",
            type: "waste_room_pressure_clean",
            price: "600.00",
            area_label: "61 m² – 80 m²",
          },
          {
            id: "e759ec61-d56a-4840-a0ee-338c51c98d50",
            type: "odour_control",
            price: "200.00",
          },
          {
            id: "834eaf6c-0d6e-439b-b7f3-603c683ee084",
            type: "bin_cleaning",
            price: "200.00",
          },
          {
            id: "501aacca-69cd-48c8-b7b6-faa8e6344637",
            type: "equipment_maintenance",
            price: "$310.00",
            equipment: "linear-compactor",
            equipment_label: "Linear With Compactor",
          },
        ],
      },
    ],
    site_name: "IT SITE",
    site_address: {
      City: "",
      State: "",
      Address: "",
      Country: "",
      PostalCode: "",
    },
    simpro_site_id: "a9df146b-8c13-4dde-b5a7-718fe3c7080b",
  },
  {
    mode: "new",
    buildings: [
      {
        id: "1232ef78-462b-4b95-823a-cd8ac32fc7f6",
        name: "",
        services: [
          {
            id: "d74829b8-1dd8-4939-a90f-7135cecd8462",
            type: "chute_cleaning",
            price: "850.00",
            chutes: "2",
            levels: "89",
          },
          {
            id: "47e9de4f-27a8-4f57-b20c-b8c2f5922d3a",
            type: "hopper_door_inspection",
            price: "200.00",
          },
          {
            id: "a04a3000-8756-469b-8501-35fed7dacea9",
            area: "61-80",
            type: "waste_room_pressure_clean",
            price: "600.00",
            area_label: "61 m² – 80 m²",
          },
          {
            id: "e759ec61-d56a-4840-a0ee-338c51c98d50",
            type: "odour_control",
            price: "200.00",
          },
          {
            id: "834eaf6c-0d6e-439b-b7f3-603c683ee084",
            type: "bin_cleaning",
            price: "200.00",
          },
          {
            id: "501aacca-69cd-48c8-b7b6-faa8e6344637",
            type: "equipment_maintenance",
            price: "$310.00",
            equipment: "linear-compactor",
            equipment_label: "Linear With Compactor",
          },
        ],
      },
    ],
    site_name: "IT SITE",
    site_address: {
      City: "",
      State: "",
      Address: "",
      Country: "",
      PostalCode: "",
    },
    simpro_site_id: "a9df146b-8c13-4dde-b5a7-718fe3c7080b",
  },
];


const mockEvent = { sites: dummydata };
const mockContext = {
  functionName: "testFunction",
  memoryLimitInMB: "1003",
  logGroupName: "/aws/lambda/testFunction",
  logStreamName: "2025/05/15/[$LATEST]abcdef1234567890",
  awsRequestId: "12345678-1234-1234-1234-123456789012",
  invokedFunctionArn: "arn:aws:lambda:us-east-1:123456789012:function:testFunction",
};

(async () => {
  try {
    const res = await handler(mockEvent, mockContext);
    if (res.statusCode !== 200) {
      console.error("Lambda error:", res);
      process.exit(1);
    }
  

    console.log(`${res.result}`);
  } catch (error) {
    console.error("Error testing Lambda function:", error);
    process.exit(1);
  }
})();


