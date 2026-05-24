from pymongo import MongoClient
import re

uri = 'mongodb://127.0.0.1:27017/test2?directConnection=true&serverSelectionTimeoutMS=2000'

client = MongoClient(uri)

db = client.get_database('test2')
posts = db.get_collection('posts')

ups = []
with posts.find() as cursor:
	for doc in cursor:
		dash = re.sub('[^-a-zA-Z0-9]', '', doc['title'].lower().replace(' ', '-'))
		ups.append([doc['_id'], dash])

for up in ups:
	posts.update_one({'_id': up[0]}, {'$set': {'dashname': up[1]}})
