var level = require('memdb')
var AutoIndex = require('..')
var keyReducer = AutoIndex.keyReducer
var sub = require('subleveldown')
var test = require('tape')
var multilevel = require('multilevel')

test('multilevel', function (t) {
  t.plan(3)

  var posts = sub(level(), 'posts', {valueEncoding: 'json'})
  var idb = sub(level(), 'title')
  var byTitle = AutoIndex(posts, idb, keyReducer('title'))
  var server = multilevel.server(byTitle)
  var client = multilevel.client(byTitle.manifest)

  server.pipe(client.createRpcStream()).pipe(server)

  var post = {
    title: 'a title',
    body: 'lorem ipsum'
  }

  posts.put('1337', post, function (err) {
    t.error(err)

    client.get('a title', function (err, _post) {
      t.error(err)
      t.deepEqual(_post, post)
    })
  })
})
