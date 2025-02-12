const fs = require('fs');
const Papa = require('papaparse');

const referenceData = {
    expertRoles: ['Loss Adjuster', 'Attorney', 'Engineer', 'Medical Expert', 'Forensic Accountant'],
    expertFirms: ['Sedgwick Experts', 'Crawford Technical Services', 'Envista Forensics', 'JS Held', 'Baker Tilly'],
    treatmentTypes: ['Surgery', 'Physical Therapy', 'Emergency Care', 'Rehabilitation', 'Diagnostic Testing'],
    deductibleBasis: ['Each and Every Loss', 'Annual Aggregate', 'Per Occurrence', 'Per Claim', 'Per Event'],
    insuranceTypes: ['Direct', 'Facultative', 'Treaty', 'Quota Share', 'Excess of Loss'],
    catCodes: ['HU', 'EQ', 'FL', 'WS', 'FR', 'TR'],
    catNames: ['Hurricane Ian', 'Hurricane Nicole', 'Texas Winter Storm', 'California Wildfires', 'Kentucky Tornadoes'],
    plans: ['Standard', 'Enhanced', 'Premium', 'Basic', 'Comprehensive'],
    streets: ['Main St', 'Oak Ave', 'Maple Rd', 'Washington Blvd', 'Park Lane'],
    cities: {
        'TX': ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth'],
        'FL': ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Naples'],
        'CA': ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento', 'San Jose'],
        'NY': ['New York', 'Buffalo', 'Albany', 'Rochester', 'Syracuse']
    },
    coverholders: ['US Risk LLC', 'American Cover Co', 'Global MGA Inc', '', 'TBD'],
    tpaNames: ['Claims TPA US', 'Sedgwick', 'Crawford & Company', 'GB'],
    causeCodes: ['FIRE', 'FLOOD', 'LIAB', 'PROP', 'AUTO'],
    classesOfBusiness: ['Property', 'Casualty', 'Marine', 'Aviation', 'Energy'],
    riskCodes: ['PR', 'CX', 'AV', 'BB', 'CC', 'D2', 'E2', 'E3', 'EF', 'FF'],
    states: ['TX', 'FL', 'CA', 'NY', 'IL', 'GA', 'LA']
};

const stateEvents = {
    'TX': {
        spring: [
            { cause: 'HAIL', prob: 0.7, desc: 'Large hail damage to property', months: [3,4,5], severity: 'high' },
            { cause: 'TORN', prob: 0.4, desc: 'Tornado damage', months: [4,5], severity: 'catastrophic' }
        ],
        summer: [
            { cause: 'HAIL', prob: 0.4, desc: 'Hail storm damage', months: [6,7,8], severity: 'medium' },
            { cause: 'WIND', prob: 0.5, desc: 'Hurricane wind damage', months: [7,8,9], severity: 'high' }
        ],
        winter: [
            { cause: 'FRST', prob: 0.6, desc: 'Freeze damage to property', months: [12,1,2], severity: 'medium' }
        ]
    },
    'FL': {
        summer: [
            { cause: 'HURR', prob: 0.8, desc: 'Hurricane surge damage', months: [6,7,8,9], severity: 'catastrophic' },
            { cause: 'FLOOD', prob: 0.7, desc: 'Storm surge flooding', months: [7,8,9], severity: 'high' }
        ],
        spring: [
            { cause: 'WIND', prob: 0.5, desc: 'Severe thunderstorm', months: [3,4,5], severity: 'medium' }
        ]
    },
    'CA': {
        summer: [
            { cause: 'FIRE', prob: 0.8, desc: 'Wildfire destruction', months: [6,7,8,9], severity: 'catastrophic' }
        ],
        winter: [
            { cause: 'MUD', prob: 0.5, desc: 'Mudslide after rain', months: [12,1,2], severity: 'high' },
            { cause: 'FLOOD', prob: 0.6, desc: 'Atmospheric river flooding', months: [1,2,3], severity: 'high' }
        ]
    }
};

