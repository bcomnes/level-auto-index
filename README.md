# level-auto-index

Automatic secondary indexing for leveldb and subleveldown.


```bash
npm install level-auto-index
```

[![level badge][level-badge]](https://github.com/level/awesome)
[![npm][npm-image]][npm-url]
[![Build Status](https://travis-ci.org/hypermodules/level-auto-index.svg?branch=master)](https://travis-ci.org/hypermodules/level-auto-index)
[![dependencies Status](https://david-dm.org/hypermodules/level-auto-index/status.svg)](https://david-dm.org/hypermodules/level-auto-index)
[![devDependencies Status](https://david-dm.org/hypermodules/level-auto-index/dev-status.svg)](https://david-dm.org/hypermodules/level-auto-index?type=dev)

<img height="100" src="index.png">

[level-badge]: http://leveldb.org/img/badge.svg
[npm-image]: https://img.shields.io/npm/v/level-auto-index.svg
[npm-url]: https://www.npmjs.com/package/level-auto-index

## Usage

```js
var level = require('level')
var AutoIndex = require('level-auto-index')
var sub = require('subleveldown')
var keyReducer = AutoIndex.keyReducer

var db = level()

var posts = sub(db, 'posts', {valueEncoding: 'json'})
var idx = {
  title: sub(db, 'title'),
  length: sub(db, 'length'),
  tag: sub(db, 'tag')
}

// add a title index
posts.byTitle = AutoIndex(posts, idx.title, keyReducer('title'))

// add a length index
// append the post.id for unique indexes with possibly overlapping values
posts.byLength = AutoIndex(posts, idx.length, function (post) {
  return post.body.length + '!' + post.id
})

// Create multiple index keys on an index
posts.byTag = AutoIndex(posts, idx.tag, function (post) {
    if (!post || !post.tags || !Array.isArray(post.tags)) return
    return post.tags.map(function (tag) {
      return [tag, post.id].join('!')
    })
  }, { multi: true })

posts.put('1337', {
  id: '1337',
  title: 'a title',
  body: 'lorem ipsum',
  tags: [ 'foo', 'bar', 'baz' ]
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
```

## API

### AutoIndex(db, idb, reduce, opts)

Automatically index a `db` level into the `idb` level using a `reduce` function that creates the index key.  The `db` and `idb` levels should be in isolated key namespaces, either by being two different levels or [`mafintosh/subleveldown`](https://github.com/mafintosh/subleveldown) partitions.  The `db` hook is mutated by [`hypermodules/level-hookdown`](https://github.com/hypermodules/level-hookdown) to set up the prehooks used for indexing.  Only `db` keys are stored as values to save space and reduce data redundancy.

Secondary returns an `AutoIndex` level that helps prune old index values, and automatically looks up source documents from `db` as you access keys on the `AutoIndex` level.

The `reduce` functions get the `value` of the `put` or `batch` operations.  Make sure that this `value` has everything you need to create your index keys.

```js
function reducer (value) {
  var idxKey = value.foo + '!' + value.bar
  return idxKey
}
```

Available opts:

```js
{
  multi: false // Reducer returns an array of keys to associate with the primary key
}
```

Multi-key index's are for when you you want to write multiple index entries into an index.  This is useful for 'tag' fields, where a document may have `n` tags per document, and you would like to index documents by 'tag'.  When creating a multi-key index, your reducer must return an array of keys to index by.

### AutoIndex#get(key, opts, cb)

Get the value that has been indexed with `key`.

### AutoIndex#create{Key,Value,Read}Stream(opts)

Create a readable stream that has indexes as keys and indexed data as values.

### AutoIndex#manifest

A [level manifest](https://github.com/dominictarr/level-manifest) that you can pass to [multilevel](https://github.com/juliangruber/multilevel).

### AutoIndex.keyReducer(string)

A shortcut reducer for simplistic key indexing.  You might need more than this.

```js
function keyReducer (reducerString) {
  function keyRdc (value) {
    return value[reducerString]
  }
  return keyRdc
}
```

For a higher level api for creating secondary indexes see [hypermodules/level-idx](https://github.com/hypermodules/level-idx).

### AutoIndex.keyReducer(string)

A shortcut reducer for simplistic multi-key indexing.  You might need more than this.

```js
function multiKeyReducer (multiFieldName, primaryKeyFieldName) {
  return function multiKeyrdc (document) {
    if (!document || !document[multiFieldName] || !Array.isArray(document[multiFieldName])) return
    return document[multiFieldName].map(function (tag) {
      return [tag, document[primaryKeyFieldName]].join('!')
    })
  }
```

### AutoIndex#db

The level instance that we are indexing.

### AutoIndex#idb

The level instance that we are using for the index.

## See Also

This module is a variant of

- [juliangruber/level-secondary](https://github.com/juliangruber/level-secondary)

but aimed at decoupling the index storage fromt the indexd db and also being compatable with subleveldown.  It came out of the work trying to make `level-secondary` compatable with subleveldown and level-sublevel.  That work lives here: [github.com/bcomnes/level-secondary/commit/9b2f914e53](https://github.com/bcomnes/level-secondary/commit/9b2f914e5304c791813b39abf892c32ee7616abf).
