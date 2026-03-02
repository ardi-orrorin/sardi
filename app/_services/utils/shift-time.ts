export const parseHmsToSeconds = (value: string, allow24Hour: boolean) => {
  const trimmed = value.trim();
  const parts = trimmed.split(":");
  if (parts.length !== 2 && parts.length !== 3) {
    return null;
  }

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  const seconds = parts.length === 3 ? Number(parts[2]) : 0;

  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || !Number.isInteger(seconds)) {
    return null;
  }

  if (allow24Hour && hours === 24 && minutes === 0 && seconds === 0) {
    return 24 * 60 * 60;
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    return null;
  }

  return hours * 3600 + minutes * 60 + seconds;
};

export const secondsToHms = (value: number) => {
  const safe = Math.max(0, Math.min(value, 24 * 60 * 60));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export const deriveEndTime = (startOffset: string, duration: string) => {
  const startSeconds = parseHmsToSeconds(startOffset, false);
  const durationSeconds = parseHmsToSeconds(duration, true);
  if (startSeconds === null || durationSeconds === null) {
    return "10:00:00";
  }

  const endSeconds = startSeconds + durationSeconds;
  if (endSeconds <= startSeconds || endSeconds > 24 * 60 * 60) {
    return "10:00:00";
  }

  return secondsToHms(endSeconds);
};