function standardizeColumnName(columnName) {
    return columnName
        .toLowerCase()
        .replace(/[\/\(\)\,\.]/g, '')
        .replace(/\s+/g, '_')
        .replace(/-/g, '_')
        .replace(/__+/g, '_')
        .replace(/^_|_$/g, '');
}

function generateAddress(state) {
    const number = Math.floor(Math.random() * 9999) + 1;
    const street = referenceData.streets[Math.floor(Math.random() * referenceData.streets.length)];
    const cities = referenceData.cities[state] || referenceData.cities['TX'];
    const city = cities[Math.floor(Math.random() * cities.length)];
    return `${number} ${street}, ${city}`;
}

function generateZipCode(state) {
    const zipPrefixes = {
        'TX': '75', 'FL': '33', 'CA': '90', 'NY': '10',
        'IL': '60', 'GA': '30', 'LA': '70'
    };
    const prefix = zipPrefixes[state] || '75';
    return prefix + String(Math.floor(Math.random() * 999)).padStart(3, '0');
}

function generateRandomDate(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const today = new Date();
    const actualEnd = endDate > today ? today : endDate;
    const timestamp = startDate.getTime() + Math.random() * (actualEnd.getTime() - startDate.getTime());
    return new Date(timestamp);
}

function generateMonetaryValue(base, multiplier = 1, variation = 0.2) {
    const baseValue = base * multiplier;
    const variationAmount = baseValue * variation;
    return Math.floor(baseValue + (Math.random() * 2 - 1) * variationAmount);
}

function introduceDateIssue(date, errorType) {
    if (!date) return date;
    switch(errorType) {
        case 'format': return date.replace(/-/g, '/');
        case 'invalid': return '2024-13-45';
        case 'empty': return '';
        case 'mixed': return date.split('-').reverse().join('-');
        default: return date;
    }
}

