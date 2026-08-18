import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const filePath = resolve("dist/public/index.html");
const html = await readFile(filePath, "utf8");
const requiredInterfaceMarkers = ["Programação de agenda", "Enviar ao Supabase", "Controle Logístico", "Filtros globais", "Veículos por hora", "Paletes por turno"];

for (const marker of requiredInterfaceMarkers) {
  if (!html.includes(marker)) throw new Error(`A interface consolidada não contém o marcador obrigatório: ${marker}`);
}

if (/<(?:script|link)\b[^>]+(?:src|href)=["'][^"']*\/assets\//i.test(html)) {
  throw new Error("A interface ainda possui recursos externos em /assets e não está consolidada em HTML único.");
}

console.log(`HTML único validado: ${filePath}`);
