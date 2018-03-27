import { utility, struct, plugin, Callback, Graph, Constants, internal } from '@greycat/greycat'
import { Promise } from 'es6-promise'

export namespace greycatincub {
  export namespace rocksdb {
    const levelup = require('levelup')
    const rocksdb = require('rocksdb')
    const mkdirp = require('mkdirp')
    const fs = require('fs')
    const { sep } = require('path')

    const CONNECTION_ERROR: string = 'PLEASE CONNECT YOUR DATABASE FIRST'
    const PREFIX_KEY: Int8Array = new Int8Array(Buffer.from('prefix'))

    export class RocksDBStorage implements plugin.Storage {
      private storagePath: string;
      private readonly updates: Array<Callback<struct.Buffer>>;
      private isConnected: boolean; // fixme useless, already stored by DB
      private graph: Graph;
      private db: any;

      constructor (storagePath: string) {
        this.storagePath = storagePath
        this.updates = Array()
      }

      get(keys: struct.Buffer, callback: Callback<struct.Buffer>): void {
        if (!this.isConnected) {
          throw new Error(CONNECTION_ERROR)
        }

        const itKeys: struct.BufferIterator = keys.iterator()
        const promises: Array<Promise<Buffer>> = Array()

        while (itKeys.hasNext()) {
          const view: struct.Buffer = itKeys.next()
          try {
            promises.push(this.db.get(view.data()))
          } catch (e) {
            console.log(e)
          }
        }

        const self = this;
        Promise.all(promises).then(function (dbValues: Buffer[]) {
          const result: struct.Buffer = self.graph.newBuffer();

          dbValues.forEach((val: Buffer, idx: number) => {
            if (idx > 0) {
              result.write(internal.CoreConstants.BUFFER_SEP)
            }
            const casted: Int8Array = new Int8Array(val)
            result.writeAll(casted)
          })

          if (callback) {
            callback(result)
          }
        }, function (error: any) {
          console.log(error)
          callback(null)
        })
      }
      
      put(stream: struct.Buffer, callback: Callback<boolean>): void {
        if (!this.isConnected) {
          throw new Error(CONNECTION_ERROR)
        }

        let result: struct.Buffer
        if (this.updates.length !== 0) {
          result = this.graph.newBuffer()
        }

        let batch = this.db.batch()

        const itStream: struct.BufferIterator = stream.iterator()

        let isFirst = true
        while (itStream.hasNext()) {
          const keyView: struct.Buffer = itStream.next()
          const valueView: struct.Buffer = itStream.next()

          if (valueView != null) {
            batch.put(keyView.data(), valueView.data())
          }

          if (result != null) {
            if (isFirst) {
              isFirst = false
            } else {
              result.write(Constants.KEY_SEP)
            }

            result.writeAll(keyView.data())
            result.write(Constants.KEY_SEP)
            result.writeAll(valueView.data())
            utility.Base64.encodeLongToBuffer(utility.HashHelper.hashBuffer(valueView, 0, valueView.length()), result)
          }
        }

        // write sync option is by default equals to false
        const self = this;
        batch.write(function (err: any) {
          if (err != null) {
            console.log(err)
            if (callback != null) {
              return callback(false)
            }
          }

          for (let i = 0; i < self.updates.length; i++) {
            self.updates[i](result)
          }

          if (callback != null) {
            callback(true)
          }
        })
      }

      putSilent(stream: struct.Buffer, callback: Callback<struct.Buffer>): void {
        if (!this.isConnected) {
          throw new Error(CONNECTION_ERROR)
        }

        let result: struct.Buffer
        let batch = this.db.batch()

        const itStream: struct.BufferIterator = stream.iterator()

        let isFirst = true
        while (itStream.hasNext()) {
          const keyView: struct.Buffer = itStream.next()
          const valueView: struct.Buffer = itStream.next()

          if (valueView != null) {
            batch.put(keyView.data(), valueView.data())
          }

          if (isFirst) {
            isFirst = false
          } else {
            result.write(Constants.KEY_SEP)
          }

          result.writeAll(keyView.data())
          result.write(Constants.KEY_SEP)
          result.writeAll(valueView.data())
          utility.Base64.encodeLongToBuffer(utility.HashHelper.hashBuffer(valueView, 0, valueView.length()), result)
        }

        // write sync option is by default equals to false
        batch.write(function (err: any) {
          if (err != null) {
            console.log(err)
            if (callback != null) {
              return callback(null)
            }
          }

          if (callback != null) {
            callback(result)
          }
        })
      }

      remove(keys: struct.Buffer, callback: Callback<boolean>): void {
        if (!this.isConnected) {
          throw new Error(CONNECTION_ERROR)
        }

        const itKeys: struct.BufferIterator = keys.iterator()
        const promises: Array<Promise<any>> = Array()

        while (itKeys.hasNext()) {
          const keyView: struct.Buffer = itKeys.next()
          promises.push(this.db.del(keyView.data()))
        }

        Promise.all(promises).then(function () {
          callback(true)
        }, function (error) {
          callback(false)
        })
      }

      connect(graph: Graph, callback: Callback<boolean>): void {
        if (this.isConnected) {
          if (callback != null) {
            callback(true)
          }
          return
        }
      
        const dbPath = `${this.storagePath}${sep}data`
        if (!fs.existsSync(dbPath)) {
          mkdirp.sync(dbPath)
        }

        try {
          // createIfMissing and SnappyCompression are set by default by th JD wrapper
          this.db = levelup(rocksdb(this.storagePath));
          
          this.isConnected = true;
          this.graph = graph;
          console.log("11");
          if (callback != null) {
            callback(true);
          }
        } catch (e) {
          console.log(e)
          if (callback != null) {
            callback(false)
          }
        }
      }

      disconnect(callback: Callback<boolean>): void {
        if (!this.isConnected) {
          if (callback != null) {
            callback(true)
          }
          return
        }

        try {
          const self = this;
          this.db.close(function () {
            self.isConnected = false
            self.db = null

            if (callback != null) {
              callback(true)
            }
          })
        } catch (e) {
          console.log(e)
          if (callback != null) {
            callback(false)
          }
        }
      }

      lock(callback: Callback<struct.Buffer>): void {
        const self = this;
        self.db.get(PREFIX_KEY, function (err: any, current: Int8Array) {
          if (err) {
            current = new Int8Array(Buffer.from('0'))
          }

          const currentStr: string = Buffer.from(current).toString()
          const currentPrefix: number = Number(currentStr)

          const newVal = currentPrefix + 1
          const newValArr: Int8Array = new Int8Array(Buffer.from(newVal + ''))

          console.log("lock - call put")
          self.db.put(PREFIX_KEY, newValArr, function (err: any) {
            console.log("lock - call put - callback")
            console.log(err)
            if (err != null) {
              console.log(err)
              if (callback != null) {
                callback(null)
              }
              return
            }

            if (callback != null) {
              var resBuffer: struct.Buffer = self.graph.newBuffer();
              utility.Base64.encodeIntToBuffer(currentPrefix, resBuffer);
              console.log("Call callback")
              console.log("callback")
              callback(resBuffer);
            }
          });

        });
      }

      unlock(previousLock: struct.Buffer, callback: Callback<boolean>): void {
        callback(true)
      }

      listen(synCallback: Callback<struct.Buffer>): void {
        this.updates.push(synCallback)
      }
    }
  }
}
