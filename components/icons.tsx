/** Ícones em traço fino (SVG inline, decorativos: aria-hidden). */
type P = { size?: number; className?: string };
const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const IconSearch = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const IconMenu = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
export const IconClose = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconMoon = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>
);
export const IconSun = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
export const IconArrowUp = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 19V5M6 11l6-6 6 6" /></svg>
);
export const IconArrowLeft = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}><path d="M15 6l-6 6 6 6" /></svg>
);
export const IconWhatsApp = ({ size = 18, className }: P) => (
  <svg {...base(size)} strokeWidth={1.6} className={className}>
    <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" />
    <path d="M9 9.5c.3 2 2 4 4.5 4.8l1-1.1 1.8.8-.4 1.5c-3.6.2-7-3.2-7-6.8l1.5-.4.8 1.8z" />
  </svg>
);
export const IconX = ({ size = 16, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" />
  </svg>
);
export const IconMail = ({ size = 18, className }: P) => (
  <svg {...base(size)} strokeWidth={1.6} className={className}><rect x="3" y="5" width="18" height="14" rx="1" /><path d="m3 6 9 7 9-7" /></svg>
);
export const IconLink = ({ size = 18, className }: P) => (
  <svg {...base(size)} strokeWidth={1.6} className={className}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </svg>
);
export const IconCheck = ({ size = 16, className }: P) => (
  <svg {...base(size)} strokeWidth={2.2} className={className}><path d="M5 12l5 5 9-10" /></svg>
);
export const IconImage = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><rect x="3" y="5" width="18" height="14" rx="1" /><circle cx="9" cy="10" r="1.5" /><path d="m21 16-5-5-8 8" /></svg>
);
export const IconUpload = ({ size = 22, className }: P) => (
  <svg {...base(size)} strokeWidth={1.6} className={className}><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></svg>
);
export const IconPlus = ({ size = 18, className }: P) => (
  <svg {...base(size)} strokeWidth={2} className={className}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconTrash = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
);
export const IconSidebar = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></svg>
);
export const IconSliders = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" />
  </svg>
);
export const IconExternal = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" /></svg>
);
