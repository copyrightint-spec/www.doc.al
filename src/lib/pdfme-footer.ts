/**
 * DOC.al Mandatory Footer - Static Schema Generator for pdfme
 *
 * Generates immutable footer elements for every page of a template:
 * - QR code (left) for document verification/scanning
 * - DOC.al logo + "Verified by DOC.al" text (center)
 * - DataMatrix code with timestamp hash (center-right)
 * - Page number "Faqja X / Y" (right)
 *
 * These use pdfme's staticSchema on BlankPdf so they cannot be
 * edited or removed by template creators in the Designer.
 */

// A4 dimensions in mm
const A4_WIDTH = 210;
const A4_HEIGHT = 297;

// Footer zone: bottom 32mm of each page
const FOOTER_HEIGHT = 32;
const FOOTER_Y = A4_HEIGHT - FOOTER_HEIGHT; // 265mm
const FOOTER_PADDING_X = 12;
const FOOTER_INNER_Y = FOOTER_Y + 4; // 4mm padding inside footer

// DOC.al "D" icon as base64 PNG (64x64px, ~1.2KB)
const DOCAL_SHIELD_DATA_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAABblBMVEVMaXEGQfEJV/8JUf7V4fwAF50AFZgALvkACZETXv0AGqcDHaQMZv8AGaIAG60AHbEBJL4CJ8MCKswEM98DE5sKXv8HSPkDFpcFO+kBF5wJQOLH4v8EKMwHLLMnb/C01v8BEp8FKbgLQtjg8f/Y7f8CFJiZxv+Ivf8FN+YDMNgEI6sQT+gLNrz2+//q9v/S5/8XUNS+3P8YXPQ/kf+mzf8BHacDHLEGO+sHSPkNRtsMZ/zn8/+/2/8RQsghbvbe7f8gYOIAGaosbfRkpf4JXv0FNeIBGqgDJ8oHSPoBIbgDKdEELdUPc/8JT/n4+/wXbfwQQMUTVvATWPYRWPC72v/E3v8AFJqJu/97tP9amfsIVP8BGKANbf0EMNYCI777//9IjvmJuv0dW9+72f0gYeKCuf2hyv57s/3O4/8AEJImavYCGKYCIbcBILcDLdQOcv8IS//+///y/f9cnf8tf/41hfxJlv8US9YLOswaWeXmHILzAAAAbXRSTlMA/f7+A/3+AQID/RP8/f7+/v79/jH+/hv98iL9Mfr+/TiWC/39Wf37/vv9k/2S+/z7/lzz/pJG0esYbV5e/pWS/uF1+fC8j9PK+2Sy7Lxn1fc8fjLrlaZe6VvyqqjjvU6RhvaI+sLlx5JuvsPkXNBcsgAAAAlwSFlzAAALEwAACxMBAJqcGAAAAlBJREFUeNrt1dlX2kAUB+BhCZMESEAoYRGQJWDFIqBVLEgFV7Turdbu+3rCarH973snaE37dHP60p6T32OYfNxJ7twQYsWKlX83lDeEUmr6/j8vCIJJQQmOM8kSdQvmCJ4sRlwc5xXltn/idmDaVt0uHAFhAtiUOAZImm+iA0DIYb+1d4IXeHJX4lwuJrSZEGaCx3MPLQAgAwAE1MA2EbZBCZ4uWgBA844FL9tFwKZvwtOtIAWepHyiF+5Xg1OQxZ3dcCjEgAdR+A0H+GdEjou4xw1ByeRSTy+hgStBIKnv8RkvA/ROhBZw7zmuShBQQOFyFoTrCtiVaNXEcwTgxyEINwBcOnbY7Z7uMyTQSJRWZuMGgJKo/ioPBEIxwKuLd0wwAoL+HNfTOOD1KLFaWokrxtUbIWiG9WUM4CRv174lVi8PFUMFZIO10xMk8OjDPAilZQPgfh622XrVNBKIvQfhzU3jwQlnh6q3TXHAp+zDj/MXiaPrlwbd9KIDh6pXQL1GADJlJrRgOUxHgadk069PhgoSuF+MlZP50cF4x5QoTzUfnOvwEuoRMGAwF0su5IbHMB1V9fNpRNan2/QO7jA5yZ1BdixUiCrCZBIlGSoI7CInEgD9THaunMzl1yrkVILRJsMWOlsKoWigmMnGygu5/LDFf5UBaPs6W8hxcgUUM2wT+cfDhtLUZM3vS7mx9wOw3+8PBlAD28Toi9qUmqkpIvD4T4vz5X6tVqvX62dn5+etEyWYhmYy/YH8fU7y5tY7f0WA0L/8dytWrFj5f/ITFmBY1Hdfz8UAAAAASUVORK5CYII=";

