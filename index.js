var extend = require('xtend')
var hook = require('level-hookdown')
var existy = require('existy')
var Transform = require('stream').Transform || require('readable-stream').Transform
var isArray = Array.isArray

module.exports = AutoIndex

function puts (opr) {
  return (
    opr.type === 'put' || (!existy(opr.type) && existy(opr.value) && existy(opr.value))
  )
}

function existyKeys (operation) {
  return existy(operation.key)
}

function empty (v) {
  return !!v
}

function AutoIndex (db, idb, reduce, opts) {
  if (!opts) opts = {}
  var hdb = !db.prehooks || !isArray(db.prehooks) ? hook(db) : db
  var multiKey = opts.multi

  if (typeof reduce !== 'function') {
    throw new Error('Reduce argument must be a function')
  }

  function index (operation, cb) {
    var key
    var keyBatch
    if (operation.type === 'put') {
      key = reduce(operation.value)
      if (key && multiKey) {
        if (!Array.isArray(key)) throw new Error('Reducer must return an array of keys for a multiKey index')
        keyBatch = key.filter(empty).map(
          function (k) {
            return { key: k, value: operation.key, type: 'put' }
          }
        )
        return idb.batch(keyBatch, cb)
      } else if (key) {
        return idb.put(key, operation.key, cb)
      }
      return process.nextTick(cb)
    } else if (operation.type === 'del') {
      db.get(operation.key, function (err, value) {
        if (!err || err.type === 'NotFoundError') {
          key = reduce(value)
          if (key && multiKey) {
            if (!Array.isArray(key)) throw new Error('Reducer must return an array of keys for a multiKey index')
            keyBatch = key.filter(empty).map(
              function (k) {
                return { key: k, type: 'del' }
              }
            )
            return idb.batch(keyBatch, cb)
          } else if (key) {
            return idb.del(key, key, cb)
          }
          return cb()
        } else if (err) {
          cb(err)
        } else {
          cb()
        }
      })
    } else if (operation.type === 'batch') {
      // todo handle dels
      var idxBatch = operation.array.filter(puts).map(function (opr) {
        return extend(opr, { key: reduce(opr.value), value: opr.key })
      })
      if (multiKey) {
        idxBatch = idxBatch.reduce(function (flattened, opr) {
          if (!opr.key) return flattened
          if (!Array.isArray(opr.key)) throw new Error('Reducer must return an array of keys for a multiKey index')
          opr.key.filter(empty).forEach(function (k) {
            flattened.push(extend(opr, { key: k }))
          })
          return flattened
        }, [])
      }
      idb.batch(idxBatch.filter(existyKeys), cb)
    }
  }

  hdb.prehooks.push(index)

  var secondary = {}

  secondary.db = hdb
  secondary.idb = idb

  secondary.manifest = {
    methods: {
      get: { type: 'async' },
      del: { type: 'async' },
      createValueStream: { type: 'readable' },
      createKeyStream: { type: 'readable' },
      createReadStream: { type: 'readable' }
    }
  }

  secondary.get = op('get')
  secondary.del = op('del')

  function op (type) {
    return function (key, opts, fn) {
      if (typeof opts === 'function') {
        fn = opts
        opts = {}
      }

      idb.get(key, function (err, value) {
        if (err) return fn(err)
        db[type](value, opts, fn)
      })
    }
  }

  secondary.createValueStream = function (opts) {
    if (!opts) opts = {}
    opts.keys = false
    return secondary.createReadStream(opts)
  }

  secondary.createKeyStream = function (opts) {
    if (!opts) opts = {}
    opts.values = false
    return secondary.createReadStream(opts)
  }

  secondary.createReadStream = function (opts) {
    opts = opts || {}
    var tr = Transform({ objectMode: true })

    tr._transform = function (chunk, enc, done) {
      var dbKey = chunk.value
      var idbKey = chunk.key
      if (opts.values === false) {
        done(null, dbKey)
        return
      }

      db.get(dbKey, function (err, value) {
        if (err && err.type === 'NotFoundError') {
          idb.del(idbKey, done)
        } else if (err) {
          done(err)
        } else {
          emit()
        }

        function emit () {
          if (opts.keys === false) {
            done(null, value)
          } else {
            done(null, {
              key: dbKey,
              value: value
            })
          }
        }
      })
    }

    var opts2 = extend({}, opts)
    opts2.keys = opts2.values = true
    idb.createReadStream(opts2).pipe(tr)

    return tr
  }

  return secondary
}

module.exports.keyReducer = keyReducer

function keyReducer (reducerString) {
  function keyRdc (value) {
    return value[reducerString]
  }
  return keyRdc
}

module.exports.multiKeyReducer = multiKeyReducer

function multiKeyReducer (multiFieldName, primaryKeyFieldName) {
  return function multiKeyrdc (document) {
    if (!document || !document[multiFieldName] || !Array.isArray(document[multiFieldName])) return
    return document[multiFieldName].map(function (tag) {
      return [tag, document[primaryKeyFieldName]].join('!')
    })
  }
}
