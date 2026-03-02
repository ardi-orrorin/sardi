import { dayjs, Dayjs } from "@/app/_commons/utils/dayjs";

export const timePickerFieldSx = {
  "& .MuiInputBase-root": {
    minHeight: "42px",
    borderRadius: "0.5rem",
    color: "var(--time-picker-input-color) !important",
    backgroundColor: "var(--surface-strong)"
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--border-main)"
  },
  "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--border-main)"
  },
  "& .MuiSvgIcon-root": {
    color: "var(--time-picker-input-color) !important",
    opacity: 0.78
  },
  "& .MuiInputBase-input": {
    color: "var(--time-picker-input-color) !important",
    WebkitTextFillColor: "var(--time-picker-input-color) !important"
  },
  "& .MuiInputLabel-root": {
    color: "var(--time-picker-input-color) !important",
    opacity: 0.78
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "var(--time-picker-input-color) !important",
    opacity: 0.95
  }
} as const;

export const toTimePickerValue = (value: string): Dayjs | null => {
  const parsed = dayjs(value.trim(), ["HH:mm:ss", "HH:mm"], true);
  return parsed.isValid() ? parsed : null;
};
