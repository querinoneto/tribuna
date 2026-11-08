/**
 * Redes sociais do jornal, exibidas no rodapé.
 *
 * Os botões aparecem sempre. Enquanto o endereço estiver vazio, o botão
 * fica visível mas sem link ("em breve"); preencha o endereço do perfil
 * para ativá-lo. A ordem aqui é a ordem no site.
 */
export const SOCIAL_LINKS = {
  x: "",
  instagram: "",
  youtube: "",
} as const;

export type SocialNetwork = keyof typeof SOCIAL_LINKS;

export const SOCIAL_LABEL: Record<SocialNetwork, string> = {
  x: "X",
  instagram: "Instagram",
  youtube: "YouTube",
};
