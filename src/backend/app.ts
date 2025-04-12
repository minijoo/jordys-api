import express, { RequestHandler } from "express";
import { exec } from "child_process";
import multer from "multer";
import cors from "cors";
import PostType from "../types/post";
import { body, param, validationResult } from "express-validator";
import escape from "validator/lib/escape";
import mongoose, { Schema } from "mongoose";
import session, { CookieOptions, SessionOptions } from "express-session";
import MongoStore from "connect-mongo";
import passport from "passport";
import { AuthenticateCallback } from "passport";
import User from "../models/user";
import { ObjectId } from "mongodb";
import S3_Api from "../libs/s3-api";
import { PassportLocalDocument } from "mongoose";
import path from "path";
import { getDimensions } from "../utils/gallery";

const CONNECTION_STRING =
  process.env.NODE_ENV === "production"
    ? `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@cluster0.rvne8rz.mongodb.net/`
    : "mongodb://127.0.0.1:27017/test2?directConnection=true&serverSelectionTimeoutMS=2000";

mongoose.connect(CONNECTION_STRING);

// const clientPromise = mongoose.connection.getClient();

type GalleryItem = {
  name: string;
  url: string;
  type: string;
  mimetype: string;
  width?: number;
  height?: number;
  video_thumb_url?: string;
};

interface IPost extends PassportLocalDocument {
  title: string;
  date: Date;
  excerpt: string;
  body: string;
  cover_url: string;
  author: ObjectId;
  gallery: GalleryItem[];
}

const postSchema: Schema = new mongoose.Schema<IPost>(
  {
    title: String,
    date: Date,
    excerpt: String,
    body: String,
    cover_url: String,
    author: mongoose.Schema.Types.ObjectId,
    gallery: [
      {
        name: String,
        url: String,
        type: String,
        mimetype: String,
        width: Number,
        height: Number,
        video_thumb_url: String,
      },
    ],
  },
  { typeKey: "$type" }
);

const Post = mongoose.model("Post", postSchema);

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
const sessionOptions = {
  secret: "your secret key", // The use of environment variables to store the secret, ensuring the secret itself does not exist in your repository. (express-session)
  resave: false,
  saveUninitialized: true,
  store: new MongoStore({ mongoUrl: CONNECTION_STRING }),
  cookie: {} as CookieOptions,
};
if (process.env.NODE_ENV === "production") {
  sessionOptions.cookie.sameSite = "none";
  sessionOptions.cookie.secure = true;
  app.set("trust proxy", 1);
}
app.use(session(sessionOptions));

/*
  Setup the local passport strategy, add the serialize and
  deserialize functions that only saves the ID from the user
  by default.
*/

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(passport.initialize());
app.use(passport.session());

const verifyToken: RequestHandler = (req, res, next) => {
  const token = process.env.TOKEN || "boopoo";
  if (!req.headers.authorization) {
    res.status(401).send("authorization header empty");
    return;
  }
  const [authType, sentToken] = req.headers.authorization.split(" ");
  if (authType !== "Basic" || sentToken !== token) {
    res.status(401).send("token provided does not match");
    return;
  }
  next();
};

app.post("/register", verifyToken, function (req, res) {
  // @TODO - comment out this method so people can't register
  User.register(
    new User({
      email: req.body.email,
      username: req.body.username,
    }),
    req.body.password,
    function (err, msg) {
      if (err) {
        res.status(500).send(err);
      } else {
        res.send({ message: "Successful" });
      }
    }
  );
});

/*
  Login routes -- This is where we will use the 'local'
  passport authenciation strategy. If success, send to
  /login-success, if failure, send to /login-failure
*/
app.post(
  "/login",
  // , {
  //   failureRedirect: "/login-failure",
  //   successRedirect: "/login-success",
  // }),
  async (req, res, next) => {
    // console.log()
    // res.send("cookie?");
    passport.authenticate("local", ((err, user, status, info) => {
      console.log(user);
      if (err) {
        return next(err);
      }
      if (!user) {
        console.log(status);
        console.log(info);
        res.status(401).send("login failed");
        return;
      }

      req.logIn(user, function (err) {
        if (err) {
          return next(err);
        }
        return res.send("cookie!");
      });
    }) as AuthenticateCallback)(req, res, next);
    // passport.authenticate("local")(req, res, next);
  }
);

app.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.send("Logout successful");
  });
});

