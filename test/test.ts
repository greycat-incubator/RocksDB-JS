import { greycatincub } from '../greycatincub.level';
import { expect } from 'chai';
import 'mocha';
import { Graph, GraphBuilder, Type, Node, Constants, struct, NodeIndex } from '@greycat/greycat';
const fs = require('fs');
const rimraf = require('rimraf');


const PATH_JAR_WRITE = './test/java/TestJava/createDB/target/createDB-1.0-SNAPSHOT-my-jar.jar'
const PATH_JAR_READ = './test/java/TestJava/readDB/target/readDB-1.0-SNAPSHOT-my-jar.jar'

const sys = require('sys')
const exec = require('child_process').exec;

describe('Test connection, write, read and disconnection functions', () => {
    const TEST_DB_PATH = './testFolder';
    const BUILDER = new GraphBuilder()
                .withStorage(new greycatincub.rocksdb.RocksDBStorage(TEST_DB_PATH));

    after(() => {
        if(fs.existsSync(TEST_DB_PATH)) {
            rimraf(TEST_DB_PATH, () => {console.log('');});
        }
    })

    it('should create the folder and not fail if it doesn\'t exist', (done: MochaDone) => {

        const graph1 = BUILDER.build();
        const graph2 = BUILDER.build();
        let id: number;

        graph1.connect((connectionOK) => {
            expect(connectionOK).to.equal(true);

            let node = graph1.newNode(0,0);
            node.set("name", Type.STRING, "aName");
            id = node.id();

            graph1.disconnect((disconnectionOK) => {
                expect(disconnectionOK).to.equal(true);
                expect(fs.existsSync(TEST_DB_PATH)).to.equal(true);

                graph2.connect((connection2OK) => {
                    expect(connection2OK).to.equal(true);

                    graph2.lookup<Node>(0,0,id,(resolved: Node) => {
                        const isUndefined = resolved === null;
                        expect(isUndefined).to.equal(false);
                        expect(resolved.get("name")).to.equal("aName");
                        graph2.disconnect(() => {
                            done();
                        });
                    });

                });
            });
        });                    
    });
});

describe('Test read / write functions, low level', () => {
    const TEST_DB_PATH = './testFolder2';

    const db = new greycatincub.rocksdb.RocksDBStorage(TEST_DB_PATH)
    const BUILDER = new GraphBuilder()
           .withStorage(db);

    after(() => {
        if(fs.existsSync(TEST_DB_PATH)) {
            rimraf(TEST_DB_PATH, () => {console.log('');});
        }
    })

    it('should write and successfully read the value',(done: MochaDone) => {
        const graph = BUILDER.build();

        graph.connect((connectionOK) => {
            const buffer = graph.newBuffer();
            buffer.writeString("key");
            buffer.write(Constants.BUFFER_SEP);
            buffer.writeString("value");

            db.put(buffer, (b: Boolean) => {
                expect(b).to.equal(true);

                const keyBuff = graph.newBuffer();
                keyBuff.writeString("key");

                db.get(keyBuff, (retrieved: struct.Buffer) => {                    
                    expect(retrieved.toString()).to.equal("value");

                    graph.disconnect(() => {
                        done();
                    });

                });
            });

        }); 
    });
});

describe('Test compatibility with Java', () => {
    const dbCreationPath = "javaDBWrite";
    const world = 87;
    const time = 98;
    const indexName = 'myIndexName';

    const db = new greycatincub.rocksdb.RocksDBStorage(dbCreationPath)
    const BUILDER = new GraphBuilder()
           .withStorage(db);

    after(() => {
        if(fs.existsSync(dbCreationPath)) {
            rimraf(dbCreationPath, () => {console.log('');});
        }
    })

    it('should read Java DB created', (done: MochaDone) => {
        const cmd = `"java" -jar ${PATH_JAR_WRITE} ${dbCreationPath} ${world} ${time} ${indexName}`;
        exec(cmd, function (error: any, stdout: string, stderr: string) {
            
            const noError = (stderr === "") && (error === null);
            expect(noError).to.equal(true);

            const graph = BUILDER.build();
            graph.connect((coOK: boolean) => {
                graph.index(world, time, indexName, (idx: NodeIndex) => {
                    console.log("idx " + idx)
                    const idxFound = idx !== null;
                    expect(idxFound).to.equal(true);
                    
                    idx.findFrom((node: Node[] ) => {
                        expect(node.length).to.equal(1);
                        expect(node[0].time()).to.equal(time);
                        expect(node[0].world()).to.equal(world);

                        graph.disconnect((discoOK: boolean) => {
                            done();
                        })
                    });
               });
            });

        });
    });
});

describe('Test compatibility with Java', () => {
    const dbCreationPath = "javaDBRead";
    const world = 87;
    const time = 98;
    const indexName = 'myIndexName';

    const db = new greycatincub.rocksdb.RocksDBStorage(dbCreationPath)
    const BUILDER = new GraphBuilder()
           .withStorage(db);

    after(() => {
        if(fs.existsSync(dbCreationPath)) {
            rimraf(dbCreationPath, () => {console.log('');});
        }
    })

    it('should read Java DB created', (done: MochaDone) => {
        const graph = BUILDER.build();
            graph.connect((coOK: boolean) => {

            
              let node = graph.newNode(world,time);

                graph.declareIndex(world, indexName, (idx: NodeIndex) => {
                    idx.update(node);
                    
                    graph.disconnect((discoOK: boolean) => {
                        const cmd = `"java" -jar ${PATH_JAR_READ} ${dbCreationPath} ${world} ${time} ${indexName}`
                        exec(cmd, function (error: any, stdout: string, stderr: string) {
            
                            const noError = (stderr === "") && (error === null);
                            expect(noError).to.equal(true);
                            expect(stdout).to.equal(`[{"world":${world},"time":${time},"id":1,"group":0}]\n`)
                            done();
                
                        });
                    })
                  
               });
            });
    });
});