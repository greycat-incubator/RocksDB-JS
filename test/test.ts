import {greycatincub} from '../greycat.rocksdb';
import {expect} from 'chai';
import 'mocha';
import { Graph, GraphBuilder, Type, Node, Constants, struct } from '@greycat/greycat';
const fs = require('fs');
const rimraf = require('rimraf'); 


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
            
            db.put(buffer, (b) => {
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