function generateClaimsData(rowCount = 100000) {
    const data = [];
    const startDate = new Date('2020-01-01');
    const today = new Date();

    const reportingPeriods = [];
    let currentDate = new Date('2020-01-01');
    while (currentDate <= today) {
        reportingPeriods.push(new Date(currentDate));
        currentDate.setMonth(currentDate.getMonth() + 3);
    }

    for (let i = 0; i < rowCount; i++) {
        const state = referenceData.states[Math.floor(Math.random() * referenceData.states.length)];
        const reportingPeriodEnd = reportingPeriods[Math.floor(Math.random() * reportingPeriods.length)];
        const reportingPeriodStart = new Date(reportingPeriodEnd);
        reportingPeriodStart.setMonth(reportingPeriodEnd.getMonth() - 3);

        const riskStart = generateRandomDate(startDate, reportingPeriodEnd);
        const riskEnd = new Date(riskStart.getTime() + 365 * 24 * 60 * 60 * 1000);
        const lossDate = generateRandomDate(riskStart, Math.min(riskEnd, reportingPeriodEnd));
        const notificationDate = generateRandomDate(lossDate, 
            Math.min(new Date(lossDate.getTime() + 30 * 24 * 60 * 60 * 1000), reportingPeriodEnd));

        const stateEvent = stateEvents[state];
        let eventDetails = null;
        if (stateEvent) {
            const month = lossDate.getMonth();
            const season = month <= 2 ? 'winter' : month <= 5 ? 'spring' : month <= 8 ? 'summer' : 'fall';
            if (stateEvent[season]) {
                for (const event of stateEvent[season]) {
                    if (event.months.includes(month + 1) && Math.random() < event.prob) {
                        eventDetails = event;
                        break;
                    }
                }
            }
        }

        const baseClaimValue = Math.random() * 1000000;
        const claimMultiplier = eventDetails ? 
            (eventDetails.severity === 'catastrophic' ? 5 : 
             eventDetails.severity === 'high' ? 3 : 
             eventDetails.severity === 'medium' ? 2 : 1) : 1;

        const indemnityPaid = generateMonetaryValue(baseClaimValue * claimMultiplier * 0.4);
        const feesPaid = generateMonetaryValue(indemnityPaid * 0.1);
        const expensesPaid = generateMonetaryValue(indemnityPaid * 0.05);
        const attorneyFees = generateMonetaryValue(indemnityPaid * 0.15);
        const adjusterFees = generateMonetaryValue(indemnityPaid * 0.08);
        const tpaFees = generateMonetaryValue(indemnityPaid * 0.03);

        const isClosed = Math.random() < 0.2;
        const closedDate = isClosed ? 
            new Date(notificationDate.getTime() + Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : 
            "";

        let record = {
            "id": i + 1,
            "Field": `FIELD${Math.floor(Math.random() * 900000 + 100000)}`,
            "Coverholder Name": referenceData.coverholders[Math.floor(Math.random() * referenceData.coverholders.length)],
            "TPA Name": referenceData.tpaNames[Math.floor(Math.random() * referenceData.tpaNames.length)],
            "Agreement No": `AGR${Math.floor(Math.random() * 900000 + 100000)}`,
            "Unique Market Reference (UMR)": `B${Math.floor(Math.random() * 9000000 + 1000000)}`,
            "Binding authority or coverholder appointment agreement inception date": riskStart.toISOString().split('T')[0],
            "Binding authority or coverholder appointment agreement expiry date": riskEnd.toISOString().split('T')[0],
            "Reporting Period Start Date": reportingPeriodStart.toISOString().split('T')[0],
            "Reporting Period (End Date)": reportingPeriodEnd.toISOString().split('T')[0],
            "Class of Business": referenceData.classesOfBusiness[Math.floor(Math.random() * referenceData.classesOfBusiness.length)],
            "Lloyd's Risk Code": referenceData.riskCodes[Math.floor(Math.random() * referenceData.riskCodes.length)],
            "Section No": Math.floor(Math.random() * 5 + 1).toString(),
            "Original Currency": "USD",
            "Settlement Currency": "USD",
            "Rate of Exchange": "1",
            "Certificate Reference": `CERT${Math.floor(Math.random() * 900000 + 100000)}`,
            "Claim Reference / Number": `CLM${Math.floor(Math.random() * 900000 + 100000)}`,
            "Insured Full Name or Company Name": `Company ${Math.floor(Math.random() * 1000)} Inc.`,
            "Insured State, Province, Territory, Canton etc.": state,
            "Insured Country": "USA",
            "Location of risk State, Province, Territory, Canton": state,
            "Location of risk Country": "USA",
            "Risk Inception Date": riskStart.toISOString().split('T')[0],
            "Risk Expiry Date": riskEnd.toISOString().split('T')[0],
            "Period of Cover - Narrative": "Annual",
            "Location of loss State, Province, Territory, Canton": state,
            "Location of loss Country": "USA",
            "Cause of Loss Code": eventDetails ? eventDetails.cause : referenceData.causeCodes[Math.floor(Math.random() * referenceData.causeCodes.length)],
            "Loss Description": eventDetails ? eventDetails.desc : "Standard property damage",
            "Date of Loss (From)": lossDate.toISOString().split('T')[0],
            "Date of Loss to": lossDate.toISOString().split('T')[0],
            "Date Claim First Advised/Date Claim Made": notificationDate.toISOString().split('T')[0],
            "Claim Status": isClosed ? "Closed" : "Open",
            "Refer to Underwriters": Math.random() < 0.1 ? "Y" : "N",
            "Denial": Math.random() < 0.05 ? "Y" : "N",
            "Claimant Name": `Claimant ${Math.floor(Math.random() * 1000)}`,
            "Loss County": `County ${Math.floor(Math.random() * 50)}`,
            "State of Filing": state,
            "PCS Code": `PCS${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,

            // Medicare Fields
            "Medicare United States Bodily Injury": Math.random() < 0.3 ? "Y" : "N",
            "Medicare Eligibility Check Performance": Math.random() < 0.95 ? "Y" : "N",
            "Medicare Outcome of Eligibility Status Check": ["Eligible", "Not Eligible", "Pending"][Math.floor(Math.random() * 3)],
            "Medicare Conditional Payments": Math.random() < 0.3 ? generateMonetaryValue(baseClaimValue * 0.1).toString() : "",
            "Medicare MSP Compliance Services": Math.random() < 0.8 ? "Completed" : "In Progress",

            // Financial Fields
            "Paid this month - Indemnity": indemnityPaid,
            "Paid this month - Fees": feesPaid,
            "Previously Paid - Indemnity": generateMonetaryValue(indemnityPaid * 0.8),
            "Previously Paid - Fees": generateMonetaryValue(feesPaid * 0.8),
            "Reserve - Indemnity": generateMonetaryValue(indemnityPaid * 0.8),
	    "Reserve - Fees": generateMonetaryValue(feesPaid * 0.5),
            "Change this month - Indemnity": Math.floor(indemnityPaid - generateMonetaryValue(indemnityPaid * 0.8)),
            "Change this month - Fees": Math.floor(feesPaid - generateMonetaryValue(feesPaid * 0.8)),
            "Total Incurred - Indemnity": Math.floor(indemnityPaid + generateMonetaryValue(indemnityPaid * 0.8) + generateMonetaryValue(indemnityPaid * 0.5)),
            "Total Incurred - Fees": Math.floor(feesPaid + generateMonetaryValue(feesPaid * 0.8) + generateMonetaryValue(feesPaid * 0.5)),

            // Additional Fields
            "Coverholder PIN": `PIN${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`,
            "Type of Insurance (Direct, or Type of RI)": referenceData.insuranceTypes[Math.floor(Math.random() * referenceData.insuranceTypes.length)],
            "Policy or Group Ref": `POL${Math.floor(Math.random() * 900000 + 100000)}`,

            // Address Fields
            "Insured Address": generateAddress(state),
            "Insured Postcode / Zip Code or similar": generateZipCode(state),
            "Location of Risk Location ID": `LOC${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`,
            "Location of Risk Address": generateAddress(state),
            "Location of Risk Postcode / Zip Code or similar": generateZipCode(state),
            "Location of loss Address": generateAddress(state),
            "Location of loss Postcode / Zip Code or similar": generateZipCode(state),

            // Additional Financial Fields
            "Deductible Amount": generateMonetaryValue(baseClaimValue * 0.05),
            "Deductible Basis": referenceData.deductibleBasis[Math.floor(Math.random() * referenceData.deductibleBasis.length)],
            "Sums Insured Amount": generateMonetaryValue(baseClaimValue * 10),

            // Date Fields
            "Date Closed": closedDate,
            "Lloyd's Cat Code": referenceData.catCodes[Math.floor(Math.random() * referenceData.catCodes.length)],
            "Catastrophe Name": referenceData.catNames[Math.floor(Math.random() * referenceData.catNames.length)],

            // Expense Fields
            "Paid this month - Expenses": expensesPaid,
            "Paid this month - Attorney Coverage Fees": attorneyFees,
            "Paid this month - Adjusters Fees": adjusterFees,
            "Paid this month - Defence Fees": generateMonetaryValue(indemnityPaid * 0.12),
            "Paid this month - TPA Fees": tpaFees,
            "Previously Paid - Expenses": generateMonetaryValue(expensesPaid * 0.8),
            "Previously Paid - Attorney Coverage Fees": generateMonetaryValue(attorneyFees * 0.8),
            "Previously Paid - Adjusters Fees": generateMonetaryValue(adjusterFees * 0.8),
            "Previously Paid - Defence Fees": generateMonetaryValue(indemnityPaid * 0.12 * 0.8),
            "Previously Paid - TPA Fees": generateMonetaryValue(tpaFees * 0.8),
            "Reserve - Expenses": generateMonetaryValue(expensesPaid * 0.5),
            "Reserve - Attorney Coverage Fees": generateMonetaryValue(attorneyFees * 0.5),
            "Reserve - Adjusters Fees": generateMonetaryValue(adjusterFees * 0.5),
            "Reserve - Defence Fees": generateMonetaryValue(indemnityPaid * 0.12 * 0.5),
            "Reserve - TPA Fees": generateMonetaryValue(tpaFees * 0.5),
            "Total Incurred": Math.floor(baseClaimValue * claimMultiplier),

            // Vehicle/Aircraft Fields
            "Name or Reg No of Aircraft Vehicle, Vessel etc.": Math.random() < 0.3 ? 
                `${['N', 'G-', 'VH-'][Math.floor(Math.random() * 3)]}${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}` : "",
            "% Ceded (Reinsurance)": Math.floor(Math.random() * 100),

            // Medical Fields
            "Plan": referenceData.plans[Math.floor(Math.random() * referenceData.plans.length)],
            "Patient Name": Math.random() < 0.3 ? `Patient ${Math.floor(Math.random() * 1000)}` : "",
            "Treatment Type": referenceData.treatmentTypes[Math.floor(Math.random() * referenceData.treatmentTypes.length)],
            "Country of Treatment": "USA",
            "Date of Treatment": new Date(lossDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],

            // Expert Fields
            "Expert - Role": referenceData.expertRoles[Math.floor(Math.random() * referenceData.expertRoles.length)],
            "Expert Firm / Company Name": referenceData.expertFirms[Math.floor(Math.random() * referenceData.expertFirms.length)],
            "Expert Reference No etc.": `EXP${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`,
            "Expert Address": generateAddress(state),
            "Expert State, Province, Territory, Canton etc.": state,
            "Expert Postcode / Zip Code or similar": generateZipCode(state),
            "Expert Country": "USA",

            // Additional Dates and Notes
            "Notes": eventDetails ? `${eventDetails.desc}. Claim under review.` : "Standard claim processing",
            "Date Claim Opened": new Date(notificationDate.getTime() - Math.random() * 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            "Ex gratia payment": Math.random() < 0.05 ? "Y" : "N",
            "Claim First Notification Acknowledgement Date": new Date(notificationDate.getTime() + Math.random() * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            "Date First Reserve Established": new Date(notificationDate.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            "Diary date": new Date(today.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            "Peer review date": Math.random() < 0.3 ? new Date(today.getTime() + Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : ""
        };

        // Introduce data quality issues (10% chance)
        if (Math.random() < 0.1) {
            const issueType = Math.floor(Math.random() * 12);
            switch(issueType) {
                case 0:
                    record["Unique Market Reference (UMR)"] = "PENDING";
                    break;
                case 1:
                    record["Date of Loss (From)"] = introduceDateIssue(record["Date of Loss (From)"], 'format');
                    break;
                case 2:
                    record["Risk Inception Date"] = introduceDateIssue(record["Risk Inception Date"], 'mixed');
                    break;
                case 3:
                    record["Original Currency"] = "";
                    break;
                case 4:
                    record["Total Incurred"] = "TBC";
                    break;
                case 5:
                    record["Cause of Loss Code"] = "";
                    break;
                case 6:
                    record["Location of risk State, Province, Territory, Canton"] = "XX";
                    break;
                case 7:
                    record["TPA Name"] = "";
                    break;
                case 8:
                    record["Agreement No"] = "TBC";
                    break;
                case 9:
                    [record["Reporting Period Start Date"], record["Reporting Period (End Date)"]] = 
                    [record["Reporting Period (End Date)"], record["Reporting Period Start Date"]];
                    break;
                case 10:
                    record["Reporting Period Start Date"] = '';
                    break;
                case 11:
                    const randomDate = generateRandomDate(startDate, today);
                    record["Reporting Period (End Date)"] = randomDate.toISOString().split('T')[0];
                    break;
            }
        }

        data.push(record);
    }
    return data;
}

// Generate and transform data
const claimsData = generateClaimsData(10000);

// Transform column names
const transformedData = claimsData.map(record => {
    const transformedRecord = {};
    Object.entries(record).forEach(([key, value]) => {
        const newKey = key === 'id' ? key : standardizeColumnName(key);
        transformedRecord[newKey] = value;
    });
    return transformedRecord;
});

// Generate CSV file
const csv = Papa.unparse(transformedData);
fs.writeFileSync('lloyds_us_claims_data_1000.csv', csv);
console.log("Generated claims data with standardized column names");
