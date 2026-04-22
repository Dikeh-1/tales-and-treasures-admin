const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // needed to avoid cross-origin issues on CodeSandbox
    image.src = url;
  });

export const getCroppedImg = async (imageSrc: string, pixelCrop: { x: number; y: number; width: number; height: number; }): Promise<File> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context for canvas');
  }

  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  // set canvas size to match the crop area
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // translate canvas origin to the center of the crop
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);

  // draw rotated image and scale
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        // Create a File object from the blob
        const file = new File([blob], 'cropped_image.jpeg', { type: 'image/jpeg' });
        resolve(file);
      } else {
        console.error('Failed to create blob.');
      }
    }, 'image/jpeg', 0.95); // Adjust quality as needed
  });
};