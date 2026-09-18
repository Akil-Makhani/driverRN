/**
 * The Lorry Receipt document, as HTML.
 *
 * This is a port of the web admin's LR template — libs/common-ui/src/lib/
 * lr-document/lr-document.component.html in bst-frontend. A driver's saved LR
 * has to be the same document the office issues, so the markup here is kept
 * deliberately identical to that file: same sections in the same order, same
 * colours, same hard-coded company/bank/terms text. When the web template
 * changes, this one changes with it.
 *
 * The web app screenshots its rendered component with html2canvas and wraps the
 * JPEG in a PDF. Here the HTML goes straight to expo-print, which renders it
 * through the platform's own print pipeline — the same layout, but as real
 * vector text rather than a picture of text.
 *
 * Every value the web template hard-codes (the "Morbi"/"Mumbai" route, the
 * zeroed freight, GST 5% / RCM Yes, "TBB", "Not Covered", the bank block) is
 * hard-coded here too, and the fields the driver API does not carry — both
 * GSTINs, the e-way bill and the invoice number — print blank, exactly as the
 * web template does when those values are missing.
 */
import type { Address, RequestedProduct, TripDetailsData } from '@/types/trip';

// ── Palette, copied from the web template ────────────────────
const NAVY = '#14213d';
const ORANGE = '#EA5B2A';
const PEACH = '#FDEDE3';
const PEACH_BORDER = '#F0B08C';
const PEACH_RULE = '#F3D5C4';
const PEACH_DOT = '#F4C2A6';
const GRID = '#9FADC4';
const HEADER_BG = '#EEF0F6';
const MICRO = '#6b7280';
const RULE = '#D8DEE8';

/** The goods table always shows at least this many rows, per the LR format. */
const MIN_GOODS_ROWS = 6;

/**
 * Page geometry in points. A4 width, but a taller-than-A4 page: the web LR is
 * one continuous sheet whose height follows its content, and the document runs
 * past A4's 842pt — on a fixed A4 page the terms and signature spill onto a
 * second page. It measures a shade over 1100pt at this width, so 1150 leaves
 * room for a longer address or an extra goods row before it would break.
 */
export const PAGE_WIDTH = 595;
export const PAGE_HEIGHT = 1150;

// The header's inline contact icons, lifted from the web template so the two
// documents read identically.
const svgIcon = (body: string) =>
  `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const ICON_MAIL = svgIcon(
  '<rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m2 6 10 7 10-7"></path>',
);
const ICON_PHONE = svgIcon(
  '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"></path>',
);
const ICON_PIN = svgIcon(
  '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>',
);

/** Escapes text before it goes into the document. Company names carry `&`. */
function esc(value?: string | null): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** `1.2-2` / `1.3-3` in Angular's number pipe: fixed decimals, grouped. */
function decimals(value: number, places: number): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  });
}

/** dd/MM/yyyy, matching the web template's date pipe. */
function formatDate(value?: string): string {
  const date = value ? new Date(value) : new Date();
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  const dd = String(safe.getDate()).padStart(2, '0');
  const mm = String(safe.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${safe.getFullYear()}`;
}

/**
 * Port of CommonService#formatAddressBlock for the structured address shape.
 * The driver API only ever returns the structured form, so the flat-string
 * branch the web helper also handles has no equivalent here.
 */
function addressLines(address?: Address): string[] {
  if (!address) return [];
  const lines: string[] = [];
  if (address.buildingName) lines.push(String(address.buildingName).trim());
  if (address.locality) lines.push(String(address.locality).trim());
  const cityLine = [address.city, address.pincode]
    .filter((part) => !!part && String(part).trim())
    .join(' - ');
  if (cityLine) lines.push(cityLine);
  return lines.filter((line) => !!line);
}

/**
 * The LR box prints just the trailing digits — "Local-LR-0505" shows as "0505"
 * — while the saved number, and the PDF's filename, keep the prefix.
 */
export function lrNumberDigits(lrNumber?: string): string {
  const value = lrNumber ?? '';
  const match = value.match(/(\d+)\s*$/);
  return match ? match[1] : value;
}

interface TemplateAssets {
  /** `data:` URIs — a print WebView cannot reach the app's bundled assets. */
  logo: string;
  signature: string;
}

const microLabel = (text: string) =>
  `<div style="font-size: 9.5px; color: ${MICRO}; margin-bottom: 3px;">${text}</div>`;

const boldValue = (text: string) =>
  `<div style="font-weight: bold; color: ${NAVY};">${text}</div>`;

/** One "label over value" cell from the LORRY RECEIPT DETAILS strip. */
const detailCell = (width: string, label: string, value: string) =>
  `<td style="padding: 6px 18px 16px; width: ${width};">
     ${microLabel(label)}${boldValue(value)}
   </td>`;

