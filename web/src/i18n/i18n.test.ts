import { describe, expect, it } from "vitest";
import es from "./es";
import en from "./en";
import textsEs from "../content/texts.es.json";
import textsEn from "../content/texts.en.json";

/** Rutas de todas las hojas del objeto (y tipo: string, función o array con su longitud). */
function shape(o: unknown, prefix = ""): string[] {
  if (Array.isArray(o)) return [`${prefix}[${o.length}]`];
  if (typeof o === "function") return [`${prefix}()`];
  if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => shape(v, prefix ? `${prefix}.${k}` : k));
  return [`${prefix}:${typeof o}`];
}

describe("i18n", () => {
  it("ES y EN tienen las mismas claves", () => {
    expect(shape(en)).toEqual(shape(es));
  });
  it("los textos divulgativos tienen las mismas claves", () => {
    expect(shape(textsEn).filter((k) => !k.startsWith("_note"))).toEqual(shape(textsEs).filter((k) => !k.startsWith("_note")));
  });
  it("ningún texto en inglés se ha quedado vacío", () => {
    const empty: string[] = [];
    const walk = (o: unknown, p: string) => {
      if (typeof o === "string" && o.trim() === "") empty.push(p);
      else if (o && typeof o === "object") Object.entries(o).forEach(([k, v]) => walk(v, `${p}.${k}`));
    };
    walk(en, "en");
    expect(empty).toEqual([]);
  });
});
