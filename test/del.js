var level = require('memdb')
var AutoIndex = require('..')
var keyReducer = AutoIndex.keyReducer
var sub = require('subleveldown')
var test = require('tape')

test('del', function (t) {
  t.plan(5)
  var db = level()
  var posts = sub(db, 'posts', {valueEncoding: 'json'})
  var idb = sub(db, 'title', {valueEncoding: 'json'})

  posts.byTitle = AutoIndex(posts, idb, keyReducer('title'))

  posts.put('1337', {
    title: 'a title',
    body: 'lorem ipsum'
  }, function (err) {
    t.error(err)

    posts.del('1337', function (err) {
      t.error(err)

      posts.byTitle.get('a title', function (err) {
        t.ok(err)
        t.ok(err.notFound)

        posts.byTitle.createReadStream()
        .on('data', function () {
          t.fail()
        })
        .on('end', function () {
          t.ok(true)
        })
      })
    })
  })
})

