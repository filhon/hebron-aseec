"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import type { Task } from "@hebron/types/tarefas";
import { AppShell, type NavSection, type AppShortcut } from "@hebron/ui";
import {
  CheckCircle,
  ListTodo,
  CalendarDays,
  RefreshCcw,
  LayoutTemplate,
  Sun,
  Settings,
  Home,
  Radio,
  Folder,
  BookOpen,
  Briefcase,
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

const APPS: AppShortcut[] = [
  {
    id: "admin",
    label: "Admin",
    href: "https://admin.hebronaseec.com.br",
    icon: Settings,
  },
  {
    id: "projetos",
    label: "Projetos",
    href: "https://projetos.hebronaseec.com.br",
    icon: Briefcase,
  },
  {
    id: "financeiro",
    label: "Financeiro",
    href: "https://financeiro.hebronaseec.com.br",
    icon: BadgeDollarSign,
  },
  {
    id: "intranet",
    label: "Intranet",
    href: "https://app.hebronaseec.com.br",
    icon: Home,
  },
  {
    id: "plataforma",
    label: "Plataforma",
    href: "https://plataforma.hebronaseec.com.br",
    icon: BookOpen,
  },
  {
    id: "radio",
    label: "Rádio",
    href: "https://radio.hebronaseec.com.br",
    icon: Radio,
  },
  {
    id: "documentos",
    label: "Documentos",
    href: "https://docs.hebronaseec.com.br",
    icon: Folder,
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
      apps={APPS}
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