app.get("/login-failure", (req, res, next) => {
  console.log(req.session);
  res.send("Login Attempt Failed.");
});

const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.status(401).json({ message: "You are not authenticated (debug)" });
  }
};

app.get("/login-success", isAuthenticated, (req, res, next) => {
  console.log(req.session);
  res.send("Login Attempt was successful.");
});

/*
  Protected Route -- Look in the account controller for
  how we ensure a user is logged in before proceeding.
  We call 'isAuthenticated' to check if the request is
  authenticated or not.
*/
app.get("/profile", isAuthenticated, function (req, res) {
  console.log(req.session);
  res.json({ message: "You made it to the secured profie" });
});

app.get("/some-method", (req, res, next) => {
  res.status(200).json({ success: true });
});

const upload = multer({ storage: multer.memoryStorage() });
const upload2 = multer({ dest: "uploads/" });

app.get("/ls", async (req, res, next) => {
  console.log("ls--------------");
  exec("ls -lh", (error, stdout, stderr) => {
    if (error) {
      console.error(`error: ${error.message}`);
      res.json({ error: error.message });
      return;
    }

    if (stderr) {
      console.error(`stderr: ${stderr}`);
      res.json({ error: stderr });
      return;
    }

    console.log(`stdout:\n${stdout}`);
    res.json({ stdout: stdout });
  });
});

// resp [[name, file],[...]]
app.post(
  "/util/convert-heic",
  upload2.single("heic-file"),
  async (req, res, next) => {
    const file = req.file as Express.Multer.File;
    if (!file) {
      res.status(400).json({ error: "no file" });
      return;
    }
    console.log(file.path);
    const dest = `converted/${file.originalname}.jpg`;
    exec(["magick", file.path, dest].join(" "), (error, stdout, stderr) => {
      if (error) {
        console.error(`error: ${error.message}`);
        res.status(500).json({ error: error.message });
        return;
      }

      if (stderr) {
        console.error(`stderr: ${stderr}`);
        res.status(500).json({ error: stderr });
        return;
      }

      console.log(`stdout:\n${stdout}`);
      res.setHeader("Content-Type", "image/jpeg");
      res.sendFile(path.resolve(__dirname, "../../", dest));

      // unlinkSync(path.resolve(__dirname, "../..", dest));
      return;
    });
  }
);

// const output :  = [];
// files.forEach(async (file) => {
//   if (file.mimetype === "image/heic") {
//     const outputBuffer = await convert({
//       buffer: file.buffer,
//       format: "JPEG",
//     });
//     output.push(outputBuffer)
//     return;
//   }
//   output.push(null);
//   return;
// });
// res.json({output});
// }
// );

app.post(
  "/posts/gallery-upload-video/:id",
  param("id").notEmpty().isMongoId(),
  upload.array("video_and_cover", 2),
  async (req, res, next) => {
    const files = req.files as Express.Multer.File[];

    if (
      files.length !== 2 ||
      !files[0].mimetype.includes("video") ||
      !files[1].mimetype.includes("image")
    ) {
      res.status(400).json({
        errors:
          "First file must be video and second file must be image. FormData field: video_and_cover",
      });
      return;
    }

    const vidFile = files[0],
      imgFile = files[1];

    imgFile.originalname = vidFile.originalname + "_cover";

    const S3_API = new S3_Api();
    const resp = await S3_API.uploadFiles(
      "jordysbucket",
      "public/assets/" + req.params?.id,
      [vidFile, imgFile]
    );

    if (resp.status !== "ok") {
      res
        .status(500)
        .json({ errors: "S3 upload failed. Message: " + resp.message });
      return;
    }

    const vidUrl = `https://d1goytf13un2gh.cloudfront.net/assets/${req.params?.id}/${vidFile.originalname}`;
    const imgUrl = `https://d1goytf13un2gh.cloudfront.net/assets/${req.params?.id}/${imgFile.originalname}`;

    const post = (await Post.findById(req.params?.id, "gallery")) as IPost;

    // if gallery not found, create one
    if (!post.gallery) {
      post.gallery = [] as GalleryItem[];
    }

    console.log("vv--", vidFile.originalname, "--vv");
    const { width, height } = getDimensions(imgFile.buffer);

    const videoItem: GalleryItem = {
      type: "video",
      mimetype: vidFile.mimetype,
      url: vidUrl,
      name: vidFile.originalname,
      width,
      height,
      video_thumb_url: imgUrl,
    };

    post.gallery.push(videoItem);

    const updatePost = await post.save();
    res.send(updatePost);
  }
);

