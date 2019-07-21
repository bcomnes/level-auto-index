# level-auto-index change log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## 2.0.0 - 2019-07-21

* Update all deps
  * Update level-hookdown
    * update Levelup 4.1.0

## 1.1.0 - 2018-03-08

* Add multi-key indexing.  Multi-key reducers can return an array of keys to index per `put`, `del`, or `batch`. Thanks [@louiscenter](https://github.com/louiscenter) and [@substack](https://github.com/substack) for the idea.

## 1.0.5

* Fix index cleaning bug.  Indexes should now clean up missing lookups.

## 1.0.4

* Fix another bug in batch operations
* Expose internally references db and idb instances

## 1.0.3

* Fix bug in batch operations.

## 1.0.2

* Fix async race conditon

## 1.0.1

#### Added

* simplified example
* added key encoding example

#### Fixed

* empty index keys are ignored

## 1.0.0

* engage
* Initial release
