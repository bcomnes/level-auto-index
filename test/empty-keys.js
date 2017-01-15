var level = require('memdb')
var AutoIndex = require('..')
var sub = require('subleveldown')
var test = require('tape')

test('empty index keys', function (t) {
  t.plan(3)
  var db = level()
  var posts = sub(db, 'posts', {valueEncoding: 'json'})
  var idb = sub(db, 'title')

  posts.byEmpty = AutoIndex(posts, idb, function (value) {
    return [].join('!')
  })

  posts.put('1337', {
    title: 'a title',
    body: 'lorem ipsum'
  }, function (err) {
    t.error(err)

    posts.del('1337', function (err) {
      t.error(err)

      posts.byEmpty.createReadStream()
        .on('data', function () {
          t.fail()
        })
        .on('end', function () {
          t.ok(true)
        })
    })
  })
})

