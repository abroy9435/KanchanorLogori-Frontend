import api from "../api";
import type {School, Programme, Department} from "../apitypes"

export async function getSchools(): Promise<School[]> {
  const res = await api.get<School[]>("/schools");
  return res.data;
}

export async function getProgrammes(): Promise<Programme[]> {
  const res = await api.get<Programme[]>("/programmes");
  return res.data;
}

export async function getDepartments(): Promise<Department[]> {
  const res = await api.get<Department[]>("/departments");
  return res.data;
}
