const MAX_UPLOAD_SIZE_BYTES = 1_000_000;

export function isValidUpload(file, allowedTypes) {
  return Boolean(
    file
      && file.size > 0
      && file.size <= MAX_UPLOAD_SIZE_BYTES
      && allowedTypes.includes(file.type),
  );
}
