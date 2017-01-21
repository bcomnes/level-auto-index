var level = require('memdb')
var AutoIndex = require('..')
var keyReducer = AutoIndex.keyReducer
var sub = require('subleveldown')
var test = require('tape')

test('batch', function (t) {
  t.plan(6)
  var db = level()
  var posts = sub(db, 'posts', {valueEncoding: 'json'})
  var idb = sub(db, 'title')

  posts.byTitle = AutoIndex(posts, idb, keyReducer('title'))

  var testVal = {title: 'another title', 'body': 'another body'}

  var data = [
    {type: 'put', key: 'first', value: {title: 'first batch title', 'body': 'batch lorem ipsum'}},
    {key: 'another', value: testVal},
    {type: 'put', key: 'third', value: {title: 'a third title', 'body': 'lorem ipsum 3'}},
    {type: 'put', key: 'final', value: {title: 'a final title', 'body': 'the final lorem ipsum'}},
    {type: 'del', key: '1337'}
  ]

  posts.put('1337', {
    title: 'a title',
    body: 'lorem ipsum'
  }, function (err) {
    t.error(err)

    posts.batch(data, function (err) {
      t.error(err)

      posts.byTitle.get('a title', function (err) {
        t.ok(err)
        t.ok(err.notFound)

        posts.byTitle.get(testVal.title, function (err, value) {
          t.error(err)
          t.deepEqual(value, testVal)
        })
      })
    })
  })
})

