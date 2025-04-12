/**
 * PassportJS adds an `email` property to the Request.User object
 * Request.User is already defined by Express
 * Declaration merging is used here to add the `email` property
 *  to Request.User definition so that TS linter and compiler don't complain
 * This file is added in tsconfig
 *
 * Help: https://stackoverflow.com/questions/44383387/typescript-error-property-user-does-not-exist-on-type-request
 */
declare namespace Express {
  export interface Request {
    user: User;
  }
  export interface User {
    email: string;
    _id: import("mongodb").ObjectId;
    picture: string;
  }
}
