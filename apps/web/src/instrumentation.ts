import { assertProductionSecrets } from "@/lib/env";

export async function register() {
  assertProductionSecrets();
}
