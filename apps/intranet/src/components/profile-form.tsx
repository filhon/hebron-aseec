"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Avatar, Button, FormField, Input } from "@hebron/ui";
import { ImagePlus, Loader2 } from "lucide-react";
import {
  getMyAvatarUploadUrl,
  getMyAvatarReadUrl,
  updateMyProfile,
} from "../actions/profile";

const AVATAR_MAX_SIZE_BYTES = 2 * 1024 * 1024;
type AvatarMimeType = "image/jpeg" | "image/png" | "image/webp";
const AVATAR_ALLOWED_MIME_TYPES: AvatarMimeType[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const BIO_MAX_LENGTH = 2000;

// Storage path é o que persiste em users.avatar_url — a prévia é resolvida
// sob demanda via signed URL de curta duração, nunca enviada a onSubmit
// (mesmo padrão de apps/plataforma/src/components/course-form.tsx, S-05).
async function uploadAvatar(
  file: File,
): Promise<{ storagePath: string; previewUrl: string }> {
  const urlResult = await getMyAvatarUploadUrl({
    fileName: file.name,
    mimeType: file.type as AvatarMimeType,
  });
  const uploadData = urlResult?.data;
  if (!uploadData) throw new Error("Não foi possível obter URL de upload.");

  const putRes = await fetch(uploadData.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!putRes.ok) throw new Error("Falha ao enviar imagem para o storage.");

  const readResult = await getMyAvatarReadUrl({
    storagePath: uploadData.storagePath,
  });
  const readData = readResult?.data;
  if (!readData) throw new Error("Não foi possível gerar a URL da imagem.");

  return { storagePath: uploadData.storagePath, previewUrl: readData.url };
}

export interface ProfileFormInitialValues {
  name: string;
  bio: string | null;
  phone: string | null;
  avatarPath: string | null;
  avatarPreviewUrl: string | null;
}

export interface ProfileFormProps {
  initialValues: ProfileFormInitialValues;
}

/** Autoatendimento do perfil exibido no diretório (bio, telefone, foto) — P-5.1b. */
export function ProfileForm({ initialValues }: ProfileFormProps) {
  const router = useRouter();
  const [bio, setBio] = React.useState(initialValues.bio ?? "");
  const [phone, setPhone] = React.useState(initialValues.phone ?? "");
  const [avatarPath, setAvatarPath] = React.useState(initialValues.avatarPath);
  const [avatarPreview, setAvatarPreview] = React.useState(
    initialValues.avatarPreviewUrl,
  );
  const [avatarStatus, setAvatarStatus] = React.useState<
    "idle" | "uploading" | "error"
  >("idle");
  const [avatarError, setAvatarError] = React.useState<string | null>(null);
  const [savedMessage, setSavedMessage] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const localPreviewRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
    };
  }, []);

  const { execute, isPending } = useAction(updateMyProfile, {
    onSuccess: () => {
      setSavedMessage(true);
      router.refresh();
    },
  });

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    if (!(AVATAR_ALLOWED_MIME_TYPES as string[]).includes(file.type)) {
      setAvatarStatus("error");
      setAvatarError("Formato não suportado. Use JPEG, PNG ou WebP.");
      return;
    }
    if (file.size > AVATAR_MAX_SIZE_BYTES) {
      setAvatarStatus("error");
      setAvatarError("Imagem muito grande. Tamanho máximo: 2 MB.");
      return;
    }

    if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
    const localPreviewUrl = URL.createObjectURL(file);
    localPreviewRef.current = localPreviewUrl;
    setAvatarPreview(localPreviewUrl);
    setAvatarStatus("uploading");
    setAvatarError(null);
    setSavedMessage(false);

    uploadAvatar(file)
      .then(({ storagePath, previewUrl }) => {
        setAvatarPath(storagePath);
        setAvatarPreview(previewUrl);
        setAvatarStatus("idle");
        if (localPreviewRef.current) {
          URL.revokeObjectURL(localPreviewRef.current);
          localPreviewRef.current = null;
        }
      })
      .catch(() => {
        setAvatarStatus("error");
        setAvatarError("Falha ao enviar imagem. Tente novamente.");
      });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (avatarStatus === "uploading") return;
    setSavedMessage(false);
    execute({
      bio: bio.trim() || null,
      phone: phone.trim() || null,
      avatarPath,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <FormField label="Foto de perfil" error={avatarError ?? undefined}>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar
              name={initialValues.name}
              avatarUrl={avatarPreview ?? undefined}
              size="lg"
            />
            {avatarStatus === "uploading" && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-(--surface)/80">
                <Loader2
                  className="h-4 w-4 animate-spin text-(--fg-muted)"
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={
                <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
              }
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarStatus === "uploading"}
            >
              {avatarPreview ? "Trocar foto" : "Adicionar foto"}
            </Button>
            <span className="text-xs">JPEG, PNG ou WebP, até 2 MB.</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="sr-only"
            aria-label="Selecionar foto de perfil"
          />
        </div>
      </FormField>

      <FormField
        label="Biografia"
        hint={`Visível para toda a equipe no diretório. ${bio.length}/${BIO_MAX_LENGTH} caracteres.`}
      >
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX_LENGTH))}
          rows={4}
          placeholder="Uma frase sobre seu papel na Hebron Aseec"
          className="w-full resize-none rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 py-2 text-sm text-(--fg) outline-none transition-colors placeholder:text-(--fg-muted) focus:border-(--brand)"
        />
      </FormField>

      <FormField
        label="Telefone"
        hint="Só aparece no diretório para quem autoriza o consentimento de comunicação em Meus Dados."
      >
        <Input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(00) 00000-0000"
        />
      </FormField>

      <div className="flex items-center gap-3 border-t border-(--divider) pt-4">
        <Button
          type="submit"
          loading={isPending}
          disabled={avatarStatus === "uploading"}
        >
          Salvar perfil
        </Button>
        {savedMessage && (
          <span className="text-xs" role="status">
            Perfil atualizado.
          </span>
        )}
      </div>
    </form>
  );
}
