# General

An API written in NodeJS that offers methods for easy storing and manipulation of blog post data that fit the requirements for posting/publishing in a particular blog system. On top of general database operations of posts like creating, editing posts, as well as publishing to these types of blog systems.

The blog I am designing this for is my own blog, jordys.site, where each post is an MDX resource that lives in one common folder inside of the folder structure of a NextJS website.

Each blog should have the following values:

1. Title
2. Date
3. Excerpt
4. Body
5. (tbd) CoverImage
6. (tbd) Photos -- photos to include in post and ability to link them as hyperlinks in body.

# Database

# Methods

Making New Post: `create`

1. Create post entry-- this creates a data item, with a unique id that will be linked to a mdx post file when published. This id will be used to unpublish and edit posts, explained later. Created post entry is set to "unpublished".
2. Make changes and save as you go

Editing A Post: `edit`

1. Choose a post entry to edit-- choose out of all post entry data items in the db, using id. Post entry data will be loaded onto the page.
2. Make changes and save as you go. No ability to redo changes once saved (other than undoing locally), for now.-- Upon save, post entry will be set to "published/edited".

Deleting A Post: `delete`

1. Choose a post entry.
2. Execute deletion-- the status of the post entry will become "deleted", and the mdx file will be archived (moved to a different folder)

Publishing A Post: `publish`

1. Choose a post entry.
2. Execute publish-- generates mdx content. Creates an mdx post file for this post entry and links the two which will be immutable, creating a forever link. The status of the post will become "published", once the execution is complete. If publishing an already linked post, this will replace the contents of the existing mdx file.

# Misc

This API hides the API keys/tokens of the Github REST API and MongoDB.

# Authentication

TBD. I'm thinking authentication using username and password facilitated by passport.js and using sessions in mongodb.

## Proof that authentication works (using CuRL)

To register user:

```bash
curl -H 'Content-Type: application/json' \
-d '{"username":"First User","password":"p@ssword","email":"firstuser@test.com"}' \
-X POST \
http://localhost:3001/register
```

To login:

```bash
curl -H 'Content-Type: application/json' \
-d '{"password":"p@ssword","username":"First User"}' \
--cookie-jar jarfile \
-X POST \
http://localhost:3001/login
```

Including `--cookie-jar jarfile` saves the session ID from the response in `jarfile`. This is handled by default in most browsers.

To view a secure resource:

```bash
curl --cookie jarfile -X GET http://localhost:3001/profile
```

The `--cookie jarfile` tells CuRL to read the cookie from `jarfile`

You can check `jarfile` contents to see the actual cookie, i.e. saved session.
