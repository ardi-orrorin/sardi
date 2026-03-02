import dayjsLib, { Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjsLib.extend(customParseFormat);
dayjsLib.extend(utc);
dayjsLib.extend(timezone);

export const dayjs = dayjsLib;
export type { Dayjs };
