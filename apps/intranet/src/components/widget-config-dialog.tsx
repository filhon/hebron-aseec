"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Settings2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@hebron/ui";
import type { DashboardWidget, KPI } from "@hebron/types/intranet";
import { saveDashboardConfig } from "../actions/dashboard";
import { WidgetConfigForm } from "./widget-config-form";

export interface WidgetConfigDialogProps {
  initialWidgets: DashboardWidget[];
  availableKpis: KPI[];
}

export function WidgetConfigDialog({
  initialWidgets,
  availableKpis,
}: WidgetConfigDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { execute, isPending } = useAction(saveDashboardConfig, {
    onSuccess: () => {
      router.refresh();
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          leftIcon={<Settings2 className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          Configurar painel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar painel</DialogTitle>
        </DialogHeader>
        <WidgetConfigForm
          initialWidgets={initialWidgets}
          availableKpis={availableKpis}
          onSubmit={(values) => execute(values)}
          onCancel={() => setOpen(false)}
          isLoading={isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
