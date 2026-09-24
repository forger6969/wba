/**
 * Next.js `template.tsx` — layout.tsx dan farqli, har navigatsiyada
 * QAYTA yasaladi. Shu tufayli CSS animatsiya (`sahifa-otish`,
 * globals.css) har sahifa almashinganda qayta ishga tushadi —
 * qo'shimcha JS kutubxonasiz (framer-motion va h.k.), server
 * komponent bo'lib qolaveradi.
 */
export default function CrmTemplate({ children }: { children: React.ReactNode }) {
  return <div className="sahifa-otish">{children}</div>
}
