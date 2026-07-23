"use client";

import { useRouter } from "next/navigation";
import { PageHeader, NotificationCenterContainer } from "@hebron/ui";
import {
  listCenterNotifications,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "../../../actions/notifications";

export default function NotificacoesPage() {
  const router = useRouter();

  return (
    <div className="hb-page">
      <PageHeader
        title="Notificações"
        description="Tudo o que exige sua atenção, reunido em um só lugar."
      />

      <NotificationCenterContainer
        currentAppId="radio"
        listNotifications={async ({ limit, offset }) => {
          const result = await listCenterNotifications({ limit, offset });
          if (!result?.data) throw new Error("Falha ao carregar notificações");
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
    </div>
  );
}
