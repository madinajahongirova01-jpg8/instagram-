export function looksLikeVideo(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === 'video/webm') {
    return isWebm(buffer);
  }
  return isIsoBaseMedia(buffer);
}

export function looksLikeAudio(buffer: Buffer, mimeType: string): boolean {
  switch (mimeType) {
    case 'audio/webm':
      return isWebm(buffer);
    case 'audio/ogg':
      return buffer.subarray(0, 4).toString('latin1') === 'OggS';
    case 'audio/mpeg':
      return (
        buffer.subarray(0, 3).toString('latin1') === 'ID3' ||
        (buffer.length > 1 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
      );
    case 'audio/mp4':
      return isIsoBaseMedia(buffer);
    default:
      return false;
  }
}

function isWebm(buffer: Buffer): boolean {
  return buffer.length > 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
}

function isIsoBaseMedia(buffer: Buffer): boolean {
  return buffer.length > 12 && buffer.subarray(4, 8).toString('latin1') === 'ftyp';
}
