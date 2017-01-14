var level = require('memdb')
var AutoIndex = require('..')
var keyReducer = AutoIndex.keyReducer
var sub = require('subleveldown')
var test = require('tape')

test('get', function (t) {
  t.plan(5)
  var db = level()
  var index = {
    title: sub(db, 'title', {valueEncoding: 'json'}),
    len: sub(db, 'length', {valueEncoding: 'json'})
  }

  var posts = sub(db, 'posts', {valueEncoding: 'json'})
  posts.byTitle = AutoIndex(posts, index.title, keyReducer('title'))
  posts.byLength = AutoIndex(posts, index.len, function (post) {
    return post.body.length
  })

  var post = {
    title: 'a title',
    body: 'lorem ipsum'
  }

  posts.put('1337', post, function (err) {
    t.error(err)

    posts.byTitle.get('a title', function (err, _post) {
      t.error(err)
      t.deepEqual(_post, post)
      posts.byLength.get(post.body.length, function (err, _post) {
        t.error(err)
        t.deepEqual(_post, post)
      })
    })
  })
})

