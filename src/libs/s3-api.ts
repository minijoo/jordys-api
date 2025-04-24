import {
  DeleteObjectCommand,
  DeleteObjectCommandOutput,
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

export default class S3_Api {
  async deleteFile(bucket: string, pathToFile: string) {
    if (!pathToFile.length) {
      return { status: "error", message: "Must provide file" };
    }

    try {
      const client = new S3Client({
        region: "us-east-1",
      });
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: pathToFile,
      });
      const resp = await client.send(command);
      return { status: "ok", output: resp };
    } catch (caught) {
      if (caught instanceof S3ServiceException)
        return { status: "error", message: caught.message };
      throw caught;
    }
  }

  /**
   * files with the same `originalname` will map to a single document, race condition
   */
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