/** A readonly-input-styled box from PAYMENT & TRANSPORT DETAILS. */
const payCell = (label: string, value: string, bold: boolean) =>
  `<td style="padding: 10px 16px 16px; width: 25%;">
     ${microLabel(label)}
     <div style="box-sizing: border-box; background: ${PEACH}; padding: 6px; border: 1px solid ${PEACH_BORDER}; border-radius: 4px; min-height: 13px;${
       bold ? ' font-weight: bold;' : ''
     }">${value}</div>
   </td>`;

const bankCell = (label: string, value: string) =>
  `<td style="padding: 8px 16px 16px; width: 25%;">
     <div style="font-size: 9.5px; color: ${MICRO};">${label}</div>
     ${boldValue(value)}
   </td>`;

/** A party card: CONSIGNOR or CONSIGNEE. */
function partyCard(heading: string, bodyLines: string[]): string {
  return `<table style="width: 100%; border-collapse: collapse; border: 1px solid ${GRID}; border-radius: 10px;">
    <tr>
      <td style="padding: 10px 16px; font-weight: bold; color: ${NAVY}; border-bottom: 1px solid ${GRID};">${heading}</td>
    </tr>
    <tr>
      <td style="padding: 12px 16px 14px; font-size: 11px; font-weight: bold; line-height: 1.8; color: ${NAVY};">
        ${bodyLines.map((line) => `<div>${line}</div>`).join('')}
      </td>
    </tr>
  </table>`;
}

