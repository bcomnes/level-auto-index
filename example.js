var level = require('memdb')
var AutoIndex = require('./')
var keyReducer = AutoIndex.keyReducer
var sub = require('subleveldown')

var db = level()

var posts = sub(db, 'posts', { valueEncoding: 'json' })
var idx = {
  title: sub(db, 'title'),
  length: sub(db, 'length')
}

// add a title index
posts.byTitle = AutoIndex(posts, idx.title, keyReducer('title'))

// add a length index
// append the post.id for unique indexes with possibly overlapping values
posts.byLength = AutoIndex(posts, idx.length, function (post) {
  return post.body.length + '!' + post.id
})

posts.put('1337', {
  id: '1337',
  title: 'a title',
  body: 'lorem ipsum'
}, function (err) {
  if (err) throw err

  posts.byTitle.get('a title', function (err, post) {
    if (err) throw err
    console.log('get', post)
    // => get: { id: '1337', title: 'a title', body: 'lorem ipsum' }

    posts.del('1337', function (err) {
      if (err) throw err
      posts.byTitle.get('a title', function (err) {
        console.log(err.name)
        // => NotFoundError
      })
    })
  })

  posts.byLength.createReadStream({
    start: 10,
    end: 20
  }).on('data', console.log.bind(console, 'read'))
  // => read { key: '1337', value: { id: '1337', title: 'a title', body: 'lorem ipsum' } }

  posts.byLength.createKeyStream({
    start: 10,
    end: 20
  }).on('data', console.log.bind(console, 'key'))
  // => key 1337

  posts.byLength.createValueStream({
    start: 10,
    end: 20
  }).on('data', console.log.bind(console, 'value'))
  // => value { id: '1337', title: 'a title', body: 'lorem ipsum' }
})
