import {getPublicRequestLocale} from "@/lib/i18n/request-locale";
import {WatchtowerPage} from "@/components/watchtowers/watchtower-page";
import {watchtowerMetadata} from "@/lib/watchtowers/metadata";
export async function generateMetadata(){return watchtowerMetadata("/tenente-swarm/torch-code",await getPublicRequestLocale(),"torch");}
export default async function Page(){return <WatchtowerPage locale={await getPublicRequestLocale()} kind="torch"/>;}
export const dynamic="force-dynamic";
