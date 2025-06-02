import { v2 as cloudinary } from 'cloudinary';

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.warn("CLOUDINARY environment variables are not fully set. Image uploads will fail.");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const uploadToCloudinary = (fileUri: string, folder: string, public_id?: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(fileUri, {
      folder: folder,
      public_id: public_id, // Useful for overwriting images
      overwrite: true,
      invalidate: true,
    })
    .then((result) => {
      resolve(result);
    })
    .catch((error) => {
      console.error("Cloudinary Upload Error:", error);
      reject(error);
    });
  });
};

export const deleteFromCloudinary = (publicId: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId)
      .then((result) => {
        resolve(result);
      })
      .catch((error) => {
        console.error("Cloudinary Deletion Error:", error);
        reject(error);
      });
  });
};

// Function to extract public ID from Cloudinary URL
export const getPublicIdFromUrl = (url: string): string | null => {
  if (!url || !url.includes('cloudinary.com')) return null;
  // Example URL: http://res.cloudinary.com/cloud_name/image/upload/v12345/folder/public_id.jpg
  // Need to extract "folder/public_id"
  try {
    const parsedUrl = new URL(url);
    const pathSegments = parsedUrl.pathname.split('/');
    // Path segments look like: ['', 'cloud_name', 'image', 'upload', 'v12345', 'folder', 'public_id.jpg']
    // We need to find the 'upload' segment and take everything after the version number.
    const uploadIndex = pathSegments.findIndex(segment => segment === 'upload');

    if (uploadIndex === -1 || uploadIndex + 2 >= pathSegments.length) {
      // If 'upload' is not found, or there's no version and public_id after it.
      // This might also happen if the URL structure is different (e.g. fetched, private images)
      // Fallback for URLs that might not have a version, or are structured differently
      // e.g. https://res.cloudinary.com/cloud_name/image/upload/folder/public_id.jpg
      // or https://res.cloudinary.com/cloud_name/image/private_images/folder/public_id.jpg
      const imageTypeIndex = pathSegments.findIndex(segment => segment === 'image' || segment === 'video' || segment === 'raw');
      if (imageTypeIndex !== -1 && imageTypeIndex + 2 < pathSegments.length) {
        let publicId = pathSegments.slice(imageTypeIndex + 2).join('/');
        // Remove extension
        publicId = publicId.substring(0, publicId.lastIndexOf('.'));
        if (publicId) return publicId;
      }
      console.warn(`Could not reliably extract public_id from URL: ${url}. Attempting simpler extraction.`);
      // Simplest extraction attempt if standard parsing fails
      const lastSlash = url.lastIndexOf('/') + 1;
      const lastDot = url.lastIndexOf('.');
      if (lastSlash > 0 && lastDot > lastSlash) {
        return url.substring(lastSlash, lastDot);
      }
      return null;
    }

    // Standard case: /image/upload/vXXXXX/folder/public_id.ext
    // We want 'folder/public_id'
    let publicId = pathSegments.slice(uploadIndex + 2).join('/'); // Skips the version segment
    // Remove extension like .jpg, .png etc.
    publicId = publicId.substring(0, publicId.lastIndexOf('.'));

    return publicId;
  } catch (error) {
    console.error(`Error parsing Cloudinary URL ${url}:`, error);
    return null;
  }
};

export default cloudinary;