app.post(
  "/posts/gallery-upload/:id",
  param("id").notEmpty().isMongoId(),
  upload.array("images", 3),
  async (req, res, next) => {
    const files = req.files as Express.Multer.File[];

    const S3_API = new S3_Api();
    const resp = await S3_API.uploadFiles(
      "jordysbucket",
      "public/assets/" + req.params?.id,
      files
    );
    if (resp.status !== "ok") {
      res
        .status(500)
        .json({ errors: "S3 upload failed. Message: " + resp.message });
      return;
    }

    const post = (await Post.findById(req.params?.id, "gallery")) as IPost;

    // if gallery not found, create one
    if (!post.gallery) {
      post.gallery = [] as GalleryItem[];
    }

    const nameHashTable: Set<string> = new Set();
    post.gallery.forEach(({ name }) => {
      nameHashTable.add(name);
    });

    files.forEach((f, index) => {
      const name = f.originalname;
      const url = `https://d1goytf13un2gh.cloudfront.net/assets/${req.params?.id}/${f.originalname}`;
      const type = ["video", "image"].find(
        (el) => el === f.mimetype.split("/")[0]
      );

      let name2 = name;
      let i = 1;
      while (nameHashTable.has(name2)) {
        name2 = name + i;
        i++;
      }

      const toPush: GalleryItem = {
        name: name2,
        url,
        mimetype: f.mimetype,
        type: type ? type : "unsupported",
      };

      if (type === "image") {
        const { width, height } = getDimensions(f.buffer);
        toPush.width = width;
        toPush.height = height;
      } else {
        toPush.height = 1080;
        toPush.width = 1080;
      }

      post.gallery.push(toPush);
    });

    const updatePost = await post.save();
    res.send(updatePost);
  }
);

app.post(
  "/posts/new",
  isAuthenticated,
  body("title").notEmpty(),
  body("excerpt").notEmpty(),
  body("date").notEmpty().isDate(), // default format is YYYY/MM/DD
  body("postBody").notEmpty(),
  async (req, res, next) => {
    const valResult = validationResult(req);
    if (valResult.isEmpty()) {
      const newPost = await new Post({
        title: req.body.title,
        excerpt: req.body.excerpt,
        date: req.body.date,
        body: req.body.postBody,
        author: req.user?._id,
      }).save();

      res.send(newPost);
    } else {
      res.status(400).send({ errors: valResult.array() });
    }
  }
);

app.get(
  "/backend/author/:id",
  verifyToken,
  param("id").notEmpty().isMongoId(),
  async (req, res, next) => {
    const valResult = validationResult(req);
    if (valResult.isEmpty()) {
      const result = await User.findById(
        ObjectId.createFromHexString(req.params?.id)
      );
      res.send(result);
    } else {
      res.status(400).send({ errors: valResult.array() });
    }
  }
);

app.get("/backend/posts/all", verifyToken, async (req, res, next) => {
  const findResults = await Post.find();
  res.send(findResults);
});

app.get("/posts/all", isAuthenticated, async (req, res, next) => {
  const findResults = await Post.find();
  res.send(findResults);
});
app.get(
  "/posts/delete/:id",
  param("id").notEmpty().isMongoId(),
  async (req, res, next) => {
    const valResult = validationResult(req);
    if (valResult.isEmpty()) {
      const result = await Post.deleteOne({ _id: req.params?.id });
      res.send(result);
    } else {
      res.status(400).send({ errors: valResult.array() });
    }
  }
);

app.get(
  "/backend/posts/:id",
  verifyToken,
  param("id").notEmpty().isMongoId(),
  async (req, res, next) => {
    const valResult = validationResult(req);
    if (valResult.isEmpty()) {
      const result = await Post.findById(
        ObjectId.createFromHexString(req.params?.id)
      );
      res.send(result);
    } else {
      res.status(400).send({ errors: valResult.array() });
    }
  }
);

app.get(
  "/posts/:id",
  isAuthenticated,
  param("id").notEmpty().isMongoId(),
  async (req, res, next) => {
    const valResult = validationResult(req);
    if (valResult.isEmpty()) {
      const result = await Post.findById(
        ObjectId.createFromHexString(req.params?.id)
      );
      res.send(result);
    } else {
      res.status(400).send({ errors: valResult.array() });
    }
  }
);

