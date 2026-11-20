import { publicPageAdoptionFor } from "@/lib/navigation/public-page-adoption";
import { getSpanishSourcePath, localizedPublicHref } from "./public-locales";

const routeCopy: Record<string, readonly [string, string, string]> = {
  "/": ["Responsables de seguridad, tecnología y riesgos que adoptan sistemas inteligentes.", "Las acciones críticas pierden contexto de confianza y responsabilidad después de la autenticación.", "Cyber Sentinels conecta identidad, autoridad, pruebas, decisiones, reconstrucción y Trust Memory durante el ciclo operativo."],
  "/platform": ["CIO, CTO, arquitectos de seguridad y responsables de plataforma.", "Los controles de confianza están fragmentados entre identidad, proveedores y procesos.", "Enterprise Trust Fabric aporta una capa de control independiente del proveedor sin sustituir los sistemas de registro."],
  "/solutions": ["Responsables de procesos regulados y de impacto.", "Las acciones humanas y automatizadas necesitan controles respaldados por pruebas más allá del acceso inicial.", "Un mismo ciclo de confianza operativa se aplica a personas, agentes de IA, identidades de máquina y procesos regulados."],
  "/trust": ["CISO, equipos de cumplimiento, auditores e investigadores.", "Resulta difícil reconstruir las pruebas, la autoridad y las limitaciones de las decisiones.", "Las decisiones reconstruibles y los paquetes de pruebas descargables mantienen explícitas las pruebas y la incertidumbre."],
  "/enterprise": ["Compradores empresariales que evalúan despliegue, gobernanza y adopción.", "Los equipos de compra necesitan un recorrido común desde la revisión de seguridad hasta un piloto controlado.", "Los recorridos de cada perfil confluyen en los mismos controles de piloto y producción respaldados por pruebas."],
  "/pricing": ["Patrocinadores empresariales y equipos de compras.", "Es difícil evaluar el alcance comercial sin acordar primero los límites del proceso, las pruebas y el despliegue.", "El piloto se delimita alrededor de un proceso de impacto y unas pruebas de aceptación medibles."],
  "/developers": ["Desarrolladores y equipos de integración empresarial.", "Las pruebas de confianza y las políticas deben integrarse sin depender de un único proveedor.", "Las API normalizadas y los adaptadores sustituibles conservan el contexto de autoridad, reconstrucción y gobernanza."],
  "/developers/docs": ["Ingenieros que implementan procesos con Cyber Sentinels.", "Los equipos necesitan contratos explícitos, comportamiento ante fallos y límites de las pruebas.", "La documentación mantiene examinables el estado del proveedor, la autorización y las limitaciones operativas."],
  "/developers/authentication": ["Ingenieros de identidad, seguridad y aplicaciones.", "La autenticación no demuestra por sí sola la autoridad para una acción de impacto.", "Antes de ejecutar, la identidad se evalúa junto con autoridad, pruebas, contexto de ejecución y políticas."],
  "/security": ["Revisores de seguridad, CISO y responsables de riesgos empresariales.", "Los controles del despliegue necesitan pruebas antes de que un piloto gestione procesos sensibles.", "El acceso protegido, RLS, los registros de auditoría y los bloqueos explícitos de preparación siguen siendo revisables."],
};
export function spanishAdoptionFor(pathname: string) {
  const source = getSpanishSourcePath(pathname) ?? pathname;
  const contract = publicPageAdoptionFor(source);
  if (!contract) return null;
  const legalOrCompany = contract.audience.startsWith("Enterprise stakeholders completing");
  const [audience, problem, differentiation] = routeCopy[source] ?? (legalOrCompany
    ? ["Participantes empresariales que revisan la empresa, las políticas o las garantías.", "Los equipos de compra necesitan límites claros sobre la empresa, las políticas y las operaciones antes de adoptar la solución.", "Cyber Sentinels distingue los compromisos de la organización de las afirmaciones sobre producto y proveedores."]
    : ["Responsables empresariales de seguridad, tecnología, cumplimiento y operaciones.", "Las acciones humanas y automatizadas de impacto necesitan pruebas atribuibles más allá del acceso.", "Cyber Sentinels conecta identidad, autoridad, pruebas, decisiones, reconstrucción y Trust Memory en un registro supervisado."]);
  return { ...contract, audience, problem, differentiation,
    primary: { href: localizedPublicHref(contract.primary.href, "es"), label: "Solicitar demostración" },
    supporting: { href: localizedPublicHref(contract.supporting.href, "es"), label: "Reservar un piloto" } };
}
