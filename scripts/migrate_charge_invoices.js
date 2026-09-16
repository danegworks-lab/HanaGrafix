// scripts/migrate_charge_invoices.js
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Target CSV files to process in chronological order
const CSV_FILES = [
  {
    path: 'scripts/CHARGE INVOICE.xlsx - EDITED 2022-2025.csv',
    defaultStartYear: 2022,
  },
  {
    path: 'scripts/CHARGE INVOICE.xlsx - EDITED 2026.csv',
    defaultStartYear: 2025,
  },
];

// Clean date parser handling 2-digit years and shorthand month/year dates
const parseDate = (dStr, fallbackYear) => {
  if (!dStr) return null;
  const s = String(dStr).trim();
  if (s.toUpperCase() === 'CANCELLED' || s === '') return null;

  // Manual shorthand overrides found in sheets
  if (s === '3/23') return { date: '2023-03-01', year: 2023 };
  if (s === '09/23') return { date: '2023-09-01', year: 2023 };
  if (s === '03/25') return { date: '2025-03-01', year: 2025 };
  if (s === '05/25') return { date: '2025-05-01', year: 2025 };
  if (s === '06/09') return { date: '2025-06-09', year: 2025 };
  if (s === '8/25') return { date: '2025-08-01', year: 2025 };
  if (s === '12/25') return { date: '2025-12-01', year: 2025 };

  const parts = s.split(/[-/]/);
  if (parts.length === 3) {
    let [m, d, y] = parts;
    if (y.length === 2) y = '20' + y;
    const formatted = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    const parsedYear = parseInt(y, 10);
    return isNaN(parsedYear) ? null : { date: formatted, year: parsedYear };
  }

  if (parts.length === 2) {
    let [m, y] = parts;
    if (y.length === 2) y = '20' + y;
    const parsedYear = parseInt(y, 10);
    return isNaN(parsedYear) ? null : { date: `${y}-${m.padStart(2, '0')}-01`, year: parsedYear };
  }

  return null;
};

// Strips currency characters, commas, and whitespace
const cleanAmount = (val) => {
  if (!val) return 0.0;
  const sanitized = String(val).replace(/,/g, '').replace(/[P₱]/g, '').trim();
  const num = parseFloat(sanitized);
  return isNaN(num) ? 0.0 : num;
};

// Extracts discount numbers from STATUS/REMARKS
const extractDiscount = (remarks) => {
  if (!remarks) return 0.0;
  const clean = remarks.replace(/,/g, '');
  const match = clean.match(/(\d+(\.\d+)?)\s*(less|discount)/i) || clean.match(/(less|discount)\s*(\d+(\.\d+)?)/i);
  return match ? parseFloat(match[1] || match[2]) : 0.0;
};

// Read and parse single CSV file
async function readAndProcessCSV(filePath, defaultYear) {
  const rows = [];
  const resolvedPath = path.resolve(filePath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  await new Promise((resolve, reject) => {
    fs.createReadStream(resolvedPath)
      .pipe(csv())
      .on('data', (data) => rows.push(data))
      .on('end', resolve)
      .on('error', reject);
  });

  let currentPad = 1;
  let currentYear = defaultYear;
  const processed = [];

  for (const r of rows) {
    // Standardize to the 8 core headers of the 2022 file
    const padRaw = r['PAD NO.'];
    const ciRaw = r['CI NO.'];
    const company = r['COMPANY'] || '';
    const details = r['DETAILS'] || '';
    const poNumber = r['PO NUMBER'] || '';
    const amountRaw = r['AMOUNT'] || '';
    const remarks = r['STATUS/REMARKS'] || '';

    // Update pad number whenever an explicit PAD NO. is encountered
    if (padRaw && String(padRaw).trim() !== '') {
      const parsedPad = parseInt(padRaw, 10);
      if (!isNaN(parsedPad)) currentPad = parsedPad;
    }

    // Skip empty divider rows
    if (!company.trim() && !details.trim() && !amountRaw.trim()) {
      continue;
    }

    const ciNo = parseInt(ciRaw, 10);
    if (isNaN(ciNo)) continue;

    // Date and year resolution
    const parsedDate = parseDate(r['DATE'], currentYear);
    if (parsedDate) currentYear = parsedDate.year;

    const dateIssued = parsedDate ? parsedDate.date : `${currentYear}-01-01`;

    // Standardized CI format: YYYY-Pad-CI
    const formattedCI = `${currentYear}-${currentPad}-${ciNo}`;

    const isCancelled = (remarks + ' ' + company).toLowerCase().includes('cancel');
    const discountVal = extractDiscount(remarks);
    const legacyAmount = cleanAmount(amountRaw);

    processed.push({
      ci_number: formattedCI,
      company: company.trim() || 'Walk-in',
      date_issued: dateIssued,
      details: details.trim() || '',
      po_number: poNumber.trim() || null,
      legacy_amount: legacyAmount,
      discount_amount: discountVal,
      status: isCancelled ? 'cancelled' : 'unpaid',
    });
  }

  return processed;
}

async function runMigration() {
  console.log('--- Starting Clean Supabase Migration ---');
  let allInvoices = [];

  for (const target of CSV_FILES) {
    console.log(`Processing file: ${target.path}...`);
    const records = await readAndProcessCSV(target.path, target.defaultStartYear);
    console.log(` -> Extracted ${records.length} valid records.`);
    allInvoices = allInvoices.concat(records);
  }

  console.log(`Total valid invoices to migrate: ${allInvoices.length}`);

  // 1. Sync Customer Directory
  console.log('Syncing unique customers to Supabase...');
  const uniqueCompanies = [...new Set(allInvoices.map((r) => r.company))];
  const customerCache = {};

  for (const comp of uniqueCompanies) {
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .ilike('name', comp)
      .maybeSingle();

    if (existing) {
      customerCache[comp.toLowerCase()] = existing.id;
    } else {
      const { data: created, error } = await supabase
        .from('customers')
        .insert([{ name: comp }])
        .select()
        .single();

      if (!error && created) {
        customerCache[comp.toLowerCase()] = created.id;
      }
    }
  }

  // 2. Batch upload charge invoices
  const payload = allInvoices.map((r) => ({
    ci_number: r.ci_number,
    customer_id: customerCache[r.company.toLowerCase()] || null,
    customer_name: r.company,
    date_issued: r.date_issued,
    legacy_order_details: r.details,
    legacy_amount: r.legacy_amount,
    po_number: r.po_number,
    discount_amount: r.discount_amount,
    status: r.status,
  }));

  console.log('Uploading Charge Invoices in batches of 100...');
  for (let i = 0; i < payload.length; i += 100) {
    const chunk = payload.slice(i, i + 100);
    const { error } = await supabase
      .from('charge_invoices')
      .upsert(chunk, { onConflict: 'ci_number' });

    if (error) {
      console.error(`Error uploading batch ${Math.floor(i / 100) + 1}:`, error.message);
    } else {
      console.log(`Batch ${Math.floor(i / 100) + 1} (${chunk.length} rows) successfully synced.`);
    }
  }

  console.log('--- Migration Complete! ---');
}

runMigration().catch(console.error);