/** Builds the complete LR document for a trip. */
export function buildLrHtml(
  trip: TripDetailsData,
  assets: TemplateAssets,
): string {
  // The web LR prints the ordered ("planned") quantities, not what was loaded.
  const items: RequestedProduct[] = trip.productDifferences?.requested ?? [];

  const pickup = trip.pickupAddress;
  const delivery = trip.deliveries?.[0]?.address;

  const totalQty = items.reduce((sum, item) => sum + (item.qty ?? 0), 0);
  const totalWeight = items.reduce((sum, item) => sum + (item.weight ?? 0), 0);

  const goodsRows = items
    .map((item, index) => {
      const sub = item.subItem?.name ? ` - ${esc(item.subItem.name)}` : '';
      const weight = decimals(item.weight ?? 0, 3);
      const cell = `padding: 10px; border: 1px solid ${GRID};`;
      return `<tr>
        <td style="${cell} text-align: center;">${index + 1}.</td>
        <td style="${cell}">${esc(item.product?.name)}${sub}</td>
        <td style="${cell} text-align: center;">--</td>
        <td style="${cell} text-align: center;">${item.qty ?? ''}</td>
        <td style="${cell} text-align: center;">${weight}</td>
        <td style="${cell} text-align: center;">${weight}</td>
      </tr>`;
    })
    .join('');

  const blankCell = `<td style="padding: 10px; border: 1px solid ${GRID};">&nbsp;</td>`;
  const blankRows = Array(Math.max(0, MIN_GOODS_ROWS - items.length))
    .fill(`<tr>${blankCell.repeat(6)}</tr>`)
    .join('');

  // GSTIN lines are omitted rather than printed empty — the web template
  // *ngIf's them away the same way when a party has no GST on file. The driver
  // API carries no GST number at all, so in practice they never appear.
  const consignorLines = [
    esc(pickup?.companyName),
    ...addressLines(pickup).map(esc),
    ...(pickup?.contactNumber ? [`Mobile: ${esc(pickup.contactNumber)}`] : []),
  ];

  const consigneeLines = [
    ...(delivery?.companyName ? [esc(delivery.companyName)] : []),
    esc(delivery?.contactName),
    ...addressLines(delivery).map(esc),
    ...(delivery?.contactNumber ? [`Mobile: ${esc(delivery.contactNumber)}`] : []),
  ];

  const goodsHead = `padding: 11px 10px; border: 1px solid ${ORANGE}; font-weight: bold;`;
  const totalCell = `padding: 10px; border: 1px solid ${GRID};`;
  const freightRow = (label: string) =>
    `<tr style="border-bottom: 1px solid ${ORANGE};">
       <td style="padding: 12px 0;">${label}</td>
       <td style="padding: 12px 0; text-align: right;">0</td>
     </tr>`;
  const dot = (color: string, square = false) =>
    `<span style="display: inline-block; width: 9px; height: 9px;${
      square ? '' : ' border-radius: 50%;'
    } background: ${color}; margin-right: 4px;"></span>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1122">
<style>
  /* The LR is one continuous sheet, as the office's copy is: A4 width but
     taller, so the terms and signature do not spill onto a second page.
     expo-print's width/height options are ignored by Android's print engine,
     which takes the page size from here instead. */
  @page { size: ${PAGE_WIDTH}pt ${PAGE_HEIGHT}pt; margin: 0; }
</style>
</head>
<body style="margin: 0; padding: 30px; font-family: Arial, sans-serif; font-size: 12px; color: #1f2937; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
  <div style="width: 100%; background: #fff; border: 2px solid ${NAVY}; padding: 40px; box-sizing: border-box;">

    <!-- Header -->
    <table style="width: 100%; border-collapse: collapse; background: ${HEADER_BG}; border-bottom: 2px solid ${NAVY};">
      <tr>
        <td style="width: 66%; vertical-align: middle; padding: 14px 18px;">
          <div style="font-size: 24px; font-weight: bold; color: ${NAVY}; margin-bottom: 3px;">Always Roadways Private Limited</div>
          <div style="font-size: 10.5px; font-weight: bold; line-height: 1.55; color: #333;">
            <strong>GSTIN:</strong> 24ABECA2356H1ZX | <strong>PAN:</strong> ABECA2356H
            <span style="display: inline-block; vertical-align: -1px; margin-left: 4px;">${ICON_MAIL}</span>
            info&#64;alwaysroadways.in
            <span style="display: inline-block; vertical-align: -1px; margin-left: 6px;">${ICON_PHONE}</span>
            +91 99094 01001<br>
            <span style="display: inline-block; vertical-align: -1px; margin-right: 4px;">${ICON_PIN}</span>
            G-5 Siromany 142, B/h Real Plaza, Nr. Omkar CNG Pump, Lalpar, Morbi &ndash; 363642 (Guj.)
          </div>
        </td>
        <td style="width: 34%; text-align: right; vertical-align: middle; padding: 14px 18px;">
          <img src="${assets.logo}" style="width: 190px; max-width: 100%;">
        </td>
      </tr>
    </table>

    <!-- Lorry Receipt Details -->
    <table style="width: 100%; border-collapse: collapse; border: 1.5px solid ${ORANGE}; border-radius: 10px; background: ${PEACH}; margin-top: 18px;">
      <tr>
        <td style="padding: 12px 18px 4px;" colspan="6">
          <span style="font-weight: bold; font-size: 13px; color: ${NAVY}; letter-spacing: 0.3px;">LORRY RECEIPT DETAILS</span>
        </td>
      </tr>
      <tr>
        ${detailCell('15%', 'LR Number', esc(lrNumberDigits(trip.lrNumber)))}
        ${detailCell('15%', 'LR Date', formatDate(trip.createdAt))}
        ${detailCell('18%', 'Vehicle Number', esc(trip.truckNumber))}
        ${detailCell('17%', 'From', 'Morbi')}
        ${detailCell('17%', 'To', 'Mumbai')}
        ${detailCell('18%', 'Delivery at', esc(delivery?.city))}
      </tr>
    </table>

    <!-- Consignor / Consignee -->
    <table style="width: 100%; border-collapse: collapse; margin-top: 18px;">
      <tr>
        <td style="width: 48.5%; vertical-align: top;">${partyCard('CONSIGNOR (SENDER)', consignorLines)}</td>
        <td style="width: 3%;"></td>
        <td style="width: 48.5%; vertical-align: top;">${partyCard('CONSIGNEE (RECEIVER)', consigneeLines)}</td>
      </tr>
    </table>

    <!-- Goods -->
    <table style="width: 100%; border-collapse: collapse; border: 1px solid ${GRID}; margin-top: 18px;">
      <tr style="background: ${ORANGE}; color: #fff;">
        <td style="${goodsHead} width: 8%; text-align: center;">SR No</td>
        <td style="${goodsHead} width: 32%;">Description of Goods</td>
        <td style="${goodsHead} width: 12%; text-align: center;">HSN</td>
        <td style="${goodsHead} width: 12%; text-align: center;">Qty</td>
        <td style="${goodsHead} width: 18%; text-align: center;">Actual WT (KG)</td>
        <td style="${goodsHead} width: 18%; text-align: center;">Charge WT (KG)</td>
      </tr>
      ${goodsRows}
      ${blankRows}
      <tr style="background: ${PEACH}; font-weight: bold;">
        <td style="${totalCell} text-align: right;" colspan="3">Total</td>
        <td style="${totalCell} text-align: center;">${decimals(totalQty, 2)}</td>
        <td style="${totalCell} text-align: center;">${decimals(totalWeight, 2)}</td>
        <td style="${totalCell} text-align: center;">${decimals(totalWeight, 2)}</td>
      </tr>
    </table>

    <!-- Freight / GST -->
    <table style="width: 100%; border-collapse: collapse; margin-top: 18px;">
      <tr>
        <td style="width: 42%; vertical-align: top; border: 1px solid ${ORANGE}; border-radius: 10px; padding: 15px;">
          <div style="font-weight: bold; color: ${NAVY}; padding-bottom: 10px; border-bottom: 1px solid ${RULE};">FREIGHT CHARGES</div>
          <table style="width: 100%; border-collapse: collapse;">
            ${freightRow('Freight Charges')}
            ${freightRow('Loading / Other')}
            <tr style="background: ${PEACH}; font-weight: bold;">
              <td style="padding: 12px 8px;">Total Freight</td>
              <td style="padding: 12px 8px; text-align: right;">0</td>
            </tr>
          </table>
        </td>
        <td style="width: 3%;"></td>
        <td style="width: 55%; vertical-align: top; border: 1px solid ${ORANGE}; border-radius: 10px; padding: 15px;">
          <div style="font-weight: bold; color: ${NAVY}; padding-bottom: 10px; border-bottom: 1px solid ${PEACH_RULE};">GST DETAILS</div>
          <div style="padding-top: 10px;">
            <div style="font-size: 11px; font-weight: bold; margin-bottom: 6px;">GST Type</div>
            <div>
              ${dot(ORANGE)}<span style="margin-right: 14px;">CGST + SGST</span>
              ${dot(PEACH_DOT)}<span>IGST</span>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
              <tr>
                <td style="width: 50%; padding-right: 5px;">
                  <div style="font-size: 10px; font-weight: bold; margin-bottom: 3px;">GST %</div>
                  <div style="background: ${PEACH}; padding: 6px; border: 1px solid ${PEACH_BORDER}; border-radius: 4px;">5%</div>
                </td>
                <td style="width: 50%; padding-left: 5px;">
                  <div style="font-size: 10px; font-weight: bold; margin-bottom: 3px;">RCM</div>
                  <div style="background: ${PEACH}; padding: 6px; border: 1px solid ${PEACH_BORDER}; border-radius: 4px;">Yes</div>
                </td>
              </tr>
            </table>
            <div style="font-size: 11px; font-weight: bold; margin: 8px 0 6px;">Payable By</div>
            <div>
              ${dot(ORANGE, true)}<span style="margin-right: 12px;">Consignor</span>
              ${dot(PEACH_DOT, true)}<span style="margin-right: 12px;">Consignee</span>
              ${dot(PEACH_DOT, true)}<span>Transporter</span>
            </div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Payment & Transport -->
    <table style="width: 100%; border-collapse: collapse; border: 1px solid ${ORANGE}; border-radius: 10px; margin-top: 18px;">
      <tr>
        <td style="padding: 10px 16px; font-weight: bold; color: ${NAVY}; border-bottom: 1px solid ${PEACH_RULE};" colspan="4">PAYMENT &amp; TRANSPORT DETAILS</td>
      </tr>
      <tr>
        ${payCell('Mode of Payment', 'TBB', true)}
        ${payCell('E-Way Bill No', '&nbsp;', false)}
        ${payCell('Invoice No', '&nbsp;', false)}
        ${payCell('Insurance', 'Not Covered', false)}
      </tr>
    </table>

    <!-- Bank details -->
    <table style="width: 100%; border-collapse: collapse; border: 1px solid ${ORANGE}; border-radius: 10px; background: ${PEACH}; margin-top: 18px;">
      <tr>
        <td style="padding: 10px 16px; font-weight: bold; color: ${NAVY}; border-bottom: 1px solid ${PEACH_RULE};" colspan="4">BANK DETAILS FOR PAYMENT</td>
      </tr>
      <tr>
        ${bankCell('Bank Name', 'HDFC Bank')}
        ${bankCell('Account Name', 'ALWAYS ROADWAYS PRIVATE LIMITED')}
        ${bankCell('Account Number', '50200115361607')}
        ${bankCell('IFSC Code', 'HDFC0000307')}
      </tr>
    </table>

    <!-- Terms + signature -->
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px; border-top: 1px solid ${RULE};">
      <tr>
        <td style="width: 68%; vertical-align: top; padding-top: 10px;">
          <div style="font-weight: bold; color: ${NAVY}; margin-bottom: 4px;">Terms &amp; Conditions:</div>
          <div style="font-size: 10px; line-height: 1.6;">
            This consignment is subject to the standard terms and conditions of carriage. The company shall not be liable for any loss, damage, or delay arising from acts of God, accidents, riots, strikes, or other causes beyond our control.
          </div>
        </td>
        <td style="width: 32%; vertical-align: bottom; text-align: center; padding-top: 10px;">
          <img src="${assets.signature}" style="display: block; width: 150px; margin: 9px auto 0;">
          <div style="font-size: 11px; font-weight: bold; color: ${NAVY}; margin-top: 4px;">Authorised Signatory</div>
        </td>
      </tr>
    </table>

    <div style="font-size: 10px; font-style: italic; text-align: center; color: ${MICRO}; margin-top: 16px;">
      Digitally Generated Lorry Receipt &ndash; No Physical Signature Required
    </div>
  </div>
</body>
</html>`;
}
