var level = require('memdb')
var AutoIndex = require('..')
var sub = require('subleveldown')
var test = require('tape')
var concat = require('concat-stream')
var multiKeyReducer = AutoIndex.multiKeyReducer

test('multi-key index', function (t) {
  var db = level()
  var index = {
    tags: sub(db, 'tags')
  }

  var posts = sub(db, 'posts', {valueEncoding: 'json'})
  posts.byTag = AutoIndex(posts, index.tags, multiKeyReducer('tags', 'id'), { multi: true })

  var postData = [
    {
      title: 'a title',
      id: 0,
      body: 'lorem ipsum',
      tags: [ 'foo', 'bar', 'baz' ]
    },
    {
      title: 'second title',
      id: 1,
      body: 'second body',
      tags: []
    },
    {
      title: 'third title',
      id: 2,
      body: 'third body'
    },
    {
      title: 'fourth title',
      body: 'fourth body',
      id: 3,
      tags: ['bing', 'google', 'foo']
    }
  ]

  var batch = postData.map(function (post) {
    return {
      type: 'put',
      key: post.id,
      value: post
    }
  })

  const singlePost = {
    title: 'some title',
    body: 'some body',
    id: 20,
    tags: ['bing', 'google', 'foo', 'bleep', 'bloop']
  }

  posts.put(singlePost.id, singlePost, function (err) {
    t.error(err)
    posts.batch(batch, function (err) {
      t.error(err)

      var tagIndexStream = posts.byTag.createReadStream({ gt: 'foo!', lt: 'foo!~' })
      var concatStream = concat(handleResults)
      tagIndexStream.on('error', handleError)
      tagIndexStream.pipe(concatStream)

      function handleResults (data) {
        t.equal(data.length, 3)
        t.equal(data[0].key, '0')
        t.deepEqual(data[0].value, postData[0])
        t.equal(data[1].key, '20')
        t.deepEqual(data[1].value, singlePost)
        t.equal(data[2].key, '3')
        t.deepEqual(data[2].value, postData[3])
        posts.del(3, function (err) {
          t.error(err)
          secondTest()
        })
      }

      function secondTest () {
        var tagIndexStream = index.tags.createReadStream()
        var concatStream = concat(handleResults)
        tagIndexStream.on('error', handleError)
        tagIndexStream.pipe(concatStream)
        function handleResults (data) {
          t.equal(data.length, 8)
          thirdTest()
        }
      }

      function thirdTest () {
        var tagIndexStream = posts.byTag.createReadStream({ gt: 'foo!', lt: 'foo!~' })
        var concatStream = concat(handleResults)
        tagIndexStream.on('error', handleError)
        tagIndexStream.pipe(concatStream)
        function handleResults (data) {
          t.equal(data.length, 2)
          t.deepEqual(data[0].value, postData[0])
          t.equal(data[1].key, '20')
          t.deepEqual(data[1].value, singlePost)
          t.end()
        }
      }

      function handleError (err) {
        t.error(err)
        t.end()
      }
    })
  })
})
