import {getPublicRequestLocale} from "@/lib/i18n/request-locale";
import {WatchtowerPage} from "@/components/watchtowers/watchtower-page";
import {watchtowerMetadata} from "@/lib/watchtowers/metadata";
export async function generateMetadata(){return watchtowerMetadata("/tenente-swarm/river-crossing",await getPublicRequestLocale(),"river");}
export default async function Page(){return <WatchtowerPage locale={await getPublicRequestLocale()} kind="river"/>;}
export const dynamic="force-dynamic";
