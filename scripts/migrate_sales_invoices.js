// scripts/migrate_sales_invoices.js
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

// Target CSV files to process
const CSV_FILES = [
  {
    path: 'Copy of OR 2024-2025 - 5-23.csv', // Adjust path if located in another folder
    defaultStartYear: 2024,
    defaultBooklet: 5,
  },
];

// Clean date parser handling 2-digit years, forward-slashes, and null/cancelled lines
const parseDate = (dStr, fallbackYear) => {
  if (!dStr) return null;
  const s = String(dStr).trim();
  if (s.toUpperCase() === 'CANCELLED' || s === '') return null;

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

// Strips currency symbols, commas, and formatting
const cleanAmount = (val) => {
  if (!val) return 0.0;
  const sanitized = String(val).replace(/,/g, '').replace(/[P₱]/g, '').trim();
  const num = parseFloat(sanitized);
  return isNaN(num) ? 0.0 : num;
};

// Read and parse single CSV file
async function readAndProcessCSV(filePath, defaultYear, defaultBooklet) {
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

  let currentBooklet = defaultBooklet;
  let currentYear = defaultYear;
  let lastValidDate = `${defaultYear}-01-01`;
  const processed = [];

  for (const r of rows) {
    // Columns from the spreadsheet:
    // YEAR, BOOKLET NO., OR NO, DATE, RECEIVED FROM, TIN NO, AMOUNT, ITEM, REMARKS
    const yearRaw = r['YEAR'];
    const bookletRaw = r['BOOKLET NO.'];
    const orRaw = r['OR NO'];
    const dateRaw = r['DATE'];
    const customer = (r['RECEIVED FROM'] || '').trim();
    const amountRaw = r['AMOUNT'] || '';
    const itemStr = (r['ITEM'] || '').trim();
    const remarkStr = (r['REMARKS'] || '').trim();

    // Update Year and Booklet when an explicit header entry is encountered
    if (yearRaw && String(yearRaw).trim() !== '') {
      const parsedYear = parseInt(yearRaw, 10);
      if (!isNaN(parsedYear)) currentYear = parsedYear;
    }

    if (bookletRaw && String(bookletRaw).trim() !== '') {
      const parsedBooklet = parseInt(bookletRaw, 10);
      if (!isNaN(parsedBooklet)) currentBooklet = parsedBooklet;
    }

    // Skip empty divider rows
    if (!orRaw && !customer && !amountRaw.trim()) {
      continue;
    }

    const orNo = parseInt(orRaw, 10);
    if (isNaN(orNo)) continue;

    const amount = cleanAmount(amountRaw);
    const isCancelled = (remarkStr + ' ' + customer).toLowerCase().includes('cancel');

    // Rule 1: Skip voided/cancelled rows that have no item and no remarks
    if (isCancelled && !itemStr && !remarkStr) {
      continue;
    }

    // Rule 2: Skip empty walk-in entries that have no details and 0 amount
    if (!customer && !itemStr && !remarkStr && amount === 0) {
      continue;
    }

    // Rule 3: Resolve customer name and details
    let finalCustomer = customer;
    let finalDetails = [itemStr, remarkStr].filter(Boolean).join(' - ') || null;

    if (isCancelled) {
      if (remarkStr) {
        // Use the remark as the company name and keep item as details
        finalCustomer = remarkStr;
        finalDetails = itemStr || null;
      } else {
        finalCustomer = 'CANCELLED';
      }
    } else if (!finalCustomer) {
      finalCustomer = 'Walk-in';
    }

    // Date resolution
    const parsedDate = parseDate(dateRaw, currentYear);
    if (parsedDate) {
      currentYear = parsedDate.year;
      lastValidDate = parsedDate.date;
    }

    const dateIssued = parsedDate ? parsedDate.date : lastValidDate;

    // Standardized SI Number: SI-YYYY-Booklet-No
    const formattedSI = `SI-${currentYear}-${currentBooklet}-${orNo}`;

    processed.push({
      si_number: formattedSI,
      customer_name: finalCustomer,
      date_issued: dateIssued,
      details: finalDetails,
      legacy_order_details: finalDetails,
      amount: amount,
      legacy_amount: amount,
    });
  }

  return processed;
}

async function runMigration() {
  console.log('--- Starting Clean Sales Invoices Migration ---');
  let allInvoices = [];

  for (const target of CSV_FILES) {
    console.log(`Processing file: ${target.path}...`);
    const records = await readAndProcessCSV(target.path, target.defaultStartYear, target.defaultBooklet);
    console.log(` -> Extracted ${records.length} valid records.`);
    allInvoices = allInvoices.concat(records);
  }

  console.log(`Total valid invoices to migrate: ${allInvoices.length}`);

  // 1. Sync Customer Directory with Customers table
  console.log('Syncing unique customers to Supabase...');
  const uniqueCompanies = [
    ...new Set(
      allInvoices
        .map((r) => r.customer_name)
        .filter((name) => name && name !== 'CANCELLED' && name !== 'Walk-in')
    ),
  ];
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

  // 2. Batch upload into sales_invoices
  const payload = allInvoices.map((r) => ({
    si_number: r.si_number,
    customer_id: customerCache[r.customer_name.toLowerCase()] || null,
    customer_name: r.customer_name,
    date_issued: r.date_issued,
    details: r.details,
    legacy_order_details: r.legacy_order_details,
    amount: r.amount,
    legacy_amount: r.legacy_amount,
  }));

  console.log('Uploading Sales Invoices in batches of 100...');
  for (let i = 0; i < payload.length; i += 100) {
    const chunk = payload.slice(i, i + 100);
    const { error } = await supabase
      .from('sales_invoices')
      .upsert(chunk, { onConflict: 'si_number' });

    if (error) {
      console.error(`Error uploading batch ${Math.floor(i / 100) + 1}:`, error.message);
    } else {
      console.log(`Batch ${Math.floor(i / 100) + 1} (${chunk.length} rows) successfully synced.`);
    }
  }

  console.log('--- Sales Invoices Migration Complete! ---');
}

runMigration().catch(console.error);