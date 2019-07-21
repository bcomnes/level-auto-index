var level = require('memdb')
var AutoIndex = require('..')
var sub = require('subleveldown')
var test = require('tape')

test('db-access', function (t) {
  var db = level()
  var posts = sub(db, 'posts', { valueEncoding: 'json' })
  var idb = sub(db, 'title')

  posts.byTitle = AutoIndex(posts, idb, function (post) {
    return post.body.length
  })

  t.deepEqual(posts.byTitle.db, posts)
  t.deepEqual(posts.byTitle.idb, idb)
  t.end()
})
