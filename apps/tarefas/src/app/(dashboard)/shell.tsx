"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAction } from "next-safe-action/hooks";
import type { Task } from "@hebron/types/tarefas";
import {
  AppShell,
  CommandMenu,
  ModuleLogo,
  NotificationBellContainer,
  getAppShortcuts,
  type NavSection,
  type ImpersonationBannerProps,
} from "@hebron/ui";
import {
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
import {
  listBellNotifications,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "../../actions/notifications";
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
  impersonation?: ImpersonationBannerProps | null;
  children: React.ReactNode;
}

export default function TarefasShell({
  user,
  tasks,
  impersonation,
  children,
}: ShellProps) {
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
      logo={<ModuleLogo module="tarefas" />}
      sidebarDark
      LinkComponent={Link}
      impersonation={impersonation}
      headerActions={
        <NotificationBellContainer
          currentAppId="tarefas"
          centerHref="/notificacoes"
          LinkComponent={Link}
          listNotifications={async () => {
            const result = await listBellNotifications({});
            if (!result?.data) {
              throw new Error("Falha ao carregar notificações");
            }
            return result.data;
          }}
          markRead={async (id) => {
            await markNotificationReadAction({ id });
          }}
          markAllRead={async () => {
            await markAllNotificationsReadAction({});
          }}
          navigate={(href) => router.push(href)}
        />
      }
    >
      {children}
      <CommandMenu
        ariaLabel="Busca e criação rápida de tarefas"
        placeholder="Buscar ou criar uma tarefa…"
        emptyLabel="Nenhuma tarefa encontrada."
        items={tasks.map((task) => ({
          id: task.id,
          label: task.title,
          indicatorColor:
            task.status === "concluido" ? "var(--hb-green)" : "var(--hb-blue)",
        }))}
        onSelectItem={(id) => router.push(`/tarefa/${id}`)}
        onCreateItem={(title) =>
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
        renderCreateLabel={(title) => (
          <>
            Criar tarefa <strong className="font-semibold">“{title}”</strong>
          </>
        )}
      />
    </AppShell>
  );
}
