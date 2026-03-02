import { disableConsoleInProduction } from "@/app/_commons/utils/console-guard";

export async function register() {
  disableConsoleInProduction();
}
