import { ImageResponse } from "next/og";
import {
  moduleIconElement,
  MODULE_ICON_SIZE,
  MODULE_ICON_CONTENT_TYPE,
} from "@hebron/ui";

// Favicon do módulo. O desenho vive em `@hebron/ui` para que os nove ícones
// do ecossistema sejam a mesma marca em nove cores, não nove desenhos.
export const size = MODULE_ICON_SIZE;
export const contentType = MODULE_ICON_CONTENT_TYPE;

export default function Icon() {
  return new ImageResponse(moduleIconElement("flats", size.width), {
    ...size,
  });
}
