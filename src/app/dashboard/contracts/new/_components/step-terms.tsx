"use client";

import { DocumentEditor } from "@/components/ui/document-editor";

interface StepTermsProps {
  termsHtml: string;
  onChange: (html: string) => void;
}

export function StepTerms({ termsHtml, onChange }: StepTermsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Termat e Kontrates</h3>
        <p className="text-sm text-muted-foreground">
          Editoni permbajtjen e kontrates. Termat e sugjeruara nga bazat ligjore jane shtuar automatikisht.
        </p>
      </div>

      <DocumentEditor
        content={termsHtml}
        onChange={onChange}
        className="min-h-[500px]"
      />
    </div>
  );
}