/**
 * Generate the static footer schema for a single page.
 * Each element is non-editable in the pdfme Designer.
 */
export function generateFooterStaticSchema(pageIndex: number, totalPages: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schemas: any[] = [];

  // ── Separator line at top of footer ──
  schemas.push({
    name: `footer_line_p${pageIndex}`,
    type: "line",
    position: { x: FOOTER_PADDING_X, y: FOOTER_Y },
    width: A4_WIDTH - FOOTER_PADDING_X * 2,
    height: 0.3,
    color: "#d4d4d8", // zinc-300
    readOnly: true,
  });

  const codeSize = 18; // QR and DataMatrix — same dimensions

  // ── QR Code (left side) ──
  schemas.push({
    name: `footer_qr_p${pageIndex}`,
    type: "qrcode",
    content: "https://www.doc.al/verify/{docHash}",
    position: { x: FOOTER_PADDING_X, y: FOOTER_INNER_Y },
    width: codeSize,
    height: codeSize,
    backgroundColor: "#ffffff",
    barColor: "#18181b",
    readOnly: true,
  });

  // ── DataMatrix code (next to QR, same size) ──
  schemas.push({
    name: `footer_datamatrix_p${pageIndex}`,
    type: "gs1datamatrix",
    content: "DOCAL-{docHash}-{timestamp}",
    position: { x: FOOTER_PADDING_X + codeSize + 3, y: FOOTER_INNER_Y },
    width: codeSize,
    height: codeSize,
    backgroundColor: "#ffffff",
    barColor: "#18181b",
    readOnly: true,
  });

  // ── Branding text block (after both codes) ──
  const textX = FOOTER_PADDING_X + codeSize * 2 + 8;

  // DOC.al Shield Logo
  schemas.push({
    name: `footer_logo_p${pageIndex}`,
    type: "image",
    content: DOCAL_SHIELD_DATA_URI,
    position: { x: textX, y: FOOTER_INNER_Y },
    width: 7,
    height: 7,
    readOnly: true,
  });

  // "doc.al" text next to logo
  schemas.push({
    name: `footer_brand_p${pageIndex}`,
    type: "text",
    content: "doc.al",
    position: { x: textX + 8, y: FOOTER_INNER_Y + 1 },
    width: 18,
    height: 5,
    fontSize: 9,
    fontColor: "#1f2937", // gray-800
    alignment: "left",
    readOnly: true,
  });

  // "Vulosur dixhitalisht nga DOC.al"
  schemas.push({
    name: `footer_verified_text_p${pageIndex}`,
    type: "text",
    content: "Vulosur dixhitalisht nga DOC.al",
    position: { x: textX, y: FOOTER_INNER_Y + 8 },
    width: 50,
    height: 4,
    fontSize: 5.5,
    fontColor: "#71717a", // zinc-500
    alignment: "left",
    readOnly: true,
  });

  // Timestamp — ISO 8601 with timezone (eIDAS)
  schemas.push({
    name: `footer_datetime_p${pageIndex}`,
    type: "text",
    content: "{timestamp_iso8601}",
    position: { x: textX, y: FOOTER_INNER_Y + 12.5 },
    width: 50,
    height: 4,
    fontSize: 5,
    fontColor: "#a1a1aa",
    alignment: "left",
    readOnly: true,
  });

  // Hash
  schemas.push({
    name: `footer_hash_p${pageIndex}`,
    type: "text",
    content: "{shortHash}",
    position: { x: textX, y: FOOTER_INNER_Y + 16.5 },
    width: 40,
    height: 4,
    fontSize: 4.5,
    fontColor: "#a1a1aa",
    alignment: "left",
    readOnly: true,
  });

  // ── Page number (right side) ──
  schemas.push({
    name: `footer_pagenum_p${pageIndex}`,
    type: "text",
    content: `Faqja ${pageIndex + 1} / ${totalPages}`,
    position: { x: A4_WIDTH - FOOTER_PADDING_X - 35, y: FOOTER_INNER_Y + 3 },
    width: 35,
    height: 5,
    fontSize: 7,
    fontColor: "#71717a",
    alignment: "right",
    readOnly: true,
  });

  return schemas;
}

