import Image from "next/image";

/** Escolhe uma variação da retícula a partir do id (sempre a mesma por matéria). */
function variant(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (h % 4) + 1;
}

/**
 * Imagem de capa otimizada (next/image). Sem imagem, mostra uma composição
 * em retícula, como foto de jornal impresso, no lugar de uma caixa vazia.
 */
export function Cover({
  src,
  alt,
  seed,
  ratio = "16/9",
  sizes = "(min-width: 1024px) 33vw, 100vw",
  priority = false,
  className = "",
}: {
  src: string | null;
  alt: string;
  seed: string;
  ratio?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  if (!src) {
    return <div aria-hidden className={`halftone halftone-${variant(seed)} ${className}`} style={{ aspectRatio: ratio }} />;
  }
  return (
    <div className={`relative overflow-hidden bg-paper-2 ${className}`} style={{ aspectRatio: ratio }}>
      {/* "priority" saiu do Next 16: a imagem principal carrega já, com prioridade alta */}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        loading={priority ? "eager" : undefined}
        fetchPriority={priority ? "high" : undefined}
        className="object-cover"
      />
    </div>
  );
}
