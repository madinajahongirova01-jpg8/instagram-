import { looksLikeAudio, looksLikeVideo } from './file-signature';

describe('file signatures', () => {
  const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypisom'), Buffer.alloc(8)]);
  const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(8)]);
  const ogg = Buffer.concat([Buffer.from('OggS'), Buffer.alloc(8)]);
  const mp3 = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(8)]);
  const script = Buffer.from('#!/bin/sh\nrm -rf /');

  it('accepts real video containers', () => {
    expect(looksLikeVideo(mp4, 'video/mp4')).toBe(true);
    expect(looksLikeVideo(mp4, 'video/quicktime')).toBe(true);
    expect(looksLikeVideo(webm, 'video/webm')).toBe(true);
  });

  it('rejects content that does not match the declared video type', () => {
    expect(looksLikeVideo(script, 'video/mp4')).toBe(false);
    expect(looksLikeVideo(mp4, 'video/webm')).toBe(false);
  });

  it('accepts real audio containers', () => {
    expect(looksLikeAudio(ogg, 'audio/ogg')).toBe(true);
    expect(looksLikeAudio(mp3, 'audio/mpeg')).toBe(true);
    expect(looksLikeAudio(webm, 'audio/webm')).toBe(true);
    expect(looksLikeAudio(mp4, 'audio/mp4')).toBe(true);
  });

  it('rejects fake audio', () => {
    expect(looksLikeAudio(script, 'audio/ogg')).toBe(false);
    expect(looksLikeAudio(ogg, 'audio/x-unknown')).toBe(false);
  });
});
