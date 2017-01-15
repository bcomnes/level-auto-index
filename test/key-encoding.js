var level = require('memdb')
var AutoIndex = require('..')
var keyReducer = AutoIndex.keyReducer
var sub = require('subleveldown')
var test = require('tape')
var bytewise = require('bytewise')

test('key encoding', function (t) {
  t.plan(3)
  var db = level()
  var index = {
    // value encoding should match keyEncoding of indexd db
    title: sub(db, 'title', {valueEncoding: bytewise}),
    len: sub(db, 'length', {valueEncoding: bytewise})
  }

  var posts = sub(db, 'posts', {valueEncoding: 'json', keyEncoding: bytewise})
  posts.byTitle = AutoIndex(posts, index.title, keyReducer('title'))
  posts.byLength = AutoIndex(posts, index.len, function (post) {
    return post.body.length
  })

  var post = {
    title: 'a title',
    body: 'lorem ipsum'
  }

  var key = ['1337']
  posts.put(key, post, function (err) {
    t.error(err)

    index.title.get('a title', function (err, _key) {
      t.error(err)
      t.deepEqual(_key, key)
    })
  })
})

