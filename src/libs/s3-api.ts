import {
  PutObjectCommand,
  PutObjectCommandOutput,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";

const extToMimetype: Map<string, string> = new Map();
extToMimetype.set("jpg", "jpeg");

const getMimeTypeFromExt = (ext: string) => {
  if (ext === "jpg") return "image/jpeg";
  return "image/" + ext;
};

/**
 * files with the same `originalname` will map to a single document, race condition
 */
export default class S3_Api {
  async uploadFiles(
    bucket: string,
    path: string,
    files: Express.Multer.File[]
  ) {
    if (files.length === 0) {
      return { status: "error", message: "Must provide at least one file" };
    }
    try {
      const client = new S3Client({
        region: "us-east-1",
      });
      const responses: PutObjectCommandOutput[] = [];
      files.forEach(async (file) => {
        // const ext = file.originalname.split(".").reverse()[0];
        // if (ext === file.originalname) {
        //   return {
        //     status: "error",
        //     message: "[" + file.originalname + "] has no extension",
        //   };
        // }
        const input = {
          Body: file.buffer,
          Bucket: bucket,
          Key: [path, file.originalname].join("/"),
          ContentType: file.mimetype,
        };
        const command = new PutObjectCommand(input);
        responses.push(await client.send(command));
      });
      await new Promise((resolve) => setTimeout(resolve, 3000)); // without this n-second wait, the images are not available to front-end immediately
      return { status: "ok", outputs: responses };
    } catch (caught) {
      if (caught instanceof S3ServiceException)
        return { status: "error", message: caught.message };
      throw caught;
    }
  }
}
