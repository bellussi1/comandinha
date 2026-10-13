"use client";

import { useRef, useState } from "react";
import { Check, Copy, Download, ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import type { PanelTable } from "@/src/services/panel-tables";

type TableQrDialogProps = {
  table: PanelTable | null;
  publicUrl: string;
  onOpenChange: (open: boolean) => void;
};

function safeFilePart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "mesa";
}

export function TableQrDialog({ table, publicUrl, onOpenChange }: TableQrDialogProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setStatus("Link copiado");
    } catch {
      setStatus("Não foi possível copiar. Selecione e copie o link acima.");
    }
  }

  function downloadSvg() {
    const svg = svgRef.current;
    if (!svg) return;

    const copy = svg.cloneNode(true) as SVGSVGElement;
    copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const content = new XMLSerializer().serializeToString(copy);
    const file = new Blob([content], { type: "image/svg+xml;charset=utf-8" });
    const objectUrl = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `comandinha-${safeFilePart(table?.name ?? "mesa")}.svg`;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
    setStatus("QR salvo em SVG");
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) setStatus(null);
        onOpenChange(open);
      }}
      open={table !== null}
    >
      <DialogContent className="painel-qr-dialog">
        <DialogHeader>
          <span className="painel-eyebrow">ACESSO PELO QR</span>
          <DialogTitle>QR da {table?.name ?? "mesa"}</DialogTitle>
          <DialogDescription>
            Escaneie para abrir o cardápio desta mesa em qualquer celular.
          </DialogDescription>
        </DialogHeader>
        {table && (
          <>
            <div className="painel-qr-frame">
              <QRCodeSVG
                aria-label={`Código QR para ${table.name}`}
                bgColor="#ffffff"
                fgColor="#40223a"
                level="H"
                marginSize={4}
                ref={svgRef}
                size={240}
                title={`QR Code da ${table.name}`}
                value={publicUrl}
              />
            </div>
            <label className="painel-qr-link-label" htmlFor="public-table-link">
              Link público
            </label>
            <div className="painel-qr-link-row">
              <input id="public-table-link" readOnly value={publicUrl} />
              <a
                aria-label="Abrir cardápio em nova aba"
                className="painel-qr-open-link"
                href={publicUrl}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink aria-hidden="true" size={17} />
              </a>
            </div>
            <div className="painel-qr-actions">
              <Button onClick={() => void copyLink()} type="button" variant="outline">
                <Copy aria-hidden="true" size={16} />
                Copiar link
              </Button>
              <Button className="painel-action-button" onClick={downloadSvg} type="button">
                <Download aria-hidden="true" size={16} />
                Baixar QR em SVG
              </Button>
            </div>
            {status && (
              <p aria-live="polite" className="painel-qr-feedback">
                {status === "Link copiado" && <Check aria-hidden="true" size={15} />}
                {status}
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
