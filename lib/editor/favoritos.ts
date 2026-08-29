import type { SceneElement } from "./types";

export interface Favorito {
  id: string;
  nome: string;
  element: SceneElement;
}

const KEY_FAV = "dd_favoritos";
const KEY_REC = "dd_recentes";

export function listarFavoritos(): Favorito[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY_FAV) || "[]");
  } catch {
    return [];
  }
}

export function persistirFavoritos(favs: Favorito[]) {
  if (typeof localStorage !== "undefined") localStorage.setItem(KEY_FAV, JSON.stringify(favs));
}

export function listarRecentes(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY_REC) || "[]");
  } catch {
    return [];
  }
}

export function persistirRecentes(rec: string[]) {
  if (typeof localStorage !== "undefined") localStorage.setItem(KEY_REC, JSON.stringify(rec));
}
