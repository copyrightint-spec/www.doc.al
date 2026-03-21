/**
 * Custom pdfme plugins for the DOC.al template editor.
 *
 * Extends the built-in text plugin to expose underline and strikethrough
 * toggles in the Designer property panel, and adds a "signature" placeholder
 * plugin built on top of the image schema.
 */

import type { Plugin } from "@pdfme/common";

// Re-export type for convenience
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPlugin = Plugin<any>;

/**
 * Create an enhanced text plugin that adds underline & strikethrough
 * checkboxes to the property panel.
 *
 * Must be called after importing @pdfme/schemas so we can clone its text plugin.
 */
export function createEnhancedTextPlugin(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  baseTextPlugin: AnyPlugin
): AnyPlugin {
  const basePropPanel = baseTextPlugin.propPanel;
  const baseSchemaFn =
    typeof basePropPanel.schema === "function"
      ? basePropPanel.schema
      : () => basePropPanel.schema;

  return {
    pdf: baseTextPlugin.pdf,
    ui: baseTextPlugin.ui,
    icon: baseTextPlugin.icon,
    uninterruptedEditMode: baseTextPlugin.uninterruptedEditMode,
    propPanel: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      schema: ((props: any) => {
        // Get the original schema fields
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const original = baseSchemaFn(props) as Record<string, any>;

        // Insert underline and strikethrough toggles after fontColor
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const enhanced: Record<string, any> = {};
        for (const [key, value] of Object.entries(original)) {
          enhanced[key] = value;

          // After fontColor, add underline + strikethrough
          if (key === "fontColor") {
            enhanced["underline"] = {
              title: "Underline",
              type: "boolean",
              widget: "checkbox",
              span: 8,
            };
            enhanced["strikethrough"] = {
              title: "Strikethrough",
              type: "boolean",
              widget: "checkbox",
              span: 8,
            };
          }
        }

        // Fallback: if fontColor wasn't found, add at end
        if (!enhanced["underline"]) {
          enhanced["underline"] = {
            title: "Underline",
            type: "boolean",
            widget: "checkbox",
            span: 8,
          };
          enhanced["strikethrough"] = {
            title: "Strikethrough",
            type: "boolean",
            widget: "checkbox",
            span: 8,
          };
        }

        return enhanced;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
      widgets: basePropPanel.widgets || {},
      defaultSchema: {
        ...basePropPanel.defaultSchema,
        underline: false,
        strikethrough: false,
      },
    },
  };
}

/**
 * Create a signature placeholder plugin.
 * Uses the image plugin but with a custom icon and default styling.
 */
export function createSignaturePlugin(
  baseImagePlugin: AnyPlugin
): AnyPlugin {
  const basePropPanel = baseImagePlugin.propPanel;

  return {
    pdf: baseImagePlugin.pdf,
    ui: baseImagePlugin.ui,
    // Signature icon (pen nib SVG)
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>',
    uninterruptedEditMode: baseImagePlugin.uninterruptedEditMode,
    propPanel: {
      ...basePropPanel,
      defaultSchema: {
        ...basePropPanel.defaultSchema,
        type: "signature",
        width: 60,
        height: 25,
        name: "Nenshkrim",
      },
    },
  };
}

/**
 * Build the complete plugin registry for the DOC.al template designer.
 *
 * Usage (in the editor page):
 *   const schemas = await import("@pdfme/schemas");
 *   const plugins = buildDesignerPlugins(schemas);
 */
export function buildDesignerPlugins(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schemas: any
): Record<string, AnyPlugin> {
  return {
    // Enhanced text with underline/strikethrough in prop panel
    text: createEnhancedTextPlugin(schemas.text),

    // Signature placeholder (based on image)
    signature: createSignaturePlugin(schemas.image),

    // Standard plugins
    image: schemas.image,
    checkbox: schemas.checkbox,
    radioGroup: schemas.radioGroup,
    date: schemas.date,
    dateTime: schemas.dateTime,
    time: schemas.time,
    select: schemas.select,
    multiVariableText: schemas.multiVariableText,

    // Shapes
    line: schemas.line,
    rectangle: schemas.rectangle,
    ellipse: schemas.ellipse,

    // Graphics
    svg: schemas.svg,

    // Barcodes
    qrcode: schemas.barcodes.qrcode,
    gs1datamatrix: schemas.barcodes.gs1datamatrix,

    // Tables
    table: schemas.table,
  };
}
