var level = require('memdb')
var AutoIndex = require('..')
var keyReducer = AutoIndex.keyReducer
var sub = require('subleveldown')
var test = require('tape')

test('read streams', function (t) {
  t.plan(4)
  var db = level()
  var index = {
    title: sub(db, 'title'),
    len: sub(db, 'length')
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
    posts.byLength.createReadStream({
      start: 10,
      end: 20
    }).on('data', function (data) {
      t.deepEqual(data, {
        key: '1337',
        value: post
      })
    })

    posts.byLength.createKeyStream({
      start: 10,
      end: 20
    }).on('data', function (data) {
      t.equal(data, '1337')
    })

    posts.byLength.createValueStream({
      start: 10,
      end: 20
    }).on('data', function (data) {
      t.deepEqual(data, post)
    })
  })
})

