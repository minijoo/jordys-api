// import { request } from "@octokit/request";
// import { Octokit } from "@octokit/rest";
// import { RequestError } from "@octokit/request-error";

// const API_TOKEN =
//

// const octokit = new Octokit({ auth: API_TOKEN });

// export default class GithubAPI {
//   repo: string;
//   owner: string;

//   constructor(owner: string, repo: string) {
//     this.owner = owner;
//     this.repo = repo;
//   }

//   log() {
//     console.log("api headers", this.owner, this.repo);
//   }

//   async listCommits() {
//     const result = await request(
//       `GET /repos/${this.owner}/${this.repo}/commits`,
//       {
//         headers: {
//           authorization: `token ${API_TOKEN}`,
//         },
//         sha: "staging",
//         owner: "OWNER",
//         repo: "REPO",
//         per_page: 5,
//       }
//     );
//     const commits = [];
//     for (const {
//       commit: {
//         message,
//         url,
//         committer: { date },
//       },
//     } of result.data) {
//       commits.push(`(date) ${date}, (message) ${message}, (url) ${url}`);
//     }
//     return commits;
//   }

//   async deleteFile(path: string, sha: string) {
//     try {
//       const result = await octokit.repos.deleteFile({
//         owner: this.owner,
//         repo: this.repo,
//         path: path,
//         message: "deleteFile - committed by api",
//         branch: "staging",
//         committer: {
//           name: "minijoo",
//           email: "minijoo@gmail.com",
//         },
//         sha,
//       });
//       return { status: result.status, data: result.data };
//     } catch (err) {
//       if (err instanceof RequestError) {
//         return { status: err.status, data: err.response?.data };
//       }
//       console.error(err);
//     }
//   }

//   async createOrUpdateFileContents(
//     path: string,
//     contents: string,
//     sha?: string
//   ) {
//     // Validate `path` @TODO
//     try {
//       const result = await octokit.repos.createOrUpdateFileContents({
//         owner: this.owner,
//         repo: this.repo,
//         path: path,
//         message: "createOrUpdateFile - committed by api",
//         content: contents,
//         branch: "staging",
//         committer: {
//           name: "minijoo",
//           email: "minijoo@gmail.com",
//         },
//         sha,
//       });
//       return { status: result.status, data: result.data };
//     } catch (err) {
//       if (err instanceof RequestError) {
//         return { status: err.status, data: err.response?.data };
//       }
//       console.error(err);
//     }
//   }
// }
