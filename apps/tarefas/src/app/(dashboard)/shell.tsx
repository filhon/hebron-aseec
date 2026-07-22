"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import type { Task } from "@hebron/types/tarefas";
import { AppShell, getAppShortcuts, type NavSection } from "@hebron/ui";
import {
  CheckCircle,
  ListTodo,
  CalendarDays,
  RefreshCcw,
  LayoutTemplate,
  Sun,
  BadgeDollarSign,
  Building2,
  Landmark,
  Church,
  Megaphone,
  Cpu,
} from "lucide-react";
import { createTask } from "../../actions/tasks";
import { logoutAction } from "../../actions/auth";
import { CommandMenu } from "../../components/command-menu";

const SECTIONS: NavSection[] = [
  {
    title: "Visão geral",
    items: [
      {
        label: "Minhas tarefas",
        href: "/",
        icon: ListTodo,
        exact: true,
      },
      {
        label: "Calendário",
        href: "/calendario",
        icon: CalendarDays,
      },
      {
        label: "Modo foco",
        href: "/foco",
        icon: Sun,
      },
    ],
  },
  {
    title: "Módulos",
    items: [
      {
        label: "Administrativo",
        href: "/workspace/administrativo",
        icon: Building2,
      },
      {
        label: "Financeiro",
        href: "/workspace/financeiro",
        icon: BadgeDollarSign,
      },
      {
        label: "Contábil e Fiscal",
        href: "/workspace/contabil_fiscal",
        icon: Landmark,
      },
      {
        label: "Eclesiástico",
        href: "/workspace/eclesiastico",
        icon: Church,
      },
      {
        label: "Comunicação",
        href: "/workspace/comunicacao",
        icon: Megaphone,
      },
      {
        label: "Tecnologia e Inovação",
        href: "/workspace/tecnologia_inovacao",
        icon: Cpu,
      },
    ],
  },
  {
    title: "Automação",
    items: [
      {
        label: "Recorrentes",
        href: "/recorrentes",
        icon: RefreshCcw,
      },
      {
        label: "Templates",
        href: "/templates",
        icon: LayoutTemplate,
      },
    ],
  },
];

interface ShellProps {
  user: { fullName: string | null; email: string | null };
  tasks: Task[];
  children: React.ReactNode;
}

export default function TarefasShell({ user, tasks, children }: ShellProps) {
  const path = usePathname();
  const router = useRouter();

  const { execute: quickCreateTask } = useAction(createTask, {
    onSuccess({ data }) {
      if (data?.task) router.push(`/tarefa/${data.task.id}`);
      router.refresh();
    },
  });

  return (
    <AppShell
      sections={SECTIONS}
      apps={getAppShortcuts("tarefas")}
      user={{
        name: user.fullName ?? user.email ?? "",
        email: user.email ?? "",
      }}
      onLogout={() => void logoutAction()}
      currentPath={path}
      appName="Tarefas"
      logo={
        <CheckCircle
          className="h-5 w-5 shrink-0"
          style={{ color: "var(--hb-blue)" }}
        />
      }
      sidebarDark
    >
      {children}
      <CommandMenu
        tasks={tasks}
        onSelectTask={(id) => router.push(`/tarefa/${id}`)}
        onCreateTask={(title) =>
          quickCreateTask({
            title,
            description: null,
            workspace: "administrativo",
            priority: "media",
            dueDate: null,
            assigneeIds: [],
            tagIds: [],
            recurrenceRule: null,
          })
        }
      />
    </AppShell>
  );
}