app.post(
  "/posts/:id",
  param("id").notEmpty().isMongoId(),
  body("title").optional(),
  body("excerpt").optional(),
  body("date").optional().isDate(), // default format is YYYY/MM/DD
  body("postBody").optional(),
  body("cover_url").optional(),
  async (req, res, next) => {
    const valResult = validationResult(req);
    if (valResult.isEmpty()) {
      if (
        !(
          req.body.cover_url ||
          req.body.title ||
          req.body.excerpt ||
          req.body.date ||
          req.body.postBody
        )
      ) {
        res.status(400).send({
          errors: [
            "Title, excerpt, date, postBody and cover_url are all empty-- nothing to update",
          ],
        });
        return next();
      }
      console.log(req.body.date);
      const post = await Post.findById(req.params?.id).exec();
      if (req.body.title) post.title = req.body.title;
      if (req.body.excerpt) post.excerpt = req.body.excerpt;
      if (req.body.date) post.date = req.body.date;
      if (req.body.postBody) post.body = req.body.postBody;
      if (req.body.cover_url) post.cover_url = req.body.cover_url;
      const updatePost = await post.save();
      res.send(updatePost);
    } else {
      res.status(400).send({ errors: valResult.array() });
    }
  }
);
// app.get("/last-commits", async (req, res, next) => {
//   const api = new GithubAPI(GITHUB_OWNER, GITHUB_REPO);
//   const commits = await api.listCommits();
//   res.send(commits.join("<br>"));
// });

// app.get("/posts", isAuthenticated, async (req, res, next) => {
//   const res = await
// });

/** UNUSED OLD STUFF FROM HERE TO BOTTOM */

// app.get(
//   "/delete-post/:sha/:pathString",
//   param("sha").notEmpty().isHash("sha1"),
//   param("pathString").notEmpty(),
//   async (req, res, next) => {
//     const valResult = validationResult(req);
//     if (valResult.isEmpty()) {
//       const sha = req.params?.sha;
//       const api = new GithubAPI(GITHUB_OWNER, GITHUB_REPO);
//       const result = await api.deleteFile(
//         `_posts/${req.params?.pathString}.mdx`,
//         sha
//       );
//       res.send(result);
//     } else {
//       res.status(400).send({ errors: valResult.array() });
//     }
//   }
// );

// app.post(
//   "/create-post/:sha?/:pathString?",
//   param("sha").optional().isHash("sha1"), // required for updates
//   param("pathString").optional(), // required for updates
//   body("title").notEmpty(),
//   body("excerpt").notEmpty(),
//   body("date").notEmpty().isDate(), // default format is YYYY/MM/DD
//   body("postBody").notEmpty(),
//   async (req, res, next) => {
//     if (!req.params?.sha !== !req.params?.pathString) {
//       res
//         .status(400)
//         .send(
//           "Server error. For updates, both path parameters, sha and pathString are required. Otherwise, both must be empty for create"
//         );
//       return;
//     }

//     const valResult = validationResult(req);
//     if (valResult.isEmpty()) {
//       const post: PostType = {
//         title: req.body.title,
//         excerpt: req.body.excerpt,
//         date: new Date(req.body.date), // is this of Date-type?
//         body: req.body.postBody,
//       };

//       // convert content to base64
//       const contents = btoa(generateMdxContentFromObject(post));

//       // api call
//       const api = new GithubAPI(GITHUB_OWNER, GITHUB_REPO);
//       const result = await api.createOrUpdateFileContents(
//         `_posts/${
//           req.params?.pathString
//             ? req.params?.pathString
//             : escape(req.body.title.split(" ").join("-"))
//         }.mdx`,
//         contents,
//         req.params?.sha
//       );

//       res.send(result);
//     } else {
//       res.status(400).send({ errors: valResult.array() });
//     }
//   }
// );

// const generateMdxContentFromObject = (post: PostType) => {
//   // could move this to util func.
//   return `---
//   title: '${post.title}'
//   excerpt: '${post.excerpt}'
//   coverImage: ''
//   date: '${post.date.toISOString().slice(0, 10)}T09:30:00.000Z'
//   author:
//     name: Jordy
//   picture: ''
//   ogImage:
//     url: ''
// ---

// ${post.body}
// `;
// };

export default app;
