"use client";

import * as React from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@hebron/ui";

export interface TermsAcceptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
  loading?: boolean;
}

const TERM_TEXT =
  "Os materiais exclusivos da Rádio Hebron Aseec são disponibilizados " +
  "apenas para uso pessoal e estudo individual. É vedada a redistribuição, " +
  "revenda ou qualquer forma de exploração comercial deste conteúdo, no " +
  "todo ou em parte, sem autorização expressa da Hebron Aseec. Este aceite " +
  "é único e válido para todos os materiais exclusivos da rádio.";

export function TermsAcceptDialog({
  open,
  onOpenChange,
  onAccept,
  loading = false,
}: TermsAcceptDialogProps) {
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    if (!open) setChecked(false);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Termo de uso de materiais exclusivos</DialogTitle>
          <DialogDescription>
            Leia com atenção antes de continuar.
          </DialogDescription>
        </DialogHeader>

        <p className="max-h-48 overflow-y-auto rounded-(--radius) border border-(--border) bg-(--surface-alt) p-4 text-sm leading-(--leading-relaxed) text-(--fg)">
          {TERM_TEXT}
        </p>

        <label
          htmlFor="terms-accept-checkbox"
          className="mt-4 flex items-start gap-3"
        >
          <input
            id="terms-accept-checkbox"
            type="checkbox"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-(--border) accent-(--brand)"
          />
          <span className="text-sm text-(--fg)">
            Li e aceito os termos de uso dos materiais exclusivos.
          </span>
        </label>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onAccept}
            disabled={!checked}
            loading={loading}
          >
            Aceitar e continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
