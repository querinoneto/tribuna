/**
 * Redes sociais do jornal, exibidas no rodapé.
 *
 * Preencha o endereço de cada perfil. Só aparecem os botões com endereço
 * preenchido; deixe "" nas redes que o jornal não usa.
 */
export const SOCIAL_LINKS = {
  instagram: "",
  x: "",
  facebook: "",
  youtube: "",
  tiktok: "",
  telegram: "",
  whatsapp: "", // canal do WhatsApp, ex.: https://whatsapp.com/channel/...
} as const;

export type SocialNetwork = keyof typeof SOCIAL_LINKS;

export const SOCIAL_LABEL: Record<SocialNetwork, string> = {
  instagram: "Instagram",
  x: "X",
  facebook: "Facebook",
  youtube: "YouTube",
  tiktok: "TikTok",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
};
