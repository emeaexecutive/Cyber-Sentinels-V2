import type {Metadata} from "next";
import {watchtowerCopy,type WatchtowerLocale} from "./content";

export function watchtowerMetadata(path:string,locale:WatchtowerLocale,kind?:"torch"|"river"):Metadata{
  const copy=watchtowerCopy[locale],title=kind?kind==="torch"?copy.torch:copy.river:"TENENTE SWARM · Ribagorza";
  const description=kind?kind==="torch"?copy.torchIntro:copy.riverIntro:copy.distinction;
  return{title:`${title} | Cyber Sentinels`,description,alternates:{canonical:locale==="es"?`/es${path}`:path,languages:{en:path,es:`/es${path}`,"x-default":path}},openGraph:{title,description,locale:locale==="es"?"es_ES":"en_GB",url:locale==="es"?`/es${path}`:path}};
}
