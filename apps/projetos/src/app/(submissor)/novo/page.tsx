import { ProjectWizard } from "../../../components/project-wizard";
import { getAnnualSubmissionWindowStatus } from "../../../lib/queries";

function formatBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default async function NovoProjetoPage() {
  const windowStatus = await getAnnualSubmissionWindowStatus();

  return (
    <div>
      {windowStatus.configured &&
        (windowStatus.open ? (
          <div className="hb-info-banner">
            <span>
              Janela de submissão do projeto anual aberta até{" "}
              <b>{formatBR(windowStatus.fechamento)}</b>. Projeto pontual pode
              ser enviado a qualquer momento.
            </span>
          </div>
        ) : (
          <div className="hb-warn-banner">
            <span>
              {windowStatus.phase === "before"
                ? `Janela de submissão do projeto anual ainda fechada — abre em ${formatBR(windowStatus.abertura)}.`
                : `Janela de submissão do projeto anual encerrada em ${formatBR(windowStatus.fechamento)} — aguarde o próximo período definido pela diretoria.`}{" "}
              Projeto pontual pode ser enviado a qualquer momento.
            </span>
          </div>
        ))}
      <ProjectWizard />
    </div>
  );
}