/**
 * Generate static schemas for all pages of a template.
 * Returns a flat array suitable for BlankPdf.staticSchema.
 */
export function generateAllPagesFooter(totalPages: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allSchemas: any[] = [];
  for (let i = 0; i < totalPages; i++) {
    allSchemas.push(...generateFooterStaticSchema(i, totalPages));
  }
  return allSchemas;
}

/**
 * Create a BlankPdf configuration with DOC.al mandatory footer.
 * Bottom padding is increased to reserve space for the footer zone.
 */
export function createBlankPdfWithFooter(totalPages: number = 1) {
  return {
    width: A4_WIDTH,
    height: A4_HEIGHT,
    padding: [10, 10, FOOTER_HEIGHT + 2, 10] as [number, number, number, number],
    staticSchema: generateAllPagesFooter(totalPages),
  };
}

/**
 * Update footer schemas when page count changes.
 * Call this when user adds/removes pages in the Designer.
 */
export function updateFooterForPageCount(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentBasePdf: any,
  newTotalPages: number
) {
  return {
    ...currentBasePdf,
    padding: [10, 10, FOOTER_HEIGHT + 2, 10] as [number, number, number, number],
    staticSchema: generateAllPagesFooter(newTotalPages),
  };
}

/**
 * Generate static header schema for organization branding.
 * Adds organization logo (top-left) and DOC.al shield (top-right) to each page.
 */
export function generateHeaderStaticSchema(
  pageIndex: number,
  orgLogoDataUri?: string,
  orgName?: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schemas: any[] = [];

  // Organization logo placeholder (top-left, 12x12mm)
  if (orgLogoDataUri) {
    schemas.push({
      name: `header_orglogo_p${pageIndex}`,
      type: "image",
      content: orgLogoDataUri,
      position: { x: 12, y: 6 },
      width: 12,
      height: 12,
      readOnly: true,
    });
  }

  // Organization name (next to logo)
  if (orgName) {
    schemas.push({
      name: `header_orgname_p${pageIndex}`,
      type: "text",
      content: orgName,
      position: { x: orgLogoDataUri ? 27 : 12, y: 9 },
      width: 60,
      height: 6,
      fontSize: 9,
      fontWeight: "bold",
      fontColor: "#0f172a",
      alignment: "left",
      readOnly: true,
    });
  }

  // DOC.al shield (top-right)
  schemas.push({
    name: `header_docal_p${pageIndex}`,
    type: "image",
    content: DOCAL_SHIELD_DATA_URI,
    position: { x: A4_WIDTH - 19, y: 6 },
    width: 7,
    height: 8,
    readOnly: true,
  });

  return schemas;
}

/**
 * Create a BlankPdf with both header (org branding) and footer (verification).
 */
export function createBlankPdfWithBranding(
  totalPages: number = 1,
  orgLogoDataUri?: string,
  orgName?: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allSchemas: any[] = [];
  for (let i = 0; i < totalPages; i++) {
    allSchemas.push(...generateHeaderStaticSchema(i, orgLogoDataUri, orgName));
    allSchemas.push(...generateFooterStaticSchema(i, totalPages));
  }

  return {
    width: A4_WIDTH,
    height: A4_HEIGHT,
    padding: [22, 10, FOOTER_HEIGHT + 2, 10] as [number, number, number, number], // top padding for header
    staticSchema: allSchemas,
  };
}

// Export constants for use in editor UI
export const FOOTER_CONSTANTS = {
  A4_WIDTH,
  A4_HEIGHT,
  FOOTER_HEIGHT,
  FOOTER_Y,
  FOOTER_PADDING_X,
};
