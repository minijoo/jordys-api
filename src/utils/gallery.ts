import imageSize from "image-size";

export function getDimensions(buffer: Buffer) {
  const { width, height, orientation } = imageSize(buffer);
  // make whichever is bigger to 1080 and the other maintain ratio
  const bigger = Math.max(width, height);
  const smallr = Math.min(width, height);
  if (bigger === width) {
    return {
      width: !orientation || orientation < 5 ? 1080 : (1080 * smallr) / bigger,
      height: !orientation || orientation < 5 ? (1080 * smallr) / bigger : 1080,
    };
  } else {
    return {
      height: !orientation || orientation < 5 ? 1080 : (1080 * smallr) / bigger,
      width: !orientation || orientation < 5 ? (1080 * smallr) / bigger : 1080,
    };
  }
}
