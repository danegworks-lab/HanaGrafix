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
const csvFilePath = path.resolve('scripts/CHARGE INVOICE.xlsx - EDITED 2022-2025.csv');

// Parse raw spreadsheet dates and extract Year
const parseDate = (dStr) => {
  if (!dStr) return null;
  const s = dStr.trim();
  if (s === '3/23') return { date: '2023-03-01', year: 2023 };
  if (s === '09/23') return { date: '2023-09-01', year: 2023 };
  if (s === '03/25') return { date: '2025-03-01', year: 2025 };
  if (s === '05/25') return { date: '2025-05-01', year: 2025 };
  if (s === '06/09') return { date: '2025-06-09', year: 2025 };

  const parts = s.split(/[-/]/);
  if (parts.length === 3) {
    let [m, d, y] = parts;
    if (y.length === 2) y = '20' + y;
    const formatted = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    const parsedYear = parseInt(y, 10);
    return isNaN(parsedYear) ? null : { date: formatted, year: parsedYear };
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

// Extracts discount values from STATUS/REMARKS (e.g., "10000 (DISCOUNT)" -> 10000)
const extractDiscount = (remarks) => {
  if (!remarks) return 0.0;
  const clean = remarks.replace(/,/g, '');
  const match = clean.match(/(\d+(\.\d+)?)\s*(less|discount)/i) || clean.match(/(less|discount)\s*(\d+(\.\d+)?)/i);
  return match ? parseFloat(match[1] || match[2]) : 0.0;
};

async function runMigration() {
  console.log('Reading CSV file...');
  const rows = [];

  await new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (data) => rows.push(data))
      .on('end', resolve)
      .on('error', reject);
  });

  // Filter out blank divider rows
  const validRows = rows.filter((r) => r['COMPANY'] || r['DETAILS'] || r['AMOUNT']);
  validRows.sort((a, b) => parseInt(a['CI NO.'], 10) - parseInt(b['CI NO.'], 10));

  let lastYear = 2022;
  const processedRows = validRows.map((r) => {
    const ciNo = parseInt(r['CI NO.'], 10);
    const parsed = parseDate(r['DATE']);
    if (parsed) lastYear = parsed.year;

    const dateIssued = parsed ? parsed.date : `${lastYear}-01-01`;
    // Each pad contains 50 receipts starting from CI 751 (Pad 1)
    const padNo = Math.floor((ciNo - 701) / 50);
    
    // Strict format: (year)-(pad no.)-(ci no.) with no spaces around dashes
    const formattedCI = `${lastYear}-${padNo}-${ciNo}`;

    const remarks = r['STATUS/REMARKS'] || '';
    const company = r['COMPANY'] || '';
    const isCancelled = (remarks + ' ' + company).toLowerCase().includes('cancel');
    const discountVal = extractDiscount(remarks);
    const rawAmount = cleanAmount(r['AMOUNT']);

    return {
      ci_number: formattedCI,
      company: company.trim() || 'Walk-in',
      date_issued: dateIssued,
      details: r['DETAILS'] ? r['DETAILS'].trim() : '',
      po_number: r['PO NUMBER'] ? r['PO NUMBER'].trim() : null,
      legacy_amount: rawAmount,
      discount_amount: discountVal,
      status: isCancelled ? 'cancelled' : 'unpaid',
    };
  });

  console.log(`Parsed ${processedRows.length} valid invoice records.`);

  // 1. Sync unique customers
  console.log('Syncing customer directory...');
  const uniqueCompanies = [...new Set(processedRows.map((r) => r.company))];
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

  // 2. Prepare and batch insert invoices
  const invoicePayload = processedRows.map((r) => ({
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

  console.log('Uploading Charge Invoices in batches...');
  for (let i = 0; i < invoicePayload.length; i += 100) {
    const chunk = invoicePayload.slice(i, i + 100);
    const { error } = await supabase
      .from('charge_invoices')
      .upsert(chunk, { onConflict: 'ci_number' });

    if (error) {
      console.error(`Error uploading batch ${Math.floor(i / 100) + 1}:`, error.message);
    } else {
      console.log(`Batch ${Math.floor(i / 100) + 1} (${chunk.length} rows) successfully synced.`);
    }
  }

  console.log('Migration complete! All CI numbers formatted as YYYY-PadNo-CINo.');
}

runMigration().catch(console.error);