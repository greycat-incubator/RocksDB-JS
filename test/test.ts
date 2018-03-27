import {greycatincub} from '../greycat.rocksdb';
import {expect} from 'chai';
import 'mocha';
import { Graph, GraphBuilder } from '@greycat/greycat';
const fs = require('fs');
const rimraf = require('rimraf'); 


describe('Connection function', () => {
    it('should create the folder and not fail if it doesn\'t exist', () => {
        const graph: Graph = new GraphBuilder()
                                    .withStorage(new greycatincub.rocksdb.RocksDBStorage('./testFolder'))
                                    .build();

        graph.connect((connectionOK) => {
            // expect(connectionOK).to.equal(true);
            
            // console.log("lilili");
            graph.disconnect((discoOK) => {
                
                // expect(discoOK).to.equal(true);
            //     console.log("laall");

                const folderExists = fs.existsSync('./testFolder');
                expect(folderExists).to.equal(true);
                rimraf('./testFolder', () => {console.log('');});
            });
        });                        
    });
});